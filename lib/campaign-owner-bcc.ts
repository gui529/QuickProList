/** Hidden copy on every campaign-manager / marketing outreach send (Resend BCC). */
export function getCampaignOwnerBccEmail(): string {
  const fromEnv =
    process.env.CAMPAIGN_BCC_EMAIL?.trim() || process.env.CAMPAIGN_OWNER_EMAIL?.trim()
  if (fromEnv) return fromEnv
  return 'gui529@hotmail.com'
}
