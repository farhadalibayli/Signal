# Run Android build with JDK 17 or 21 (avoids "Unsupported class file major version 68" on Java 24).
# Usage: .\scripts\run-android-with-jdk17.ps1

function Get-JavaVersion {
    param([string]$JavaHome)
    if (-not $JavaHome -or -not (Test-Path "$JavaHome\bin\java.exe")) { return $null }
    try {
        $out = & "$JavaHome\bin\java.exe" -version 2>&1
        if ($out -match 'version "(\d+)') { return [int]$Matches[1] }
    } catch {}
    return $null
}

# 1) If JAVA_HOME is already 17 or 21, use it
if ($env:JAVA_HOME) {
    $v = Get-JavaVersion $env:JAVA_HOME
    if ($v -in 17, 21) {
        Write-Host "Using existing JAVA_HOME (Java $v): $env:JAVA_HOME" -ForegroundColor Green
        Set-Location $PSScriptRoot\..
        npx expo run:android
        exit $LASTEXITCODE
    }
}

# 2) Search common install locations (including Android Studio JBR)
$searchPaths = @(
    "C:\Program Files\Android\Android Studio\jbr",
    "C:\Program Files\Eclipse Adoptium\jdk-17*",
    "C:\Program Files\Eclipse Adoptium\jdk-21*",
    "C:\Program Files\Java\jdk-17*",
    "C:\Program Files\Java\jdk-21*",
    "C:\Program Files\Microsoft\jdk-17*",
    "C:\Program Files\Microsoft\jdk-21*",
    "C:\Program Files\Amazon Corretto\jdk17*",
    "C:\Program Files\Amazon Corretto\jdk21*",
    "C:\Program Files\Zulu\zulu-17*",
    "C:\Program Files\Zulu\zulu-21*",
    "$env:LOCALAPPDATA\Programs\Eclipse Adoptium\jdk-17*",
    "$env:LOCALAPPDATA\Programs\Eclipse Adoptium\jdk-21*"
)

$jdk17or21 = $null
foreach ($pattern in $searchPaths) {
    $dirs = Get-Item $pattern -ErrorAction SilentlyContinue
    if (-not $dirs) { continue }
    $dirs = @($dirs)
    foreach ($d in $dirs) {
        $path = $d.FullName
        $v = Get-JavaVersion $path
        if ($v -in 17, 21) {
            $jdk17or21 = $path
            break
        }
    }
    if ($jdk17or21) { break }
}

# 3) If current java is in a "jdk-*" folder, look for jdk-17/jdk-21 siblings
if (-not $jdk17or21) {
    try {
        $javaCmd = Get-Command java -ErrorAction Stop
        $javaDir = $javaCmd.Source
        for ($i = 0; $i -lt 3; $i++) { $javaDir = Split-Path $javaDir -Parent }
        $parent = Split-Path $javaDir -Parent
        if (Test-Path $parent) {
            foreach ($name in @("jdk-17", "jdk-21")) {
                $sibling = Get-Item (Join-Path $parent $name) -ErrorAction SilentlyContinue
                if ($sibling) {
                    $v = Get-JavaVersion $sibling.FullName
                    if ($v -in 17, 21) { $jdk17or21 = $sibling.FullName; break }
                }
            }
            if (-not $jdk17or21) {
                Get-ChildItem $parent -Directory -Filter "jdk-*" -ErrorAction SilentlyContinue | ForEach-Object {
                    $v = Get-JavaVersion $_.FullName
                    if ($v -in 17, 21) { $script:jdk17or21 = $_.FullName }
                }
            }
        }
    } catch {}
}

if ($jdk17or21) {
    $env:JAVA_HOME = $jdk17or21
    Write-Host "Using JAVA_HOME=$jdk17or21" -ForegroundColor Green
    Set-Location $PSScriptRoot\..
    npx expo run:android
} else {
    Write-Host "JDK 17 or 21 not found." -ForegroundColor Yellow
    Write-Host "Install from https://adoptium.net/ (Temurin 17 LTS), then run this script again." -ForegroundColor Yellow
    Write-Host "Or set manually and run:" -ForegroundColor Yellow
    Write-Host '  $env:JAVA_HOME = "C:\Path\To\jdk-17"; npx expo run:android' -ForegroundColor Cyan
    Write-Host "See android/ANDROID_JAVA_FIX.md for details." -ForegroundColor Cyan
    exit 1
}
