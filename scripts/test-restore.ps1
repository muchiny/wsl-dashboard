<#
.SYNOPSIS
    Diagnostic script for WSL snapshot restore bug.
    Tests whether wsl --import correctly restores a snapshot by comparing
    behavior with and without the --version 2 flag.

.DESCRIPTION
    This script is NON-DESTRUCTIVE: it clones an existing distro into a
    temporary test distro, runs the restore cycle on the clone, and cleans up.
    Your real distros are never modified.

.PARAMETER DistroName
    Name of the source WSL distro to clone for testing.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File scripts/test-restore.ps1 -DistroName Ubuntu
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$DistroName
)

$ErrorActionPreference = 'Stop'
$TestDistro = '_nexus_restore_test'
$TempDir = Join-Path $env:TEMP "wsl-nexus-restore-test-$(Get-Random)"

function Write-Step($msg) { Write-Host ('  ==> ' + $msg) -ForegroundColor Cyan }
function Write-Ok($msg) { Write-Host ('    [OK] ' + $msg) -ForegroundColor Green }
function Write-Fail($msg) { Write-Host ('    [FAIL] ' + $msg) -ForegroundColor Red }
function Write-Info($msg) { Write-Host ('    ' + $msg) -ForegroundColor Gray }

function Cleanup {
    Write-Step 'Cleanup'
    wsl --terminate $TestDistro 2>$null
    wsl --unregister $TestDistro 2>$null
    if (Test-Path $TempDir) { Remove-Item -Recurse -Force $TempDir 2>$null }
    Write-Ok 'Cleaned up'
}

trap { Cleanup; break }

Write-Host ''
Write-Host '========================================================' -ForegroundColor Yellow
Write-Host '  WSL Nexus - Snapshot Restore Diagnostic Script' -ForegroundColor Yellow
Write-Host '========================================================' -ForegroundColor Yellow

Write-Step "Checking source distro '$DistroName' exists"
# wsl -l outputs UTF-16LE with null bytes between chars; strip them for matching
$distroListRaw = wsl -l -q 2>&1 | Out-String
$distroListClean = $distroListRaw -replace "`0", ''
if ($distroListClean -notmatch [regex]::Escape($DistroName)) {
    Write-Fail "Distro '$DistroName' not found. Available distros:"
    Write-Host $distroListClean
    exit 1
}
Write-Ok "Found '$DistroName'"

