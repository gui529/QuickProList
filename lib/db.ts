import { neon } from '@neondatabase/serverless'

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL)
}

export async function query<T>(text: string, params: unknown[] = []): Promise<T[]> {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('Database not configured')
  const sql = neon(url)
  return (await sql.query(text, params)) as T[]
}
