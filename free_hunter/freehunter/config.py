"""設定の読み込み。settings.toml → settings.example.toml の順で探す。
環境変数 FH_HOME で free_hunter フォルダの場所を変更可能（VPS 移行用）。"""
from __future__ import annotations

import os
import tomllib
from dataclasses import dataclass
from pathlib import Path
from typing import Any

BASE_DIR = Path(os.environ.get("FH_HOME", Path(__file__).resolve().parent.parent))
CONFIG_DIR = BASE_DIR / "config"


def _load_toml(path: Path) -> dict[str, Any]:
    with open(path, "rb") as f:
        return tomllib.load(f)


@dataclass
class Settings:
    raw: dict[str, Any]

    def get(self, section: str, key: str, default: Any = None) -> Any:
        return self.raw.get(section, {}).get(key, default)

    def path(self, key: str, default: str) -> Path:
        p = Path(self.get("paths", key, default))
        return p if p.is_absolute() else BASE_DIR / p

    @property
    def db_path(self) -> Path:
        env = os.environ.get("FH_DB")
        return Path(env) if env else self.path("db_file", "data/freehunter.db")

    @property
    def data_dir(self) -> Path:
        return self.path("data_dir", "data")

    @property
    def log_dir(self) -> Path:
        return self.path("log_dir", "logs")


def load_settings(path: Path | None = None) -> Settings:
    if path is None:
        path = CONFIG_DIR / "settings.toml"
        if not path.exists():
            path = CONFIG_DIR / "settings.example.toml"
    raw = _load_toml(path) if path.exists() else {}
    return Settings(raw)


def load_sources(path: Path | None = None) -> list[dict[str, Any]]:
    path = path or CONFIG_DIR / "sources.toml"
    if not path.exists():
        return []
    data = _load_toml(path)
    sources = data.get("source", [])
    for s in sources:
        s.setdefault("enabled", True)
        s.setdefault("is_official", False)
        s.setdefault("follow_detail", False)
        s.setdefault("use_browser", False)
        if "name" not in s or "url" not in s or "kind" not in s:
            raise ValueError(f"sources.toml の項目に name/url/kind がありません: {s}")
    return sources
