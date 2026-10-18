import type { Metadata } from 'next'
import { LEGAL_LAST_UPDATED, LEGAL_OPERATOR, legalContactMailto } from '@/lib/legal-site'
import { PUBLIC_CONTACT_EMAIL } from '@/lib/site-contact'

export const metadata: Metadata = {
  title: 'Terms of Service — QuickProList',
  description: 'Terms governing use of QuickProList and paid business listings.',
}

export default function TermsPage() {
  return (
    <div className="max-w-2xl mx-auto py-8 prose prose-slate prose-headings:text-slate-900">
      <h1 className="text-3xl font-bold text-slate-900 mb-2 not-prose">Terms of Service</h1>
      <p className="text-sm text-slate-500 not-prose">Last updated: {LEGAL_LAST_UPDATED}</p>

      <h2>1. Acceptance</h2>
      <p>
        These Terms of Service (&quot;Terms&quot;) govern your use of quickprolist.com and related
        pages (the &quot;Site&quot;), operated by <strong>{LEGAL_OPERATOR}</strong>{' '}
        (&quot;QuickProList,&quot; &quot;we,&quot; &quot;us&quot;). By using the Site — whether as
        a visitor or as a business enrolling in a paid listing — you agree to these Terms. If
        you do not agree, do not use the Site.
      </p>

      <h2>2. What QuickProList is</h2>
      <p>
        QuickProList is a search directory for local home-service businesses. Results include
        businesses we have added to our directory, including businesses in our paid listing
        program. QuickProList is not a contractor, does not perform home
        services, and does not employ, endorse, certify, or guarantee any listed business. Listing
        details may be incomplete or out of date; you are responsible for verifying licensing,
        insurance, and suitability before hiring anyone.
      </p>
      <p>
        Listings in our paid listing program, including free previews, are labeled &quot;Sponsored&quot; and
        may be shown ahead of other results. Payment affects whether and where a listing appears;
        it is not a recommendation. We do not perform background checks or license verification.
      </p>

      <h2>3. Visitors</h2>
      <p>
        You may search the Site without an account. You agree not to misuse the Site — for example,
        by scraping at scale, attempting to disrupt the Site, or using it for unlawful purposes.
      </p>

      <h2>4. Paid listings for businesses</h2>
      <h3>4.1 Enrollment</h3>
      <p>
        A business may enroll via an invitation link (email, SMS, or direct URL) or through a trial
        preview when offered. You must provide accurate business information and complete checkout
        through Stripe to subscribe.
      </p>
      <h3>4.2 Billing and cancellation</h3>
      <p>
        Paid listings are billed on a <strong>recurring monthly subscription</strong> at the
        price shown when you enroll (unless a different price is clearly displayed).{' '}
        <strong>
          Your subscription renews automatically each month until you cancel.
        </strong>{' '}
        You may cancel at any time online using the cancellation link in your subscription
        confirmation email, or by emailing{' '}
        <a href={legalContactMailto}>{PUBLIC_CONTACT_EMAIL}</a>. Cancellation stops future charges
        and takes effect at the end of the current billing period. If you subscribe during a free
        preview, billing starts on the day you subscribe and any remaining preview days are not
        added on. We do not provide prorated refunds for partial periods except where required by
        law. By subscribing, you authorize us and Stripe to charge your payment method on each
        renewal date.
      </p>
      <h3>4.3 Trials</h3>
      <p>
        We may offer a free 30-day preview. No payment information is collected during the preview,
        and you will not be charged. If the preview ends without a paid subscription, the listing
        is removed from search results automatically. One free preview per business.
      </p>
      <h3>4.4 Delisting</h3>
      <p>
        We may delist a business if payment fails, the subscription is canceled, the business
        violates these Terms, or we discontinue the listing program. Delisting removes the business
        from search; we may retain records as described in our Privacy Policy.
      </p>

      <h2>5. Communications</h2>
      <p>
        We may contact businesses by email or SMS about paid listings. Reply <strong>STOP</strong>{' '}
        to opt out of SMS. Use <strong>Unsubscribe</strong> in marketing emails. We honor opt-outs
        recorded in our systems.
      </p>

      <h2>6. Disclaimers</h2>
      <p>
        THE SITE AND ALL LISTINGS ARE PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot;
        WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING IMPLIED WARRANTIES
        OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT
        WARRANT THE ACCURACY OR RELIABILITY OF ANY LISTING OR THIRD-PARTY INFORMATION.
      </p>

      <h2>7. Limitation of liability</h2>
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, QUICKPROLIST AND ITS OPERATOR WILL NOT BE LIABLE
        FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF
        PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE SITE OR ANY LISTED BUSINESS&apos;S
        SERVICES. OUR TOTAL LIABILITY FOR ANY CLAIM ARISING OUT OF OR RELATING TO THE SITE OR
        THESE TERMS IS LIMITED TO THE GREATER OF (A) THE AMOUNTS YOU PAID TO QUICKPROLIST IN THE
        TWELVE (12) MONTHS BEFORE THE CLAIM OR (B) ONE HUNDRED U.S. DOLLARS (US$100). SOME
        JURISDICTIONS DO NOT ALLOW CERTAIN LIMITATIONS; IN THOSE CASES, OUR LIABILITY IS LIMITED
        TO THE FULLEST EXTENT PERMITTED BY LAW.
      </p>

      <h2>8. Indemnity</h2>
      <p>
        If you are a business using the Site, you agree to indemnify and hold harmless QuickProList
        and its operator from claims arising out of your listing content, your services, or your
        violation of these Terms or applicable law, except to the extent caused by our gross
        negligence or willful misconduct.
      </p>

      <h2>9. Termination</h2>
      <p>
        We may suspend or terminate access to the Site or a listing for violation of these Terms,
        non-payment, fraud, or conduct that harms users or QuickProList.
      </p>

      <h2>10. Governing law</h2>
      <p>
        These Terms are governed by the laws of the State of Georgia, USA, without regard to
        conflict-of-law rules. You agree that state or federal courts located in Georgia have
        exclusive jurisdiction over disputes arising from these Terms or the Site, except where
        applicable law requires otherwise.
      </p>

      <h2>11. Changes</h2>
      <p>
        We may update these Terms. The &quot;Last updated&quot; date will change when we do.
        Continued use of the Site after changes become effective constitutes acceptance of the
        revised Terms.
      </p>

      <h2>12. Contact</h2>
      <p>
        Questions about these Terms:{' '}
        <a href={legalContactMailto}>{PUBLIC_CONTACT_EMAIL}</a>.
      </p>
    </div>
  )
}
