$ProjectName = "OPSCORE V3 + OKE"
$OutputDir = "OKE_EXPORT"
$LatestFile = Join-Path $OutputDir "OPSCORE_SOURCE_BOOK.md"

$IncludeExtensions = @(
    ".py",
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".css",
    ".json",
    ".sql",
    ".md",
    ".cjs",
    ".mjs"
)

$ExcludeExtensions = @(
    ".pyc"
)

$ExcludeFolders = @(
    "node_modules",
    ".next",
    ".git",
    "dist",
    "build",
    ".vercel",
    "__pycache__",
    "OKE_EXPORT",
    ".turbo",
    ".vscode"
)

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

$files = Get-ChildItem -Recurse -File |
Where-Object {

    $extension = $_.Extension.ToLower()

    if ($IncludeExtensions -notcontains $extension) {
        return $false
    }

    if ($ExcludeExtensions -contains $extension) {
        return $false
    }

    foreach ($folder in $ExcludeFolders) {
        if ($_.FullName -match [regex]::Escape($folder)) {
            return $false
        }
    }

    return $true

} | Sort-Object FullName

$totalFiles = $files.Count
$totalLines = 0

foreach ($file in $files) {
    try {
        $totalLines += (Get-Content $file.FullName | Measure-Object -Line).Lines
    }
    catch {}
}

@"
# $ProjectName Source Book

Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

Files: $totalFiles
Lines: $totalLines

Purpose

This Source Book contains the complete engineering source snapshot
of OPSCORE and OKE.

Rules

- Audit before coding.
- Never assume architecture.
- UI must remain thin.
- Engine owns business logic.
- API should remain gateways.
- Regenerate after significant changes.

---
"@ | Set-Content $LatestFile -Encoding UTF8

foreach ($file in $files) {

    $relative = Resolve-Path -Relative $file.FullName

    if ([string]::IsNullOrWhiteSpace($relative)) {
        continue
    }

    $extension = $file.Extension.TrimStart(".")

    try {

        $content = Get-Content $file.FullName -Raw

    }
    catch {

        $content = "[Unable to read file]"

    }

    $lineCount = ($content -split "`n").Count

    Add-Content $LatestFile ""
    Add-Content $LatestFile "# $relative"
    Add-Content $LatestFile ""
    Add-Content $LatestFile "Lines: $lineCount"
    Add-Content $LatestFile ""

    Add-Content $LatestFile "````$extension"
    Add-Content $LatestFile $content
    Add-Content $LatestFile "````"
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "OPSCORE SOURCE BOOK GENERATED" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Output : $LatestFile"
Write-Host "Files  : $totalFiles"
Write-Host "Lines  : $totalLines"
Write-Host ""