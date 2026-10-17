# Campaign strategy (campaign-manager)

Owner intent — **move fast**; agent decides execution within guardrails.

Before changing waves, copy, or caps, check **`docs/campaigns/lessons.json`**
(active entries — each must justify itself via **`subscriberImpact`**). After an
outcome that helped or hurt **replies, enroll, or paid**, add a lesson per
`docs/campaigns/skills/lessons.md`; skip everything else.

## Pace

- **Do not wait** for per-email owner approval when board **Send authority** is
  `STANDALONE` and **Status** is `ACTIVE`.
- Pick the next highest-leverage action each session: research → list prospects
  → send → log → follow-up.
- Spawn helpers in parallel when it saves time; merge into `board.md`.
- **Pause** only for deliverability failures, suppressions, or hitting **Daily
  email cap** — not for routine sends.
- **Missing email is not a pause** — run the discovery loop in
  `unblock-yourself.md`, then send or `skip` and continue.

## Send pacing (deliverability — not optional)

**Move fast** means sessions and decisions, not firing dozens of identical API
calls in a minute. Reputation and inbox providers care about **volume spikes**
and copy similarity more than Resend’s raw rate limit.

| Rule | Default |
|------|---------|
| **Daily volume** | Whatever **Daily email cap** `board.md` states — currently **5** pro sends/day (owner voice 2026-10-17 ~17:47 ET). Do not substitute 25 or 10. |
| **Per scheduled tick** | **≤ 2** pro sends per 20m tick when possible — spread cap across the day |
| **Same session** | **≥ 90 seconds** between successful sends (**90–120s** for Wave 2 cold); never under **30s** |
| **Concurrency** | **One send at a time** — one `campaign-manager-send.ts` process; no parallel blasts |
| **Batching** | No “mass send” script; **never** dump full daily cap in one hour |
| **Channel** | Cold outreach is manual **Gmail** `gui.quickprolist@gmail.com`, not Resend. Board is `PAUSED` (2026-10-17) — do not send. Planned test ~20 emails over a few days, low volume. Resend is transactional/opted-in only. |
| **Ramp** | Cap follows `board.md` (currently **5**). Do not keep the withdrawn 25/day Resend cap. |
| **Stop** | `PAUSED` on bounce, complaint, repeated junk placement, or Resend **429** / rate errors |

**Do not send all at once** — bursts look like bulk spam to Microsoft/Gmail and hurt a new domain.
**1/sec** is API-safe but still too fast for cold B2B; spacing protects inbox placement.

## Waves

### Wave 1 — Already on the site (do first)

Pros already in `curated_businesses` for a (city, category). Email is honest:
they can see themselves in search. Goal: enroll / 30-day preview / paid.

- Use **listed-pro copy** (not “can we add you?” — they are already listed).
- Need a real **to** address — **agent discovers it** (contact page, search,
  helper); never idle waiting on owner. See `unblock-yourself.md`.
- `--enroll-url` when an invitation exists; else search link with canonical
  category slug (`plumbing`, not `plumbers`).

### Wave 2 — Fill the third slot

Up to **3** pros per search; owner seeded **2** per category. Outreach to net-new
businesses with permission-style copy (`DEFAULT_MESSAGE` or variant) + scarcity
(one spot left).

### Wave 3 — Next wedge

Expand to the next opened town/category when the current wedge has ongoing sends
and discovery — **do not wait** for Wave 1 to be 100% complete.

## Continuous campaign (owner: keep going)

Read **`continuous-campaign.md`**. Summary:

- **Never treat Wave 1 as the end state** — when listed pros are slow (phone-only
  sites, no reply), shift the same session to **Wave 2 discovery**, **follow-ups**,
  and **next category**.
- **Only stop** for `PAUSED`, **daily cap**, deliverability, or outside send hours
  on scheduled ticks — not because a wave list ran out.
- Every tick/session ends with **next subscriber lever** on the board, not
  “blocked on Wave 1”.

## Owner visibility

Every send **BCCs** the owner (`CAMPAIGN_BCC_EMAIL` or default
`gui.quickprolist@gmail.com`). Recipients do not see the BCC line.
