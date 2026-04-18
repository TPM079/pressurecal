$ErrorActionPreference = 'Stop'

$files = @(
  'index.html',
  'public\robots.txt',
  'scripts\prerender-seo.mjs',
  'src\pages\AboutPage.tsx',
  'src\pages\FullRigCalculator.tsx',
  'src\pages\GpmLpmCalculatorPage.tsx',
  'src\pages\HomePage.tsx',
  'src\pages\HosePressureLossCalculator.tsx',
  'src\pages\NozzleCalculator.tsx',
  'src\pages\NozzleSizeChartPage.tsx',
  'src\pages\PsiBarCalculatorPage.tsx',
  'src\pages\TargetPressureNozzleCalculatorPage.tsx',
  'api\create-share-link.ts',
  'api\share-landing.ts'
)

foreach ($file in $files) {
  if (-not (Test-Path $file)) {
    Write-Warning "Skipped missing file: $file"
    continue
  }

  $content = Get-Content $file -Raw
  $updated = $content

  $updated = $updated -replace 'https://www\.pressurecal\.com', 'https://pressurecal.com'

  if ($file -in @('api\create-share-link.ts', 'api\share-landing.ts')) {
    $updated = $updated -replace 'www\.pressurecal\.com', 'pressurecal.com'
  }

  if ($updated -ne $content) {
    Set-Content $file $updated -NoNewline
    Write-Host "Updated $file"
  } else {
    Write-Host "No changes needed in $file"
  }
}

Write-Host ''
Write-Host 'Verification:'
Get-ChildItem -Recurse -File |
  Where-Object { $_.FullName -notmatch '\\dist\\' -and $_.Name -ne 'vercel.json' } |
  Select-String 'www\.pressurecal\.com'
