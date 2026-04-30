$ErrorActionPreference = 'Stop'

$UserName = if ($env:DEPLOY_USER) { $env:DEPLOY_USER } else { 'robertpelloni' }
$HostName = if ($env:DEPLOY_HOST) { $env:DEPLOY_HOST } else { 'pdx1-shared-a1-33.dreamhost.com' }
$RemotePath = if ($env:DEPLOY_REMOTE_PATH) { $env:DEPLOY_REMOTE_PATH } else { '~/bobsgame.com' }
$Password = $env:DEPLOY_PASSWORD
$SshOpts = @('-o', 'StrictHostKeyChecking=no', '-o', 'UserKnownHostsFile=/dev/null')

function Invoke-SshCommand([string]$Command) {
    if ($Password -and (Get-Command sshpass -ErrorAction SilentlyContinue)) {
        & sshpass -p $Password ssh @SshOpts "$UserName@$HostName" $Command
    } else {
        & ssh @SshOpts "$UserName@$HostName" $Command
    }
}

function Copy-Directory([string]$Source, [string]$Destination) {
    if ($Password -and (Get-Command sshpass -ErrorAction SilentlyContinue)) {
        & sshpass -p $Password scp @SshOpts -r $Source "$UserName@$HostName`:$Destination"
    } else {
        & scp @SshOpts -r $Source "$UserName@$HostName`:$Destination"
    }
}

Write-Host '=== Starting Deployment to bobsgame.com ==='
Write-Host "Target: $UserName@$HostName`:$RemotePath"

if ($env:DEPLOY_SKIP_BUILD -eq '1') {
    Write-Host '[1/5] Skipping build (DEPLOY_SKIP_BUILD=1)...'
} else {
    Write-Host '[1/5] Building production assets...'
    npm run build
}

Write-Host '[2/5] Ensuring remote directories exist...'
Invoke-SshCommand "mkdir -p $RemotePath $RemotePath/server"

Write-Host '[3/5] Uploading static files...'
Copy-Directory 'dist/renderer/*' "$RemotePath/"

Write-Host '[4/5] Uploading multiplayer server files...'
Copy-Directory 'server/*' "$RemotePath/server/"

Write-Host '[5/5] Remote post-deploy actions...'
if ($env:DEPLOY_INSTALL_SERVER -eq '1') {
    Invoke-SshCommand "cd $RemotePath/server && npm install"
}
if ($env:DEPLOY_RESTART_SERVER -eq '1') {
    Invoke-SshCommand "cd $RemotePath/server && (pm2 restart index.js || pm2 start index.js)"
}

Write-Host '=== Deployment Complete ==='
Write-Host 'Tip: set DEPLOY_PASSWORD, DEPLOY_INSTALL_SERVER=1, and DEPLOY_RESTART_SERVER=1 if needed.'
