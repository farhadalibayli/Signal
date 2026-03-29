# One-time setup: find JDK 17 or 21 and write it to android/gradle.properties.
# After this, "npx expo run:android" will use that JDK (no need to set JAVA_HOME or run the helper script).
# Usage: .\scripts\setup-android-jdk.ps1

function Get-JavaVersion {
    param([string]$JavaHome)
    if (-not $JavaHome -or -not (Test-Path "$JavaHome\bin\java.exe")) { return $null }
    try {
        $out = & "$JavaHome\bin\java.exe" -version 2>&1
        if ($out -match 'version "(\d+)') { return [int]$Matches[1] }
    } catch {}
    return $null
}

function Find-Jdk17Or21 {
    if ($env:JAVA_HOME) {
        $v = Get-JavaVersion $env:JAVA_HOME
        if ($v -in 17, 21) { return $env:JAVA_HOME }
    }
    $searchPaths = @(
        "C:\Program Files\Android\Android Studio\jbr",
        "C:\Program Files\Eclipse Adoptium\jdk-17*", "C:\Program Files\Eclipse Adoptium\jdk-21*",
        "C:\Program Files\Java\jdk-17*", "C:\Program Files\Java\jdk-21*",
        "C:\Program Files\Microsoft\jdk-17*", "C:\Program Files\Microsoft\jdk-21*",
        "C:\Program Files\Amazon Corretto\jdk17*", "C:\Program Files\Amazon Corretto\jdk21*",
        "C:\Program Files\Zulu\zulu-17*", "C:\Program Files\Zulu\zulu-21*",
        "$env:LOCALAPPDATA\Programs\Eclipse Adoptium\jdk-17*", "$env:LOCALAPPDATA\Programs\Eclipse Adoptium\jdk-21*"
    )
    foreach ($pattern in $searchPaths) {
        $dirs = Get-Item $pattern -ErrorAction SilentlyContinue
        if (-not $dirs) { continue }
        foreach ($d in @($dirs)) {
            $v = Get-JavaVersion $d.FullName
            if ($v -in 17, 21) { return $d.FullName }
        }
    }
    try {
        $javaCmd = Get-Command java -ErrorAction Stop
        $javaDir = $javaCmd.Source
        for ($i = 0; $i -lt 3; $i++) { $javaDir = Split-Path $javaDir -Parent }
        $parent = Split-Path $javaDir -Parent
        if (Test-Path $parent) {
            Get-ChildItem $parent -Directory -Filter "jdk-*" -ErrorAction SilentlyContinue | ForEach-Object {
                $v = Get-JavaVersion $_.FullName
                if ($v -in 17, 21) { return $_.FullName }
            }
        }
    } catch {}
    return $null
}

$frontendRoot = Split-Path $PSScriptRoot -Parent
$gradleProps = Join-Path $frontendRoot "android\gradle.properties"
if (-not (Test-Path $gradleProps)) {
    Write-Host "android/gradle.properties not found. Run 'npx expo prebuild' first." -ForegroundColor Red
    exit 1
}

$jdk = Find-Jdk17Or21
if (-not $jdk) {
    Write-Host "JDK 17 or 21 not found. Install from https://adoptium.net/ (Temurin 17), then run this script again." -ForegroundColor Yellow
    Write-Host "Or set JAVA_HOME to your JDK 17/21 and run this script." -ForegroundColor Yellow
    exit 1
}

# For gradle.properties, backslashes must be escaped (each \ -> \\)
$jdkEscaped = $jdk -replace '\\', '\\\\'
$line = "org.gradle.java.home=$jdkEscaped"

$content = Get-Content $gradleProps -Raw
if ($content -match 'org\.gradle\.java\.home\s*=') {
    $content = $content -replace 'org\.gradle\.java\.home\s*=.*', $line
} else {
    $content = $content.TrimEnd() + "`n`n# Use JDK 17/21 for build (required; Java 24 not supported by Gradle 8.x)`n$line`n"
}
Set-Content $gradleProps $content -NoNewline

# Fix JAVA_HOME so Gradle/gradlew stops using the old (removed) jdk-24 path
[Environment]::SetEnvironmentVariable("JAVA_HOME", $jdk, "User")
$env:JAVA_HOME = $jdk

Write-Host "Set org.gradle.java.home and JAVA_HOME to: $jdk" -ForegroundColor Green
Write-Host "You can now run: npx expo run:android" -ForegroundColor Green
Write-Host "(Open a new terminal if another app still sees the old JAVA_HOME.)" -ForegroundColor Gray
