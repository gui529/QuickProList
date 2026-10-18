import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import nextConfig from '../../next.config'
import robots from '../robots'

describe('preview pages stay out of search indexes', () => {
  it('sends X-Robots-Tag: noindex, nofollow on /preview/*', async () => {
    const rules = await nextConfig.headers?.()
    const preview = rules?.find((rule) => rule.source === '/preview/:path*')
    expect(preview?.headers).toEqual([{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }])
  })

  it('disallows /preview/ in robots.txt and leaves it out of the sitemap', () => {
    const body = robots()
    const rule = Array.isArray(body.rules) ? body.rules[0] : body.rules
    expect(rule.disallow).toContain('/preview/')

    const sitemap = readFileSync(path.join(__dirname, '../sitemap.ts'), 'utf8')
    expect(sitemap).not.toContain('/preview')
  })
})
