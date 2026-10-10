/**
 * One-time setup: allow headless `agent -p` to use web search/fetch for outreach discovery.
 * Merges into ~/.cursor/cli-config.json (does not remove existing allow rules).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const path = join(homedir(), '.cursor', 'cli-config.json')
if (!existsSync(path)) {
  console.error('Missing', path, '— run: agent login')
  process.exit(1)
}

const config = JSON.parse(readFileSync(path, 'utf8'))
const allow = new Set(config.permissions?.allow ?? [])
for (const rule of ['WebFetch(*)', 'Shell(curl:*)']) allow.add(rule)
config.permissions = { ...(config.permissions ?? {}), allow: [...allow], deny: config.permissions?.deny ?? [] }
config.autoAcceptWebSearch = true

writeFileSync(path, JSON.stringify(config, null, 2) + '\n', 'utf8')
console.log('Updated', path)
console.log('autoAcceptWebSearch=true, WebFetch(*) allowed')
