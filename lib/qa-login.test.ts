import { afterEach, describe, expect, it } from 'vitest'
import { qaLoginAllowed } from './qa-login'

const original = {
  secret: process.env.QA_ADMIN_SECRET,
  env: process.env.VERCEL_ENV,
}

afterEach(() => {
  if (original.secret === undefined) delete process.env.QA_ADMIN_SECRET
  else process.env.QA_ADMIN_SECRET = original.secret
  if (original.env === undefined) delete process.env.VERCEL_ENV
  else process.env.VERCEL_ENV = original.env
})

describe('qaLoginAllowed', () => {
  it('is off without a secret', () => {
    delete process.env.QA_ADMIN_SECRET
    delete process.env.VERCEL_ENV
    expect(qaLoginAllowed('home-help-git-dev-gui-costas-projects.vercel.app')).toBe(false)
  })

  it('is on for the dev host when the secret is set and this is not production', () => {
    process.env.QA_ADMIN_SECRET = 'secret'
    process.env.VERCEL_ENV = 'preview'
    expect(qaLoginAllowed('home-help-git-dev-gui-costas-projects.vercel.app')).toBe(true)
    expect(qaLoginAllowed('localhost:3000')).toBe(true)
  })

  it('is off on the production host even if the secret is set', () => {
    process.env.QA_ADMIN_SECRET = 'secret'
    delete process.env.VERCEL_ENV
    expect(qaLoginAllowed('www.quickprolist.com')).toBe(false)
    expect(qaLoginAllowed('quickprolist.com')).toBe(false)
  })

  it('is off when Vercel says this build is production', () => {
    process.env.QA_ADMIN_SECRET = 'secret'
    process.env.VERCEL_ENV = 'production'
    expect(qaLoginAllowed('home-help-git-dev-gui-costas-projects.vercel.app')).toBe(false)
  })
})
