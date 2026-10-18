import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  appendSentRecord,
  findSentByEmail,
  loadSentRegistry,
  SENT_REGISTRY_RELATIVE_PATH,
} from './campaign-sent-registry'
import { writeFileSync, mkdirSync } from 'node:fs'

describe('campaign-sent-registry', () => {
  let root: string

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'qpl-sent-'))
    mkdirSync(join(root, 'docs/campaigns'), { recursive: true })
    writeFileSync(join(root, SENT_REGISTRY_RELATIVE_PATH), '{"version":1,"sent":[]}\n')
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('records and finds by normalized email', () => {
    appendSentRecord(
      {
        email: 'Pro@Example.com',
        businessName: 'Acme',
        city: 'marietta',
        category: 'plumbing',
        batch: 'b1',
        resendId: 'r1',
        subject: 'Hi',
        sentAt: '2026-01-01T00:00:00.000Z',
      },
      root
    )
    expect(findSentByEmail('pro@example.com', root)?.businessName).toBe('Acme')
    expect(() =>
      appendSentRecord(
        {
          email: 'pro@example.com',
          businessName: 'Dup',
          city: 'x',
          category: 'y',
          batch: 'b2',
          resendId: 'r2',
          subject: 'Hi',
          sentAt: '2026-01-02T00:00:00.000Z',
        },
        root
      )
    ).toThrow(/already sent/)
    expect(loadSentRegistry(root).sent).toHaveLength(1)
  })
})
