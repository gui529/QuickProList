# Flow: Admin — Campaign outreach

Admin sends one-off **SMS or email** to a business and views send history / open tracking.

---

## Entry

`/admin/campaigns` — `CampaignsClient` (`app/admin/campaigns/page.tsx`).

Requires admin session (same as `/admin`).

Tabs:

- **Queue** — `CampaignQueueTab` — `campaign_prospects` in Neon (approve / send)
- **Send** — `CampaignTab` — one-off manual outreach
- **Reports** — `CampaignReportsTab` (Resend engagement when configured)

**AI discovery** is a separate local worker in **`outreach/`** (not deployed). It inserts rows via `POST /api/campaigns/prospects` (bearer). See [outreach-project.md](../outreach-project.md).

---

## Discovery worker (`outreach/`)

1. `npm run find` or local dashboard **Find pros** → `POST /api/campaigns/prospects` with `CAMPAIGN_OUTREACH_SECRET`.
2. Review in **Queue** tab on production (or local dev with `DATABASE_URL`).

## Queue send

1. Approve → `POST /api/campaigns/prospects/:id/approve`
2. Send → `POST /api/campaigns/prospects/:id/send` → `lib/campaign-send.ts`, `campaign_contacts`

---

## Manual send (Send tab)

1. **Add Manually** modal.
2. Channel: SMS or Email.
3. Required: business name, message body (default `DEFAULT_MESSAGE` in `lib/campaigns.ts` — personal permission ask, site URL, 30-day add, preview link below signature).
4. Placeholders on send: `{senderIntro}`, `{businessName}`, `{city}`, `{category}`, `{areas}` (e.g. Atlanta, Marietta, Acworth, Kennesaw, and nearby towns), `{siteUrl}`, `{signature}` (`lib/campaign-message.ts`; set `CAMPAIGN_SENDER_NAME` for “I'm Jeremy with QuickProList” / sign-off).
5. Email wrapper (`lib/email.ts`): greeting `Hi,`; body paragraphs; enroll preview URL; $29.99 note; pre-launch line (“building it up right now”); unsubscribe footer.
6. **Email only:** email address, **category**, and **city** required (API 400 without them).
7. **SMS:** phone required.
8. Submit → `POST /api/campaigns/send`.

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
