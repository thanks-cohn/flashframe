$ErrorActionPreference = "Stop"

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Dist = Join-Path $Root "dist"
$Stage = Join-Path $Dist "flashframe-store-stage"
$ManifestPath = Join-Path $Root "manifest.json"

if (-not (Test-Path $ManifestPath)) {
    throw "manifest.json is missing"
}

$Manifest = Get-Content $ManifestPath -Raw | ConvertFrom-Json
if ($Manifest.manifest_version -ne 3) {
    throw "Chrome Web Store package must use Manifest V3"
}

$Version = [string]$Manifest.version
if ([string]::IsNullOrWhiteSpace($Version)) {
    throw "Manifest version is missing"
}

$Description = [string]$Manifest.description
if ([string]::IsNullOrWhiteSpace($Description) -or $Description.Length -gt 132) {
    throw "Manifest description must contain 1-132 characters"
}

# This isolated Chrome edition deliberately has no desktop companion and no broad
# website access. If this list changes, review the new permission before changing
# this release gate.
$AllowedPermissions = @()
$ActualPermissions = @($Manifest.permissions | ForEach-Object { [string]$_ })
$UnexpectedPermissions = @($ActualPermissions | Where-Object { $_ -notin $AllowedPermissions })
$MissingPermissions = @($AllowedPermissions | Where-Object { $_ -notin $ActualPermissions })
if ($UnexpectedPermissions.Count -or $MissingPermissions.Count) {
    throw "Permission gate failed. Expected only: $($AllowedPermissions -join ', '). Actual: $($ActualPermissions -join ', ')"
}

$AllowedHosts = @()
$ActualHosts = @($Manifest.host_permissions | ForEach-Object { [string]$_ })
$UnexpectedHosts = @($ActualHosts | Where-Object { $_ -notin $AllowedHosts })
$MissingHosts = @($AllowedHosts | Where-Object { $_ -notin $ActualHosts })
if ($UnexpectedHosts.Count -or $MissingHosts.Count) {
    throw "Host-permission gate failed. Expected no host permissions. Actual: $($ActualHosts -join ', ')"
}
if ($ActualHosts -contains "http://*/*" -or $ActualHosts -contains "https://*/*" -or $ActualHosts -contains "<all_urls>") {
    throw "Broad host access is forbidden in the isolated Chrome edition"
}

$RequiredIcons = @{
    "16" = "icons/icon16.png"
    "32" = "icons/icon32.png"
    "48" = "icons/icon48.png"
    "128" = "icons/icon128.png"
}
foreach ($Size in $RequiredIcons.Keys) {
    $Expected = $RequiredIcons[$Size]
    $Actual = [string]$Manifest.icons.$Size
    if ($Actual -ne $Expected) {
        throw "Manifest icon $Size must be $Expected; got $Actual"
    }
    if (-not (Test-Path (Join-Path $Root $Expected))) {
        throw "Missing required icon: $Expected"
    }
}

# Audit only files that can ship in the extension. Documentation is intentionally
# excluded from the Store ZIP.
$ShipRoots = @("manifest.json", "LICENSE", "src", "rules", "icons")
$TextExtensions = @(".js", ".mjs", ".html", ".css", ".json")
$ForbiddenBinaryExtensions = @(".exe", ".dll", ".msi", ".bat", ".cmd", ".ps1", ".py", ".pyc")
$ForbiddenText = @(
    @{ Name = "localhost dependency"; Pattern = '(?i)localhost' },
    @{ Name = "loopback dependency"; Pattern = '127\.0\.0\.1' },
    @{ Name = "native messaging"; Pattern = '(?i)nativeMessaging|connectNative|sendNativeMessage' },
    @{ Name = "desktop companion"; Pattern = '(?i)\bcompanion\b' },
    @{ Name = "Windows executable dependency"; Pattern = '(?i)\.exe\b' },
    @{ Name = "eval"; Pattern = '(?i)\beval\s*\(' },
    @{ Name = "Function constructor"; Pattern = '(?i)new\s+Function\s*\(' },
    @{ Name = "remote script tag"; Pattern = '(?i)<script[^>]+src\s*=\s*[''\"]https?://' },
    @{ Name = "remote JavaScript import"; Pattern = '(?i)(?:import\s*\(|from\s*)\s*[''\"]https?://' },
    @{ Name = "remote importScripts"; Pattern = '(?i)importScripts\s*\(\s*[''\"]https?://' }
)

