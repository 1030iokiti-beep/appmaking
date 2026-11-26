"""SQLite データ管理。DB は 1 ファイル（data/freehunter.db）。"""
from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from datetime import date, datetime
from pathlib import Path
from typing import Any, Iterator, Optional

SCHEMA = """
CREATE TABLE IF NOT EXISTS campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fingerprint TEXT,
    url TEXT NOT NULL,
    url_norm TEXT NOT NULL UNIQUE,
    domain TEXT,
    title TEXT NOT NULL,
    company TEXT,
    prize TEXT,
    prize_value_yen INTEGER,
    prize_value_estimated INTEGER DEFAULT 0,
    winners INTEGER,
    start_date TEXT,
    deadline TEXT,
    conditions TEXT DEFAULT '[]',
    conditions_text TEXT,
    method TEXT,
    apply_url TEXT,
    is_official INTEGER DEFAULT 0,
    ended INTEGER DEFAULT 0,
    status TEXT,
    genre TEXT,
    eligibility TEXT DEFAULT '{}',
    source_name TEXT,
    source_kind TEXT,
    raw_text TEXT,
    first_seen TEXT,
    last_seen TEXT,
    score REAL,
    rank TEXT,
    score_breakdown TEXT,
    reasons TEXT,
    est_minutes REAL,
    ai_note TEXT,
    ai_rank TEXT,
    hidden INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_campaigns_rank ON campaigns(rank);
CREATE INDEX IF NOT EXISTS idx_campaigns_deadline ON campaigns(deadline);
CREATE INDEX IF NOT EXISTS idx_campaigns_company ON campaigns(company);

CREATE TABLE IF NOT EXISTS campaign_sources (
    campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    source_name TEXT NOT NULL,
    url TEXT NOT NULL,
    seen_at TEXT NOT NULL,
    PRIMARY KEY (campaign_id, source_name, url)
);

CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL REFERENCES campaigns(id),
    applied_at TEXT NOT NULL,
    method TEXT,
    result TEXT DEFAULT 'pending',   -- pending / won / lost
    note TEXT
);
CREATE INDEX IF NOT EXISTS idx_app_campaign ON applications(campaign_id);

CREATE TABLE IF NOT EXISTS wins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER REFERENCES campaigns(id),
    application_id INTEGER REFERENCES applications(id),
    won_at TEXT NOT NULL,
    prize TEXT,
    value_yen INTEGER,
    received INTEGER DEFAULT 0,
    note TEXT
);

CREATE TABLE IF NOT EXISTS collect_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at TEXT NOT NULL,
    finished_at TEXT,
    source_name TEXT,
    fetched INTEGER DEFAULT 0,
    new_count INTEGER DEFAULT 0,
    updated INTEGER DEFAULT 0,
    error TEXT
);
"""

JSON_FIELDS = ("conditions", "eligibility", "score_breakdown", "reasons")


def _ser(v: Any) -> Any:
    if isinstance(v, (date, datetime)):
        return v.isoformat()
    if isinstance(v, bool):
        return int(v)
    return v


