@echo off
REM ============================================================================
REM bob's game web (okgame) — Workspace & Submodule Setup Script (setup.bat)
REM ============================================================================
REM Initializes recursive git submodules:
REM   - submodules/bobui (https://github.com/robertpelloni/bqt.git)
REM     - submodules/bobui/submodules/juce (https://github.com/juce-framework/JUCE)
REM     - submodules/bobui/submodules/ultimatepp (https://github.com/ultimatepp/ultimatepp)
REM Installs npm packages for the root web/Electron app and server/ backend,
REM and seeds .env.production from .env.production.example if absent.
REM ============================================================================
setlocal
title bob's game web — Setup
cd /d "%~dp0"

echo [bobsgameweb] Synchronizing recursive git submodules...
git submodule sync --recursive
git submodule update --init --recursive
if errorlevel 1 (
    echo [bobsgameweb] WARNING: git submodule update returned non-zero status.
)

if not exist ".env.production" (
    if exist ".env.production.example" (
        echo [bobsgameweb] Creating .env.production from .env.production.example...
        copy /Y ".env.production.example" ".env.production" >nul
    )
)

echo [bobsgameweb] Installing root npm dependencies...
call npm install
if errorlevel 1 (
    echo [bobsgameweb] ERROR: Root npm install failed.
    exit /b %errorlevel%
)

if exist "server\package.json" (
    echo [bobsgameweb] Installing server npm dependencies...
    pushd server
    call npm install
    if errorlevel 1 (
        popd
        echo [bobsgameweb] ERROR: server npm install failed.
        exit /b 1
    )
    popd
)

echo [bobsgameweb] Setup complete! Run build.bat to compile or start.bat to launch.
endlocal
