@echo off
REM ============================================================================
REM bobsgameweb (okgame) -- Hetzner Live Client Launcher (Zero Local Servers)
REM ============================================================================
REM USAGE:
REM   start.bat              Opens live https://bobsgame.com in default browser.
REM   start.bat --electron   Launches Electron desktop client connected to live Hetzner.
REM   start.bat --deploy     Deploys frontend + backend live to Hetzner (5.161.250.43).
REM   start.bat --bobui      Delegates to submodules\bobui\start.bat (BQt Go kernel).
REM ============================================================================
setlocal
title bobsgameweb-live
cd /d "%~dp0"

if /I "%~1"=="--bobui" (
    if not exist "submodules\bobui\start.bat" (
        echo [bobsgameweb] ERROR: submodules\bobui\start.bat not found.
        exit /b 1
    )
    call "submodules\bobui\start.bat"
    exit /b %errorlevel%
)

if /I "%~1"=="--electron" (
    echo [bobsgameweb] Launching Electron desktop client ^(Hetzner Live: https://bobsgame.com^)...
    call npx electron .
    exit /b %errorlevel%
)

if /I "%~1"=="--deploy" (
    echo [bobsgameweb] Deploying live to Hetzner ^(bobsgame.com + ws.bobsgame.com^)...
    bash ./scripts/deploy-with-rollback.sh
    exit /b %errorlevel%
)

echo [bobsgameweb] Opening live Hetzner deployment: https://bobsgame.com
start "" "https://bobsgame.com"
endlocal
