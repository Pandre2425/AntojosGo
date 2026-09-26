param(
    [ValidateSet('doctor', 'build', 'install')][string]$Action = 'doctor',
    [ValidateSet('emulator', 'usb')][string]$Target = 'emulator',
    [ValidatePattern('^[A-Za-z0-9_.:-]+$')][string]$Serial
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $projectRoot
$sdkRoot = $env:ANDROID_HOME
if (-not $sdkRoot) { $sdkRoot = Join-Path $env:LOCALAPPDATA 'Android/Sdk' }
$studioJdk = Join-Path $env:ProgramFiles 'Android/Android Studio/jbr'
$jdkRoot = if (Test-Path -LiteralPath (Join-Path $studioJdk 'bin/java.exe')) { $studioJdk } else { $env:JAVA_HOME }
if (-not $jdkRoot) { throw 'Instala el JDK 21 de Android Studio o configura JAVA_HOME.' }
$adbPath = Join-Path $sdkRoot 'platform-tools/adb.exe'
$javaPath = Join-Path $jdkRoot 'bin/java.exe'
if (-not (Test-Path -LiteralPath $javaPath)) { throw 'Java no encontrado. Configura JAVA_HOME con el JDK 21 de Android Studio.' }
if (-not (Test-Path -LiteralPath $adbPath)) { throw 'ADB no encontrado. Instala Android SDK Platform-Tools o configura ANDROID_HOME.' }
$env:JAVA_HOME = $jdkRoot
$env:ANDROID_HOME = $sdkRoot
& $javaPath -version
if ($LASTEXITCODE -ne 0) { throw 'No se pudo ejecutar Java.' }
Write-Output "Android SDK: $sdkRoot"
& $adbPath devices -l
if ($LASTEXITCODE -ne 0) { throw 'ADB no pudo consultar dispositivos.' }
if ($Action -eq 'doctor') { exit 0 }

try {
    $response = Invoke-WebRequest 'http://127.0.0.1:3000/welcome' -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -ne 200) { throw 'Respuesta inesperada.' }
} catch { throw 'Primero inicia la app: npm.cmd run dev -- --hostname 127.0.0.1 --port 3000' }

$previousTarget = $env:ANTOJOS_ANDROID_TARGET
try {
    $env:ANTOJOS_ANDROID_TARGET = $Target
    & node scripts/android-sync-dev.cjs
    if ($LASTEXITCODE -ne 0) { throw 'Fallo la sincronizacion Android.' }
} finally { $env:ANTOJOS_ANDROID_TARGET = $previousTarget }
& .\android\gradlew.bat -p android assembleDebug --console=plain
if ($LASTEXITCODE -ne 0) { throw 'Fallo la compilacion Android.' }
$apkPath = Join-Path $projectRoot 'android/app/build/outputs/apk/debug/app-debug.apk'
if (-not (Test-Path -LiteralPath $apkPath)) { throw 'No se genero el APK esperado.' }
Write-Output "APK de desarrollo ($Target): $apkPath"
if ($Action -eq 'build') { exit 0 }

$deviceLines = & $adbPath devices
if ($LASTEXITCODE -ne 0) { throw 'No se pudo consultar ADB.' }
$ready = @($deviceLines | Where-Object { $_ -match '^\S+\s+device$' } | ForEach-Object { ($_ -split '\s+')[0] })
if ($Serial) {
    if ($ready -notcontains $Serial) { throw 'El dispositivo elegido no esta conectado/autorizado.' }
    $selectedSerial = $Serial
} else {
    $candidates = @($ready | Where-Object { if ($Target -eq 'emulator') { $_ -like 'emulator-*' } else { $_ -notlike 'emulator-*' } })
    if ($candidates.Count -ne 1) { throw 'Conecta un unico dispositivo del tipo elegido o indica -Serial. No se ha instalado el APK.' }
    $selectedSerial = $candidates[0]
}
if ($Target -eq 'usb') {
    & $adbPath -s $selectedSerial reverse tcp:3000 tcp:3000
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo conectar el puerto local mediante USB.' }
}
& $adbPath -s $selectedSerial install -r $apkPath
if ($LASTEXITCODE -ne 0) { throw 'Fallo la instalacion. No se borraron datos ni se desinstalo la app.' }
Write-Output 'Instalado. Abre AntojosGo en Android y manten el servidor local activo. No es un APK de produccion.'
