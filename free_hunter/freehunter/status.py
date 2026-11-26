"""案件の状態判定（受付中 / 締切切れ / 募集終了 / 開始前）。"""
from __future__ import annotations

from datetime import date
from typing import Optional

OPEN = "open"
EXPIRED = "expired"
ENDED = "ended"
NOT_STARTED = "not_started"
UNKNOWN_DEADLINE = "open_unknown_deadline"


def judge_status(deadline: Optional[date], start: Optional[date], ended_flag: bool,
                 today: Optional[date] = None) -> str:
    today = today or date.today()
    if ended_flag:
        return ENDED
    if deadline and deadline < today:
        return EXPIRED
    if start and start > today:
        return NOT_STARTED
    if not deadline:
        return UNKNOWN_DEADLINE
    return OPEN


STATUS_LABELS = {
    OPEN: "受付中",
    UNKNOWN_DEADLINE: "受付中(締切不明)",
    NOT_STARTED: "開始前",
    EXPIRED: "締切切れ",
    ENDED: "募集終了",
}
