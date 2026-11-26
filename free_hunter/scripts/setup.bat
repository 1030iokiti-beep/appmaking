@echo off
rem FREE HUNTER 初回セットアップ（ダブルクリックで実行）
chcp 65001 > nul
cd /d %~dp0..
where python > nul 2>&1 || (echo Python が見つかりません。https://www.python.org/ から 3.11 以上をインストールしてください & pause & exit /b 1)
if not exist .venv python -m venv .venv
call .venv\Scripts\activate.bat
python -m pip install --upgrade pip
pip install -r requirements.txt || (echo ライブラリのインストールに失敗しました & pause & exit /b 1)
python -m playwright install chromium
if not exist config\settings.toml copy config\settings.example.toml config\settings.toml
python -m freehunter init
echo.
echo セットアップ完了。次は config\settings.toml の [profile] を編集し、
echo   scripts\run_daily.bat で収集、scripts\dashboard.bat で管理画面を開けます。
pause
