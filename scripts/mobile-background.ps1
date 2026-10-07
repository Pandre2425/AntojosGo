$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$mobileRoot = Join-Path $projectRoot 'mobile'
$logRoot = Join-Path $mobileRoot '.expo'
$port = 8081
New-Item -ItemType Directory -Force -Path $logRoot | Out-Null

# PowerShell 5.1 may return Content as byte[] when the response has no text content-type.
function Get-MetroStatus {
    param([int]$TimeoutSec = 2)
    try {
        $response = Invoke-WebRequest "http://127.0.0.1:$port/status" -UseBasicParsing -TimeoutSec $TimeoutSec
    } catch { return $null }
    $body = $response.Content
    if ($body -is [byte[]]) { $body = [System.Text.Encoding]::UTF8.GetString($body) }
    return [string]$body
}

function Test-MetroRunning {
    param([int]$TimeoutSec = 2)
    $body = Get-MetroStatus -TimeoutSec $TimeoutSec
    return ($body -and $body.Contains('packager-status:running'))
}

function Set-AdbReverse {
    $adb = Get-Command adb.exe -ErrorAction SilentlyContinue
    if (-not $adb) { return }
    $devices = & $adb.Source devices | Select-String "`tdevice$"
    foreach ($device in $devices) {
        $serial = ($device.Line -split "`t")[0]
        & $adb.Source -s $serial reverse "tcp:$port" "tcp:$port" | Out-Null
        & $adb.Source -s $serial reverse 'tcp:3000' 'tcp:3000' | Out-Null
    }
}

if (Test-MetroRunning) {
    Set-AdbReverse
    Write-Host 'Metro ya esta activo. Abre AntojosGo desde Expo Go (exp://127.0.0.1:8081).'
    exit 0
}

$listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($listener) {
    $owner = Get-Process -Id $listener.OwningProcess -ErrorAction SilentlyContinue
    throw "El puerto $port esta ocupado por otro proceso ($($owner.ProcessName), PID $($listener.OwningProcess)) que no responde como Metro. Cierralo manualmente antes de reintentar."
}

$nodePath = (Get-Command node.exe).Source
# Start-Process with redirection lets node inherit this script's stdout, so callers piping
# our output never see EOF. Win32_Process.Create starts it detached without inherited handles.
$serverLog = Join-Path $logRoot 'server.log'
$errorLog = Join-Path $logRoot 'server-error.log'
$commandLine = "cmd.exe /d /c `"`"$nodePath`" --dns-result-order=ipv4first node_modules/expo/bin/cli start --android --localhost --port $port 1>`"$serverLog`" 2>`"$errorLog`"`""
$startup = New-CimInstance -ClassName Win32_ProcessStartup -ClientOnly -Property @{ ShowWindow = [uint16]0 }
$created = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = $commandLine; CurrentDirectory = $mobileRoot; ProcessStartupInformation = $startup }
if ($created.ReturnValue -ne 0) { throw "No se pudo iniciar Expo (codigo $($created.ReturnValue))." }
$processId = $created.ProcessId
for ($attempt = 0; $attempt -lt 60; $attempt++) {
    Start-Sleep -Seconds 1
    if (-not (Get-Process -Id $processId -ErrorAction SilentlyContinue)) { throw 'Expo termino antes de arrancar. Revisa mobile/.expo/server-error.log.' }
    if (Test-MetroRunning -TimeoutSec 1) {
        Set-AdbReverse
        Write-Host "Metro disponible en 127.0.0.1:$port (PID $processId). Logs en mobile/.expo/."
        exit 0
    }
}
throw 'Metro no respondio a tiempo. Revisa mobile/.expo/server.log.'
