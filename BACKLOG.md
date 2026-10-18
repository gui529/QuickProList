# Backlog

Requests and findings go to **QPL Team Lead** in chat. Nobody files GitHub
issues or issue comments.

Code changes go to **QPL Dev**, through the Team Lead or the team room.
QPL Dev commits directly to `dev` after the tests and build pass. There are
no PRs into `dev`. `main` and production only change with Guilherme's
approval.

Existing GitHub issues stay for reference only. Do not file, comment,
label, or close them.

`legal-agent` researches compliance questions and drafts legal text (ToS,
Privacy Policy, consent copy) for Guilherme to review — it never finalizes
or publishes a legal document itself. A legal question stays with the Team
Lead until Guilherme decides.

See `.claude/agents/*.md` for each agent's exact workflow.

## The team, and when to consult a peer

Every agent has the `Agent` tool and can spawn any of the others below
mid-run when a question falls outside its own lane — this is the single
list all of them read, so it's the one place to update when the roster
changes:

| Agent | Job | Consult it when... |
|---|---|---|
| `backlog-worker` | Implements the one code change QPL Dev was given. Commits it on `dev` after the tests and build pass. | You need a second implementation opinion — rare; usually it's the one being consulted, not consulting. |
| `qa-validator` | Reviews the latest `dev` commit against what was asked. | You need a second look at whether a diff actually meets what was requested. |
| `product-owner` | Once-a-day strategic pass; sends a few build requests to QPL Team Lead. Does not write code. | You're deciding whether a feature is worth building/what it should look like from a business-model angle. |
| `revenue-strategist` | Brutally honest viability check: does this business have real potential to make money? Reports a verdict (go / pivot / no-go) to QPL Team Lead, never builds anything, never files an issue. | You need to know if a large feature, price change, or go-to-market push is commercially worth it — not for routine requests. |
| `legal-agent` | Compliance research + legal-text drafting. Prime directive: never let QuickProList do anything illegal that could get the company sued or harmed. | **Any time a legal/compliance question comes up, from any agent** — a data practice, a third-party API's terms, messaging/consent rules, billing disclosures, or "am I allowed to build this." Its answer is independently double-checked (it spawns a second `legal-agent` pass itself), so it's safe to treat as authoritative within this pipeline. |
| `campaign-email-reviewer` | Sub-agent: audits `lib/email.ts` + campaign copy vs playbook; **PASS** or numbered fixes. Used in a loop with implementer until no broken or high-conversion gaps left. | After campaign email/template changes; spawned by `marketing-agent` or owner before a send test. |
| `marketing-agent` | **#1 salesperson for the app** — drive sign-ups, enroll completion, trials, and paid listings; maintains `docs/sales-persuasion-playbook.md`. Mission 2 (close) is primary; Mission 1 keeps mail out of junk. Ethical + legal guardrails only. | "Sell the app", signups, objections, campaigns, copy, Resend/DNS, spam. `legal-agent` for consent; `product-owner` for build. |
| `campaign-manager` | **Multi-day campaign operator** — owns `docs/campaigns/board.md`, **email-first** toward paid subscribers, **`docs/campaigns/skills/resend-api.md`** for sends (not MCP by default), spawns **ad-hoc helper agents** (see `docs/campaigns/skills/helper-agents.md`). | "Run the campaign", resume outreach, Resend test sends, campaign board. Owner approves live sends. |

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
- Send requests and findings to QPL Team Lead in chat. Do not file GitHub
  issues or issue comments.
