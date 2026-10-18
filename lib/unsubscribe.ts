import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { getCampaignSiteUrl } from './campaign-defaults'
import { normalizeEmail } from './suppressions'

const OPAQUE_VERSION = 'v2'

function configuredSecret(): string | null {
  const s = process.env.UNSUBSCRIBE_SECRET ?? process.env.CRON_SECRET
  return s ? s : null
}

function requireSecret(): string {
  const s = configuredSecret()
  if (!s) throw new Error('UNSUBSCRIBE_SECRET (or CRON_SECRET) not configured')
  return s
}

function sign(payload: string): string {
  return createHmac('sha256', requireSecret()).update(payload).digest('base64url')
}

function signaturesMatch(expectedSig: string, actualSig: string): boolean {
  const expected = Buffer.from(expectedSig)
  const actual = Buffer.from(actualSig)
  if (expected.length !== actual.length) return false
  return timingSafeEqual(expected, actual)
}

function aesKey(): Buffer {
  return createHash('sha256').update(requireSecret()).digest()
}

/** Opaque blob: random IV + GCM tag + ciphertext. The email is not recoverable without the server secret. */
function sealEmail(email: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', aesKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(email, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, ciphertext]).toString('base64url')
}

function openEmail(id: string): string | null {
  const secret = configuredSecret()
  if (!secret) return null
  const buf = Buffer.from(id, 'base64url')
  if (buf.length < 12 + 16 + 1) return null
  const iv = buf.subarray(0, 12)
  const tag = buf.subarray(12, 28)
  const ciphertext = buf.subarray(28)
  try {
    const decipher = createDecipheriv('aes-256-gcm', createHash('sha256').update(secret).digest(), iv)
    decipher.setAuthTag(tag)
    const email = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
    return email.includes('@') ? email : null
  } catch {
    return null
  }
}

/**
 * New links are `v2.<opaque id>.<hmac>`. The id does not contain the email.
 * Links minted before this (`base64url(email).<hmac>`) still verify.
 * Missing secret, bad signature, or a tampered id all fail closed (null).
 */
export function createUnsubscribeToken(email: string): string {
  const normalized = normalizeEmail(email)
  if (!normalized.includes('@')) throw new Error('Invalid unsubscribe email')
  const id = sealEmail(normalized)
  const payload = `${OPAQUE_VERSION}.${id}`
  return `${payload}.${sign(payload)}`
}

function verifyLegacy(payload: string, sig: string): string | null {
  if (!signaturesMatch(sign(payload), sig)) return null
  const email = Buffer.from(payload, 'base64url').toString()
  return email.includes('@') ? email : null
}

function verifyOpaque(id: string, sig: string): string | null {
  const payload = `${OPAQUE_VERSION}.${id}`
  if (!signaturesMatch(sign(payload), sig)) return null
  return openEmail(id)
}

/** Returns the normalized email if the token is authentic, else null. */
export function verifyUnsubscribeToken(token: string): string | null {
  if (!configuredSecret()) return null
  try {
    const parts = token.split('.')
    if (parts.length === 3 && parts[0] === OPAQUE_VERSION && parts[1] && parts[2]) {
      return verifyOpaque(parts[1], parts[2])
    }
    if (parts.length === 2 && parts[0] && parts[1]) return verifyLegacy(parts[0], parts[1])
    return null
  } catch {
    return null
  }
}

export function buildUnsubscribeUrl(email: string): string {
  return `${getCampaignSiteUrl()}/api/unsubscribe?token=${encodeURIComponent(createUnsubscribeToken(email))}`
}
