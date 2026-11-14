<#
.SYNOPSIS
    bob's game web (okgame) — Consolidated Local Operations Script (BelowNormal Priority)

.DESCRIPTION
    Manages building, starting, health-probing, log-tailing, and stopping local
    bob's game web services without ever cleaning built binaries or killing
    unrelated processes:
      - ws       : Multiplayer Socket.io / REST Server (server/index.js, port 6065)
      - ai       : Generative AI Proxy Server (server/ai_proxy.js, port 8080)
      - web      : Vite Frontend Dev Server (port 3000)
      - electron : Electron Desktop Shell + System Tray (dist/main/index.js)

    Every spawned process has its Windows scheduling priority explicitly set to
    `BelowNormal` and its PID recorded in `logs/pids.json` so `stop` only ever
    terminates exact child PIDs owned by this script.

.EXAMPLE
    .\scripts\local-ops.ps1 -Action status
    .\scripts\local-ops.ps1 -Action start -Target all
    .\scripts\local-ops.ps1 -Action logs -Target ws
    .\scripts\local-ops.ps1 -Action stop -Target all
#>
param(
    [ValidateSet('status', 'start', 'stop', 'restart', 'logs', 'build')]
    [string]$Action = 'status',

    [ValidateSet('all', 'ws', 'ai', 'web', 'electron')]
    [string]$Target = 'all'
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent $PSScriptRoot
$LogDir   = Join-Path $RepoRoot 'logs'
$PidFile  = Join-Path $LogDir 'pids.json'

if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

function Read-PidRegistry {
    if (Test-Path $PidFile) {
        try {
            $raw = Get-Content $PidFile -Raw
            if ($raw) {
                return ($raw | ConvertFrom-Json -AsHashtable)
            }
        } catch {}
    }
    return @{}
}

function Save-PidRegistry([hashtable]$Registry) {
    $Registry | ConvertTo-Json | Set-Content -Path $PidFile -Encoding UTF8
}

function Test-TcpPort([int]$Port) {
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $iar = $client.BeginConnect('127.0.0.1', $Port, $null, $null)
        $ok = $iar.AsyncWaitHandle.WaitOne(350, $false)
        if ($ok -and $client.Connected) {
            $client.Close()
            return $true
        }
        $client.Close()
    } catch {}
    return $false
}

function Start-BelowNormalService([string]$Name, [string]$FilePath, [string[]]$ArgumentList, [int]$Port = 0) {
    if ($Port -gt 0 -and (Test-TcpPort $Port)) {
        Write-Host "[local-ops] $Name already listening on 127.0.0.1:$Port — skipping spawn." -ForegroundColor Cyan
        return
    }
    $outLog = Join-Path $LogDir "local-$Name.log"
    $errLog = Join-Path $LogDir "local-$Name.err.log"

    $proc = Start-Process -FilePath $FilePath `
        -ArgumentList $ArgumentList `
        -WorkingDirectory $RepoRoot `
        -RedirectStandardOutput $outLog `
        -RedirectStandardError $errLog `
        -WindowStyle Hidden `
        -PassThru

    try {
        $proc.PriorityClass = [System.Diagnostics.ProcessPriorityClass]::BelowNormal
    } catch {}

    $reg = Read-PidRegistry
    $reg[$Name] = $proc.Id
    Save-PidRegistry $reg
    Write-Host "[local-ops] Started $Name (PID=$($proc.Id), Priority=BelowNormal) -> $outLog" -ForegroundColor Green
}

function Stop-OwnedService([string]$Name) {
    $reg = Read-PidRegistry
    if (-not $reg.ContainsKey($Name)) {
        Write-Host "[local-ops] No recorded PID for $Name." -ForegroundColor DarkGray
        return
    }
    $targetPid = [int]$reg[$Name]
    try {
        $proc = Get-Process -Id $targetPid -ErrorAction SilentlyContinue
        if ($null -ne $proc) {
            Stop-Process -Id $targetPid -Force -ErrorAction SilentlyContinue
            Write-Host "[local-ops] Stopped $Name (PID=$targetPid)." -ForegroundColor Yellow
        }
    } catch {}
    $reg.Remove($Name)
    Save-PidRegistry $reg
}

