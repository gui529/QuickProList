# Campaign-manager on a schedule (cloud)

**Yes** — run **`campaign-manager`** in the **cloud** on a timer. The right tool is
**Cursor Automations** (scheduled trigger), not Vercel cron (that only hits HTTP
routes in the Next.js app).

**Migrating off a local PC `/loop`:** see **[cloud-migrate.md](./cloud-migrate.md)**.

---

## Recommended: Cursor Automation

1. Open **[cursor.com/automations](https://cursor.com/automations)** (or Cursor →
   Automations / Glass).
2. **New automation** → trigger **Schedule** (cron).
3. **Timezone:** `America/New_York`.
4. **Cron (every 20 min, 9:00–17:40 ET):**

   ```cron
   0,20,40 9-17 * * *
   ```

   - First tick **9:00**, last **17:40** (still inside “until 6 pm” without
     firing at 18:00).
   - For **weekdays only:** `0,20,40 9-17 * * 1-5`.

5. **Agent:** point at this repo (`gui529/QuickProList`), branch **`dev`**.
6. **Instructions / prompt** (each run is one short session):

   ```text
   You are campaign-manager. Read .claude/agents/campaign-manager.md and follow it.

   This is a scheduled tick (not a human chat). Do one focused pass:
   - git pull origin dev
   - Read board.md, lessons.json, unblock-yourself.md, continuous-campaign.md
   - If board Status is PAUSED, exit with one-line reason
   - Respect daily email cap (count today's rows in sent-registry.json)
   - Run full priority stack: listed pros (--wave listed), then Wave 2 outreach (--wave outreach), follow-ups, next wedge — do NOT stop when Wave 1 is slow
   - Self-unblock: discover emails; ≤2 pro sends this tick; ≥90s between sends if multiple
   - Append board session log; commit/push to dev only campaign ops files — never main
   - End with: emails sent this tick, cap remaining, paying subs note, next subscriber lever
   ```

7. **Owner setup:** `automation-setup.md` (Resend + Neon MCP + `UNSUBSCRIBE_SECRET`).

8. **Enable** the automation.

### What each tick should do (design)

| Setting | Why |
|---------|-----|
| **~27 ticks/day** (9–6, every 20m) | Steady discovery + follow-up, not one long session |
| **Daily cap** on board | Hard stop — **10** pro/day until inbox gate cleared |
| **≤2 pro sends / tick** | Spread volume; avoid dumping cap in one hour |
| **≥90s between sends** | When one tick sends **multiple** emails |
| **One tick = one log entry** | board session log “scheduled tick” |

If a tick finds **cap hit** or **no verifiable emails**, it should still update
the board (discovery notes) and exit — **no idle “blocked”**.

---

## Alternative: `/loop 20m` (this chat / local IDE)

In a **long-lived Cursor chat** on your machine, **`/loop 20m`** arms a **20-minute**
wake (1200s) via monitored shell output. Good when you keep the project open and
want the same thread to keep running campaign-manager.

**Each tick prompt should include business hours** (the loop itself runs 24/7):

```text
Campaign-manager tick. Read .claude/agents/campaign-manager.md + unblock-yourself.md.
If now is outside 9:00–18:00 America/New_York, log one line on board and exit (no sends).
Otherwise: git pull dev; read board/lessons; PAUSED check; daily cap via sent-registry.json;
continuous-campaign priority stack; ≤2 pro sends; ≥90s between sends; append session log. Do not stop when Wave 1 is exhausted.
```

**Stop:** ask to stop the loop; agent kills the background sleeper.

### `/loop` on Cloud Agent (if `subscribe_timer` is available)

Use **`delaySeconds: 1200`** or a **cron** on the subscription timer for 9–6 ET
(see Cursor `/loop` skill). Same tick prompt as above.

| Approach | Best for |
|----------|----------|
| **Automations + cron** | Hands-off cloud, exact 9–6 ET window |
| **`/loop 20m` local** | Your machine + this chat; agent checks hours each tick |
| **`/loop` + cron (cloud)** | Long cloud chat with hour window |

---

## What does **not** run campaign-manager

| Mechanism | Runs |
|-----------|------|
| Vercel `vercel.json` crons | App routes only (`/api/cron/digest`, etc.) |
| GitHub Actions (unless you wire Cursor API yourself) | CI/scripts you define — not this agent file by default |
| Local `npm run dev` | Dev server only |

---

## Owner checklist before turning on

- [ ] Board **Status** `ACTIVE`, **Send authority** `STANDALONE`
- [ ] Resend domain verified; owner ok with **BCC** on every send
- [ ] Secrets available in cloud automation environment
- [ ] **`dev`** has latest campaign scripts + registries (or automation pulls each tick)
- [ ] Inbox placement tested (lesson: don’t ramp if junk)

To pause outreach: set board **Status** `PAUSED` on `dev` (next tick exits) or
disable the automation in Cursor.
