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

Static React/MDX-style content in page components (placeholders may exist for contact email / address per file content at read time).

Privacy page mentions browser `localStorage` for preferences; the home page currently stores **`quickprolist:lastLocation`** only (`app/page.tsx`).

---

## Key files

`app/privacy/page.tsx`, `app/terms/page.tsx`.
