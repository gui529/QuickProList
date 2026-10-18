# Campaign board (message log)

**Owner:** QuickProList outbound to local pros → **paid subscribers** ($29.99/mo featured listings).

**Steward:** `campaign-manager` agent — read this file **first** on every run; append a log entry **last** before stopping.

**North star:** active paying subscribers (Stripe). Secondary: enroll starts, trials, replies, queue depth.

---

## Campaign state

| Field | Value |
|-------|--------|
| **Status** | `PAUSED` |
| **Current focus** | **PAUSED — do not send.** Planned test, only when the owner runs it by hand: ~20 emails over a few days from Gmail. Batch `wave-atl-2026-10` stays on file; no Resend sends. |
| **Daily email cap** | `5` pro outreach/day (owner test excluded from cap) |
| **Cap ramp** | Owner voice **2026-10-17 ~17:47 ET**: cap is **5**/day for a small manual Gmail test. The earlier **25**/day Resend cap is withdrawn. |
| **Send authority** | `STANDALONE` — does **not** apply while Status is `PAUSED`. Do not resume sending. |
| **Sender / channel** | **Gmail** `gui.quickprolist@gmail.com` — manual cold outreach. Planned test ~20 emails over a few days, low volume. |
| **Send transport** | **Not Resend.** Cold outreach must not go through Resend. Resend stays for transactional/opted-in mail only. |
| **Automation setup** | `automation-setup.md` — Neon MCP for reads. Do not send cold mail from the tick. |
| **Owner inbox** | **`gui.quickprolist@gmail.com`** — same account is the cold-outreach sender. ImprovMX inbound `*@quickprolist.com` still forwards here. |
| **Run schedule** | Every **20 minutes** (cron `0,20,40 7-19 * * *`) |
| **Send hours** | **Sends only 7:00–20:00 America/New_York** |
| **Pace** | **At least 90 seconds** between sends; **≤2 pro sends** per tick when possible; spread the daily cap across the day |
| **Inbox gate** | **Pending** — confirm BCC + `@quickprolist.com` mail lands in **Gmail** (not Spam) |
| **Last session** | 2026-10-17 ~17:47 ET (owner pause; no sends) |
| **Paused reason** | Owner paused 2026-10-17: Resend Acceptable Use Policy prohibits cold outreach/scraped lists and bounce rate was 25% (limit 4%). Switching to a small manual Gmail test. |

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
| 2026-10-16 | info@pacesconstruction.com | Paces Construction | wave-atl-2026-10 | 01a146c9-… | Wave 1 listed |
| 2026-10-17 | info@atlantisplumbing.com | Atlantis Plumbing | wave-atl-2026-10 | 01a14bbd-… | Wave 1 listed |
| 2026-10-17 | help@colonyroofers.com | Colony Roofers | wave-atl-2026-10 | 01a14bbf-… | Wave 1 listed |

---

## Metrics snapshot (update each session)

| Metric | Value | As of |
|--------|-------|--------|
| Paying subscribers (prod) | **0** | 2026-10-17 |
| Emails sent (board **Sent log**, 7d) | 9 (1 test + 8 Wave 1 listed) | 2026-10-17 |
| Replies / interested | | |
| Last inbox test | **Unconfirmed** — check **gui.quickprolist@gmail.com** (inbox + spam) |

---

## Owner approvals (only if Send authority = `OWNER_EACH`)

| Date | What | Approved? |
|------|------|-----------|
| 2026-10-15 | **STANDALONE** send authority for campaign-manager | Yes |
| 2026-10-17 | Voice: keep **STANDALONE** + **ACTIVE**; daily cap **25**; goal paying subscribers at $29.99/mo | Yes |
| 2026-10-17 | Voice ~17:47 ET: **PAUSED**; withdraw the 25/day cap; cap **5**; cold outreach is manual Gmail, not Resend | Yes |

*With `STANDALONE`, agent sends within daily cap when Status is `ACTIVE`; use this table only for one-off overrides or revoking authority.*

---

## Next actions (ordered)

1. **Do not send.** Status is `PAUSED`. Do not resume Resend cold outreach or any automated sends.
2. **Channel:** manual Gmail from `gui.quickprolist@gmail.com` — planned test ~20 emails over a few days, low volume. Resend is transactional/opted-in mail only.
3. **Cap:** **5** pro emails/day (`board.md` is source of truth). The **25**/day cap is withdrawn.
4. **Strategy (when the owner runs the manual test):** tighten prospect filtering to the trades converting best. The campaign manager decides which trades based on results. Not this tick.

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
| 2026-10-17-cap-follows-board | Cap is whatever `board.md` states (currently **5**, owner voice 2026-10-17 ~17:47 ET). Campaign is `PAUSED` — do not send. Supersedes `2026-10-15-send-pacing`. |
| 2026-10-17-gmail-not-resend | Cold outreach is manual Gmail `gui.quickprolist@gmail.com`, not Resend. Planned test ~20 emails over a few days. Resend is transactional/opted-in only. Supersedes `2026-10-16-cloud-resend-mcp`. |
| 2026-10-15-dedupe-registry | sent-registry.json before every send |

