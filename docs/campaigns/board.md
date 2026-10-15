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
| **Daily email cap** | *(owner-approved; default 10 until deliverability proven)* |
| **Last session** | *(ISO date/time ET)* |
| **Paused reason** | *(if PAUSED)* |

---

## Metrics snapshot (update each session)

| Metric | Value | As of |
|--------|-------|--------|
| Paying subscribers (prod) | | |
| Emails sent (campaign_contacts, last 7d) | | |
| Queue: pending_review / approved / sent | | |
| Suppressions count | | |
| Last inbox test (Outlook/Gmail) | | |

*Pull numbers from Neon / Resend / admin when possible; note "estimate" if manual.*

---

## Owner approvals (required for live sends)

| Date | What | Approved? |
|------|------|-----------|
| | First production batch | |

*Campaign-manager never triggers live email without a row here or explicit owner message in the same thread.*

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
