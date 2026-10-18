# One-shot: set Vercel prod CRON_SECRET + UNSUBSCRIBE_SECRET (same value) and write automation paste file.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

$secret = node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
if (-not $secret -or $secret.Length -lt 16) { Write-Error 'Failed to generate secret' }

Write-Host 'Setting CRON_SECRET and UNSUBSCRIBE_SECRET on Vercel Production (home-help)...'
$secret | npx vercel env add CRON_SECRET production --force --yes | Out-Host
$secret | npx vercel env add UNSUBSCRIBE_SECRET production --force --yes | Out-Host

$out = Join-Path $root 'secrets/campaign-automation-paste.env'
@(
  '# Paste entire file into Cursor Automation → Environment (.env)',
  '# Matches Vercel Production CRON_SECRET + UNSUBSCRIBE_SECRET',
  '',
  "UNSUBSCRIBE_SECRET=$secret"
) | Set-Content -Path $out -Encoding utf8

Write-Host "Wrote $out"
Write-Host 'Redeploy production (push main or Vercel redeploy) so live unsub links use the new secret.'
Write-Host 'Paste that file into Campaign Loop env, then Save + Test.'
