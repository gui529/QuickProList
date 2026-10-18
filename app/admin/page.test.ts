import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const source = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'page.tsx'), 'utf8')

describe('admin page', () => {
  it('stays dynamic when the build has no auth env', () => {
    expect(source).toMatch(/export const dynamic = 'force-dynamic'/)
  })
})
