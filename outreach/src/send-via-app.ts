import { apiBaseUrl, outreachSecret } from './env.ts'

export async function sendCampaignEmailViaApp(input: {
  businessName: string
  email: string
  category: string
  city: string
}) {
  const res = await fetch(`${apiBaseUrl()}/api/campaigns/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${outreachSecret()}`,
    },
    body: JSON.stringify({
      channel: 'email',
      businessName: input.businessName,
      email: input.email,
      category: input.category,
      city: input.city,
    }),
  })
  const data = (await res.json()) as { error?: string; contact?: unknown }
  if (!res.ok) throw new Error(data.error ?? `Send failed (${res.status})`)
  return data
}
