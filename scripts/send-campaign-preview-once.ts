/**
 * @deprecated Use scripts/campaign-manager-send.ts
 * Thin wrapper for quick owner tests.
 */
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const to = process.argv[2]
const businessName = process.argv[3] ?? "Gui's Quality Plumbing"
if (!to) {
  console.error('Usage: npx tsx scripts/send-campaign-preview-once.ts <toEmail> [businessName]')
  process.exit(1)
}

const script = resolve(import.meta.dirname, 'campaign-manager-send.ts')
const r = spawnSync(
  'npx',
  [
    'tsx',
    script,
    '--to',
    to,
    '--business',
    businessName,
    '--city',
    'marietta',
    '--category',
    'plumbing',
    '--batch',
    'preview',
  ],
  { stdio: 'inherit', cwd: resolve(import.meta.dirname, '..'), shell: true }
)
process.exit(r.status ?? 1)
