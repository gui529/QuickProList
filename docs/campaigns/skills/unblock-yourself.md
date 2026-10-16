# Unblock yourself (campaign-manager)

**Default:** If something is missing, **go get it** — then continue the session.
Do **not** stop with “blocked” and wait for the owner when **STANDALONE** +
**ACTIVE**, unless the item is on the **escalate to owner** list below.

Missing data is a **task**, not a reason to end the run.

---

## Escalate to owner only

| Situation | Why |
|-----------|-----|
| Revoke **STANDALONE** or change send policy | Owner authority |
| Raise **daily cap** above board value | Owner guardrail |
| **PAUSED** / deliverability crisis needs human DNS or Resend dashboard | Risk |
| Legal/compliance uncertainty (CAN-SPAM, consent) | `legal-agent` or owner |
| Promote **`main`** / production deploy | Repo rule |
| Bounce or **“do not contact”** from a real pro | Suppression |

Everything else → **self-serve** (research, Neon read, env fix, website scrape,
spawn helper, small code fix on `dev`).

---

## Missing email (`needs_email`)

**Goal:** A public address **visible on the business’s site or listing** — never
invent or pattern-guess (`info@` + domain) unless that exact string appears in
source you fetched.

### Loop (per prospect)

1. **`websiteUrl`** from `prospects-registry.json` (or re-sync:
   `npx tsx scripts/campaign-sync-listed-prospects.ts`).
2. **WebFetch** (or browser): `/contact`, `/contact-us`, `/about`, homepage
   footer — look for `mailto:` and plain-text emails.
3. **WebSearch:** `"<business name>" <city> contact email` — only use hits that
   quote the same address on a page you can cite.
4. **Parallel:** spawn **`contact-email-finder`** helper (`generalPurpose` +
   WebSearch/WebFetch) for batches of `needs_email` rows.
5. **Optional:** local `outreach/` discovery (`docs/outreach-project.md`) for
   net-new; for Wave 1 listed pros, **website-first** is usually faster.
6. Update prospect row: `email`, `emailSource` (URL + date), `status: pending`
   → send → `sent`.
7. If **no** email after reasonable tries (contact + home + one search pass):
   `status: skip` + `skipReason` (e.g. `phone-only contact form`) — move to next
   prospect **same session**.

Then **send** if under cap — do not park the whole campaign on one hard site.

---

## Missing env / send failure

| Error | Self-fix |
|-------|----------|
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | `.env.local` or `vercel env pull` + verify non-empty |
| `UNSUBSCRIBE_SECRET` empty after pull | `.env.local` secret or `QA_ADMIN_SECRET` fallback (see lessons) |
| `already_sent` | Next prospect — dedupe working |
| `SuppressedError` | Mark prospect `skip`; check Neon suppressions |
| Resend 429 | Wait, retry once; if repeated → board **PAUSED** |

---

## Missing enroll link / invitation

1. Neon: invitation row for `curated_business_id` if `DATABASE_URL` set.
2. If none: send Wave 1 with **search URL** only (`--wave listed`); note on
   board to generate invite via admin flow later.
3. Do **not** block send on missing enroll URL for listed pros.

---

## Missing listed-pro copy / broken search URL

Fix on **`dev`** in `lib/campaigns.ts` / `lib/email.ts` if broken; use
`--dry-run` before live sends. Do not wait for owner to file a ticket.

---

## Missing prospect list

```bash
npx tsx scripts/campaign-sync-listed-prospects.ts   # needs DATABASE_URL
```

Use production branch URL when mailing pros on **www.quickprolist.com**.

---

## Session discipline

- **End state:** cap hit, no more verifiable emails today, or **PAUSED** —
  not “I stopped because email was null.”
- Log discovery attempts on the board session log (which URLs, found / skip).
- Add a **lesson** only when discovery pattern helps future **subscriber** wins
  (e.g. “franchise sites hide email — skip faster”).