---

## Session log (newest first)

<!-- campaign-manager: append below this line -->

### 2026-10-17 — Owner pause (~17:47 ET)

**Agent:** board/config update only (no sends)  
**Owner (Guilherme), voice 2026-10-17 ~17:47 ET:**  
**Status:** `PAUSED`. Do not resume sending.  
**Paused reason:** Owner paused 2026-10-17: Resend Acceptable Use Policy prohibits cold outreach/scraped lists and bounce rate was 25% (limit 4%). Switching to a small manual Gmail test.  
**Sender / channel:** Gmail `gui.quickprolist@gmail.com`. Cold outreach must not go through Resend. Planned test ~20 emails over a few days, manual, low volume. Resend stays for transactional/opted-in mail only.  
**Daily email cap:** **5** (board is source of truth; the 25/day cap is withdrawn).  
**Sends:** none.

### 2026-10-17 — Owner approval (~17:35 ET)

**Agent:** board update only (no campaign-manager send)  
**Owner (Guilherme), voice 2026-10-17:** approved standalone operation. **Send authority** remains `STANDALONE`; **Status** remains `ACTIVE`. Daily cap raised **10 → 25**/day. Goal is paying subscribers at **$29.99/mo**.  
**Paused reason:** none was set (template placeholder only). Cleared that placeholder on this approval; campaign was not paused.  
**Schedule (unchanged):** every 20 minutes; sends only **7:00–20:00 America/New_York**; at least **90 seconds** between sends.  
**Sends:** no live emails sent; this update is board/config only, pending before any further sends.  
**Open risks (same session):** 25% bounce rate on recent real prospect sends (2 bounced, 1 suppressed of 8); listed-wave email lacks a working enroll/preview link; bounces not captured by the Resend webhook; CAN-SPAM postal address pending issue #18.

### 2026-10-17 — Scheduled tick (17:23 ET)

**Agent:** campaign-manager (cron)  
**Send window:** **7:00–20:00 ET** — in window.  
**Neon MCP:** paying subscribers **0**; `info@atlantisplumbing.com` + `help@colonyroofers.com` not suppressed.  
**Discovery:** Atlantis email on `/terms` (`info@atlantisplumbing.com`); Colony `help@colonyroofers.com` on homepage; Bardi/Peach/Atlanta Green Maids/Mr Roofer — phone/form only this pass.  
**Sent:** 2 — **Atlantis Plumbing** (`01a14bbd-f0e1-7b18-b9c9-6b725a9ab98a`), **Colony Roofers** (`01a14bbf-13f2-7dd2-929b-9b47d5d92cfe`); `--wave listed`, batch `wave-atl-2026-10`; `--finalize` → `sent-registry.json`.  
**Cap:** **2/10** pro sends today (2026-10-17).  
**Next tick:** remaining Wave 1 `needs_email`; up to **2** more sends if verified + cap.

### 2026-10-16 — Scheduled tick (18:17 ET)

**Agent:** campaign-manager (cron)  
**Send window:** **7:00–20:00 ET** — in window.  
**Neon MCP:** paying subscribers **0**; `info@pacesconstruction.com` not suppressed.  
**Sent:** 1 — **Paces Construction** `info@pacesconstruction.com` (`--wave listed`, batch `wave-atl-2026-10`) Resend `01a146c9-f213-7b70-9d68-d47ba47184df`; `--finalize` → `sent-registry.json`.  
**Discovery:** Bardi `/contact` — phone/form only (no public email).  
**Cap:** **1/10** pro sends today (2026-10-16).  
**Next tick:** `needs_email` pass on remaining Wave 1; up to **1** more send today if verified email + cap.

### 2026-10-16 — Scheduled tick (18:15 ET)

**Agent:** campaign-manager (cron)  
**Send window:** After **17:40 ET** automation cutoff — **no pro sends** (log + discovery). Paces queued for **≥9:00 ET 2026-10-17** per next actions.  
**Neon MCP:** paying subscribers **0**; `info@pacesconstruction.com` **not** suppressed.  
**Pipeline:** `--prepare` OK (listed copy, BCC `gui.quickprolist@gmail.com`, unsub signed); Resend MCP available.  
**Discovery:** Re-checked Peach Plumbing, Colony Roofers, Atlanta Green Maids — phone/form only; **Mike Hammersmith** → `skip` (form-only contact page).  
**Sent:** 0  
**Cap:** 0/10 pro sends today (2026-10-16).  
**Next tick (in window):** MCP send **Paces Construction** (`--wave listed`, batch `wave-atl-2026-10`); continue `needs_email` on remaining Wave 1 rows.

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
