# Campaign board (message log)

**Owner:** QuickProList outbound to local pros → **paid subscribers** ($29.99/mo featured listings).

**Steward:** `campaign-manager` agent — read this file **first** on every run; append a log entry **last** before stopping.

**North star:** active paying subscribers (Stripe). Secondary: enroll starts, trials, replies, queue depth.

---

## Campaign state

| Field | Value |
|-------|--------|
| **Status** | `ACTIVE` |
| **Current focus** | **Continuous** — Atlanta/Marietta: finish listed Wave 1 + fill 3rd slots (Wave 2) · batch `wave-atl-2026-10` |
| **Daily email cap** | `10` pro outreach/day (owner test excluded from cap) |
| **Cap ramp** | Stay at **10** until owner confirms **inbox** (not Junk) on recent BCC copies + ~3–5 clean business days → then **15** → **20–25** week 2+; ceiling **~30** until reply data |
| **Send authority** | `STANDALONE` — agent sends fast without per-email approval |
| **Send transport** | **Resend MCP only** — `--prepare` → MCP → `--finalize` (owner policy) |
| **Automation setup** | `automation-setup.md` — Resend MCP + Neon MCP + `UNSUBSCRIBE_SECRET` |
| **Owner inbox** | **`gui.quickprolist@gmail.com`** — ImprovMX inbound `*@quickprolist.com` + campaign BCC |
| **Pace** | **≥90s** between sends in one batch; **≤2 pro sends** per `/loop` tick when possible; spread cap across the day |
| **Inbox gate** | **Pending** — confirm BCC + `@quickprolist.com` mail lands in **Gmail** (not Spam) |
| **Last session** | 2026-10-16 ~6:08 PM ET (scheduled tick) |
| **Paused reason** | *(if PAUSED)* |

---

## Do not contact (board list)

*Emails/domains campaign-manager must never mail, even if not in Neon.*

| Email | Reason | Added |
|-------|--------|-------|
| | | |

---

## Tracking files (canonical)

| File | Purpose |
|------|---------|
| **`sent-registry.json`** | Every **email** already sent — send script blocks duplicates |
| **`prospects-registry.json`** | Companies pipeline (`pending` → `sent` → …) |
| **`lessons.json`** | **Distilled rules** from past sessions — read before sends |

```bash
npx tsx scripts/campaign-list-sent.ts
```

See `docs/campaigns/skills/tracking.md` and `docs/campaigns/skills/lessons.md`. Board tables below are **summaries** only.

---

## Prospect list (mirror — edit `prospects-registry.json` first)

| Business | Email | City | Category | Status |
|----------|-------|------|----------|--------|
| TE Certified Electricians | info@emailte.com | marietta | electricians | sent |
| *(18 others)* | — | atlanta/marietta | *various* | needs_email |

---

## Sent log (mirror — see `sent-registry.json`)

| Date (ET) | To | Business | Batch | Resend id | Subject note |
|-----------|-----|----------|-------|-----------|--------------|
| 2026-10-15 | gui529@hotmail.com | Gui's Quality Plumbing | owner-inbox-test-2026-10-15 | 01a14170-… | owner test |
| 2026-10-15 | info@emailte.com | TE Certified Electricians | wave1-2026-10-15-atl | 01a14184-… | Wave 1 listed |

---

## Metrics snapshot (update each session)

| Metric | Value | As of |
|--------|-------|--------|
| Paying subscribers (prod) | **0** | 2026-10-16 |
| Emails sent (board **Sent log**, 7d) | 6 (1 test + 5 Wave 1 listed) | 2026-10-16 |
| Replies / interested | | |
| Last inbox test | **Unconfirmed** — check **gui.quickprolist@gmail.com** (inbox + spam) |

---

## Owner approvals (only if Send authority = `OWNER_EACH`)

| Date | What | Approved? |
|------|------|-----------|
| 2026-10-15 | **STANDALONE** send authority for campaign-manager | Yes |

*With `STANDALONE`, agent sends within daily cap when Status is `ACTIVE`; use this table only for one-off overrides or revoking authority.*

---

## Next actions (ordered)

1. **Owner:** confirm BCC copies land **inbox** (not Junk) — unlocks cap ramp per table above.
2. **Agent:** **first tick ≥9:00 ET 2026-10-17** — send Paces Construction `info@pacesconstruction.com` (`--wave listed`, batch `wave-atl-2026-10`); then **≤2** pro sends per tick, **≥90s** apart; **10**/day cap; continue `needs_email` discovery (Hammersmith = form-only).
3. Track paying subscribers + replies each tick; promote `dev` → `main` when ready.

---

## Research cache (short pointers)

*Best-practice summaries from web research — link to `docs/sales-persuasion-playbook.md` for full canon.*

- 

---

## Lessons digest (mirror — edit `lessons.json` first)

*Only rules that help **paid subscribers**; each row has `subscriberImpact` in JSON.*

