# Push live Stripe keys from secrets/stripe-vercel-production.txt to Vercel Production.

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$envFile = Join-Path $root 'secrets/stripe-vercel-production.txt'

if (-not (Test-Path $envFile)) {
  Write-Error 'Missing secrets/stripe-vercel-production.txt'
}

$vars = @{}
Get-Content $envFile | ForEach-Object {
  $line = $_.Trim()
  if (-not $line -or $line.StartsWith('#')) { return }
  $i = $line.IndexOf('=')
  if ($i -lt 1) { return }
  $k = $line.Substring(0, $i).Trim()
  $v = $line.Substring($i + 1).Trim()
  if ($v.StartsWith('"') -and $v.EndsWith('"')) { $v = $v.Substring(1, $v.Length - 2) }
  $vars[$k] = $v
}

foreach ($key in @('STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET')) {
  if (-not $vars[$key]) { Write-Error "Missing $key" }
  if ($vars[$key] -match 'PASTE_') { Write-Error "Replace placeholder for $key" }
  if ($key -eq 'STRIPE_SECRET_KEY' -and $vars[$key] -notmatch '^sk_live_') {
    Write-Error "$key must start with sk_live_"
  }
  if ($key -eq 'STRIPE_WEBHOOK_SECRET' -and $vars[$key] -notlike 'whsec_*') {
    Write-Error "$key must start with whsec_"
  }
}

Set-Location $root
foreach ($key in @('STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET')) {
  Write-Host "Setting $key on Vercel Production..."
  $vars[$key] | vercel env add $key production --force 2>&1 | Out-Host
}

Write-Host 'Vercel Production env updated.'
