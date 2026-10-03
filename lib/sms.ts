import twilio from 'twilio'
import { SuppressedError, isSuppressed } from './suppressions'

function getClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  if (!sid || !token) throw new Error('Twilio credentials not configured')
  return twilio(sid, token)
}

export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return null
}

export class SmsDisabledError extends Error {
  constructor() {
    super('SMS outreach is disabled (set SMS_OUTREACH_ENABLED=true to enable)')
    this.name = 'SmsDisabledError'
  }
}

const OPT_OUT_LINE = 'Reply STOP to opt out.'

export function withOptOutLanguage(body: string): string {
  return /\bstop\b/i.test(body) ? body : `${body.trimEnd()} ${OPT_OUT_LINE}`
}

/** `to` must be E.164 (see `normalizePhone`). */
export async function sendSms(to: string, body: string): Promise<string> {
  if (process.env.SMS_OUTREACH_ENABLED !== 'true') throw new SmsDisabledError()
  if (await isSuppressed('sms', to)) throw new SuppressedError('sms', to)

  const from = process.env.TWILIO_FROM_NUMBER
  if (!from) throw new Error('TWILIO_FROM_NUMBER not configured')
  const client = getClient()
  const message = await client.messages.create({ from, to, body: withOptOutLanguage(body) })
  return message.sid
}
