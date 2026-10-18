# Flow: `/search` URL redirect

Some links use `/search` with query parameters; the app normalizes them to the home page.

---

## Route

`app/search/page.tsx` (server component)

Reads `searchParams`: `location`, `category`, `lat`, `lng`, `highlight`.

Builds `URLSearchParams` and **`redirect`s to `/?{params}`** — same keys preserved.

---

## Who generates `/search` links

- **Enroll preview step** links straight to `/?location=&category=` (the homepage search), not `/search`.
- **Share link modal** builds `/?location=&category=&highlight=` directly (`components/ShareLinkModal.tsx`), not `/search`.

---

## Homeowner search behavior after redirect

See [homeowner-search.md](./homeowner-search.md).
