<#
Builds the Android test APK (ARM64) pointing at a deployed backend.
  .\scripts\build-apk.ps1 -ApiUrl https://antojosgo.vercel.app
  .\scripts\build-apk.ps1 -ApiUrl http://192.168.1.19:3000 -AllowHttp   # LAN test against the dev PC
Optional: $env:GOOGLE_MAPS_ANDROID_KEY enables maps (see mobile/app.config.js).
Output: mobile/android/app/build/outputs/apk/release/app-release.apk
#>
param([Parameter(Mandatory)][string]$ApiUrl, [switch]$AllowHttp)
# No global 'Stop': in PowerShell 5.1 any stderr line from npx/gradle (even a warning) would abort. Exit codes are checked instead.
if (-not $AllowHttp -and $ApiUrl -notmatch '^https://') { throw 'Use an https:// URL, or -AllowHttp for a LAN test build.' }
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
  Get-Item app\build\outputs\apk\release\app-release.apk | Select-Object FullName, Length, LastWriteTime
} finally { Pop-Location }
