# Pick up tomorrow — QuickProList

**Reminder:** You asked to resume this list on **Thursday, Oct 8, 2026**. Start here before new work.

---

## P0 — Email deliverability (why campaigns hit junk)

From the marketing-agent pass (Resend + `lib/email.ts`). Goal: inbox placement, not just “delivered.”

- [x] **Resend domains** — `contact.quickprolist.com` is **verified** (inbound receiving disabled in Resend). Apex `quickprolist.com` still **not_started**.
- [x] **DNS (contact)** — Inbound MX removed via Resend (receiving disabled).
- [ ] **DNS (apex)** — Publish Resend records at registrar — see `docs/email-deliverability.md`.
- [ ] **From address (Vercel prod)** — `RESEND_FROM_EMAIL=jeremy@quickprolist.com` and `CAMPAIGN_SENDER_NAME=Jeremy` on Production (and Preview/Dev if you send tests from there).
- [x] **Subject + body (code)** — Plain subjects, softer template, shorter default campaign text on `dev`.
- [ ] **Send tests** — Outlook (Hotmail) first, then mail-tester if needed, after prod env + DNS.

---

## P1 — Product / admin (recent dev work)

- [ ] **Smoke-test dev admin** — Pinned Pros **More** menu (fix is on `dev`, commit `cc847b8`). Dev: https://home-help-git-dev-gui-costas-projects.vercel.app/admin
- [ ] **Merge `dev` → `main` when ready** — e.g. production legal pages + brand (`b01b995` and later). `main` is usually one commit behind `dev`, not a large drift.
- [ ] **Dev DB cleanup** — Remove orphan **QA Stripe Check** invitation rows if any remain; cancel stray Stripe **test** subscriptions if still open.

---

## P1 — Payments (production)

See also `docs/payments-plan.md` (untracked).

- [x] Live Stripe keys + webhook on **production** `SITE_URL` = https://www.quickprolist.com (smoke test + cancel done)
- [ ] Enable Stripe **Customer Portal** for billing management (required for self-serve cancel/update card)
- [x] One live payment smoke test on production
- [ ] **Vercel Production:** `CRON_SECRET`, `UNSUBSCRIBE_SECRET` (and optional `PRO_DASHBOARD_ENABLED`, `RESEND_WEBHOOK_SECRET`) — see `docs/stripe-production-setup.md`

---

## P2 — Legal pages

- [x] **Privacy & Terms** — production copy on `dev` (`lib/legal-site.ts`, `app/privacy/page.tsx`, `app/terms/page.tsx`). Public contact: `contact@quickprolist.com` only (no personal name/address on site). CAN-SPAM may still require a postal line in campaign email footers — see `lib/email.ts` / marketing templates.

---

## P2 — Housekeeping

- [ ] **Local `.env.local`** — Ensure `AUTH_SECRET` is set if you QA login locally (was missing at one point).
- [ ] **Data** — Fix bad stored review URL for Elma’s Cleaning (points at wrong site) if still wrong in DB.
- [ ] **Untracked docs** — `docs/dev-database-plan.md`, `docs/payments-plan.md` — commit or delete when you are ready.

---

## Agents to invoke

| Task | Agent |
|------|--------|
| Email junk / campaigns / copy / persuasion | `marketing-agent` (`.claude/agents/marketing-agent.md`, `docs/sales-persuasion-playbook.md`) |
| CAN-SPAM / cold outreach wording | `legal-agent` |
| Full dev regression (incl. admin 7b, Stripe checkout) | `qa-validator` |
| What to build next | `product-owner` |