function Show-ServiceStatus {
    $reg = Read-PidRegistry
    $services = @(
        @{ Key = 'ws';       Label = 'Game WS Server'; Port = 6065; Health = 'http://127.0.0.1:6065/healthz' },
        @{ Key = 'ai';       Label = 'AI Proxy';       Port = 8080; Health = 'http://127.0.0.1:8080/healthz' },
        @{ Key = 'web';      Label = 'Vite Web';       Port = 3000; Health = 'http://127.0.0.1:3000/' },
        @{ Key = 'electron'; Label = 'Electron Tray';  Port = 0;    Health = '' }
    )

    foreach ($svc in $services) {
        $recordedPid = if ($reg.ContainsKey($svc.Key)) { $reg[$svc.Key] } else { $null }
        $pidAlive = $false
        if ($recordedPid) {
            $pidAlive = $null -ne (Get-Process -Id ([int]$recordedPid) -ErrorAction SilentlyContinue)
        }
        $portOpen = if ($svc.Port -gt 0) { Test-TcpPort $svc.Port } else { $pidAlive }
        $stateText = if ($portOpen -or $pidAlive) { 'ONLINE' } else { 'OFFLINE' }
        $color = if ($stateText -eq 'ONLINE') { 'Green' } else { 'DarkYellow' }
        $detail = ""
        if ($portOpen -and $svc.Health -and $svc.Key -in @('ws', 'ai')) {
            try {
                $resp = Invoke-RestMethod -Uri $svc.Health -TimeoutSec 2
                $detail = " v$($resp.version)"
            } catch {}
        }
        Write-Host ("  [{0,-7}] {1,-16} Port={2,-5} TrackedPID={3}{4}" -f $stateText, $svc.Label, $(if ($svc.Port -gt 0) { $svc.Port } else { 'n/a' }), $(if ($recordedPid) { $recordedPid } else { '-' }), $detail) -ForegroundColor $color
    }
}

switch ($Action) {
    'status' {
        Show-ServiceStatus
    }
    'build' {
        Write-Host "[local-ops] Running build.bat at BelowNormal priority..." -ForegroundColor Cyan
        & cmd.exe /c (Join-Path $RepoRoot 'build.bat')
    }
    'start' {
        if ($Target -in @('all', 'ws')) {
            Start-BelowNormalService -Name 'ws' -FilePath 'node' -ArgumentList @('server/index.js') -Port 6065
        }
        if ($Target -in @('all', 'ai')) {
            Start-BelowNormalService -Name 'ai' -FilePath 'node' -ArgumentList @('server/ai_proxy.js') -Port 8080
        }
        if ($Target -in @('all', 'web')) {
            Start-BelowNormalService -Name 'web' -FilePath 'node' -ArgumentList @('node_modules/vite/bin/vite.js', '--port', '3000') -Port 3000
        }
        if ($Target -eq 'electron') {
            $electronExe = Join-Path $RepoRoot 'node_modules\electron\dist\electron.exe'
            Start-BelowNormalService -Name 'electron' -FilePath $electronExe -ArgumentList @('.') -Port 0
        }
        Start-Sleep -Milliseconds 1200
        Show-ServiceStatus
    }
    'stop' {
        $targets = if ($Target -eq 'all') { @('electron', 'web', 'ai', 'ws') } else { @($Target) }
        foreach ($t in $targets) { Stop-OwnedService -Name $t }
    }
    'restart' {
        $targets = if ($Target -eq 'all') { @('ws', 'ai', 'web') } else { @($Target) }
        foreach ($t in $targets) { Stop-OwnedService -Name $t }
        Start-Sleep -Milliseconds 600
        & $PSCommandPath -Action start -Target $Target
    }
    'logs' {
        $targets = if ($Target -eq 'all') { @('ws', 'ai', 'web', 'electron') } else { @($Target) }
        foreach ($t in $targets) {
            foreach ($suffix in @('.log', '.err.log')) {
                $p = Join-Path $LogDir "local-$t$suffix"
                if (Test-Path $p) {
                    Write-Host "=== $p (last 20 lines) ===" -ForegroundColor Cyan
                    Get-Content $p -Tail 20
                }
            }
        }
    }
}
