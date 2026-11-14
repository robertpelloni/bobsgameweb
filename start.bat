@echo off
REM ============================================================================
REM bob's game web (okgame) — Unified Launch Script (start.bat)
REM ============================================================================
REM USAGE:
REM   start.bat              Starts AI Proxy (8080) + Multiplayer WS Server (6065)
REM                          in background windows (if not already bound) and
REM                          runs the Vite dev server on http://localhost:3000.
REM   start.bat --electron   Launches Electron + Vite desktop shell (npm run dev:electron).
REM   start.bat --preview    Serves the production bundle in dist\renderer via Vite preview.
REM   start.bat --server     Runs only the Multiplayer WebSocket server (port 6065).
REM   start.bat --ai-proxy   Runs only the Generative AI proxy server (port 8080).
REM   start.bat --bobui      Delegates to submodules\bobui\start.bat (BQt Go kernel).
REM ============================================================================
setlocal
title bob's game web
cd /d "%~dp0"

REM Lower parent cmd.exe priority to BelowNormal so Node/Vite/Electron processes
REM never starve host OS responsiveness.
powershell -NoProfile -Command "$p = Get-Process -Id $PID; if ($p.Parent) { try { $p.Parent.PriorityClass = 'BelowNormal' } catch {} }" >nul 2>nul

if /I "%~1"=="--bobui" (
    if not exist "submodules\bobui\start.bat" (
        echo [bobsgameweb] ERROR: submodules\bobui\start.bat not found. Run setup.bat first.
        exit /b 1
    )
    call "submodules\bobui\start.bat"
    exit /b %errorlevel%
)

where node >nul 2>nul
if errorlevel 1 (
    echo [bobsgameweb] ERROR: node not found in PATH.
    exit /b 1
)

if /I "%~1"=="--server" (
    echo [bobsgameweb] Starting Multiplayer WebSocket Server on port 6065...
    node server/index.js
    exit /b %errorlevel%
)

if /I "%~1"=="--ai-proxy" (
    echo [bobsgameweb] Starting Generative AI Proxy on port 8080...
    node server/ai_proxy.js
    exit /b %errorlevel%
)

if /I "%~1"=="--electron" (
    echo [bobsgameweb] Launching Electron + Vite desktop mode...
    call npm run dev:electron
    exit /b %errorlevel%
)

if /I "%~1"=="--preview" (
    echo [bobsgameweb] Serving production bundle via Vite preview...
    call npm run preview
    exit /b %errorlevel%
)

REM Default full-stack local development startup:
REM Spawn background services at BelowNormal priority only if ports 6065 / 8080 are not already listening.
netstat -ano | findstr /R /C:":6065 .*LISTENING" >nul 2>nul
if errorlevel 1 (
    echo [bobsgameweb] Starting background Multiplayer WebSocket Server ^(port 6065, BelowNormal^)...
    start "bobsgameweb-ws-server" /min /belownormal cmd /c "cd /d ""%~dp0"" && node server/index.js"
)

netstat -ano | findstr /R /C:":8080 .*LISTENING" >nul 2>nul
if errorlevel 1 (
    echo [bobsgameweb] Starting background AI Proxy Server ^(port 8080, BelowNormal^)...
    start "bobsgameweb-ai-proxy" /min /belownormal cmd /c "cd /d ""%~dp0"" && node server/ai_proxy.js"
)

echo [bobsgameweb] Starting Vite dev server on http://localhost:3000 ^(BelowNormal^)...
call npm run dev
endlocal
