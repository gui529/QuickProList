# Lessons learned (campaign-manager)

**File:** `docs/campaigns/lessons.json`  
**North star:** Every lesson must help **get paying subscribers** ($29.99/mo featured
listings) — not general notes, repo trivia, or curiosity.

Lessons are **actionable memory**: what to do differently so more pros **receive** mail,
**trust** it, **reply**, **start enroll/trial**, and **pay**.

The board **session log** is narrative; **lessons** are filtered rules for the next run.

---

## Subscriber impact test (required before adding a lesson)

Before appending to `lessons.json`, complete this sentence:

> **This improves subscribers because** ___.

If you cannot finish it with a plausible link to the funnel, **do not add the lesson**.
Log one line in the session log instead, or fix code/docs without polluting lessons.

| Funnel stage | Examples of valid lessons |
|--------------|-------------------------|
| **Reach** | Deliverability, pacing, DNS, list hygiene — mail must land |
| **Relevance** | Right wave (listed vs cold), city/category, honest copy |
| **Conversion** | Subject/body/CTA that got replies or enroll clicks |
| **Close** | Follow-up timing, objection handling, enroll-url usage |
| **Protect revenue** | Avoid complaints, double-sends, dishonest copy — one angry pro kills trust |

Tooling/env lessons are allowed **only** when they unblock or protect outbound mail
(e.g. broken unsub → no sends; duplicate send → burned lead).

---

## Every session

### Start (before sends)

1. Read **`lessons.json`** — all `"status": "active"` entries.
2. Prioritize lessons that touch **today’s wedge** (board focus) and **conversion**
   over pure infrastructure — but never violate **high** deliverability/dedupe lessons.
3. Apply **`do`** / **`dont`** to the send plan.

### End (after work)

1. Ask: *What moved us closer to a paying subscriber? What blocked that?*
2. Only distill insights that pass the **subscriber impact test** into **`lessons.json`**.
3. Each new row **must** include **`subscriberImpact`** (see shape below).
4. Supersede lessons that no longer help revenue; do not accumulate idle rules.

---

## When to add vs skip

| Add (if subscriberImpact is clear) | Skip |
|-------------------------------------|------|
| Copy/subject tied to reply or enroll | Generic cold-email theory with no A/B on our list |
| Bounce/complaint/junk pattern on real pros | One bad address |
| Targeting mistake (wrong wave, wrong slug → dead CTA) | Internal refactor with no send path change |
| Follow-up that recovered or lost a lead | Owner chit-chat unrelated to outreach |
| Env block that stopped sends | “Nice to know” Resend API detail |

---

## Lesson shape

```json
{
  "id": "YYYY-MM-DD-short-slug",
  "addedAt": "ISO-8601 with offset",
  "tags": ["deliverability", "copy", "conversion", "targeting", "follow-up", "env"],
  "severity": "high | medium | low",
  "subscriberImpact": "One sentence: how this increases paid subs or protects the path to them.",
  "lesson": "One sentence — the rule.",
  "evidence": "What happened (reply, junk, Resend id, Stripe, owner note).",
  "do": "Concrete behavior next time.",
  "dont": "Optional anti-pattern.",
  "status": "active | superseded"
}
```

- **`severity: high`** — violating it likely loses leads (spam folder, double-send, wrong copy for wave).
- When a lesson becomes **code or playbook truth**, implement there and **supersede** the JSON row.

---

## Feeding other docs

- **`lib/campaigns.ts` / playbook** — when a conversion lesson stabilizes.
- **`campaign-strategy.md`** — wave order and pace; only lessons that change who we mail or how fast.
- **`board.md`** — session log references lesson `id` when it validated or created a revenue-relevant rule.

---

## Owner input

Owner corrections count as lessons **when they change how we win subscribers** (tone,
cap, who to mail, what to promise). One-off scheduling preferences → session log only.
