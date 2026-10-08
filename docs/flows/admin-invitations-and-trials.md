# Flow: Admin — Invitations, trials, enrollment links

Admin creates **paid enrollment links** or starts **free trials** without the business using `/enroll` checkout.

---

## Entry

`/admin?tab=invitations` — **Invitations** tab in `AdminClient` (sidebar label “Invitations”).

Lists rows from `GET /api/invitations` → `listInvitations()` (`lib/invitations.ts`). Admin can delete invitations via `DELETE /api/invitations?id=`.

---

## Paid enrollment link (modal)

From **Pinned Pros**: **Enrollment link** on a card → `EnrollmentLinkModal`.

1. Pick cities (`CityMultiSelect`), monthly price (default 29.99).
2. **Generate** → `POST /api/invitations` with `businessName`, `category`, `cities`, `monthlyPrice`, optional `yelpId` / `yelpData`, `existingCuratedId` for manual businesses.
3. Response `{ token }` → modal shows `{origin}/enroll/{token}` to copy.

Business flow from that URL: [enroll-paid-subscription.md](./enroll-paid-subscription.md).

---

## Trial (modal)

From **Pinned Pros**: **Start trial** → `TrialModal`.

1. Choose unlimited trial or limited days (default 30).
2. **Start** → `POST /api/invitations` with `isTrial: true`, `trialDays`, `existingCuratedId` or Yelp payload per `app/api/invitations/route.ts`.

Server path (`isTrial` branch):

- Creates or updates `curated_businesses` (trial dates, `is_trial`).
- `createTrialInvitation` with `status: 'trial'`, `monthly_price: 0`.
- Listing can appear in search when not draft/delisted and trial not expired — **no** Stripe step.

---

## Share link (search highlight)

`ShareLinkModal` — copies home URL:

`/?location={city}&category={value}&highlight={businessId}`

Opens homeowner flow with highlighted card: [homeowner-search.md](./homeowner-search.md).

---

## Key files

`components/EnrollmentLinkModal.tsx`, `components/TrialModal.tsx`, `components/ShareLinkModal.tsx`, `app/api/invitations/route.ts`, `app/admin/AdminClient.tsx`.
