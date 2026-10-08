# Flow: Admin — Campaign outreach

Admin sends one-off **SMS or email** to a business and views send history / open tracking.

---

## Entry

`/admin/campaigns` — `CampaignsClient` (`app/admin/campaigns/page.tsx`).

Requires admin session (same as `/admin`).

Tabs:

- **Send** — `CampaignTab` (`components/CampaignTab.tsx`)
- **Reports** — `CampaignReportsTab` (Resend engagement when configured)

---

## Manual send (Send tab)

1. **Add Manually** modal.
2. Channel: SMS or Email.
3. Required: business name, message body (default `DEFAULT_MESSAGE` from `lib/campaigns.ts` — permission-style copy, 30-day preview ask).
4. Placeholders on send: `{businessName}`, `{city}`, `{category}`, `{areas}` (opened towns phrase), `{signature}` (`lib/campaign-message.ts`, `CAMPAIGN_SENDER_NAME`).
5. **Email only:** email address, **category**, and **city** required (API 400 without them).
6. **SMS:** phone required.
7. Submit → `POST /api/campaigns/send`.

### Email path (`app/api/campaigns/send/route.ts`)

- Suppression check → 409 if opted out.
- `expandCampaignMessage` for placeholders.
- `createInvitation` when city+category → `enrollUrl` in `sendEmail`.
- Marketing mail: plain text + minimal HTML, human **From** (`formatMarketingFromAddress`), subject `Okay to add {business} to our {city} list?` (`lib/email.ts`).
- `recordContact` → `campaign_contacts` table.

### SMS path

- `sendSms` with message body (no invitation auto-create in route for SMS-only sends).

---

## Campaign history

`GET /api/campaigns` lists `campaign_contacts` (`lib/campaigns.ts`).

---

## Related user flows

- Recipient email → [enroll-paid-subscription.md](./enroll-paid-subscription.md), [email-unsubscribe.md](./email-unsubscribe.md)
- Recipient SMS → [sms-opt-out.md](./sms-opt-out.md)

---

## Key files

`app/admin/campaigns/CampaignsClient.tsx`, `components/CampaignTab.tsx`, `components/CampaignReportsTab.tsx`, `app/api/campaigns/send/route.ts`, `app/api/campaigns/route.ts`, `lib/email.ts`, `lib/sms.ts`.
