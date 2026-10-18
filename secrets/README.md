# Local secrets (not committed)

| File | Purpose |
|------|---------|
| `stripe-vercel-production.example` | Template — safe to copy |
| `stripe-vercel-production.txt` | **You** paste live `sk_live_…` and `whsec_…` here (gitignored) |
| `campaign-automation-paste.env` | **You** fill `UNSUBSCRIBE_SECRET` (gitignored) — paste file into Cursor Automation |
| `campaign-automation-paste.env.example` | Template (safe to commit) |

After saving `stripe-vercel-production.txt`, run from repo root:

```powershell
.\scripts\push-stripe-env-production.ps1
```

**Campaign automation .env paste** (Cursor Automation env UI):

```powershell
.\scripts\fetch-campaign-automation-env.ps1
# or: npm run fetch:campaign-automation-env
```

Requires `vercel login` and linked project **home-help**. Writes `secrets/campaign-automation-paste.env` (gitignored). Uses production `UNSUBSCRIBE_SECRET`, or `CRON_SECRET` if unsub is missing/short.
