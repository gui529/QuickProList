# Campaign strategy (campaign-manager)

Owner intent — **move fast**; agent decides execution within guardrails.

## Pace

- **Do not wait** for per-email owner approval when board **Send authority** is
  `STANDALONE` and **Status** is `ACTIVE`.
- Pick the next highest-leverage action each session: research → list prospects
  → send → log → follow-up.
- Spawn helpers in parallel when it saves time; merge into `board.md`.
- **Pause** only for deliverability failures, suppressions, or hitting **Daily
  email cap** — not for routine sends.

## Waves

### Wave 1 — Already on the site (do first)

Pros already in `curated_businesses` for a (city, category). Email is honest:
they can see themselves in search. Goal: enroll / 30-day preview / paid.

- Use **listed-pro copy** (not “can we add you?” — they are already listed).
- Need a real **to** address (discover from website if missing).
- `--enroll-url` when an invitation exists; else search link with canonical
  category slug (`plumbing`, not `plumbers`).

### Wave 2 — Fill the third slot

Up to **3** pros per search; owner seeded **2** per category. Outreach to net-new
businesses with permission-style copy (`DEFAULT_MESSAGE` or variant) + scarcity
(one spot left).

### Wave 3 — Next wedge

Next city/category only after wave 1–2 are moving (sends logged, replies tracked).

## Owner visibility

Every send **BCCs** the owner (`CAMPAIGN_BCC_EMAIL` or default
`gui529@hotmail.com`). Recipients do not see the BCC line.
