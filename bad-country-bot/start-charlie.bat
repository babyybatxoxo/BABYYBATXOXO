@echo off
REM Double-click me (Windows). Works from anywhere: downloads Charlie if needed,
REM then puts him in Docker Desktop for good.
setlocal
set "ZIPURL=https://github.com/babyybatxoxo/BABYYBATXOXO/archive/refs/heads/claude/bad-country-server-setup-auz0qs.zip"
set "HOMEDIR=%USERPROFILE%\CheckpointCharlie"
echo Waking up Checkpoint Charlie...

REM --- 1. Find Charlie's code (next to me, in a subfolder, or download it) ---
cd /d "%~dp0"
if exist "docker-compose.yml" goto havecode
if exist "bad-country-bot\docker-compose.yml" (
  cd /d "%~dp0bad-country-bot"
  goto havecode
)
echo Downloading Charlie's code to %HOMEDIR% ...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $z=Join-Path $env:TEMP 'charlie.zip'; $d=Join-Path $env:TEMP 'charlie-unzip'; Invoke-WebRequest -UseBasicParsing $env:ZIPURL -OutFile $z; if (Test-Path $d) { Remove-Item $d -Recurse -Force }; Expand-Archive $z $d; $src=Join-Path (Get-ChildItem $d)[0].FullName 'bad-country-bot'; New-Item -ItemType Directory -Force $env:HOMEDIR | Out-Null; Copy-Item (Join-Path $src '*') $env:HOMEDIR -Recurse -Force"
if errorlevel 1 goto broke
cd /d "%HOMEDIR%"
if not exist "docker-compose.yml" goto broke
:havecode
echo Charlie's code is in: %CD%

REM --- 2. Make sure Docker Desktop is running ---
docker info >nul 2>&1
if not errorlevel 1 goto dockerup
echo Opening Docker Desktop, give it a minute...
start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
:waitdocker
timeout /t 3 >nul
docker info >nul 2>&1
if errorlevel 1 goto waitdocker
:dockerup

REM --- 3. Token (asked once, saved in .env on this computer only) ---
findstr /r "^DISCORD_TOKEN=." .env >nul 2>&1
if not errorlevel 1 goto havetoken
set /p "T=Paste Charlie's bot token, then press Enter: "
> .env echo DISCORD_TOKEN=%T%
>> .env echo GUILD_ID=1540905721879593030
set "T="
cls
:havetoken

REM --- 4. Build + start ---
docker compose -f docker-compose.yml up -d --build
if errorlevel 1 goto broke
echo Waiting for Charlie to check in...
for /l %%i in (1,1,40) do (
  docker compose -f docker-compose.yml logs 2>nul | findstr /c:"guarding the checkpoint" >nul && goto alive
  timeout /t 2 >nul
)
echo He didn't check in. Last log lines (screenshot this for Claude):
docker compose -f docker-compose.yml logs --tail 15
pause
exit /b 1

:alive
echo.
echo  Charlie is ALIVE in Docker Desktop.
echo  He restarts on his own whenever Docker Desktop runs.
echo  Tip: Docker Desktop - Settings - General - "Start Docker Desktop when you sign in" = ON.
echo  Tell Claude he's alive so the cloud copy gets shut down.
pause
exit /b 0

:broke
echo.
echo Something broke. Screenshot this window for Claude.
pause
exit /b 1
