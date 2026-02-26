#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Generate a self-signed code signing certificate for WSL Nexus development builds.
.DESCRIPTION
    Creates a code signing certificate in the current user's certificate store,
    adds it to the Trusted Root store (suppresses "unknown publisher" for the current machine),
    and exports the thumbprint for use with Tauri's signing configuration.

    Run this script ONCE on each dev machine. The certificate is valid for 3 years.
.EXAMPLE
    powershell -ExecutionPolicy Bypass -File scripts\generate-dev-cert.ps1
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$SubjectName = "CN=WSL Nexus Dev, O=muchini"
$CertStorePath = "Cert:\CurrentUser\My"

# Check if a certificate with this subject already exists
$existing = Get-ChildItem $CertStorePath -CodeSigningCert |
    Where-Object { $_.Subject -eq $SubjectName -and $_.NotAfter -gt (Get-Date) }

if ($existing) {
    Write-Host "A valid certificate already exists:" -ForegroundColor Yellow
    Write-Host "  Subject:     $($existing.Subject)"
    Write-Host "  Thumbprint:  $($existing.Thumbprint)"
    Write-Host "  Expires:     $($existing.NotAfter)"
    Write-Host ""
    Write-Host "To regenerate, first delete it from certmgr.msc (Personal > Certificates)."
    exit 0
}

# Generate the self-signed code signing certificate
Write-Host "Generating self-signed code signing certificate..." -ForegroundColor Cyan

$cert = New-SelfSignedCertificate `
    -Type CodeSigningCert `
    -Subject $SubjectName `
    -CertStoreLocation $CertStorePath `
    -NotAfter (Get-Date).AddYears(3) `
    -KeyAlgorithm RSA `
    -KeyLength 2048 `
    -HashAlgorithm SHA256 `
    -KeyUsage DigitalSignature `
    -FriendlyName "WSL Nexus Dev Signing"

# Trust the certificate on this machine (suppresses "unknown publisher" warning)
Write-Host "Adding certificate to Trusted Root store..." -ForegroundColor Cyan

$rootStore = [System.Security.Cryptography.X509Certificates.X509Store]::new(
    [System.Security.Cryptography.X509Certificates.StoreName]::Root,
    [System.Security.Cryptography.X509Certificates.StoreLocation]::CurrentUser
)
$rootStore.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadWrite)
$rootStore.Add($cert)
$rootStore.Close()

# Done
Write-Host ""
Write-Host "Certificate created successfully!" -ForegroundColor Green
Write-Host "  Subject:     $($cert.Subject)"
Write-Host "  Thumbprint:  $($cert.Thumbprint)"
Write-Host "  Expires:     $($cert.NotAfter)"
Write-Host "  Store:       $CertStorePath"
Write-Host ""
Write-Host "The certificate is trusted on this machine." -ForegroundColor Green
Write-Host "You can now build with: cargo tauri build" -ForegroundColor Green
