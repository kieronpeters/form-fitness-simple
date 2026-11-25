param(
    [switch]$SkipWebBuild,
    [switch]$Install,
    [string]$Serial = ""
)

$ErrorActionPreference = "Stop"
$androidDir = $PSScriptRoot
$repoRoot = Split-Path $androidDir -Parent
$sdk = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { "$env:LOCALAPPDATA\Android\Sdk" }

$buildTools = Get-ChildItem (Join-Path $sdk "build-tools") -Directory |
    Sort-Object { [version]$_.Name } -Descending |
    Select-Object -First 1
$platform = Get-ChildItem (Join-Path $sdk "platforms") -Directory |
    Sort-Object { [int]($_.Name -replace '^android-', '') } -Descending |
    Select-Object -First 1

if (-not $buildTools -or -not $platform) {
    throw "Android build-tools or platform not found under $sdk"
}

$androidJar = Join-Path $platform.FullName "android.jar"
$aapt2 = Join-Path $buildTools.FullName "aapt2.exe"
$zipalign = Join-Path $buildTools.FullName "zipalign.exe"
$d8 = Join-Path $buildTools.FullName "d8.bat"
$apksigner = Join-Path $buildTools.FullName "apksigner.bat"
$jar = (Get-Command jar -ErrorAction Stop).Source

$buildDir = Join-Path $androidDir "build"
$assetsDir = Join-Path $androidDir "assets\www"
$classesDir = Join-Path $buildDir "classes"
$dexDir = Join-Path $buildDir "dex"
$resourcesZip = Join-Path $buildDir "resources.zip"
$unsignedApk = Join-Path $buildDir "app-unsigned.apk"
$alignedApk = Join-Path $buildDir "app-aligned.apk"
$finalApk = Join-Path $buildDir "form-fitness.apk"
$keystore = Join-Path $androidDir "form-fitness-debug.keystore"

if (-not $SkipWebBuild) {
    Push-Location $repoRoot
    try {
        npm run build
        if ($LASTEXITCODE -ne 0) { throw "Web build failed" }
    } finally {
        Pop-Location
    }
}

$distDir = Join-Path $repoRoot "dist"
if (-not (Test-Path (Join-Path $distDir "index.html"))) {
    throw "dist/index.html not found. Run the web build first."
}

if (Test-Path $buildDir) { Remove-Item $buildDir -Recurse -Force }
if (Test-Path $assetsDir) { Remove-Item $assetsDir -Recurse -Force }
New-Item -ItemType Directory -Force -Path $buildDir, $classesDir, $dexDir, $assetsDir | Out-Null
Copy-Item (Join-Path $distDir "*") $assetsDir -Recurse -Force

& $aapt2 compile --dir (Join-Path $androidDir "res") -o $resourcesZip
if ($LASTEXITCODE -ne 0) { throw "aapt2 compile failed" }

& $aapt2 link -o $unsignedApk -I $androidJar `
    --manifest (Join-Path $androidDir "AndroidManifest.xml") `
    --min-sdk-version 26 --target-sdk-version 34 `
    --version-code 1 --version-name "1.1.0" `
    $resourcesZip
if ($LASTEXITCODE -ne 0) { throw "aapt2 link failed" }

$javaFiles = Get-ChildItem (Join-Path $androidDir "src") -Recurse -Filter *.java | ForEach-Object FullName
& javac -source 8 -target 8 -Xlint:-options -bootclasspath $androidJar -d $classesDir $javaFiles
if ($LASTEXITCODE -ne 0) { throw "javac failed" }

$classFiles = Get-ChildItem $classesDir -Recurse -Filter *.class | ForEach-Object FullName
& $d8 --lib $androidJar --min-api 26 --output $dexDir $classFiles
if ($LASTEXITCODE -ne 0) { throw "d8 failed" }

Push-Location $dexDir
try {
    & $jar uf $unsignedApk classes.dex
    if ($LASTEXITCODE -ne 0) { throw "jar update failed" }
} finally {
    Pop-Location
}

# aapt2 on Windows can store asset paths with backslashes, which AssetManager
# cannot open. Add the bundled site explicitly with ZIP-standard forward slashes.
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$assetRoot = Join-Path $androidDir "assets"
$zip = [System.IO.Compression.ZipFile]::Open($unsignedApk, [System.IO.Compression.ZipArchiveMode]::Update)
try {
    foreach ($file in Get-ChildItem $assetRoot -Recurse -File) {
        $relative = $file.FullName.Substring($assetRoot.Length + 1).Replace('\', '/')
        $entryName = "assets/$relative"
        $existing = $zip.GetEntry($entryName)
        if ($existing) { $existing.Delete() }
        $entry = $zip.CreateEntry($entryName, [System.IO.Compression.CompressionLevel]::Optimal)
        $entryStream = $entry.Open()
        $fileStream = [System.IO.File]::OpenRead($file.FullName)
        try {
            $fileStream.CopyTo($entryStream)
        } finally {
            $fileStream.Dispose()
            $entryStream.Dispose()
        }
    }
} finally {
    $zip.Dispose()
}

& $zipalign -f 4 $unsignedApk $alignedApk
if ($LASTEXITCODE -ne 0) { throw "zipalign failed" }

if (-not (Test-Path $keystore)) {
    & keytool -genkeypair -v -keystore $keystore -storepass android -keypass android `
        -alias androiddebugkey -keyalg RSA -keysize 2048 -validity 10000 `
        -dname "CN=Android Debug,O=Android,C=US"
    if ($LASTEXITCODE -ne 0) { throw "keytool failed" }
}

& $apksigner sign --ks $keystore --ks-pass pass:android --key-pass pass:android --out $finalApk $alignedApk
if ($LASTEXITCODE -ne 0) { throw "apksigner sign failed" }

& $apksigner verify --verbose $finalApk
if ($LASTEXITCODE -ne 0) { throw "apksigner verify failed" }

Write-Host ""
Write-Host "APK: $finalApk"
Get-Item $finalApk | Select-Object FullName, Length

if ($Install) {
    $deviceLine = (adb devices) | Where-Object { $_ -match "\sdevice$" } | Select-Object -First 1
    if (-not $deviceLine) { throw "No ADB device is connected." }
    if (-not $Serial) {
        $Serial = ($deviceLine -split "\s+")[0]
    }
    Write-Host "Installing on $Serial..."
    adb -s $Serial install -r $finalApk
    if ($LASTEXITCODE -ne 0) { throw "adb install failed" }
    adb -s $Serial shell am force-stop com.kieronpeters.form
    adb -s $Serial shell am start -n com.kieronpeters.form/.MainActivity
    Write-Host "Launched com.kieronpeters.form/.MainActivity"
}
