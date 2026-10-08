# Flow: Email unsubscribe

Recipient of a **marketing** email opts out of future campaign mail.

Transactional emails (welcome, payment failure) use `kind: 'transactional'` in `lib/email.ts` and do not include the marketing unsubscribe footer path described here.

---

## Link format

Marketing emails include `List-Unsubscribe` headers and a footer link to:

`/api/unsubscribe?token={signed}`

Token from `createUnsubscribeToken` (`lib/unsubscribe.ts`); requires `UNSUBSCRIBE_SECRET` or `CRON_SECRET`.

---

## Steps

### 1. GET `/api/unsubscribe?token=...`

`app/api/unsubscribe/route.ts`

- Verifies token → shows HTML page: “Stop … emails to **{email}**?” with a form **POST** button.
- Invalid token → 400 HTML “Invalid link”.
- **Does not** unsubscribe on GET (avoids mail-scanner false opt-outs).

### 2. POST `/api/unsubscribe?token=...`

- Valid token → `addSuppression('email', email, 'unsubscribe')` (`lib/suppressions.ts`).
- Success HTML: “You're unsubscribed.”
- Supports RFC 8058 one-click POST from clients that send `List-Unsubscribe-Post`.

---

## Effect on sends

`sendEmail` with default `kind: 'marketing'` checks `isSuppressed` and throws `SuppressedError` (`lib/email.ts`).

`POST /api/campaigns/send` returns **409** if email is suppressed before send.

---

## Key files

`app/api/unsubscribe/route.ts`, `lib/unsubscribe.ts`, `lib/suppressions.ts`, `lib/email.ts`.
