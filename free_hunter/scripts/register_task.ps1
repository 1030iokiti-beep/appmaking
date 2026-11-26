# FREE HUNTER を Windows タスクスケジューラに登録する
# 使い方（PowerShell）:  powershell -ExecutionPolicy Bypass -File scripts\register_task.ps1 -Times "07:00","19:00"
# 削除:                  Unregister-ScheduledTask -TaskName "FreeHunter" -Confirm:$false
param(
    [string[]]$Times = @("07:00", "19:00"),
    [string]$TaskName = "FreeHunter"
)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$bat = Join-Path $root "scripts\run_daily.bat"
if (-not (Test-Path $bat)) { throw "run_daily.bat が見つかりません: $bat" }

$action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$bat`"" -WorkingDirectory $root
$triggers = $Times | ForEach-Object { New-ScheduledTaskTrigger -Daily -At $_ }
# スリープ中なら起こす / 実行時間が過ぎていたら起動後すぐ実行 / 最長1時間で打ち切り
$settings = New-ScheduledTaskSettingsSet -WakeToRun -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 1) `
    -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $triggers -Settings $settings `
    -Description "FREE HUNTER 懸賞情報の自動収集" -Force | Out-Null
Write-Host "登録しました: $TaskName （毎日 $($Times -join ', ')）"
Write-Host "確認: タスクスケジューラ → タスク スケジューラ ライブラリ → $TaskName"
