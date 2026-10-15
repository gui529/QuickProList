import type { Metadata } from 'next'
import { LEGAL_LAST_UPDATED, LEGAL_OPERATOR, legalContactMailto } from '@/lib/legal-site'
import { PUBLIC_CONTACT_EMAIL } from '@/lib/site-contact'

export const metadata: Metadata = {
  title: 'Privacy Policy — QuickProList',
  description: 'How QuickProList collects, uses, and shares information.',
}

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto py-8 prose prose-slate prose-headings:text-slate-900">
      <h1 className="text-3xl font-bold text-slate-900 mb-2 not-prose">Privacy Policy</h1>
      <p className="text-sm text-slate-500 not-prose">Last updated: {LEGAL_LAST_UPDATED}</p>

      <h2>1. Who we are</h2>
      <p>
        QuickProList (&quot;QuickProList,&quot; &quot;we,&quot; &quot;us&quot;) operates
        quickprolist.com, a directory that helps visitors find local home-service businesses
        (plumbers, electricians, HVAC, and similar categories) and lets those businesses pay for
        a featured listing. This policy explains what information we collect, from whom, why, and
        what choices you have.
      </p>
      <p>
        Operator: <strong>{LEGAL_OPERATOR}</strong>. Privacy questions or requests:{' '}
        <a href={legalContactMailto}>{PUBLIC_CONTACT_EMAIL}</a>.
      </p>

      <h2>2. Information we collect</h2>
      <h3>2.1 Visitors searching the site</h3>
      <p>
        You can search QuickProList without creating an account. Search queries (location and
        category) are sent to our servers to return results; we do not require your name, email, or
        phone number to search.
      </p>
      <p>
        <strong>Starred favorites</strong> are stored only in your browser&apos;s{' '}
        <code>localStorage</code> and are not sent to our servers. Clearing browser data removes
        them.
      </p>
      <p>
        We process your IP address transiently in server memory to apply rate limits that protect
        the site from abuse (for example, excessive search or checkout requests). We do not store
        IP addresses in our database for that purpose.
      </p>
      <p>
        We use <strong>Vercel Analytics</strong> and <strong>Vercel Speed Insights</strong> for
        aggregated usage and performance metrics (such as page views and load times). As configured
        today, these tools do not use third-party advertising cookies.
      </p>

      <h3>2.2 Business listings in search results</h3>
      <p>
        Search results show businesses we have added to our directory (&quot;curated&quot;
        listings), stored in our database. Some older listings may include information originally
        obtained from third-party directories; we do not rely on live feeds from those sources
        today.
      </p>
      <p>
        If you submit your business through our &quot;List your business&quot; form, we store the
        business name, your name, email, phone (if provided), category, ZIP code, and any message
        you include so we can follow up.
      </p>
      <p>
        For businesses we add manually, we store the information the business or our team
        provides (name, phone, address, website, photos, and similar listing details).
      </p>

      <h3>2.3 Business owners with a featured listing</h3>
      <p>When a business enrolls in a paid featured listing, we collect and store:</p>
      <ul>
        <li>Enrollment and listing details (business name, category, service area, and price).</li>
        <li>
          The billing email address collected by <strong>Stripe</strong> during checkout, so we can
          contact you about billing (for example, a failed payment).
        </li>
        <li>
          Payment card details, which are collected and processed only by Stripe. We do not store
          your full card number.
        </li>
        <li>
          A private dashboard link (unguessable token) so you can view listing statistics without a
          password-based account, when that feature is enabled.
        </li>
      </ul>

      <h3>2.4 Outreach and campaign contacts</h3>
      <p>
        We may contact local businesses by email or SMS to invite them to a featured listing. When
        we do, we log the business name, contact information, message content, and delivery status.
        We maintain a suppression list of addresses and numbers that have opted out, bounced, or
        reported spam, and we check it before sending marketing messages.
      </p>

      <h3>2.5 Admin access</h3>
      <p>
        QuickProList operators who manage listings and campaigns sign in with Google (OAuth) and
        must be on an internal allow-list. Consumers and businesses do not have general login
        accounts on QuickProList.
      </p>

      <h2>3. How we use information</h2>
      <ul>
        <li>Operate the directory and display listings.</li>
        <li>Process paid featured-listing subscriptions through Stripe.</li>
        <li>
          Contact businesses about listing opportunities and, for subscribers, about billing or
          subscription status.
        </li>
        <li>Measure and improve site performance (aggregated analytics).</li>
        <li>Comply with law and enforce our Terms of Service.</li>
      </ul>
      <p>We do not sell personal information and we do not use it for third-party advertising.</p>

      <h2>4. Who we share information with</h2>
      <p>We use service providers that process data on our behalf, including:</p>
      <ul>
        <li><strong>Stripe</strong> — payment processing and subscription billing.</li>
        <li><strong>Neon</strong> — hosted PostgreSQL database for listings and account data.</li>
        <li><strong>Cloudflare R2</strong> — storage for business photos we host.</li>
        <li><strong>Google</strong> — sign-in for QuickProList operators (OAuth).</li>
        <li><strong>Twilio</strong> — SMS messages, when used.</li>
        <li><strong>Resend</strong> — email delivery.</li>
        <li><strong>Vercel</strong> — hosting, analytics, and performance monitoring.</li>
      </ul>
      <p>
        We may also disclose information if required by law, to protect rights and safety, or in
        connection with a business transfer. We do not sell or share personal information for
        others&apos; independent marketing.
      </p>

      <h2>5. Data retention</h2>
      <p>
        We keep listing and enrollment data while a listing is active and for a reasonable period
        afterward for billing, tax, and dispute records. Outreach logs and suppression lists are
        retained as needed to honor opt-outs and document compliance.
      </p>

      <h2>6. Your choices</h2>
      <ul>
        <li>
          <strong>SMS:</strong> reply <strong>STOP</strong> to opt out of further texts.
        </li>
        <li>
          <strong>Email marketing:</strong> use the <strong>Unsubscribe</strong> link in any
          marketing email.
        </li>
        <li>
          <strong>Subscribers:</strong> cancel anytime through the Stripe billing portal (linked
          from your dashboard when available) or by emailing us.
        </li>
        <li>
          <strong>Privacy requests:</strong> email{' '}
          <a href={legalContactMailto}>{PUBLIC_CONTACT_EMAIL}</a> to ask what we hold about you or
          to request deletion, subject to legal and billing retention requirements.
        </li>
      </ul>

      <h2>7. U.S. state privacy rights</h2>
      <p>
        Depending on where you live, you may have rights to know, access, correct, or delete
        personal information, or to opt out of certain processing. We do not sell personal
        information. To exercise rights, contact{' '}
        <a href={legalContactMailto}>{PUBLIC_CONTACT_EMAIL}</a>. We will verify requests as
        required by law. California residents may designate an authorized agent; we may deny
        requests that are excessive, repetitive, or unfounded.
      </p>

      <h2>8. Children&apos;s privacy</h2>
      <p>
        QuickProList is not directed to children under 13, and we do not knowingly collect personal
        information from them.
      </p>

      <h2>9. Changes</h2>
      <p>
        We may update this policy as our practices change. We will post the revised policy on this
        page and update the &quot;Last updated&quot; date. Material changes may also be noted on
        the site where appropriate.
      </p>

      <h2>10. Contact</h2>
      <p>
        <a href={legalContactMailto}>{PUBLIC_CONTACT_EMAIL}</a>
      </p>
    </div>
  )
}
