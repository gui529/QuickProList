/** Hyphenated 8-4-4-4-12 hex form. Postgres `uuid` columns reject every other string. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: string): boolean {
  return typeof value === 'string' && UUID_RE.test(value)
}
