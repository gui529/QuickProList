# Flow: `/search` URL redirect

Some links use `/search` with query parameters; the app normalizes them to the home page.

---

## Route

`app/search/page.tsx` (server component)

Reads `searchParams`: `location`, `category`, `lat`, `lng`, `highlight`.

Builds `URLSearchParams` and **`redirect`s to `/?{params}`** — same keys preserved.

---

## Who generates `/search` links

- **Enroll preview step** builds `` `/search?where=...` `` in `EnrollClient.tsx` (parameter name `where` is **not** read by `app/search/page.tsx`, which only forwards `location`, `category`, `lat`, `lng`, `highlight`). Documented as implemented.
- **Share link modal** builds `/?location=&category=&highlight=` directly (`components/ShareLinkModal.tsx`), not `/search`.

---

## Homeowner search behavior after redirect

See [homeowner-search.md](./homeowner-search.md).
