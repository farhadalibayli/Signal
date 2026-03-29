# Install JDK 17 (Eclipse Temurin) and uninstall Oracle JDK 24.
# Run from frontend folder: .\scripts\install-jdk17-remove-jdk24.ps1
# Requires winget and may prompt for admin.

Write-Host "Step 1: Installing Eclipse Temurin JDK 17..." -ForegroundColor Cyan
winget install EclipseAdoptium.Temurin.17.JDK --accept-package-agreements --accept-source-agreements
if ($LASTEXITCODE -ne 0) {
    Write-Host "JDK 17 install failed or was cancelled." -ForegroundColor Red
    exit 1
}

Write-Host "`nStep 2: Uninstalling Oracle JDK 24..." -ForegroundColor Cyan
winget uninstall Oracle.JDK.24 --accept-source-agreements
if ($LASTEXITCODE -ne 0) {
    Write-Host "Uninstall failed or JDK 24 not found (that's ok)." -ForegroundColor Yellow
}

Write-Host "`nStep 3: Configuring Android build to use JDK 17..." -ForegroundColor Cyan
& (Join-Path $PSScriptRoot "setup-android-jdk.ps1")

Write-Host "`nDone. Open a new terminal and run: npx expo run:android" -ForegroundColor Green
