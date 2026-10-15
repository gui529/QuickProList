# Helper agents (campaign-manager)

`campaign-manager` is **not** limited to QuickProList’s fixed roster in
`.claude/agents/`. For each task, spawn **ad-hoc helper agents** via the
**`Agent` / `Task`** tool with a **one-job prompt** (goal, inputs, output
format, time box).

Log spawns on `docs/campaigns/board.md` (session log → **Spawns:**).

## When to spawn

| Need | Example helper name (in prompt) | Suggested subagent type |
|------|----------------------------------|-------------------------|
| Cold-email research | `email-strategy-researcher` | `generalPurpose` + WebSearch |
| Subject/body draft | `campaign-copy-drafter` | `generalPurpose` |
| DNS / domain / Resend status | `deliverability-scout` | `generalPurpose` or shell + Resend skill |
| Codebase / API paths | `campaign-integrator` | `explore` |
| Legal gray area | `compliance-checker` | `generalPurpose` (or repo `legal-agent` if heavy) |
| Implement app fix | `campaign-engineer` | `generalPurpose` or repo `backlog-worker` |

## Prompt template

```
You are a one-shot helper for QuickProList campaign-manager.

Role: <name>
Goal: <single outcome>
Context: <board excerpt, city/category, constraints>
Output: <bullets / PASS-FAIL / table — no prose walls>
Do not: send email, merge to main, or expose secrets.
```

Merge helper output into the board; discard noise.

## Repo agents (optional)

Use `.claude/agents/*.md` **only when** the task clearly matches that agent’s
job (e.g. `marketing-agent` for playbook rewrites). Default to **custom
helpers** above for speed and narrow scope.

Do **not** spawn another `campaign-manager`.
