import { describe, expect, it } from 'vitest'
import { addProspectToRegistry, mergeCuratedProspects, type ProspectRegistry } from './campaign-prospect-registry'
import type { SentRegistryEntry } from './campaign-sent-registry'

function registry(prospects: ProspectRegistry['prospects'] = []): ProspectRegistry {
  return { version: 1, updatedAt: '2026-10-01T00:00:00.000Z', prospects }
}

describe('prospect registry', () => {
  it('merges curated rows without resetting a sent prospect or dropping a manual one', () => {
    const merged = mergeCuratedProspects(
      [
        {
          businessName: 'Old Name',
          email: 'owner@kept.example',
          city: 'atlanta',
          category: 'plumbing',
          source: 'curated',
          status: 'sent',
          curatedId: 'id-1',
          emailSource: 'https://kept.example/contact',
          skipReason: 'should stay only if skip',
        },
        {
          businessName: 'Manual Co',
          email: 'owner@manual.example',
          city: 'marietta',
          category: 'roofing',
          source: 'manual',
          status: 'pending',
          emailSource: 'https://manual.example/contact',
        },
      ],
      [
        {
          id: 'id-1',
          name: 'Kept Plumbing',
          category: 'plumbing',
          cities: ['atlanta'],
          contact_email: null,
          website_url: 'https://kept.example',
        },
        {
          id: 'id-2',
          name: 'New Co',
          category: 'electricians',
          cities: ['marietta'],
          contact_email: 'Owner@New.example',
          website_url: 'https://new.example',
        },
      ]
    )
    const kept = merged.find((row) => row.curatedId === 'id-1')
    expect(kept?.status).toBe('sent')
    expect(kept?.email).toBe('owner@kept.example')
    expect(kept?.businessName).toBe('Kept Plumbing')
    expect(kept?.emailSource).toBe('https://kept.example/contact')
    expect(merged.find((row) => row.businessName === 'Manual Co')?.status).toBe('pending')
    expect(merged.find((row) => row.curatedId === 'id-2')).toMatchObject({
      email: 'owner@new.example',
      status: 'pending',
    })
  })

  it('refuses a duplicate email and an address already in send history', () => {
    const current = registry([
      {
        businessName: 'Acme',
        email: 'owner@acme.example',
        city: 'atlanta',
        category: 'plumbing',
        source: 'manual',
        status: 'pending',
      },
    ])
    expect(() =>
      addProspectToRegistry(current, {
        businessName: 'Acme 2',
        email: 'Owner@acme.example',
        city: 'marietta',
        category: 'roofing',
        sourceUrl: 'https://acme.example/contact',
      })
    ).toThrow(/Duplicate prospect/)

    const sent: SentRegistryEntry = {
      email: 'owner@fresh.example',
      businessName: 'Fresh',
      city: 'atlanta',
      category: 'plumbing',
      batch: 'b',
      resendId: 'r',
      subject: 's',
      sentAt: '2026-10-15T00:00:00.000Z',
    }
    expect(() =>
      addProspectToRegistry(
        registry(),
        {
          businessName: 'Fresh',
          email: 'owner@fresh.example',
          city: 'atlanta',
          category: 'plumbing',
          sourceUrl: 'https://fresh.example/contact',
        },
        { history: { resend: [sent], gmail: [] } }
      )
    ).toThrow(/REFUSED already contacted/)
  })

  it('flags a role address when adding it', () => {
    const current = registry()
    const added = addProspectToRegistry(current, {
      businessName: 'Role Co',
      email: 'info@role.example',
      city: 'atlanta',
      category: 'plumbing',
      sourceUrl: 'https://role.example/contact',
    })
    expect(added.roleAddress).toBe(true)
    expect(added.status).toBe('pending')
  })
})
