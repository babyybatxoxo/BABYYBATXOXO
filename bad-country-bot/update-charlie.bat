@echo off
REM Double-click me (Windows) to update Checkpoint Charlie to the newest version.
REM Keeps your .env (token) and data folder. Put me in Charlie's bad-country-bot folder.
setlocal
set "ZIPURL=https://github.com/babyybatxoxo/BABYYBATXOXO/archive/refs/heads/claude/bad-country-server-setup-auz0qs.zip"
cd /d "%~dp0"
if not exist "docker-compose.yml" (
  if exist "%USERPROFILE%\CheckpointCharlie\docker-compose.yml" ( cd /d "%USERPROFILE%\CheckpointCharlie" ) else (
    echo I can't find Charlie here. Put update-charlie.bat inside the bad-country-bot folder ^(next to docker-compose.yml^).
    pause
    exit /b 1
  )
)
set "TARGET=%CD%"
echo Updating Charlie in %TARGET% ...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $z=Join-Path $env:TEMP 'charlie.zip'; $d=Join-Path $env:TEMP 'charlie-unzip'; Invoke-WebRequest -UseBasicParsing $env:ZIPURL -OutFile $z; if (Test-Path $d) { Remove-Item $d -Recurse -Force }; Expand-Archive $z $d; $src=Join-Path (Get-ChildItem $d)[0].FullName 'bad-country-bot'; Copy-Item (Join-Path $src '*') $env:TARGET -Recurse -Force"
if errorlevel 1 goto broke
docker info >nul 2>&1
if errorlevel 1 (
  echo Open Docker Desktop first, then run me again.
  pause
  exit /b 1
)
docker compose -f docker-compose.yml up -d --build
if errorlevel 1 goto broke
echo Waiting for Charlie to check in...
for /l %%i in (1,1,40) do (
  docker compose -f docker-compose.yml logs --since 2m 2>nul | findstr /c:"guarding the checkpoint" >nul && goto alive
  timeout /t 2 >nul
)
echo He didn't check in. Last log lines (screenshot this for Claude):
docker compose -f docker-compose.yml logs --tail 15
pause
exit /b 1
:alive
echo.
echo  Charlie is updated and ALIVE. New commands can take a minute to show up in Discord.
pause
exit /b 0
:broke
echo.
echo Something broke. Screenshot this window for Claude.
pause
exit /b 1
