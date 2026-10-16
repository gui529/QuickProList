# Continuous campaign (never “done” with Wave 1)

**Owner intent:** campaign-manager **keeps running** until **paying subscribers**
grow — not until a wave checklist is finished.

Waves are **priority order**, not finish lines. When Wave 1 slows (no emails,
low replies), **automatically** work Wave 2, follow-ups, and the next wedge in the
**same session / same scheduled tick**.

---

## Stop conditions (only these)

| Stop | Who |
|------|-----|
| Board **Status** `PAUSED` | Agent (deliverability) or owner |
| **Daily email cap** hit for the calendar day | Agent — resume next day / next tick |
| Outside **send hours** (e.g. 9–18 ET on scheduled ticks) | Agent — log only |
| Owner disables automation / stops `/loop` | Owner |

**Not** a stop condition: “Wave 1 list exhausted”, “all listed pros emailed once”,
“no replies yet”.

---

## Priority stack (each session / tick)

Work **top to bottom** until cap or time for that tick is used ( **≤ 2 pro sends per
20m tick**, **≥ 90s** apart if multiple in one session — see `campaign-strategy.md`):


1. **Revenue check** — Neon MCP `run_sql` → paying subscriber count on board
   (`neon-mcp.md`). Log enroll/reply signals: **replies to
   `@quickprolist.com`** and campaign **BCC** land in **gui.quickprolist@gmail.com**
   (`CAMPAIGN_BCC_EMAIL` overrides default).
2. **Hot leads** — prospects `replied` / interested → push enroll URL, admin
   invite, or owner note; highest conversion leverage.
3. **Wave 1 — listed pros** — `needs_email` → discover → `--wave listed` send.
4. **Wave 2 — third slot** — categories where search has room (up to **3** pros):
   discover net-new locals; `--wave outreach` (`DEFAULT_MESSAGE`); add to
   `prospects-registry.json` (`source: discovery`).
5. **Follow-up** — prior `sent` with no reply after **≥5 days** (one polite bump;
   `--wave follow-up` when copy exists; else note on board for copy work).
6. **Next wedge** — next opened town or category on board **Current focus**;
   update focus when a wedge is “moving” (sends + discovery logged).

If step 3 is empty **this tick**, do **not** idle — execute 4–6.

---

## Sends by wave

| Wave | `--wave` | Copy |
|------|----------|------|
| Listed on site | `listed` | `LISTED_MESSAGE` |
| Cold / third slot | `outreach` (default) | `DEFAULT_MESSAGE` |
| Bump | `follow-up` | TBD in `lib/campaigns.ts` — until then, board note only |
| Test | `test` | Owner inbox tests |

---

## Discovery (Wave 2+)

- **`outreach/`** worker → `campaign_prospects` API **optional**; prefer standalone
  path: discover → `prospects-registry.json` → `campaign-manager-send.ts`.
- WebSearch + contact pages (same rules as Wave 1 — **verified email only**).
- Spawn **`contact-email-finder`** helpers in parallel for list building.

---

## Board fields

- **Current focus** — active wedge (city + category + wave mix), update as you shift.
- **Next actions** — always point at **subscriber** outcomes, not “finish Wave 1”.
