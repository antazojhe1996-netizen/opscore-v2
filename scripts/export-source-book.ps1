$ProjectName = "OPSCORE V3"
$DateStamp = Get-Date -Format "yyyy-MM-dd_HH-mm"
$OutputDir = "docs\source-books"
$LatestFile = Join-Path $OutputDir "OPSCORE_SOURCE_BOOK_LATEST.md"
$VersionedFile = Join-Path $OutputDir "OPSCORE_SOURCE_BOOK_$DateStamp.md"

$IncludeExtensions = @(".ts", ".tsx", ".js", ".jsx", ".css", ".json", ".sql", ".md", ".cjs", ".mjs")

$ExcludeFolders = @(
  "node_modules",
  ".next",
  ".git",
  "dist",
  "build",
  ".vercel",
  "docs\source-books"
)

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

$files = Get-ChildItem -Recurse -File |
  Where-Object {
    $file = $_
    $include = $IncludeExtensions -contains $file.Extension.ToLower()
    $excluded = $false

    foreach ($folder in $ExcludeFolders) {
      if ($file.FullName -like "*\$folder\*") {
        $excluded = $true
      }
    }

    $include -and -not $excluded
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

This file is the full source snapshot of OPSCORE V3 for audit, refactor planning, architecture review, and regression tracking.

## Rules

- No guessing.
- Audit first.
- Engine first.
- UI must not contain business logic.
- API routes must be gateways only.
- Source Book must be regenerated after major architecture changes.

---

## Table of Contents

"@

Set-Content -Path $LatestFile -Value $header -Encoding UTF8

foreach ($file in $files) {
  $relative = Resolve-Path -Relative $file.FullName
  Add-Content -Path $LatestFile -Value "- [$relative](#$($relative.ToLower().Replace('\','').Replace('/','').Replace('.','').Replace(' ','-')))"
}

Add-Content -Path $LatestFile -Value "`n---`n"

foreach ($file in $files) {
  $relative = Resolve-Path -Relative $file.FullName
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

Copy-Item $LatestFile $VersionedFile -Force

Write-Host ""
Write-Host "Source Book generated successfully." -ForegroundColor Green
Write-Host "Latest: $LatestFile" -ForegroundColor Cyan
Write-Host "Versioned: $VersionedFile" -ForegroundColor Cyan
Write-Host "Files: $totalFiles"
Write-Host "Lines: $totalLines"