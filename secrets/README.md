# Local secrets (not committed)

| File | Purpose |
|------|---------|
| `stripe-vercel-production.example` | Template — safe to copy |
| `stripe-vercel-production.txt` | **You** paste live `sk_live_…` and `whsec_…` here (gitignored) |

After saving `stripe-vercel-production.txt`, run from repo root:

```powershell
.\scripts\push-stripe-env-production.ps1
```

Or ask the agent to run it after you confirm the file is filled in.
