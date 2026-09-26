import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// Regression test for QPL-007-QA1: a fresh Supabase project bootstraps by
// running migrations/*.sql in plain alphabetical order (no migration
// framework/history table involved). That means a table's CREATE TABLE must
// always appear, in run order, before any ALTER TABLE or REFERENCES that
// touches it - otherwise a from-scratch bootstrap breaks. Numeric prefixes
// (000_, 001_, ...) encode that dependency order; this test fails loudly if
// that invariant is ever violated, whether by a bad rename or a new file
// added without a correct prefix.

const MIGRATIONS_DIR = path.join(__dirname)

function getMigrationFilesInOrder(): string[] {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort()
}

function extractStatements(sql: string): string[] {
  const withoutComments = sql.replace(/--.*$/gm, '')
  return withoutComments
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean)
}

describe('migrations/*.sql run in dependency order', () => {
  it('never ALTERs or REFERENCEs a table before its own CREATE TABLE', () => {
    const files = getMigrationFilesInOrder()
    expect(files.length).toBeGreaterThan(0)

    const createdTables = new Set<string>()

    for (const file of files) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8')

      for (const statement of extractStatements(sql)) {
        const createMatch = statement.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(\w+)/i)
        const alterMatch = statement.match(/ALTER TABLE\s+(\w+)/i)
        const referenceMatches = [...statement.matchAll(/REFERENCES\s+(\w+)/gi)]

        if (alterMatch) {
          const table = alterMatch[1]
          if (!createdTables.has(table)) {
            throw new Error(
              `${file}: "ALTER TABLE ${table}" runs before ${table}'s CREATE TABLE. ` +
                `Current alphabetical run order: ${files.join(', ')}`
            )
          }
        }

        for (const [, table] of referenceMatches) {
          // A self-reference inside the CREATE TABLE statement that
          // introduces the table is fine (the table is being created now).
          if (createMatch && createMatch[1] === table) continue
          if (!createdTables.has(table)) {
            throw new Error(
              `${file}: "REFERENCES ${table}" runs before ${table}'s CREATE TABLE. ` +
                `Current alphabetical run order: ${files.join(', ')}`
            )
          }
        }

        if (createMatch) {
          createdTables.add(createMatch[1])
        }
      }
    }
  })
})
