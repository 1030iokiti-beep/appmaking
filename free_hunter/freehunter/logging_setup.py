"""ログ設定。logs/freehunter_YYYYMMDD.log に日別で保存。"""
from __future__ import annotations

import logging
import sys
from datetime import date
from pathlib import Path

_configured = False


def setup_logging(log_dir: Path, level: int = logging.INFO) -> None:
    global _configured
    if _configured:
        return
    log_dir.mkdir(parents=True, exist_ok=True)
    fmt = logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s")
    root = logging.getLogger("freehunter")
    root.setLevel(level)
    fh = logging.FileHandler(log_dir / f"freehunter_{date.today():%Y%m%d}.log", encoding="utf-8")
    fh.setFormatter(fmt)
    root.addHandler(fh)
    sh = logging.StreamHandler(sys.stdout)
    sh.setFormatter(fmt)
    root.addHandler(sh)
    _configured = True