Write-Step 'System WSL default version'
$defaultVer = (Get-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Lxss' -Name DefaultVersion -ErrorAction SilentlyContinue).DefaultVersion
if ($defaultVer) {
    Write-Info "Default WSL version from registry: $defaultVer"
    if ($defaultVer -eq 1) {
        Write-Fail 'DEFAULT IS WSL 1 - this is likely the root cause!'
    }
} else {
    Write-Info 'Could not read default version from registry (probably WSL 2)'
}

# Setup
New-Item -ItemType Directory -Path $TempDir -Force | Out-Null
$sourceTar = Join-Path $TempDir 'source.tar'
$snapshotTar = Join-Path $TempDir 'snapshot.tar'
$cloneDir = Join-Path $TempDir 'clone'

Write-Step "Exporting '$DistroName' to create test clone (this may take a while...)"
wsl --terminate $DistroName 2>$null
wsl --shutdown
Start-Sleep -Seconds 2
wsl --export $DistroName $sourceTar
if (-not (Test-Path $sourceTar) -or (Get-Item $sourceTar).Length -eq 0) {
    Write-Fail 'Export failed or produced empty file'
    Cleanup
    exit 1
}
$sourceSize = [math]::Round((Get-Item $sourceTar).Length / 1MB, 1)
Write-Ok "Exported $sourceSize MB"

Write-Step "Creating test clone '$TestDistro'"
New-Item -ItemType Directory -Path $cloneDir -Force | Out-Null
wsl --import $TestDistro $cloneDir $sourceTar --version 2
Start-Sleep -Seconds 2

$verifyClone = wsl -d $TestDistro -e echo 'clone-ok' 2>&1
if ($verifyClone -notmatch 'clone-ok') {
    Write-Fail 'Clone creation failed'
    Cleanup
    exit 1
}
Write-Ok 'Clone created and bootable'

# Create snapshot of clean state
Write-Step 'Creating snapshot of clean clone state'
wsl -d $TestDistro -e sh -c "echo RESTORE-TEST-MARKER > /var/tmp/.snapshot-marker"
wsl --terminate $TestDistro 2>$null
wsl --shutdown
Start-Sleep -Seconds 3
wsl --export $TestDistro $snapshotTar
if (-not (Test-Path $snapshotTar) -or (Get-Item $snapshotTar).Length -eq 0) {
    Write-Fail 'Snapshot export failed'
    Cleanup
    exit 1
}
$snapSize = [math]::Round((Get-Item $snapshotTar).Length / 1MB, 1)
Write-Ok "Snapshot created: $snapSize MB"

# Dirty the clone
Write-Step 'Creating test folder AFTER snapshot (should disappear on restore)'
wsl -d $TestDistro -e sh -c "mkdir -p /home/THIS_SHOULD_BE_GONE && echo dirty-data > /home/THIS_SHOULD_BE_GONE/file.txt"
$dirtyCheck = wsl -d $TestDistro -e sh -c "test -d /home/THIS_SHOULD_BE_GONE && echo EXISTS || echo MISSING"
if ($dirtyCheck -match 'EXISTS') {
    Write-Ok 'Test folder created successfully'
} else {
    Write-Fail 'Could not create test folder'
    Cleanup
    exit 1
}

function Run-RestoreTest {
    param(
        [string]$TestName,
        [string[]]$ExtraImportArgs
    )

    Write-Step "TEST: $TestName"

    Write-Info 'Terminating and shutting down WSL...'
    wsl --terminate $TestDistro 2>$null
    wsl --shutdown
    Start-Sleep -Seconds 3

    Write-Info "Unregistering '$TestDistro'..."
    wsl --unregister $TestDistro 2>$null
    Start-Sleep -Seconds 1

    Write-Info 'Deleting install directory...'
    if (Test-Path $cloneDir) {
        Remove-Item -Recurse -Force $cloneDir
        if (Test-Path $cloneDir) {
            Write-Info 'First delete failed, retrying after shutdown...'
            wsl --shutdown
            Start-Sleep -Seconds 3
            Remove-Item -Recurse -Force $cloneDir
        }
    }
    New-Item -ItemType Directory -Path $cloneDir -Force | Out-Null
    Write-Info 'Install directory cleaned and recreated'

    wsl --shutdown
    Start-Sleep -Seconds 2

    $importArgs = @('--import', $TestDistro, $cloneDir, $snapshotTar) + $ExtraImportArgs
    Write-Info "Running: wsl $($importArgs -join ' ')"
    & wsl @importArgs
    Start-Sleep -Seconds 2

    wsl --shutdown
    Start-Sleep -Seconds 2

    $versionInfo = wsl -l -v 2>&1 | Out-String
    Write-Info 'Distro list after import:'
    $versionInfo -split "`n" | Where-Object { $_ -match $TestDistro } | ForEach-Object { Write-Info "  $_" }

    $folderCheck = wsl -d $TestDistro -e sh -c "test -d /home/THIS_SHOULD_BE_GONE && echo EXISTS || echo GONE" 2>&1
    $markerCheck = wsl -d $TestDistro -e sh -c "cat /var/tmp/.snapshot-marker 2>/dev/null" 2>&1
    $fsType = wsl -d $TestDistro -e sh -c "df -T / 2>/dev/null | tail -1" 2>&1

    Write-Info "Filesystem type: $fsType"
    Write-Info "Snapshot marker: $markerCheck"

    $result = @{
        TestName    = $TestName
        FolderGone  = ($folderCheck -match 'GONE')
        MarkerFound = ($markerCheck -match 'RESTORE-TEST-MARKER')
        FsType      = $fsType
        WslVersion  = if ($versionInfo -match "$TestDistro\s+\S+\s+(\d)") { $Matches[1] } else { '?' }
    }

    if ($result.FolderGone) {
        Write-Ok 'Test folder is GONE (restore worked!)'
    } else {
        Write-Fail 'Test folder STILL EXISTS (restore FAILED!)'
    }

    if ($result.MarkerFound) {
        Write-Ok 'Snapshot marker found (filesystem is from snapshot)'
    } else {
        Write-Fail 'Snapshot marker NOT found (filesystem is NOT from snapshot)'
    }

    Write-Info "Imported as WSL version: $($result.WslVersion)"

    return $result
}

# Test A: WITHOUT --version 2
$resultA = Run-RestoreTest -TestName 'Import WITHOUT --version 2' -ExtraImportArgs @()

# Re-dirty for Test B
Write-Step 'Re-creating test folder for next test'
wsl -d $TestDistro -e sh -c "mkdir -p /home/THIS_SHOULD_BE_GONE && echo dirty-data > /home/THIS_SHOULD_BE_GONE/file.txt"

# Test B: WITH --version 2
$resultB = Run-RestoreTest -TestName 'Import WITH --version 2' -ExtraImportArgs @('--version', '2')

# Summary
Write-Host ''
Write-Host '================================================================' -ForegroundColor Yellow
Write-Host '                    RESULTS SUMMARY' -ForegroundColor Yellow
Write-Host '================================================================' -ForegroundColor Yellow
Write-Host 'Test                         | Folder Gone | Marker | WSL V' -ForegroundColor Yellow
Write-Host '-----------------------------+-------------+--------+------' -ForegroundColor Yellow

$statusA = if ($resultA.FolderGone) { '   PASS    ' } else { '  *FAIL*   ' }
$markerA = if ($resultA.MarkerFound) { '  YES ' } else { '  NO  ' }
$colorA = if ($resultA.FolderGone) { 'Green' } else { 'Red' }
Write-Host ("Without --version 2          |{0}|{1}|   {2}" -f $statusA, $markerA, $resultA.WslVersion) -ForegroundColor $colorA

$statusB = if ($resultB.FolderGone) { '   PASS    ' } else { '  *FAIL*   ' }
$markerB = if ($resultB.MarkerFound) { '  YES ' } else { '  NO  ' }
$colorB = if ($resultB.FolderGone) { 'Green' } else { 'Red' }
Write-Host ("With --version 2             |{0}|{1}|   {2}" -f $statusB, $markerB, $resultB.WslVersion) -ForegroundColor $colorB

Write-Host '================================================================' -ForegroundColor Yellow

if (-not $resultA.FolderGone -and $resultB.FolderGone) {
    Write-Host 'DIAGNOSIS: The --version 2 flag fixes the issue!' -ForegroundColor Green
    Write-Host 'The app was creating WSL 1 distros on import.' -ForegroundColor Green
} elseif ($resultA.FolderGone -and $resultB.FolderGone) {
    Write-Host 'Both tests passed - issue may be in app orchestration, not WSL commands.' -ForegroundColor Yellow
} elseif (-not $resultA.FolderGone -and -not $resultB.FolderGone) {
    Write-Host 'BOTH TESTS FAILED - issue is deeper than --version 2.' -ForegroundColor Red
    Write-Host 'This points to a WSL/wslservice.exe caching bug.' -ForegroundColor Red
} else {
    Write-Host 'Unexpected result pattern - investigate manually.' -ForegroundColor Red
}

Cleanup
Write-Host 'Done.'
