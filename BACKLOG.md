# Backlog

Work is tracked in [GitHub Issues](https://github.com/gui529/QuickProList/issues),
not in this file.

- **Priority:** `P0` / `P1` / `P2` labels, highest first.
- **Owner-only work:** `needs-owner` label — a business/legal decision or a
  live third-party credential the repo doesn't have. Never picked up by
  `backlog-worker`. A legal `needs-owner` issue may carry research/a draft
  from `legal-agent`, but stays open until the owner decides.
- **Claimed:** `in-progress` label — a `backlog-worker` run is actively on
  it. Treated as available again if it's gone stale (roughly 3+ hours with
  no activity).
- **Dependencies:** noted in an issue's body as `Blocked by: #N`.

Agents (`backlog-worker`, `qa-validator`, `product-owner`, `legal-agent`)
all read and write GitHub Issues directly, and all push code to the shared
`dev` branch. `main` is reserved for the repo owner to merge into when
ready to deploy. `legal-agent` researches compliance questions and drafts
legal text (ToS, Privacy Policy, consent copy) for owner review — it never
finalizes or publishes a legal document itself.

See `.claude/agents/*.md` for each agent's exact workflow.
