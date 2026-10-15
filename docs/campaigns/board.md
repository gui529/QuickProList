# Campaign board (message log)

**Owner:** QuickProList outbound to local pros → **paid subscribers** ($29.99/mo featured listings).

**Steward:** `campaign-manager` agent — read this file **first** on every run; append a log entry **last** before stopping.

**North star:** active paying subscribers (Stripe). Secondary: enroll starts, trials, replies, queue depth.

---

## Campaign state

| Field | Value |
|-------|--------|
| **Status** | `IDLE` — set to `ACTIVE`, `PAUSED`, or `STOPPED` by campaign-manager |
| **Current focus** | *(city + category + batch name)* |
| **Daily email cap** | `10` (raise after inbox tests pass) |
| **Send authority** | `STANDALONE` — agent sends via Resend script, not the app |
| **Last session** | *(ISO date/time ET)* |
| **Paused reason** | *(if PAUSED)* |

---

## Do not contact (board list)

*Emails/domains campaign-manager must never mail, even if not in Neon.*

| Email | Reason | Added |
|-------|--------|-------|
| | | |

---

## Prospect list (standalone — not app queue)

| Business | Email | City | Category | Status |
|----------|-------|------|----------|--------|
| | | | | pending / sent / replied / subscribed |

---

## Sent log (standalone Resend — not `campaign_contacts`)

| Date (ET) | To | Business | Batch | Resend id | Subject note |
|-----------|-----|----------|-------|-----------|--------------|
| | | | | | |

---

## Metrics snapshot (update each session)

| Metric | Value | As of |
|--------|-------|--------|
| Paying subscribers (prod) | | |
| Emails sent (board **Sent log**, 7d) | | |
| Replies / interested | | |
| Last inbox test (Outlook) | | |

---

## Owner approvals (only if Send authority = `OWNER_EACH`)

| Date | What | Approved? |
|------|------|-----------|
| 2026-10-15 | **STANDALONE** send authority for campaign-manager | Yes |

*With `STANDALONE`, agent sends within daily cap when Status is `ACTIVE`; use this table only for one-off overrides or revoking authority.*

---

## Next actions (ordered)

1. 
2. 
3. 

---

## Research cache (short pointers)

*Best-practice summaries from web research — link to `docs/sales-persuasion-playbook.md` for full canon.*

- 

---

## Session log (newest first)

<!-- campaign-manager: append below this line -->

### 2026-10-15 — Board created

**Agent:** campaign-manager (setup)  
**Status:** `IDLE`  
**Notes:** Message log initialized at production launch. Prioritize **email** over SMS. Use **`docs/campaigns/skills/resend-api.md`** (not Resend MCP by default) for sends. Spawn **ad-hoc helpers** per `docs/campaigns/skills/helper-agents.md`; repo agents optional. Deliverability: `docs/email-deliverability.md`, `docs/pickup-tomorrow.md` P0.
