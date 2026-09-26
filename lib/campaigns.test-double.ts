// Test-only in-memory double for lib/campaigns.ts.
//
// Mirrors the exported function signatures of lib/campaigns.ts, backed by a
// plain in-memory array instead of Supabase.
//
// IMPORTANT: this is a test double only. Never import it from `app/` or
// from non-test files under `lib/` — see BACKLOG.md QPL-001.
import type { CampaignContact, RecordContactInput } from './campaigns'

let contacts: CampaignContact[] = []
let idCounter = 0

/** Test-only helper: clear all in-memory state between tests. */
export function __reset(): void {
  contacts = []
  idCounter = 0
}

/** Test-only helper: inspect all contacts currently in the store. */
export function __all(): CampaignContact[] {
  return [...contacts]
}

export async function recordContact(input: RecordContactInput): Promise<CampaignContact> {
  const contact: CampaignContact = {
    id: `contact-${++idCounter}`,
    yelp_id: input.yelpId ?? null,
    business_name: input.businessName,
    phone: input.phone ?? '',
    email: input.email ?? null,
    channel: input.channel,
    category: input.category ?? null,
    city: input.city ?? null,
    message_body: input.messageBody,
    message_sid: input.messageSid ?? null,
    status: input.status,
    error_message: input.errorMessage ?? null,
    invitation_token: input.invitationToken ?? null,
    sent_at: new Date().toISOString(),
  }
  contacts.push(contact)
  return contact
}

export async function listCampaignContacts(): Promise<CampaignContact[]> {
  return [...contacts].sort(
    (a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()
  )
}