class Database:
    def __init__(self, path: Path | str):
        self.path = Path(path)
        if str(path) != ":memory:":
            self.path.parent.mkdir(parents=True, exist_ok=True)
        self.conn = sqlite3.connect(str(path), check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self.conn.execute("PRAGMA foreign_keys = ON")
        self.conn.execute("PRAGMA journal_mode = WAL") if str(path) != ":memory:" else None
        self.conn.executescript(SCHEMA)

    def close(self) -> None:
        self.conn.close()

    @contextmanager
    def tx(self) -> Iterator[sqlite3.Connection]:
        try:
            yield self.conn
            self.conn.commit()
        except Exception:
            self.conn.rollback()
            raise

    # ───── campaigns ─────
    @staticmethod
    def row_to_dict(row: sqlite3.Row) -> dict:
        d = dict(row)
        for k in JSON_FIELDS:
            if k in d and isinstance(d[k], str):
                try:
                    d[k] = json.loads(d[k])
                except json.JSONDecodeError:
                    pass
        return d

    def get_campaign(self, cid: int) -> Optional[dict]:
        r = self.conn.execute("SELECT * FROM campaigns WHERE id=?", (cid,)).fetchone()
        return self.row_to_dict(r) if r else None

    def find_by_url(self, url_norm: str) -> Optional[dict]:
        r = self.conn.execute("SELECT * FROM campaigns WHERE url_norm=?", (url_norm,)).fetchone()
        return self.row_to_dict(r) if r else None

    def candidates_for_dedup(self, company: Optional[str], domain: str, limit: int = 300) -> list[dict]:
        rows = self.conn.execute(
            "SELECT * FROM campaigns WHERE (company IS NOT NULL AND company=?) OR domain=? "
            "OR first_seen >= date('now','-45 days') ORDER BY id DESC LIMIT ?",
            (company, domain, limit),
        ).fetchall()
        return [self.row_to_dict(r) for r in rows]

    def insert_campaign(self, data: dict) -> int:
        data = {k: _ser(json.dumps(v, ensure_ascii=False) if k in JSON_FIELDS and not isinstance(v, str) else v)
                for k, v in data.items()}
        cols = ",".join(data)
        q = ",".join("?" * len(data))
        cur = self.conn.execute(f"INSERT INTO campaigns ({cols}) VALUES ({q})", list(data.values()))
        return int(cur.lastrowid)

    def update_campaign(self, cid: int, data: dict) -> None:
        if not data:
            return
        data = {k: _ser(json.dumps(v, ensure_ascii=False) if k in JSON_FIELDS and not isinstance(v, str) else v)
                for k, v in data.items()}
        sets = ",".join(f"{k}=?" for k in data)
        self.conn.execute(f"UPDATE campaigns SET {sets} WHERE id=?", [*data.values(), cid])

    def add_source_seen(self, cid: int, source_name: str, url: str) -> None:
        self.conn.execute(
            "INSERT OR REPLACE INTO campaign_sources VALUES (?,?,?,?)",
            (cid, source_name, url, datetime.now().isoformat(timespec="seconds")),
        )

    def all_campaigns(self, include_hidden: bool = False) -> list[dict]:
        q = "SELECT c.*, (SELECT COUNT(*) FROM applications a WHERE a.campaign_id=c.id) AS applied FROM campaigns c"
        if not include_hidden:
            q += " WHERE hidden=0"
        return [self.row_to_dict(r) for r in self.conn.execute(q).fetchall()]

    # ───── applications / wins ─────
    def is_applied(self, cid: int) -> bool:
        return self.conn.execute("SELECT 1 FROM applications WHERE campaign_id=?", (cid,)).fetchone() is not None

    def record_application(self, cid: int, method: str | None = None, note: str | None = None) -> int:
        cur = self.conn.execute(
            "INSERT INTO applications (campaign_id, applied_at, method, note) VALUES (?,?,?,?)",
            (cid, datetime.now().isoformat(timespec="seconds"), method, note),
        )
        self.conn.commit()
        return int(cur.lastrowid)

    def record_win(self, cid: int, prize: str | None, value_yen: int | None, note: str | None = None,
                   won_at: date | None = None) -> int:
        app = self.conn.execute("SELECT id FROM applications WHERE campaign_id=? ORDER BY id DESC LIMIT 1",
                                (cid,)).fetchone()
        if app:
            self.conn.execute("UPDATE applications SET result='won' WHERE id=?", (app["id"],))
        cur = self.conn.execute(
            "INSERT INTO wins (campaign_id, application_id, won_at, prize, value_yen, note) VALUES (?,?,?,?,?,?)",
            (cid, app["id"] if app else None, (won_at or date.today()).isoformat(), prize, value_yen, note),
        )
        self.conn.commit()
        return int(cur.lastrowid)

    def applications(self) -> list[dict]:
        rows = self.conn.execute(
            "SELECT a.*, c.title, c.company, c.deadline, c.url FROM applications a "
            "JOIN campaigns c ON c.id=a.campaign_id ORDER BY a.applied_at DESC").fetchall()
        return [dict(r) for r in rows]

    def wins(self) -> list[dict]:
        rows = self.conn.execute(
            "SELECT w.*, c.title, c.company FROM wins w LEFT JOIN campaigns c ON c.id=w.campaign_id "
            "ORDER BY w.won_at DESC").fetchall()
        return [dict(r) for r in rows]

    # ───── runs ─────
    def start_run(self, source_name: str) -> int:
        cur = self.conn.execute("INSERT INTO collect_runs (started_at, source_name) VALUES (?,?)",
                                (datetime.now().isoformat(timespec="seconds"), source_name))
        self.conn.commit()
        return int(cur.lastrowid)

    def finish_run(self, run_id: int, fetched: int, new: int, updated: int, error: str | None) -> None:
        self.conn.execute(
            "UPDATE collect_runs SET finished_at=?, fetched=?, new_count=?, updated=?, error=? WHERE id=?",
            (datetime.now().isoformat(timespec="seconds"), fetched, new, updated, error, run_id))
        self.conn.commit()

    def recent_runs(self, limit: int = 50) -> list[dict]:
        return [dict(r) for r in self.conn.execute(
            "SELECT * FROM collect_runs ORDER BY id DESC LIMIT ?", (limit,)).fetchall()]
