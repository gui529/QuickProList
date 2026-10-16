# Step 3 — Secrets for cloud campaign automation

Copy these into your **Cursor Automation** environment variables (same values as Vercel Production / your local `.env.local` where applicable). **Do not commit values.**

| Variable | Required | Notes |
|----------|----------|--------|
| `RESEND_API_KEY` | Yes | Resend dashboard |
| `RESEND_FROM_EMAIL` | Yes | e.g. `jeremy@quickprolist.com` |
| `UNSUBSCRIBE_SECRET` | Yes* | Or `CRON_SECRET` (production has both on Vercel `home-help`) |
| `SITE_URL` | Yes | `https://www.quickprolist.com` |
| `CAMPAIGN_SENDER_NAME` | Yes | e.g. `Jeremy` |
| `CAMPAIGN_BCC_EMAIL` | Optional | Defaults to `gui.quickprolist@gmail.com` in code |
| `DATABASE_URL` | Recommended | Neon **production** branch for `campaign-sync-listed-prospects.ts` |

\* Send script also accepts `CRON_SECRET` if `UNSUBSCRIBE_SECRET` unset.

**Where to copy from:** Vercel → Project **home-help** → Settings → Environment Variables → Production (re-enter into Cursor; do not paste into git).

After saving secrets, run **one manual** automation execution (Step 4).
