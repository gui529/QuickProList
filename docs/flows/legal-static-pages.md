# Flow: Privacy & Terms (static pages)

Visitor reads legal copy; no forms or auth.

---

## Pages

| URL | File |
|-----|------|
| `/privacy` | `app/privacy/page.tsx` |
| `/terms` | `app/terms/page.tsx` |

Linked from enroll checkout footer (`EnrollClient.tsx`) and site footer where present.

---

## Content

Static content in `app/privacy/page.tsx` and `app/terms/page.tsx`. Operator label and contact email come from `lib/legal-site.ts` and `lib/site-contact.ts` (`contact@quickprolist.com`; no postal address on the public pages).

Privacy page mentions browser `localStorage` for preferences; the home page currently stores **`quickprolist:lastLocation`** only (`app/page.tsx`).

---

## Key files

`app/privacy/page.tsx`, `app/terms/page.tsx`.
