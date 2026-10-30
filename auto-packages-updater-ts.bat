@echo off
cd /d "c:\Or\web\projects\auto-packages-updater-ts"
echo Updating Auto Packages Updater itself...
rem Self-update before the run: the updater processes its own repo last, so
rem without this the first run after a fix still executes the old code.
git pull --rebase || echo Self-update pull failed, running the current version.
call pnpm install --frozen-lockfile || echo Self-update install failed, running the current version.
echo Starting Auto Packages Updater...
set LOG_LEVEL=debug
call npm run sync
echo.
echo Auto packages update process finished.
pause
