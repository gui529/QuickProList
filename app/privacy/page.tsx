import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — QuickProList',
}

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-4">Privacy Policy</h1>
      <div className="bg-amber-50 ring-1 ring-amber-200 rounded-xl p-4 text-sm text-amber-900 mb-6">
        Placeholder — pending legal review, see GitHub issue #19. This page does not yet contain
        binding legal text.
      </div>
      <p className="text-slate-600">
        This Privacy Policy will describe how QuickProList collects, uses, and protects
        information about visitors and business owners who use this site. Final content is
        pending owner/legal review.
      </p>
    </div>
  )
}
