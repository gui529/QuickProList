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

## The team, and when to consult a peer

Every agent has the `Agent` tool and can spawn any of the others below
mid-run when a question falls outside its own lane — this is the single
list all of them read, so it's the one place to update when the roster
changes:

| Agent | Job | Consult it when... |
|---|---|---|
| `backlog-worker` | Picks up and implements exactly one open issue. | You need to know if a specific issue is already claimed/blocked, or want a second implementation opinion — rare; usually it's the one being consulted, not consulting. |
| `qa-validator` | Reviews backlog-worker's latest commit against its issue. | You need a second look at whether a diff actually meets an acceptance criterion. |
| `product-owner` | Once-a-day strategic pass; files new buildable issues. | You're deciding whether a feature is worth building/what it should look like from a business-model angle. |
| `legal-agent` | Compliance research + legal-text drafting. Prime directive: never let QuickProList do anything illegal that could get the company sued or harmed. | **Any time a legal/compliance question comes up, from any agent** — a data practice, a third-party API's terms, messaging/consent rules, billing disclosures, or "am I allowed to build this." Its answer is independently double-checked (it spawns a second `legal-agent` pass itself), so it's safe to treat as authoritative within this pipeline. |

Rules for consulting a peer:
- Give the peer enough context to actually answer (what you're doing, the
  specific question) — a bare "is this legal?" with no detail wastes the
  call.
- A consult is a quick question, not a hand-off of your whole task — you
  still own finishing your own job afterward.
- Don't spawn a peer of your own type (e.g. `backlog-worker` calling
  another `backlog-worker`) — that's `legal-agent`'s own internal
  verification pattern, not a general one, and doing it elsewhere just
  duplicates work without the same safeguards.
