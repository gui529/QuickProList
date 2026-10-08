# Pick up tomorrow — QuickProList

**Reminder:** You asked to resume this list on **Thursday, Oct 8, 2026**. Start here before new work.

---

## P0 — Email deliverability (why campaigns hit junk)

From the marketing-agent pass (Resend + `lib/email.ts`). Goal: inbox placement, not just “delivered.”

- [x] **Resend domains** — `contact.quickprolist.com` is **verified** (inbound receiving disabled in Resend). Apex `quickprolist.com` still **not_started**.
- [x] **DNS (contact)** — Inbound MX removed via Resend (receiving disabled).
- [ ] **DNS (apex)** — Publish Resend records at registrar — see `docs/email-deliverability.md`.
- [ ] **From address (Vercel prod)** — Set `RESEND_FROM_EMAIL` to `hello@contact.quickprolist.com` (code adds `QuickProList` display name).
- [x] **Subject + body (code)** — Plain subjects, softer template, shorter default campaign text on `dev`.
- [ ] **Send tests** — Outlook (Hotmail) first, then mail-tester if needed, after prod env + DNS.

---

## P1 — Product / admin (recent dev work)

- [ ] **Smoke-test dev admin** — Pinned Pros **More** menu (fix is on `dev`, commit `cc847b8`). Dev: https://home-help-git-dev-gui-costas-projects.vercel.app/admin
- [ ] **Merge to `main` when ready** — Admin sidebar, drafts, QA sign-in, Stripe regression docs are on `dev` only; production `main` is behind. You decide when to merge/deploy.
- [ ] **Dev DB cleanup** — Remove orphan **QA Stripe Check** invitation rows if any remain; cancel stray Stripe **test** subscriptions if still open.

---

## P1 — Payments (production)

See also `docs/payments-plan.md` (untracked).

- [ ] Live Stripe keys + webhook on **production** `SITE_URL` = https://www.quickprolist.com
- [ ] Enable Stripe **Customer Portal** for billing management
- [ ] One live payment test only when you explicitly want go-live

---

## P2 — Legal pages (blocked on you)

Privacy / Terms still need your inputs before edits:

- [ ] **Public contact email** for the site
- [ ] **Postal address** — same as `MAILING_ADDRESS` in Vercel or different?

Decisions already made: operator name “QuickProList”; no arbitration clause; Georgia law; no prorated refunds; no “Featured” label on cards; remove draft legal banner when editing; replace Supabase mentions with Neon + R2.

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
