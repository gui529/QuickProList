import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CLI_JSON = {
  permissions: {
    allow: ['WebFetch(*)', 'Shell(curl:*)', 'Shell(powershell:*)'],
    deny: [] as string[],
  },
}

/** Minimal folder so headless agent does not read QuickProList / outreach source. */
export function createEphemeralAgentWorkspace(): string {
  const root = mkdtempSync(join(tmpdir(), 'qpl-outreach-agent-'))
  const cursorDir = join(root, '.cursor')
  mkdirSync(cursorDir, { recursive: true })
  writeFileSync(join(cursorDir, 'cli.json'), JSON.stringify(CLI_JSON, null, 2), 'utf8')
  return root
}
