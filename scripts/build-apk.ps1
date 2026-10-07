<#
Builds the Android test APK (ARM64) pointing at a deployed backend.
  .\scripts\build-apk.ps1 -ApiUrl https://antojosgo.vercel.app
  .\scripts\build-apk.ps1 -ApiUrl http://192.168.1.19:3000 -AllowHttp   # LAN test against the dev PC
Optional: GOOGLE_MAPS_ANDROID_KEY (env var or mobile/.env.local) enables maps (see mobile/app.config.js).
Signing: the project's own key, read from ~/.gradle/gradle.properties (see mobile/plugins/with-release-signing.js).
Output: mobile/android/app/build/outputs/apk/release/app-release.apk
#>
param([Parameter(Mandatory)][string]$ApiUrl, [switch]$AllowHttp)
# No global 'Stop': in PowerShell 5.1 any stderr line from npx/gradle (even a warning) would abort. Exit codes are checked instead.
if (-not $AllowHttp -and $ApiUrl -notmatch '^https://') { throw 'Use an https:// URL, or -AllowHttp for a LAN test build.' }
# Refuse to build without the project's signing key: an APK signed with another key cannot update the installed app.
$props = "$env:USERPROFILE\.gradle\gradle.properties"
if (-not ((Test-Path $props) -and (Select-String -Path $props -Pattern '^ANTOJOSGO_RELEASE_STORE_FILE=' -Quiet))) {
  throw "Falta la clave de firma (ANTOJOSGO_RELEASE_* en $props). Restaura la copia de seguridad antes de compilar."
}
# Fail fast: the backend must answer like AntojosGo before we spend minutes compiling.
try { $probe = Invoke-WebRequest -UseBasicParsing -TimeoutSec 60 -ErrorAction Stop "$($ApiUrl.TrimEnd('/'))/api/v1/catalog/search?limit=1" }
catch { throw "Backend did not answer at $ApiUrl : $($_.Exception.Message)" }

$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:NINJA_PATH = "$env:LOCALAPPDATA\Programs\ninja-1.12.1\ninja.exe"
$env:EXPO_PUBLIC_API_URL = $ApiUrl.TrimEnd('/')
$env:ALLOW_HTTP_API = if ($AllowHttp) { '1' } else { '' }
$env:NODE_ENV = 'production'

Push-Location "$PSScriptRoot\..\mobile"
try {
  npx expo prebuild --platform android --no-install
  if ($LASTEXITCODE) { throw 'prebuild failed' }
  Set-Location android
  .\gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a --console=plain
  if ($LASTEXITCODE) { throw 'gradle build failed' }
  $apk = 'app\build\outputs\apk\release\app-release.apk'
  if (-not (Test-Path $apk)) { throw 'No se generó app-release.apk firmado (¿clave de firma inválida?).' }
  # Never hand out an APK signed with React Native's public debug key.
  $signer = Get-ChildItem "$env:ANDROID_HOME\build-tools\*\apksigner.bat" | Sort-Object FullName | Select-Object -Last 1
  $certs = & $signer.FullName verify --print-certs $apk 2>&1 | Out-String
  if ($LASTEXITCODE) { throw "La firma del APK no es válida: $certs" }
  if ($certs -match '5e8f16062ea3cd2c4a0d547876baa6f38cabf625') { throw 'El APK quedó firmado con la clave pública de depuración; no lo repartas.' }
  $certs -split "`n" | Select-String 'SHA-1 digest'
  Get-Item $apk | Select-Object FullName, Length, LastWriteTime
} finally { Pop-Location }
