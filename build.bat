@echo off
REM ============================================================================
REM bob's game web (okgame) — Unified Build Script (build.bat)
REM ============================================================================
REM WHAT:
REM   1. Lowers current build shell priority to BelowNormal so parallel tsc/Vite/Go
REM      compilations never starve interactive UI or host processes.
REM   2. Validates Node.js & npm availability.
REM   3. Optionally builds the BQt Go runtime submodule (submodules\bobui\build.bat)
REM      when Go is available in PATH.
REM   4. Runs full TypeScript typechecking, compiles Electron main-process files
REM      (tsconfig.main.json -> dist\main), and bundles the PixiJS/WebGPU renderer
REM      via Vite (dist\renderer).
REM
REM WHY & SIDE EFFECTS:
REM   - Never cleans or purges compiled binaries or hydrated static assets inside
REM     dist\renderer, cpp_port\build_output, or submodules\bobui\**\build_output.
REM   - Writes "success" into .build_success upon clean completion.
REM   - Pass --copy-assets to force Vite to re-copy the 2.5 GB data\ directory.
REM ============================================================================
setlocal EnableDelayedExpansion
title bob's game web — Build
cd /d "%~dp0"

REM Lower parent cmd.exe priority to BelowNormal (inherited by spawned child processes)
powershell -NoProfile -Command "$p = Get-Process -Id $PID; if ($p.Parent) { try { $p.Parent.PriorityClass = 'BelowNormal' } catch {} }" >nul 2>nul

if /I "%~1"=="--copy-assets" (
    set "VITE_COPY_PUBLIC_DIR=true"
)

echo [bobsgameweb] Verifying Node.js toolchain...
where node >nul 2>nul
if errorlevel 1 (
    echo [bobsgameweb] ERROR: node not found in PATH.
    exit /b 1
)

REM Step 1: Build BQt submodule (submodules\bobui) if Go is installed
if exist "submodules\bobui\build.bat" (
    where go >nul 2>nul
    if not errorlevel 1 (
        echo [bobsgameweb] Building submodule submodules\bobui...
        call "submodules\bobui\build.bat"
        if errorlevel 1 (
            echo [bobsgameweb] WARNING: submodules\bobui build returned non-zero status; continuing web build.
        )
    ) else (
        echo [bobsgameweb] Go toolchain not detected; skipping submodules\bobui Go build.
    )
)

REM Step 2: Run full TypeScript check + Electron main compile + Vite bundle
echo [bobsgameweb] Running npm run build...
call npm run build
if errorlevel 1 (
    echo [bobsgameweb] ERROR: Build failed with exit code %errorlevel%.
    exit /b %errorlevel%
)

echo success> .build_success
echo [bobsgameweb] Build completed successfully!
endlocal
