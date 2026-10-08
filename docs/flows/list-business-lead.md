# Flow: List business lead (homepage form)

A business owner submits interest from the **“Get listed on QuickProList”** section on `/`.

---

## UI

`components/ListBusinessSection.tsx` on `app/page.tsx`.

1. Collapsed CTA → expand form.
2. Fields: business name, contact name, email, phone (optional), category (select), ZIP, message (optional).
3. Submit → `POST /api/list-business` with JSON body.
4. Success → thank-you state; form fields cleared.
5. Error → inline message from API `error` field.

Copy states “Free to apply — we'll review and reach out.” (no automatic listing creation in this flow).

---

## API

`app/api/list-business/route.ts`

**POST** — public, no auth.

- Required: `businessName`, `contactName`, `email`, `category`, `zip`.
- Email format validated.
- Persists via `createListingRequest` (`lib/listing-requests.ts`).
- On DB failure, logs error but still returns `{ ok: true }` (user sees success).

**GET** — admin only (`requireAdmin`); lists requests for admin UI.

---

## Admin follow-up

Admin reads submissions on **Requests** tab: [admin-listing-requests.md](./admin-listing-requests.md).

---

## Key files

`components/ListBusinessSection.tsx`, `app/api/list-business/route.ts`, `lib/listing-requests.ts`, `components/RequestsTab.tsx`.
