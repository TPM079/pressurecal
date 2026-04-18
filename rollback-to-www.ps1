$files = @(
  "index.html",
  "public\robots.txt",
  "scripts\prerender-seo.mjs",
  "src\pages\AboutPage.tsx",
  "src\pages\FullRigCalculator.tsx",
  "src\pages\GpmLpmCalculatorPage.tsx",
  "src\pages\HomePage.tsx",
  "src\pages\HosePressureLossCalculator.tsx",
  "src\pages\NozzleCalculator.tsx",
  "src\pages\NozzleSizeChartPage.tsx",
  "src\pages\PsiBarCalculatorPage.tsx",
  "src\pages\TargetPressureNozzleCalculatorPage.tsx"
)

$old = "https://pressurecal.com"
$new = "https://www.pressurecal.com"

foreach ($file in $files) {
  if (Test-Path $file) {
    $content = Get-Content $file -Raw
    $updated = $content.Replace($old, $new)
    if ($updated -ne $content) {
      $updated | Set-Content $file
      Write-Host "Updated $file"
    } else {
      Write-Host "No changes needed in $file"
    }
  } else {
    Write-Host "Missing $file"
  }
}

$apiFiles = @(
  "api\create-share-link.ts",
  "api\share-landing.ts"
)

foreach ($file in $apiFiles) {
  if (Test-Path $file) {
    $content = Get-Content $file -Raw
    $updated = $content.Replace('"pressurecal.com"', '"www.pressurecal.com"')
    if ($updated -ne $content) {
      $updated | Set-Content $file
      Write-Host "Updated $file"
    } else {
      Write-Host "No changes needed in $file"
    }
  } else {
    Write-Host "Missing $file"
  }
}

Write-Host ""
Write-Host "Verification: searching for non-www references outside dist"
Get-ChildItem -Recurse -File |
  Where-Object { $_.FullName -notmatch '\\dist\\' } |
  Select-String "https://pressurecal\.com|`"pressurecal\.com`""
