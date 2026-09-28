import { NextRequest } from 'next/server'
import twilio from 'twilio'
import { addSuppression, removeSuppression } from '@/lib/suppressions'

const OPT_OUT = new Set(['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'])
const OPT_IN = new Set(['START', 'UNSTOP'])

function twiml(): Response {
  return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
    headers: { 'content-type': 'text/xml' },
  })
}

/**
 * Twilio inbound-message webhook. Twilio itself sends the carrier-required
 * STOP/START confirmation replies and blocks sends to opted-out numbers; this
 * route mirrors those opt-outs into our own suppression list so our records
 * (and any other send path) agree. Configure it as the messaging webhook of
 * the Twilio number: POST {SITE_URL}/api/sms/inbound.
 */
export async function POST(req: NextRequest) {
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const signature = req.headers.get('x-twilio-signature')
  if (!authToken || !signature) return new Response('Unauthorized', { status: 401 })

  const params = Object.fromEntries(
    [...(await req.formData()).entries()].map(([k, v]) => [k, String(v)])
  )
  const siteUrl = (process.env.SITE_URL ?? 'https://www.quickprolist.com').replace(/\/$/, '')
  if (!twilio.validateRequest(authToken, signature, `${siteUrl}/api/sms/inbound`, params)) {
    return new Response('Unauthorized', { status: 401 })
  }

  const from = params.From
  const keyword = (params.Body ?? '').trim().toUpperCase()
  if (from) {
    if (OPT_OUT.has(keyword)) await addSuppression('sms', from, `sms-${keyword.toLowerCase()}`)
    else if (OPT_IN.has(keyword)) await removeSuppression('sms', from)
  }
  return twiml()
}
