import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { addSuppression, normalizeEmail } from '@/lib/suppressions'

/**
 * Resend webhook: non-transient bounces and spam complaints go on the
 * do-not-contact list so we never mail those addresses again. In the Resend
 * dashboard subscribe to `email.bounced` and `email.complained`, point it at
 * {SITE_URL}/api/resend/webhook, and set RESEND_WEBHOOK_SECRET.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  const apiKey = process.env.RESEND_API_KEY
  if (!secret || !apiKey) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const payload = await req.text()
  let event
  try {
    event = new Resend(apiKey).webhooks.verify({
      payload,
      headers: {
        id: req.headers.get('svix-id') ?? '',
        timestamp: req.headers.get('svix-timestamp') ?? '',
        signature: req.headers.get('svix-signature') ?? '',
      },
      webhookSecret: secret,
    })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (event.type === 'email.complained') {
    for (const to of event.data.to) await addSuppression('email', normalizeEmail(to), 'complaint')
  } else if (event.type === 'email.bounced' && event.data.bounce.type !== 'Transient') {
    for (const to of event.data.to) await addSuppression('email', normalizeEmail(to), 'bounce')
  }
  return NextResponse.json({ ok: true })
}
