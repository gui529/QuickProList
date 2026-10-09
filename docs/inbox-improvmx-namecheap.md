# Inbound email: ImprovMX + Namecheap (`quickprolist.com`)

QuickProList **sends** mail via Resend (e.g. `jeremy@quickprolist.com`). **Inbound** mail to `@quickprolist.com` is handled by **ImprovMX** (free tier) and forwarded to the owner inbox.

Resend keeps DKIM/SPF on **`send.`** (and `resend._domainkey`); ImprovMX only needs **root `@` MX** and **one root SPF TXT**. Do not remove or change Resend records on `send`, `send.contact`, `rsend`, or `resend._domainkey`.

---

## Production state (verified 2026-10-09)

| Piece | Value |
|--------|--------|
| Forward destination | `gui529@hotmail.com` |
| ImprovMX alias | Catch-all `*` → Hotmail (all local parts) |
| ImprovMX `forwarding_ready` | `true` |
| Apex MX | `mx1.improvmx.com` (10), `mx2.improvmx.com` (20) |
| Apex SPF TXT | `v=spf1 include:spf.improvmx.com ~all` |
| DMARC | `_dmarc` → `v=DMARC1; p=none;` (valid) |
| Outbound | Unchanged — Resend on apex + `send` subdomain |

**Smoke test:** From an external mailbox (not `@quickprolist.com`), send to `contact@quickprolist.com` or any `something@quickprolist.com`. Message should arrive at Hotmail within a few minutes (check Junk once).

---

## Agent / API access (no web UI required)

1. **ImprovMX** — Set `IMPROVMX_API_KEY` in Windows **User** environment variables (ImprovMX dashboard → API). Use the Cursor skill `improvmx-api` and helper:

   ```powershell
   node "$env:USERPROFILE/.cursor/skills/improvmx-api/scripts/improvmx.mjs" GET /domains/quickprolist.com
   node "$env:USERPROFILE/.cursor/skills/improvmx-api/scripts/improvmx.mjs" GET /domains/quickprolist.com/aliases
   node "$env:USERPROFILE/.cursor/skills/improvmx-api/scripts/improvmx.mjs" POST /domains/quickprolist.com/verify
   ```

   Never commit the API key. `send_ready: false` on the domain is normal — we do not send outbound through ImprovMX.

2. **Namecheap DNS** — Cursor MCP `user-namecheap` (`dns_records_get`, `dns_records_save`) can add apex MX/TXT. ImprovMX cannot edit registrar DNS; run `POST .../verify` after changes.

---

## 1. ImprovMX account (initial setup)

1. Sign up at [improvmx.com](https://improvmx.com).
2. **Add domain** → `quickprolist.com`.
3. Under **Aliases**, add a **catch-all** `*` → `gui529@hotmail.com` (covers every address on the domain), or separate aliases:
   - `jeremy` → `gui529@hotmail.com`
   - `contact` → `gui529@hotmail.com`
4. Confirm any verification email ImprovMX sends to the forward destination.

---

## 2. Namecheap DNS

**Domain List** → **Manage** → **Advanced DNS**.

### Mail Settings

- **Mail Settings** → **Custom MX** (not Private Email).

Add two **MX** records for host **`@`**:

| Type | Host | Value | Priority |
|------|------|-------|----------|
| MX | `@` | `mx1.improvmx.com` | 10 |
| MX | `@` | `mx2.improvmx.com` | 20 |

Remove any other **MX** on `@` (old Resend inbound, etc.). **Do not** remove Resend records on **`send`**, **`resend._domainkey`**, or other subdomains.

### SPF (root only)

One **TXT** on host **`@`**:

```text
v=spf1 include:spf.improvmx.com ~all
```

If you already have a TXT starting with `v=spf1` on `@`, **merge** includes into a single record (only one SPF TXT on `@`). Do **not** add `include:amazonses.com` on `@` for Resend—that belongs on **`send.`** in Resend’s dashboard.

---

## 3. Verify

1. ImprovMX dashboard → **Check DNS**, or `POST /domains/quickprolist.com/verify` via API — `records.valid` should be `true` (often 15–60 minutes after DNS edits).
2. From an outside account, email **`contact@quickprolist.com`** and **`jeremy@quickprolist.com`** (or any catch-all address).
3. Reply to a campaign from admin and confirm it hits the same Hotmail inbox.

---

## 4. Reply from Hotmail (optional)

Use **Outlook/Hotmail** settings (or Gmail **Send mail as**) if you want to **reply as** `jeremy@` or `contact@` from your personal inbox. Outbound campaigns still go through **Resend** from the app.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Namecheap “Redirect Email” blocked | Expected when MX isn’t Namecheap’s; use ImprovMX MX above, ignore Redirect Email. |
| Resend still sends | Unaffected if `send.` / DKIM records are untouched. |
| Mail to contact@ bounces | MX not propagated or alias missing in ImprovMX; re-run verify. |
| ImprovMX `forwarding_ready: false` | Apex MX/SPF missing or still propagating. |

See also [email-deliverability.md](./email-deliverability.md) for Resend outbound DNS.
