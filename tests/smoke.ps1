# Toggle Docs smoke test (v3.0)
# Starts tests/server.js, runs the app in headless Chrome over http://localhost,
# asserts zero JS console errors and that the dashboard rendered.
$ErrorActionPreference = 'Stop'

$chrome = @(
  'C:\Program Files\Google\Chrome\Application\chrome.exe',
  'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe',
  'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $chrome) { Write-Error 'No Chrome/Edge found. Install Chrome or Edge to run the smoke test.' }

# Start the static server (ES modules require http://, not file://)
$env:PORT = '8765'
$serverScript = '"' + (Join-Path $PSScriptRoot 'server.js') + '"'
$server = Start-Process -FilePath 'node' -ArgumentList $serverScript `
  -PassThru -WindowStyle Hidden

# Wait until the server actually answers (max 10s)
$url = 'http://localhost:8765/index.html'
$ready = $false
for ($i = 0; $i -lt 20; $i++) {
  Start-Sleep -Milliseconds 500
  if ($server.HasExited) { break }
  try {
    $probe = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2
    if ($probe.StatusCode -eq 200) { $ready = $true; break }
  } catch {}
}
if (-not $ready) { Write-Error "Dev server did not become ready (exited: $($server.HasExited))." }

try {
  $args_ = '--headless=new --disable-gpu --user-data-dir="' + $env:TEMP +
    '\td-smoke-profile" --no-first-run --enable-logging=stderr --v=0 ' +
    '--virtual-time-budget=8000 --dump-dom "' + $url + '"'

  $outFile = Join-Path $env:TEMP 'td-smoke-dom.html'
  $errFile = Join-Path $env:TEMP 'td-smoke-err.txt'

  $p = Start-Process -FilePath $chrome -ArgumentList $args_ `
    -RedirectStandardOutput $outFile -RedirectStandardError $errFile `
    -Wait -PassThru -NoNewWindow

  $dom = [IO.File]::ReadAllText($outFile)
  $errText = [IO.File]::ReadAllText($errFile)

  $consoleErrors = ($errText -split "`n") |
    Where-Object { $_ -match 'INFO:CONSOLE' -and $_ -notmatch 'DEPRECATED_ENDPOINT' }

$rendered = $dom -match 'dash-doc-card' -and $dom -match 'id="btn-theme"'

Write-Host '--- Smoke test results ---'
if ($consoleErrors) {
  Write-Host 'Console errors:' -ForegroundColor Red
  $consoleErrors | ForEach-Object { Write-Host $_.Line }
} else {
  Write-Host 'Console errors: none' -ForegroundColor Green
}
Write-Host ("Dashboard rendered: " + $(if ($rendered) { 'yes' } else { 'NO' }) )

if (-not $consoleErrors -and $rendered) {
  Write-Host 'SMOKE TEST PASSED' -ForegroundColor Green
  exit 0
} else {
  Write-Host 'SMOKE TEST FAILED' -ForegroundColor Red
  exit 1
}
} finally {
  if ($server -and -not $server.HasExited) { Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue }
}