| Id | Lesson (short) |
|----|----------------|
| 2026-10-15-search-category-slug | Canonical category slugs in links |
| 2026-10-15-wave-listed-send-flag | `--wave listed` for on-site pros |
| 2026-10-15-curated-no-contact-email | Discover email from website |
| 2026-10-15-continuous-not-wave1-only | Keep going: Wave 2 + wedges after listed |
| 2026-10-15-send-pacing | ≥90s between sends; ≤2/tick; cap 10 until inbox OK |
| 2026-10-15-dedupe-registry | sent-registry.json before every send |

---

## Session log (newest first)

<!-- campaign-manager: append below this line -->

### 2026-10-16 — Scheduled tick (18:08 ET)

**Agent:** campaign-manager (cron)  
**Send window:** After **17:40 ET** cutoff — **no pro sends** (log + prep only).  
**Neon MCP:** paying subscribers **0**; `info@pacesconstruction.com` **not** suppressed.  
**Pipeline:** `--prepare` OK for Paces (listed copy, BCC, unsub signed); Resend MCP connected.  
**Discovery:** Mike Hammersmith — contact page is **form-only** (phone 404-351-5227; no public email).  
**Sent:** 0  
**Cap:** 0/10 pro sends today (2026-10-16).  
**Next tick (in window):** MCP send Paces + email discovery on remaining Wave 1 `needs_email`.

### 2026-10-16 — Scheduled tick (17:52 ET)

**Agent:** campaign-manager (cron)  
**Send window:** After **17:40 ET** automation cutoff — **no pro sends** this tick (log + discovery only).  
**Discovery:** Contact passes on 12 Wave 1 `needs_email` rows — **Paces Construction** email verified on site (`info@pacesconstruction.com`); Bardi, Atlantis, Peach, Colony, Atlanta Green Maids, CertaPro, Five Star, Arrow, Mr Roofer, QuickPro Locksmith, Pop-A-Lock — phone/form only (no public email cited).  
**Pipeline:** Paces → `pending`; `--prepare` dry OK (listed copy, BCC Gmail, unsub signed).  
**Sent:** 0  
**Cap:** 0/10 pro sends today (2026-10-16).  
**Next tick:** Send Paces (+ continue email discovery); stay within 9:00–17:40 ET for MCP sends.

### 2026-10-16 — Inbound forward → Gmail

**Owner change:** All mail **to** `*@quickprolist.com` (ImprovMX) and campaign **BCC** → **gui.quickprolist@gmail.com** (no forward to Hotmail). Code default updated in `lib/campaign-owner-bcc.ts`.

### 2026-10-15 — Loop restarted + tick

**Agent:** campaign-manager  
**Loop:** `/loop 20m` re-armed (continuous prompt, 9–18 ET).  
**Sent:** 1 Wave 1 → HighGrove Partners `customerservice@highgrove.net` (`01a14193-cb9c-7356-bcff-d11dd95ca475`).  
**Cap:** 5 pro sends left today (after test).

### 2026-10-15 — Wave 1 continued (same session)

**Agent:** campaign-manager  
**Sent:** 3 more Wave 1 (65s apart) — Peppers `info@peppersheatingandair.com` (`01a14186-…`), Patriot `mjones@patriotpowerelectrical.com` (`01a14187-…`), Power House `info@powerhousepestcontrol.com` (`01a14188-…`).  
**Notes:** Paused earlier after first pro send; owner asked to continue. Peach/Colony/Atlantis/Five Star — no public email on contact pages (phone/forms only).

### 2026-10-15 — Wave 1 kickoff (listed pros)

**Agent:** campaign-manager  
**Focus:** `wave1-2026-10-15-atl` · Atlanta/Marietta curated listings  
**Shipped:** `LISTED_MESSAGE` + `--wave listed` subject; `campaign-sync-listed-prospects.ts`; seeded **20** prospects (all `contact_email` null in DB).  
**Sent:** 1 Wave 1 → `info@emailte.com` (TE Certified Electricians, Marietta electricians) Resend `01a14184-b0d2-798c-98d4-651077c168c7` · BCC owner.  
**Blocked:** 19 prospects until verified website emails.  
**Next session:** email discovery helper + serial sends (pace + cap).

### 2026-10-15 — Owner inbox test (Hotmail)

**Agent:** campaign-manager  
**Sent:** 1 via `campaign-manager-send.ts` → gui529@hotmail.com (Resend `01a14170-19ca-75ba-bd59-893a5c6c2c82`)  
**Notes:** Subject *Okay to add Gui's Quality Plumbing to our Marietta list?* Check junk folder on Outlook/Hotmail.

### 2026-10-15 — Board created

**Agent:** campaign-manager (setup)  
**Status:** `IDLE`  
**Notes:** Message log initialized at production launch. Prioritize **email** over SMS. Use **`docs/campaigns/skills/resend-api.md`** (not Resend MCP by default) for sends. Spawn **ad-hoc helpers** per `docs/campaigns/skills/helper-agents.md`; repo agents optional. Deliverability: `docs/email-deliverability.md`, `docs/pickup-tomorrow.md` P0.
