# Move campaign from local PC to cloud

Today: **campaign-manager** + **`/loop 20m`** on your machine (PowerShell sleeper).
Goal: **scheduled cloud agent** on `dev` — no PC awake, same board/registries/lessons.

Inbound mail (ImprovMX → Gmail) and **Resend** are already cloud. You are moving
**the agent + schedule + secrets + git state**, not the app.

---

## 1. Put campaign state on `dev` (git)

Cloud ticks read/write repo files. **Push** before enabling automation:

| Path | Why |
|------|-----|
| `docs/campaigns/board.md` | Status, cap, session log |
| `docs/campaigns/sent-registry.json` | Dedupe |
| `docs/campaigns/prospects-registry.json` | Pipeline |
| `docs/campaigns/lessons.json` | Rules |
| `scripts/campaign-manager-send.ts`, `lib/campaign-*.ts`, etc. | Send path |

**Rule:** each cloud tick may `git pull` → work → `commit` + `push` **only** campaign
ops paths on **`dev`**. Never `main` unless owner asks.

---

## 2. Create Cursor Automation (replaces local `/loop`)

See **`cloud-schedule.md`** for full prompt and cron.

| Setting | Value |
|---------|--------|
| Trigger | Schedule cron `0,20,40 7-19 * * *`, TZ `America/New_York` |
| Repo | `gui529/QuickProList`, branch **`dev`** |
| Agent instructions | `campaign-manager` + `automation-tick-prompt.md` |
| Business hours | Enforced in prompt (**7:00–20:00** ET); last cron tick **19:40** |

**Disable local loop** after automation is green (ask agent to stop background
PowerShell loop, or kill the sleeper process).

---

## 3. Cloud setup (minimal)

See **`automation-setup.md`**.

- **Do not use Resend MCP for cold outreach** (owner 2026-10-17). Manual Gmail `gui.quickprolist@gmail.com`. Board is `PAUSED`. Resend is transactional/opted-in only.
- **Repo defaults** for from, sender, BCC, site URL (`lib/campaign-defaults.ts`, `lib/campaign-owner-bcc.ts`).
- **Optional env:** `UNSUBSCRIBE_SECRET` (= Vercel Production `CRON_SECRET`) if `--prepare` cannot sign unsub links.
- **Neon MCP** on automation for DB (see `neon-mcp.md`). **No `DATABASE_URL`** on automation.

---

## 4. Permissions the cloud agent needs

- **Git:** read/write **`dev`** (pull + push campaign commits).
- **Network:** Resend MCP, Neon MCP, WebFetch/WebSearch for email discovery.
- **Shell:** `npx tsx scripts/campaign-manager-send.ts`, `campaign-sync-listed-prospects.ts`, tests not required each tick.

No Admin UI, no `POST /api/campaigns/send` unless owner opts in.

---

## 5. What stays local (optional)

| Item | Notes |
|------|--------|
| `outreach/` discovery worker | Optional; cloud agent can WebFetch instead |
| Your PC | Off once automation runs |
| Vercel crons | Unrelated (digest/winback only) |
| ImprovMX / Gmail | Already cloud; no change |

---

## 6. Cutover checklist

1. [ ] Commit + push all campaign files on **`dev`**.
2. [ ] Configure automation **secrets** (table above).
3. [ ] Create + enable **Cursor Automation** (cron + prompt).
4. [ ] Run **one manual** cloud agent tick; confirm send or dry-run + board log + push.
5. [ ] **Stop** local `/loop 20m` on PC.
6. [ ] Confirm **gui.quickprolist@gmail.com** receives BCC + `contact@` tests.
7. [ ] Board **Inbox gate** → clear when Gmail placement is good.

**Pause cloud campaign:** board `Status` → `PAUSED` or disable automation.

---

## 7. Failure modes

| Symptom | Fix |
|---------|-----|
| Tick runs but no sends | Resend MCP disconnected, or missing `UNSUBSCRIBE_SECRET` / `CRON_SECRET` |
| `already_sent` | Normal — registry on `dev` is working |
| No registry updates on `dev` | Agent lacked push permission or didn’t commit |
| Duplicate sends | Two schedulers (local loop **and** automation) — stop one |
| Wrong city/listings | Neon MCP scoped to wrong project/branch — use production |
