@echo off
rem 収集 → 評価 → AI分析依頼ファイル出力（タスクスケジューラから呼ばれる）
chcp 65001 > nul
cd /d %~dp0..
call .venv\Scripts\activate.bat
python -m freehunter run
exit /b %ERRORLEVEL%
