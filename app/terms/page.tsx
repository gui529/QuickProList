import type { Metadata } from 'next'

// LEGAL DRAFT: pending owner/counsel review, not yet approved for production.
// Drafted by legal-agent against the app's actual features as of the commit
// that added this file (see app/enroll/[token]/EnrollClient.tsx, lib/stripe.ts,
// lib/invitations.ts, lib/kv.ts). Do not treat as final or binding. Bracketed
// [OWNER TO FILL] / [NEEDS COUNSEL] values must be supplied/reviewed by the
// owner before this can be treated as complete, and the whole document needs
// owner/counsel sign-off regardless. See GitHub issue #19.

export const metadata: Metadata = {
  title: 'Terms of Service — QuickProList',
}

export default function TermsPage() {
  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-4">Terms of Service</h1>
      <div className="bg-amber-50 ring-1 ring-amber-200 rounded-xl p-4 text-sm text-amber-900 mb-6 not-prose">
        <strong>Draft — pending legal review, see GitHub issue #19.</strong> This text was
        drafted by an AI agent from the app&apos;s current features and is not legal advice. It
        is not binding, not final, and must be reviewed and approved by QuickProList&apos;s
        owner (and, where noted, counsel) before it governs the site. Bracketed items marked{' '}
        <code>[OWNER TO FILL]</code> or <code>[NEEDS COUNSEL]</code> are placeholders or open
        questions the owner must resolve.
      </div>

      <p className="text-sm text-slate-500">Last updated: [OWNER TO FILL — date of owner approval]</p>

      <h2>1. Acceptance of these terms</h2>
      <p>
        These Terms of Service (&quot;Terms&quot;) govern your use of quickprolist.com
        (the &quot;Site&quot;), operated by <strong>[OWNER TO FILL — legal entity name]</strong>{' '}
        (&quot;QuickProList,&quot; &quot;we,&quot; &quot;us&quot;). By using the Site — as a
        visitor searching for local businesses, or as a business subscribing to a featured
        listing — you agree to these Terms. If you do not agree, do not use the Site.
      </p>

      <h2>2. What QuickProList is</h2>
      <p>
        QuickProList is a search directory for local home-service businesses. Search results
        combine businesses we have separately agreed to feature (&quot;curated&quot; listings)
        with live results pulled from the Yelp Fusion API. QuickProList is <strong>not</strong>{' '}
        a contractor, does not perform home-service work itself, and does not employ, endorse,
        certify, or guarantee the quality, licensing, insurance, or work of any listed business.
        Ratings, reviews, and business details shown for Yelp-sourced results originate from
        Yelp and may not be current or accurate; we are not responsible for their accuracy.
        Curated and paid featured listings may be shown above other results in search.
        QuickProList does not perform background checks, license verification, or insurance
        verification of any listed business.
        {/* OWNER NOTE / NEEDS COUNSEL (see #19 comment thread, #81): the former on-listing
            trust label was removed. Confirm whether the pinned placement of paid/curated
            listings needs clearer on-listing
            disclosure (e.g. a "Featured"/"Sponsored" label) for FTC endorsement/advertising-
            disclosure purposes, separate from this Terms clause. */}
      </p>

      <h2>3. Visitors using search</h2>
      <p>
        You may search the Site free of charge and without creating an account. You agree not
        to misuse the Site — e.g. scraping listings at scale, attempting to disrupt the Site, or
        using it for any unlawful purpose.
      </p>

      <h2>4. Featured listings for businesses</h2>
      <h3>4.1 Enrollment</h3>
      <p>
        A business may be invited (by email, SMS, or a direct link) to subscribe to a featured
        listing, or may enroll after being curated as a trial listing. Enrolling requires
        providing accurate business information and completing checkout through our payment
        processor, Stripe.
      </p>
      <h3>4.2 Billing, auto-renewal, and cancellation</h3>
      <p>
        Featured listings are billed on a <strong>recurring monthly subscription</strong> at the
        price shown at the time of enrollment (currently $29.99/month unless a different price
        is shown to you). <strong>Your subscription automatically renews each month</strong> at
        the then-current price until you cancel. You may cancel at any time through your
        subscriber dashboard (Stripe Billing Portal link) or by contacting us; cancellation
        takes effect at the end of the then-current billing period, and we do not provide
        prorated refunds for partial periods except where required by law.
        <strong> [NEEDS COUNSEL — confirm the enrollment page&apos;s current
        &quot;Billed monthly, cancel anytime&quot; disclosure satisfies applicable
        auto-renewal/negative-option notice laws for the states where subscribers are located;
        several states require specific pre-purchase disclosures and a way to cancel that is at
        least as easy as signing up.]</strong>
      </p>
      <h3>4.3 Trials</h3>
      <p>
        We may offer a free trial period for a curated listing before requiring payment. Trial
        listings may be removed from search results without payment if the trial ends without
        conversion to a paid subscription, as reflected by the trial-expiration date shown to
        you.
      </p>
      <h3>4.4 Delisting</h3>
      <p>
        We may remove (delist) a featured listing if payment fails, the subscription is
        canceled, or the business violates these Terms. Delisting hides the listing from search
        results; it does not necessarily delete our records of it.
      </p>

      <h2>5. Outreach communications</h2>
      <p>
        We may contact businesses by SMS or email to offer a featured listing. You can opt out
        of SMS by replying <strong>STOP</strong>, and out of email by clicking the{' '}
        <strong>Unsubscribe</strong> link in any marketing email. Opt-outs are recorded
        automatically and we do not send marketing messages to opted-out contacts.
      </p>

      <h2>6. Disclaimers</h2>
      <p>
        THE SITE AND ALL LISTINGS ARE PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND.
        WE DO NOT WARRANT THE ACCURACY, COMPLETENESS, OR RELIABILITY OF ANY LISTING OR
        THIRD-PARTY DATA (INCLUDING YELP-SOURCED DATA). YOU ARE SOLELY RESPONSIBLE FOR VETTING
        ANY BUSINESS YOU CONTACT THROUGH THE SITE.
      </p>

      <h2>7. Limitation of liability</h2>
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, QUICKPROLIST WILL NOT BE LIABLE FOR ANY
        INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES ARISING FROM YOUR USE OF THE SITE OR ANY
        LISTED BUSINESS&apos;S SERVICES.{' '}
        <strong>[NEEDS COUNSEL — a liability cap/carve-outs clause should be drafted with
        counsel, tailored to applicable state law.]</strong>
      </p>

      <h2>8. Termination</h2>
      <p>
        We may suspend or terminate access to the Site, or a featured listing, for violation of
        these Terms, non-payment, or at our discretion with respect to non-paying visitors.
      </p>

      <h2>9. Governing law</h2>
      <p>
        These Terms are governed by the laws of{' '}
        <strong>the State of Georgia</strong>, without regard to conflict-of-law
        principles. <strong>[NEEDS COUNSEL — venue/arbitration clause, if desired.]</strong>
      </p>

      <h2>10. Changes to these Terms</h2>
      <p>
        We may update these Terms as the product changes. Continued use of the Site after an
        update constitutes acceptance of the revised Terms.
      </p>

      <h2>11. Contact us</h2>
      <p>
        Questions about these Terms: <strong>[OWNER TO FILL — contact email]</strong>,{' '}
        <strong>[OWNER TO FILL — physical postal address]</strong>.
      </p>
    </div>
  )
}
