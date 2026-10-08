# User flows (QuickProList)

Each file documents **one flow** as implemented in the repo today — routes, UI steps, and APIs — without speculating about unbuilt behavior.

| Flow | Doc | Primary audience |
|------|-----|------------------|
| Home search for pros | [homeowner-search.md](./homeowner-search.md) | Homeowner / visitor |
| `/search` URL alias | [search-redirect.md](./search-redirect.md) | Homeowner / visitor |
| “Get listed” lead form | [list-business-lead.md](./list-business-lead.md) | Business owner (inbound) |
| Public ProSite page | [pro-site-visit.md](./pro-site-visit.md) | Homeowner / visitor |
| Paid enrollment (invitation → Stripe) | [enroll-paid-subscription.md](./enroll-paid-subscription.md) | Business owner |
| Business performance dashboard | [business-dashboard.md](./business-dashboard.md) | Subscribed business (token link) |
| Email unsubscribe | [email-unsubscribe.md](./email-unsubscribe.md) | Campaign recipient |
| SMS STOP / START | [sms-opt-out.md](./sms-opt-out.md) | SMS recipient |
| Admin sign-in | [admin-sign-in.md](./admin-sign-in.md) | Admin |
| Pinned pros (curate listings) | [admin-pinned-pros.md](./admin-pinned-pros.md) | Admin |
| Invitations, trials, share links | [admin-invitations-and-trials.md](./admin-invitations-and-trials.md) | Admin |
| Listing requests inbox | [admin-listing-requests.md](./admin-listing-requests.md) | Admin |
| Business reports tab | [admin-reports.md](./admin-reports.md) | Admin |
| Campaign outreach | [admin-campaigns-outreach.md](./admin-campaigns-outreach.md) | Admin |
| Privacy & Terms pages | [legal-static-pages.md](./legal-static-pages.md) | Any visitor |

**Automated / backend-only** (not a clickable site journey, but affects users):

| Flow | Doc |
|------|-----|
| Stripe webhook (go-live, delist, emails) | [stripe-webhook-effects.md](./stripe-webhook-effects.md) |
| Scheduled digest & win-back emails | [scheduled-email-jobs.md](./scheduled-email-jobs.md) |

**Code map:** `app/**/page.tsx` (10 pages), `app/api/**/route.ts` (22 API routes).
