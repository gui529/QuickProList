import { apiBaseUrl, outreachSecret } from './env.ts'

export interface ProspectPayload {
  businessName: string
  email: string
  phone?: string
  website?: string
  category: string
  city: string
  discoveryNotes?: string
  searchQuery?: string
}

export async function pushProspectsToApp(prospects: ProspectPayload[]) {
  const res = await fetch(`${apiBaseUrl()}/api/campaigns/prospects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${outreachSecret()}`,
    },
    body: JSON.stringify({ prospects }),
  })
  const data = (await res.json()) as {
    error?: string
    added?: number
    skipped?: number
    prospects?: unknown[]
  }
  if (!res.ok) throw new Error(data.error ?? `Push failed (${res.status})`)
  return data
}
