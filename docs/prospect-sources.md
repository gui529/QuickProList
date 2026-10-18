# Prospect sources

Never use Yelp as a prospect source. Yelp's terms prohibit using its data for direct marketing. Legal put Yelp-sourced prospects on hold on 2026-10-17.

Gmail batches and follow-ups read `source` on each prospect in `docs/campaigns/prospects-registry.json` (`ProspectRecord` in `lib/campaign-prospect-registry.ts`). The allowlist lives in `lib/prospect-sources.ts`.

## Allowed sources

| Value | Meaning |
| --- | --- |
| `own_site` | The business's own website |
| `chamber` | Chamber of Commerce |
| `ga_sos` | Georgia Secretary of State business registry |
| `ga_license` | Georgia license lookup |

## Missing or anything else

A missing, blank, `yelp` (any case), or unknown `source` is disallowed. Batch selection and follow-ups skip that prospect with reason `disallowed_source`. If the address is also suppressed, the reason stays `suppressed`.

The Gmail prospect list is that JSON registry. This rule does not add a database column.
