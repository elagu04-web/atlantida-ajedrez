param([string]$OutputDirectory = (Join-Path $PSScriptRoot 'dist'))
$ErrorActionPreference = 'Stop'
if (-not $env:JAVA_HOME -or -not (Test-Path -LiteralPath (Join-Path $env:JAVA_HOME 'bin\java.exe'))) { throw 'Configurá JAVA_HOME con un JDK 21 o superior.' }
$sdkDirectory = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { $env:ANDROID_SDK_ROOT }
if (-not $sdkDirectory -or -not (Test-Path -LiteralPath $sdkDirectory)) { throw 'Configurá ANDROID_HOME con tu Android SDK.' }
if (-not $env:ATLANTIDA_ANDROID_KEYSTORE -or -not (Test-Path -LiteralPath $env:ATLANTIDA_ANDROID_KEYSTORE)) { throw 'Configurá ATLANTIDA_ANDROID_KEYSTORE con la clave de firma privada.' }
if (-not $env:ATLANTIDA_ANDROID_KEY_PASSWORD) { throw 'Configurá ATLANTIDA_ANDROID_KEY_PASSWORD. No la escribas en archivos públicos.' }
$projectDirectory = Join-Path $PSScriptRoot 'android'
$nativeManifest = Get-Content -LiteralPath (Join-Path $projectDirectory 'twa-manifest.json') -Raw | ConvertFrom-Json
$nativeVersion = $nativeManifest.appVersionName
if ($nativeVersion -notmatch '^\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?$') { throw 'La versión Android no tiene un formato válido.' }
$outputPath = [IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Path $outputPath -Force | Out-Null
$sdkProperty = $sdkDirectory.Replace('\','/').Replace(':','\:')
[IO.File]::WriteAllText((Join-Path $projectDirectory 'local.properties'), "sdk.dir=$sdkProperty`n")
Push-Location $projectDirectory
try {
 & '.\gradlew.bat' --no-daemon --console=plain --max-workers=2 ':app:assembleRelease' ':app:lintRelease'
 if ($LASTEXITCODE -ne 0) { throw 'La compilación o el análisis de Android fallaron.' }
 $tools = Join-Path $sdkDirectory 'build-tools\36.0.0'
 $unsignedApk = Join-Path $projectDirectory 'app\build\outputs\apk\release\app-release-unsigned.apk'
 $alignedApk = Join-Path $outputPath 'atlantida-aligned.apk'
 $signedApk = Join-Path $outputPath "atlantida-$nativeVersion.apk"
 & (Join-Path $tools 'zipalign.exe') -f -p 4 $unsignedApk $alignedApk
 if ($LASTEXITCODE -ne 0) { throw 'Falló la alineación del APK.' }
 & (Join-Path $tools 'apksigner.bat') sign --ks $env:ATLANTIDA_ANDROID_KEYSTORE --ks-key-alias atlantida --ks-pass env:ATLANTIDA_ANDROID_KEY_PASSWORD --key-pass env:ATLANTIDA_ANDROID_KEY_PASSWORD --out $signedApk $alignedApk
 if ($LASTEXITCODE -ne 0) { throw 'Falló la firma del APK.' }
 $verification = & (Join-Path $tools 'apksigner.bat') verify --verbose --print-certs $signedApk
 if ($LASTEXITCODE -ne 0) { throw 'No se pudo verificar la firma.' }
 $verification | Write-Output
 $certificate = [regex]::Match(($verification -join "`n"), 'certificate SHA-256 digest:\s*([a-fA-F0-9]{64})').Groups[1].Value.ToLowerInvariant()
 $expectedCertificates = @($nativeManifest.fingerprints | ForEach-Object { $_.value.Replace(':','').ToLowerInvariant() })
 if (-not $certificate -or $certificate -notin $expectedCertificates) { throw 'El certificado del APK no coincide con Digital Asset Links. No publiques este archivo.' }
 $hash = (Get-FileHash -LiteralPath $signedApk -Algorithm SHA256).Hash.ToLowerInvariant()
 [IO.File]::WriteAllText((Join-Path $outputPath "atlantida-$nativeVersion.apk.sha256"), "$hash  atlantida-$nativeVersion.apk`n")
 Write-Output "APK firmado: $signedApk"
 Write-Output "SHA-256: $hash"
} finally { Pop-Location }
