import type { Metadata } from 'next'
import { PUBLIC_CONTACT_EMAIL } from '@/lib/site-contact'

// LEGAL DRAFT: pending owner/counsel review, not yet approved for production.
// Drafted by legal-agent against the app's actual data flows as of the commit
// that added this file (see lib/kv.ts, lib/invitations.ts, lib/campaigns.ts,
// lib/stripe.ts, app/layout.tsx). Do not treat as final or binding. Bracketed
// [OWNER TO FILL] values must be supplied by the owner before this can be
// treated as complete, and the whole document needs owner/counsel sign-off
// regardless. See GitHub issue #19.

export const metadata: Metadata = {
  title: 'Privacy Policy — QuickProList',
}

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-4">Privacy Policy</h1>
      <div className="bg-amber-50 ring-1 ring-amber-200 rounded-xl p-4 text-sm text-amber-900 mb-6 not-prose">
        <strong>Draft — pending legal review, see GitHub issue #19.</strong> This text was
        drafted by an AI agent from the app&apos;s current code and is not legal advice. It is
        not binding, not final, and must be reviewed and approved by QuickProList&apos;s owner
        (and, where noted, counsel) before it governs the site. Bracketed items marked{' '}
        <code>[OWNER TO FILL]</code> are placeholders the owner must complete.
      </div>

      <p className="text-sm text-slate-500">Last updated: [OWNER TO FILL — date of owner approval]</p>

      <h2>1. Who we are</h2>
      <p>
        QuickProList (&quot;QuickProList,&quot; &quot;we,&quot; &quot;us&quot;) operates
        quickprolist.com, a directory site that helps visitors find local home-service
        businesses (plumbers, electricians, HVAC, and similar categories) and lets those
        businesses pay for a featured listing. This policy explains what information we
        collect, from whom, why, and what choices are available.
      </p>
      <p>
        Legal entity and contact details: <strong>[OWNER TO FILL — legal entity name]</strong>,{' '}
        <strong>[OWNER TO FILL — physical postal address]</strong>. Privacy questions or
        requests: <strong>[OWNER TO FILL — contact email]</strong>.
      </p>

      <h2>2. Information we collect</h2>
      <h3>2.1 Visitors searching the site</h3>
      <p>
        You can search QuickProList without creating an account. Search queries (location and
        category) are sent to our server to run the search; we do not require or knowingly
        collect your name, email, or phone number just to search.
      </p>
      <p>
        <strong>&quot;Starred&quot; favorites</strong> are saved only in your browser&apos;s{' '}
        <code>localStorage</code> — never sent to or stored on our servers. Clearing your
        browser data removes them.
      </p>
      <p>
        We also process your IP address transiently, in server memory only, to apply rate
        limits that protect the Site from abuse (e.g. excessive search or checkout requests);
        this is not written to our database or retained after the request completes.
      </p>
      <p>
        We use <strong>Vercel Analytics</strong> and <strong>Vercel Speed Insights</strong> to
        collect aggregated, privacy-oriented usage and performance metrics (e.g. page views,
        load times). These do not use third-party advertising cookies as configured today.
      </p>

      <h3>2.2 Business listings shown in search results</h3>
      <p>
        Search results show businesses we have &quot;curated&quot; — stored in our own
        database. Some older curated listings were originally created from a snapshot of
        Yelp-provided information (business name, phone, address, photo, rating, review count,
        and category) stored in our database together with a Yelp business ID; we no longer
        query Yelp.
        {/* OWNER NOTE: our retention posture for this Yelp-sourced snapshot data is under
            internal review for compliance with Yelp's API terms and may change (e.g. to store
            only the Yelp business ID long-term and fetch display details live at request time).
            Do not publish this internal-review status in the public policy text; update this
            section to reflect the final posture once decided. */}
      </p>
      <p>
        If you submit your business through our &quot;List your business&quot; form, we store
        the business name, your name, email, phone (if provided), category, ZIP code, and any
        message you include, so we can follow up about a listing.
      </p>
      <p>
        For businesses we add manually (not sourced from Yelp), we store the information the
        business or our admin team provides directly (name, phone, address, website, and
        similar listing details).
      </p>

      <h3>2.3 Business owners who subscribe to a featured listing</h3>
      <p>When a business subscribes to a paid featured listing, we collect and store:</p>
      <ul>
        <li>
          Listing and enrollment details (business name, category, cities, price, and — if
          sourced from Yelp — the Yelp snapshot described above) in our{' '}
          <code>enrollment_invitations</code> table.
        </li>
        <li>
          The billing email address Stripe collects during checkout (
          <code>customer_details.email</code>), stored so we can contact you about billing
          issues (e.g. a failed payment).
        </li>
        <li>
          Payment card details are collected and processed entirely by{' '}
          <strong>Stripe</strong>, our payment processor. We never see or store your full card
          number.
        </li>
        <li>
          A private, unguessable <strong>dashboard token</strong> that lets you view your own
          listing&apos;s view/click statistics without creating a password-based account.
        </li>
      </ul>

      <h3>2.4 Outreach / campaign contacts</h3>
      <p>
        We sometimes contact local businesses (or businesses that reach out to us) by SMS or
        email to invite them to a paid listing. When we do, we record the business name, phone
        number and/or email address, the message sent, and delivery status in a{' '}
        <code>campaign_contacts</code> table, as a log of who was contacted.
        We keep a separate do-not-contact list of email addresses and phone numbers that have
        opted out, bounced, or reported our messages as spam, and check it before every
        marketing message so we do not contact them again.
      </p>

      <h3>2.5 Admin accounts</h3>
      <p>
        QuickProList staff who manage listings and campaigns sign in with
        their Google account (via Google OAuth) and must be on an internal admin allow-list. This is
        separate from any consumer- or business-facing account; consumers do not have login
        accounts on QuickProList today.
      </p>

      <h2>3. How we use information</h2>
      <ul>
        <li>To operate the search directory and display listings.</li>
        <li>To process and administer paid featured-listing subscriptions via Stripe.</li>
        <li>
          To contact businesses about featured-listing opportunities, and to contact
          subscribed businesses about billing or their subscription status.
        </li>
        <li>To measure and improve site performance and usage (aggregated analytics).</li>
        <li>To comply with legal obligations and enforce our Terms of Service.</li>
      </ul>
      <p>We do not sell personal information, and we do not use it for third-party advertising.</p>

      <h2>4. Who we share information with</h2>
      <p>We share information with the following service providers, each acting on our behalf:</p>
      <ul>
        <li><strong>Stripe</strong> — payment processing and subscription billing.</li>
        <li><strong>Supabase</strong> — our database and file storage (business photos).</li>
        <li><strong>Google</strong> — sign-in for QuickProList staff (Google OAuth).</li>
        <li><strong>Twilio</strong> — sends SMS outreach messages on our behalf.</li>
        <li><strong>Resend</strong> — sends outreach and transactional emails on our behalf.</li>
        <li><strong>Vercel</strong> — hosting, analytics, and performance monitoring.</li>
      </ul>
      <p>
        We do not otherwise sell, rent, or share personal information with third parties for
        their own marketing purposes.
      </p>

      <h2>5. Data retention</h2>
      <p>
        We retain curated-listing and enrollment data for as long as a listing is active plus a
        reasonable period after cancellation for billing/records purposes. Campaign contact
        records are retained as a log of outreach activity.
        {/* OWNER NOTE: our retention posture for Yelp-sourced data specifically is under
            internal review; see the note in section 2.2 above. Update this section once that
            review concludes rather than leaving an internal-review admission in public text. */}
      </p>

      <h2>6. Your choices</h2>
      <ul>
        <li>
          <strong>Businesses contacted by SMS:</strong> reply <strong>STOP</strong> to any text
          to opt out of future messages. Your opt-out is recorded automatically.
        </li>
        <li>
          <strong>Businesses contacted by email:</strong> click the <strong>Unsubscribe</strong>{' '}
          link at the bottom of any marketing email. Your opt-out is recorded automatically.
        </li>
        <li>
          <strong>Subscribed businesses:</strong> you can cancel your subscription at any time
          from your dashboard (Stripe Billing Portal) or by contacting us.
        </li>
        <li>
          <strong>Everyone:</strong> you may ask us what information we hold about you and
          request its deletion, subject to legal/billing retention needs, by contacting{' '}
          <strong>[OWNER TO FILL — contact email]</strong>.
        </li>
      </ul>

      <h2>7. California and other state privacy rights</h2>
      <p>
        Depending on your state of residence, you may have additional rights over your personal
        information (e.g. under the California Consumer Privacy Act). We do not sell personal
        information. <strong>[OWNER TO FILL / NEEDS COUNSEL — confirm applicability and add any
        required state-specific disclosures once business volume/geography is known.]</strong>
      </p>

      <h2>8. Children&apos;s privacy</h2>
      <p>QuickProList is not directed to children under 13, and we do not knowingly collect personal information from them.</p>

      <h2>9. Changes to this policy</h2>
      <p>
        We may update this policy as the product changes. Material changes will be reflected by
        updating the &quot;Last updated&quot; date above.
      </p>

      <h2>10. Contact us</h2>
      <p>
        Questions about this policy:{' '}
        <a href={`mailto:${PUBLIC_CONTACT_EMAIL}`} className="text-amber-800 underline">
          {PUBLIC_CONTACT_EMAIL}
        </a>
        , <strong>[OWNER TO FILL — physical postal address]</strong>.
      </p>
    </div>
  )
}
