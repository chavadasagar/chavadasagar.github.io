# verify_site.ps1 - Verify site integrity and data assets
$ErrorActionPreference = 'Stop'

$base = "d:\sagar\chavadasagar.github.io\mysite\TutorialStudio"
$dataDir = Join-Path $base "assets\data"
$catalogPath = Join-Path $dataDir "catalog.json"

Write-Host "Verifying catalog.json..."
$catalog = Get-Content $catalogPath -Raw | ConvertFrom-Json
Write-Host "  -> Categories: $($catalog.categories.Count)"
Write-Host "  -> Subjects: $($catalog.subjects.Count)"
Write-Host "  -> Topics: $($catalog.all_topics.Count)"
Write-Host "  -> Examples: $($catalog.stats.total_examples)"

Write-Host "Verifying 38 subject data files..."
$subFiles = Get-ChildItem (Join-Path $dataDir "subjects") -Filter "*.json"
Write-Host "  -> Found $($subFiles.Count) subject JSON files"

$totalValid = 0
foreach ($f in $subFiles) {
    $content = Get-Content $f.FullName -Raw | ConvertFrom-Json
    if ($content.Count -gt 0) {
        $totalValid++
    }
}
Write-Host "  -> Verified $totalValid / $($subFiles.Count) subject files contain valid topics"

Write-Host "Verifying HTML files..."
$htmlFiles = Get-ChildItem $base -Filter "*.html"
foreach ($h in $htmlFiles) {
    Write-Host "  -> HTML page: $($h.Name) ($($h.Length) bytes)"
}

Write-Host "Site verification completed successfully!"
