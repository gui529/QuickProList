# Sync production UNSUBSCRIBE_SECRET / CRON_SECRET into secrets/campaign-automation-paste.env
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

# Remove stale pulls that set CRON_SECRET="" and override vercel env run
@('.env.campaign-automation', '.env.campaign-send.local') | ForEach-Object {
  $p = Join-Path $root $_
  if (Test-Path $p) { Remove-Item $p -Force }
}

Write-Host 'Pulling decrypted Production env from Vercel (home-help)...'
npx vercel env run -e production -- npx tsx scripts/write-campaign-automation-paste.ts
if ($LASTEXITCODE -ne 0) {
  Write-Host 'vercel env run failed — if secrets were just set, wait 1 min and retry, or run scripts/setup-campaign-automation-secrets.ps1'
  exit $LASTEXITCODE
}

Write-Host 'Paste secrets/campaign-automation-paste.env into Cursor Automation → Environment.'