$FilesToShip = New-Object System.Collections.Generic.List[string]
foreach ($Relative in $ShipRoots) {
    $Path = Join-Path $Root $Relative
    if (-not (Test-Path $Path)) {
        throw "Required package path is missing: $Relative"
    }
    if ((Get-Item $Path).PSIsContainer) {
        Get-ChildItem $Path -Recurse -File | ForEach-Object { $FilesToShip.Add($_.FullName) }
    } else {
        $FilesToShip.Add((Get-Item $Path).FullName)
    }
}

foreach ($File in $FilesToShip) {
    $Extension = [IO.Path]::GetExtension($File).ToLowerInvariant()
    if ($Extension -in $ForbiddenBinaryExtensions) {
        throw "Forbidden desktop/runtime file in Store package: $File"
    }
    if ($Extension -notin $TextExtensions) { continue }
    $Text = Get-Content $File -Raw
    foreach ($Rule in $ForbiddenText) {
        if ($Text -match $Rule.Pattern) {
            $TrimChars = [char[]]@([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)
            $Prefix = $Root.TrimEnd($TrimChars) + [IO.Path]::DirectorySeparatorChar
            $Relative = if ($File.StartsWith($Prefix, [StringComparison]::OrdinalIgnoreCase)) {
                $File.Substring($Prefix.Length)
            } else {
                $File
            }
            throw "Release gate failed: $($Rule.Name) found in $Relative"
        }
    }
}

if (Test-Path $Stage) { Remove-Item $Stage -Recurse -Force }
New-Item -ItemType Directory -Path $Stage -Force | Out-Null

foreach ($Relative in $ShipRoots) {
    $Source = Join-Path $Root $Relative
    $Target = Join-Path $Stage $Relative
    if ((Get-Item $Source).PSIsContainer) {
        Copy-Item $Source $Target -Recurse -Force
    } else {
        $Parent = Split-Path $Target -Parent
        New-Item -ItemType Directory -Path $Parent -Force | Out-Null
        Copy-Item $Source $Target -Force
    }
}

New-Item -ItemType Directory -Path $Dist -Force | Out-Null
$Output = Join-Path $Dist "flashframe-chrome-web-store-v$Version.zip"
if (Test-Path $Output) { Remove-Item $Output -Force }
Compress-Archive -Path (Join-Path $Stage "*") -DestinationPath $Output -CompressionLevel Optimal

$TestUnpacked = Join-Path $Dist "test-unpacked"
if (Test-Path $TestUnpacked) { Remove-Item $TestUnpacked -Recurse -Force }
Expand-Archive -Path $Output -DestinationPath $TestUnpacked -Force

$PackagedManifest = Join-Path $TestUnpacked "manifest.json"
if (-not (Test-Path $PackagedManifest)) {
    throw "Packaging error: manifest.json is not at the ZIP root"
}

Write-Host ""
Write-Host "FLASHFRAME ISOLATED CHROME RELEASE GATE: PASS"
Write-Host "Version:       $Version"
Write-Host "Store ZIP:     $Output"
Write-Host "Test unpacked: $TestUnpacked"
Write-Host "Permissions:   $($ActualPermissions -join ', ')"
Write-Host "Host access:   $($ActualHosts -join ', ')"
Write-Host "Companion:     NONE"
Write-Host "Python/EXE:    NOT REQUIRED"
