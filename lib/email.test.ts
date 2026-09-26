import { describe, expect, it, vi, beforeEach } from 'vitest'

const sendMock = vi.fn(async () => ({ data: { id: 'email_123' }, error: null }))

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: sendMock }
  },
}))

import { sendEmail } from './email'

describe('sendEmail (lib/email.ts)', () => {
  beforeEach(() => {
    sendMock.mockClear()
    process.env.RESEND_API_KEY = 'test_key'
    process.env.RESEND_FROM_EMAIL = 'noreply@example.com'
  })

  it('escapes HTML-unsafe characters in businessName and body lines before interpolating into the HTML email', async () => {
    await sendEmail(
      'owner@example.com',
      '<script>alert(1)</script>',
      'Hello <b>there</b>\nSecond line & "quoted" more'
    )

    expect(sendMock).toHaveBeenCalledTimes(1)
    const call = sendMock.mock.calls[0][0]

    expect(call.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(call.html).not.toContain('<script>alert(1)</script>')
    expect(call.html).toContain('Hello &lt;b&gt;there&lt;/b&gt;')
    expect(call.html).toContain('Second line &amp; &quot;quoted&quot; more')
  })

  it('leaves the plaintext fallback unescaped', async () => {
    const businessName = '<script>alert(1)</script>'
    const body = 'Hello <b>there</b>\nSecond line & "quoted" more'

    await sendEmail('owner@example.com', businessName, body)

    const call = sendMock.mock.calls[0][0]
    expect(call.text).toContain(body)
  })
})
