<#
.SYNOPSIS
    Sign a binary with the WSL Nexus dev certificate.
.DESCRIPTION
    Called automatically by Tauri during the build process via the signCommand config.
    Looks up the "WSL Nexus Dev" code signing certificate in the current user's store
    and applies an Authenticode signature with a timestamp.
.PARAMETER FilePath
    Path to the binary to sign (passed by Tauri).
#>

param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$FilePath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$SubjectName = "CN=WSL Nexus Dev, O=muchini"
$TimestampServer = "http://timestamp.digicert.com"

# Find the certificate
$cert = Get-ChildItem Cert:\CurrentUser\My -CodeSigningCert |
    Where-Object { $_.Subject -eq $SubjectName -and $_.NotAfter -gt (Get-Date) } |
    Sort-Object NotAfter -Descending |
    Select-Object -First 1

if (-not $cert) {
    Write-Error "Code signing certificate not found. Run 'scripts\generate-dev-cert.ps1' first."
    exit 1
}

# Sign the binary
Set-AuthenticodeSignature `
    -FilePath $FilePath `
    -Certificate $cert `
    -TimestampServer $TimestampServer `
    -HashAlgorithm SHA256 |
    Out-Null

Write-Host "Signed: $FilePath"
