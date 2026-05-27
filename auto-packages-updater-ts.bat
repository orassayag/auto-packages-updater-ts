@echo off
cd /d "c:\Or\web\projects\auto-packages-updater-ts"
echo Starting Auto Packages Updater...
set LOG_LEVEL=debug
npm run sync
echo.
echo Auto packages update process finished.
pause
