@echo off
REM Double-click me (Windows). Puts Checkpoint Charlie in Docker Desktop for good.
cd /d "%~dp0"
echo Waking up Checkpoint Charlie...
docker info >nul 2>&1
if not errorlevel 1 goto dockerup
echo Opening Docker Desktop, give it a minute...
start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
:waitdocker
timeout /t 3 >nul
docker info >nul 2>&1
if errorlevel 1 goto waitdocker
:dockerup
findstr /r "^DISCORD_TOKEN=." .env >nul 2>&1
if errorlevel 1 (
  set /p T=Paste Charlie's bot token, then press Enter: 
  call echo DISCORD_TOKEN=%%T%%> .env
  echo GUILD_ID=1540905721879593030>> .env
  cls
)
docker compose up -d --build
if errorlevel 1 (
  echo Something broke. Screenshot this window for Claude.
  pause
  exit /b 1
)
echo Waiting for Charlie to check in...
for /l %%i in (1,1,30) do (
  docker compose logs 2>nul | findstr /c:"guarding the checkpoint" >nul && goto alive
  timeout /t 2 >nul
)
echo He didn't check in. Last log lines (send a screenshot to Claude):
docker compose logs --tail 15
pause
exit /b 1
:alive
echo.
echo Charlie is ALIVE in Docker. He restarts on his own whenever Docker Desktop runs.
echo Tip: Docker Desktop - Settings - General - "Start Docker Desktop when you sign in" = on.
pause
