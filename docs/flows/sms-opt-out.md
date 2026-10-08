# Flow: SMS opt-out / opt-in (Twilio inbound)

Recipient texts a carrier keyword to the Twilio number used for campaign SMS.

---

## Endpoint

`POST /api/sms/inbound` — `app/api/sms/inbound/route.ts`

Configured in Twilio as the messaging webhook for `TWILIO_FROM_NUMBER`. Validates `x-twilio-signature` against `TWILIO_AUTH_TOKEN` and `{SITE_URL}/api/sms/inbound`.

---

## Keywords (body trimmed, uppercased)

| Set | Keywords | App action |
|-----|----------|------------|
| Opt-out | STOP, STOPALL, UNSUBSCRIBE, CANCEL, END, QUIT | `addSuppression('sms', From, ...)` |
| Opt-in | START, UNSTOP | `removeSuppression('sms', From)` |

Response: empty TwiML `<Response></Response>` (Twilio sends carrier confirmations per Twilio settings).

---

## Effect on campaign SMS

`POST /api/campaigns/send` (SMS channel) uses `sendSms`; suppressed numbers should be blocked by `lib/sms.ts` / suppressions (same pattern as email).

---

## Key files

`app/api/sms/inbound/route.ts`, `lib/suppressions.ts`, `lib/sms.ts`, `app/api/campaigns/send/route.ts`.
