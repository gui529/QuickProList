import { createHash } from 'node:crypto'
import { query } from './db'
import { CATEGORY_IMAGES } from './category-images'
import { fetchLogoFromWebsite } from './website-logo'
import { isStorageConfigured, uploadPublicObject } from './storage'

export type CuratedImageSource = 'existing' | 'website-r2' | 'category-stock' | 'skipped'

export interface EnsureCuratedImageResult {
  imageUrl: string | null
  source: CuratedImageSource
}

function extFromContentType(ct: string, url: string): string {
  if (ct.includes('png')) return 'png'
  if (ct.includes('webp')) return 'webp'
  if (ct.includes('gif')) return 'gif'
  if (ct.includes('svg')) return 'svg'
  const fromUrl = url.match(/\.([a-z0-9]+)(?:\?|$)/i)?.[1]?.toLowerCase()
  if (fromUrl && ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(fromUrl)) {
    return fromUrl === 'jpeg' ? 'jpg' : fromUrl
  }
  return 'jpg'
}

async function fetchImageBytes(url: string): Promise<{ buf: ArrayBuffer; contentType: string } | null> {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: {
        'user-agent': 'QuickProList-CampaignBot/1.0 (+https://www.quickprolist.com)',
        accept: 'image/*,*/*',
      },
    })
    if (!res.ok) return null
    const ct = res.headers.get('content-type') ?? ''
    if (!ct.startsWith('image/') && !url.match(/\.(png|jpe?g|webp|gif|svg)(\?|$)/i)) return null
    const buf = await res.arrayBuffer()
    if (buf.byteLength > 5 * 1024 * 1024 || buf.byteLength < 200) return null
    return { buf, contentType: ct.startsWith('image/') ? ct : 'image/jpeg' }
  } catch {
    return null
  }
}

function categoryFallback(category: string, id: string): string | null {
  const list = CATEGORY_IMAGES[category]
  if (!list?.length) return null
  const n = parseInt(createHash('sha256').update(id).digest('hex').slice(0, 8), 16)
  return list[n % list.length]
}

/**
 * Set curated_businesses.image_url when missing: website logo → R2, else category stock (Pexels).
 * Search cards use next/image; logos must be on R2 or an allowed host (see next.config.ts).
 */
export async function ensureCuratedBusinessImage(
  businessId: string,
  options: { force?: boolean; dryRun?: boolean } = {}
): Promise<EnsureCuratedImageResult> {
  const rows = await query<{
    id: string
    category: string
    website_url: string | null
    image_url: string | null
  }>('SELECT id, category, website_url, image_url FROM curated_businesses WHERE id = $1', [businessId])
  const row = rows[0]
  if (!row) return { imageUrl: null, source: 'skipped' }

  const existing = row.image_url?.trim() || null
  if (existing && !options.force) {
    return { imageUrl: existing, source: 'existing' }
  }

  let imageUrl: string | null = null
  let source: CuratedImageSource = 'skipped'
  const storageOk = isStorageConfigured()

  if (row.website_url?.trim()) {
    const logoUrl = await fetchLogoFromWebsite(row.website_url)
    if (logoUrl) {
      const img = await fetchImageBytes(logoUrl)
      if (img && storageOk) {
        const ext = extFromContentType(img.contentType, logoUrl)
        if (!options.dryRun) {
          const key = `${crypto.randomUUID()}.${ext}`
          imageUrl = await uploadPublicObject(
            new Uint8Array(img.buf),
            img.contentType.split(';')[0],
            key
          )
        } else {
          imageUrl = logoUrl
        }
        source = 'website-r2'
      }
    }
  }

  if (!imageUrl) {
    imageUrl = categoryFallback(row.category, row.id)
    if (imageUrl) source = 'category-stock'
  }

  if (!imageUrl) return { imageUrl: null, source: 'skipped' }

  if (!options.dryRun && imageUrl !== existing) {
    await query('UPDATE curated_businesses SET image_url = $1 WHERE id = $2', [imageUrl, row.id])
  }

  return { imageUrl, source }
}
