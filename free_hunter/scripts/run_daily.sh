#!/usr/bin/env bash
# VPS(Linux) 用。crontab 例:  0 7,19 * * * /opt/free_hunter/scripts/run_daily.sh
set -euo pipefail
cd "$(dirname "$0")/.."
source .venv/bin/activate
python -m freehunter run
