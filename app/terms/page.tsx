import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service — QuickProList',
}

export default function TermsPage() {
  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-4">Terms of Service</h1>
      <div className="bg-amber-50 ring-1 ring-amber-200 rounded-xl p-4 text-sm text-amber-900 mb-6">
        Placeholder — pending legal review, see GitHub issue #19. This page does not yet contain
        binding legal text.
      </div>
      <p className="text-slate-600">
        These Terms of Service will govern use of QuickProList by visitors and by business owners
        subscribed to the paid pro listing service. Final content is pending owner/legal review.
      </p>
    </div>
  )
}
