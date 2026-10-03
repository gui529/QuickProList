import { NextRequest } from 'next/server'
import { addSuppression } from '@/lib/suppressions'
import { verifyUnsubscribeToken } from '@/lib/unsubscribe'

function page(title: string, bodyHtml: string, status = 200): Response {
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${title}</title></head><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:80px auto;padding:0 20px;color:#334155">${bodyHtml}</body></html>`
  return new Response(html, { status, headers: { 'content-type': 'text/html; charset=utf-8' } })
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function invalid(): Response {
  return page('Invalid link', '<h1>This unsubscribe link is invalid.</h1><p>Reply to any of our emails and we will remove you manually.</p>', 400)
}

// GET only shows a confirm button. Unsubscribing on GET would let email
// security scanners that prefetch links silently unsubscribe real recipients.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') ?? ''
  const email = verifyUnsubscribeToken(token)
  if (!email) return invalid()

  return page(
    'Unsubscribe',
    `<h1>Unsubscribe</h1><p>Stop QuickProList marketing emails to <strong>${escapeHtml(email)}</strong>?</p>
     <form method="POST" action="/api/unsubscribe?token=${encodeURIComponent(token)}"><button type="submit" style="padding:10px 20px;font-size:16px">Unsubscribe</button></form>`
  )
}

// Handles both the confirm-page form and RFC 8058 one-click POSTs from mail clients.
export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') ?? ''
  const email = verifyUnsubscribeToken(token)
  if (!email) return invalid()

  await addSuppression('email', email, 'unsubscribe')
  return page('Unsubscribed', `<h1>You're unsubscribed.</h1><p>${escapeHtml(email)} will no longer receive marketing emails from QuickProList.</p>`)
}

