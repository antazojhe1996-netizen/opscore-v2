$ProjectName = "OPSCORE V3"
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
  "docs\source-books",
  "OKE_EXPORT"
)

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

$files = Get-ChildItem -Recurse -File |
  Where-Object {
    $file = $_
    $extension = $file.Extension.ToLower()

    $include = $IncludeExtensions -contains $extension
    $excludedExt = $ExcludeExtensions -contains $extension
    $excludedFolder = $false

    foreach ($folder in $ExcludeFolders) {
      if ($file.FullName -like "*\$folder\*") {
        $excludedFolder = $true
      }
    }

    $include -and -not $excludedExt -and -not $excludedFolder
  } |
  Sort-Object FullName

$totalFiles = $files.Count
$totalLines = 0

foreach ($file in $files) {
  try {
    $totalLines += (Get-Content -LiteralPath $file.FullName | Measure-Object -Line).Lines
  } catch {}
}

$header = @"
# $ProjectName Source Book

Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

## Summary

- Files: $totalFiles
- Lines: $totalLines

## Purpose

This file is the full source snapshot of OPSCORE V3 and OKE for audit, refactor planning, architecture review, and regression tracking.

## Rules

- No guessing.
- Audit first.
- Engine first.
- UI must not contain business logic.
- API routes must be gateways only.
- Source Book must be regenerated after major architecture changes.
- Python OKE files must be included.
- Runtime/cache/generated export folders must be excluded.
- This file is overwritten on every run.

---

## Table of Contents

"@

Set-Content -Path $LatestFile -Value $header -Encoding UTF8

foreach ($file in $files) {
  $relative = Resolve-Path -Relative $file.FullName

  if ([string]::IsNullOrWhiteSpace($relative)) {
    continue
  }

  $anchor = $relative.ToLower().Replace('\','').Replace('/','').Replace('.','').Replace(' ','-')
  Add-Content -Path $LatestFile -Value "- [$relative](#$anchor)"
}

Add-Content -Path $LatestFile -Value "`n---`n"

foreach ($file in $files) {
  $relative = Resolve-Path -Relative $file.FullName

  if ([string]::IsNullOrWhiteSpace($relative)) {
    continue
  }

  $ext = $file.Extension.TrimStart(".")
  $lineCount = 0

  try {
    $content = Get-Content -LiteralPath $file.FullName -Raw
    $lineCount = ($content -split "`n").Count
  } catch {
    $content = "[Unable to read file]"
  }

  Add-Content -Path $LatestFile -Value "`n# $relative`n"
  Add-Content -Path $LatestFile -Value "`nLines: $lineCount`n"
  Add-Content -Path $LatestFile -Value "````$ext"
  Add-Content -Path $LatestFile -Value $content
  Add-Content -Path $LatestFile -Value "````"
}

Write-Host ""
Write-Host "Source Book generated successfully." -ForegroundColor Green
Write-Host "Output: $LatestFile" -ForegroundColor Cyan
Write-Host "Files: $totalFiles"
Write-Host "Lines: $totalLines"