/** Owner inbox for campaign BCC and ImprovMX inbound — override via env if needed. */
export const DEFAULT_CAMPAIGN_OWNER_INBOX = 'gui.quickprolist@gmail.com'

/** Hidden copy on every campaign-manager / marketing outreach send (Resend BCC). */
export function getCampaignOwnerBccEmail(): string {
  const fromEnv =
    process.env.CAMPAIGN_BCC_EMAIL?.trim() || process.env.CAMPAIGN_OWNER_EMAIL?.trim()
  if (fromEnv) return fromEnv
  return DEFAULT_CAMPAIGN_OWNER_INBOX
}
