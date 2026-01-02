import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { BreadcrumbJsonLd } from '@/lib/seo/json-ld'

export const metadata: Metadata = {
  title: 'Terms of Service | Aerial Shots Media',
  description: 'Terms of Service for Aerial Shots Media real estate photography and media services.',
}

export default function TermsPage() {
  const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://aerialshots.media'

  return (
    <main className="min-h-screen bg-black">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: SITE_URL },
          { name: 'Terms of Service', url: `${SITE_URL}/legal/terms` },
        ]}
      />

      {/* Header */}
      <section className="relative py-16 md:py-24 border-b border-white/5">
        <div className="container">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground">
            Terms of Service
          </h1>
          <p className="mt-4 text-muted-foreground">
            Last updated: January 2, 2026
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="container">
          <div className="max-w-3xl prose prose-invert prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground">
            <h2>1. Agreement to Terms</h2>
            <p>
              By accessing or using the services provided by Aerial Shots Media (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
            </p>

            <h2>2. Services Description</h2>
            <p>
              Aerial Shots Media provides real estate media services including but not limited to:
            </p>
            <ul>
              <li>Professional HDR photography</li>
              <li>Drone and aerial photography/videography</li>
              <li>Video production and property tours</li>
              <li>3D virtual tours (Matterport, Zillow 3D)</li>
              <li>Virtual staging</li>
              <li>Floor plans and property measurements</li>
            </ul>

            <h2>3. Booking and Scheduling</h2>
            <p>
              <strong>3.1 Booking Confirmation:</strong> All bookings are subject to availability and are confirmed upon receipt of payment or approved credit terms.
            </p>
            <p>
              <strong>3.2 Property Access:</strong> You are responsible for ensuring property access at the scheduled time. This includes coordinating with homeowners, tenants, or property managers.
            </p>
            <p>
              <strong>3.3 Property Condition:</strong> Properties should be photo-ready at the time of the appointment. We recommend reviewing our pre-shoot checklist for optimal results.
            </p>

            <h2>4. Cancellation and Rescheduling</h2>
            <p>
              <strong>4.1 Client Cancellations:</strong> Cancellations made at least 24 hours before the scheduled appointment will receive a full refund. Cancellations with less than 24 hours notice may be subject to a cancellation fee of up to 50% of the booking total.
            </p>
            <p>
              <strong>4.2 Weather-Related Cancellations:</strong> For services requiring outdoor photography (drone, exterior shots), we reserve the right to reschedule if weather conditions are unsuitable. Weather-related rescheduling incurs no additional fees.
            </p>
            <p>
              <strong>4.3 No-Shows:</strong> If we are unable to access the property at the scheduled time due to client or property access issues, the full booking amount will be charged.
            </p>

            <h2>5. Payment Terms</h2>
            <p>
              <strong>5.1 Payment Methods:</strong> We accept major credit cards, debit cards, and approved invoicing for established accounts.
            </p>
            <p>
              <strong>5.2 Payment Timing:</strong> Payment is due at the time of booking unless alternative arrangements have been made.
            </p>
            <p>
              <strong>5.3 Late Payments:</strong> Invoiced accounts that are past due may incur a late fee of 1.5% per month.
            </p>

            <h2>6. Delivery and Turnaround</h2>
            <p>
              <strong>6.1 Standard Delivery:</strong> Photos are typically delivered within 24 hours. Video and 3D tours are delivered within 48-72 hours.
            </p>
            <p>
              <strong>6.2 Rush Delivery:</strong> Same-day or expedited delivery is available for an additional fee.
            </p>
            <p>
              <strong>6.3 Access:</strong> All media is delivered through your personal agent portal and remains accessible for 12 months from the delivery date.
            </p>

            <h2>7. Usage Rights and Licensing</h2>
            <p>
              <strong>7.1 License Grant:</strong> Upon full payment, you receive a non-exclusive license to use the delivered media for marketing the specific property photographed, including MLS listings, websites, social media, and print materials.
            </p>
            <p>
              <strong>7.2 Restrictions:</strong> Media may not be resold, sublicensed, or used for purposes other than marketing the specific property without written permission.
            </p>
            <p>
              <strong>7.3 Copyright:</strong> Aerial Shots Media retains copyright ownership of all media. We may use media for portfolio, marketing, and promotional purposes unless otherwise agreed in writing.
            </p>

            <h2>8. Revisions and Re-shoots</h2>
            <p>
              <strong>8.1 Edits:</strong> One round of minor edits is included at no additional cost. Additional revisions may incur fees.
            </p>
            <p>
              <strong>8.2 Re-shoots:</strong> If there is a quality or coverage issue attributable to our team, we will schedule a re-shoot at no additional cost. Re-shoots requested due to changes in property condition or client preferences are subject to additional fees.
            </p>

            <h2>9. Drone Services</h2>
            <p>
              <strong>9.1 FAA Compliance:</strong> All drone operations are conducted by FAA Part 107 certified pilots in compliance with federal regulations.
            </p>
            <p>
              <strong>9.2 Airspace Restrictions:</strong> Some locations may have airspace restrictions that prevent drone operations. In such cases, we will notify you and provide alternative solutions when possible.
            </p>
            <p>
              <strong>9.3 Insurance:</strong> Our drone operations are covered by $2M liability insurance.
            </p>

            <h2>10. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Aerial Shots Media shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from or related to your use of our services. Our total liability shall not exceed the amount paid for the specific service in question.
            </p>

            <h2>11. Indemnification</h2>
            <p>
              You agree to indemnify and hold harmless Aerial Shots Media, its officers, directors, employees, and agents from any claims, damages, losses, or expenses arising from your use of our services or violation of these terms.
            </p>

            <h2>12. Dispute Resolution</h2>
            <p>
              Any disputes arising from these terms or our services shall be resolved through binding arbitration in Orange County, Florida, in accordance with the rules of the American Arbitration Association.
            </p>

            <h2>13. Modifications to Terms</h2>
            <p>
              We reserve the right to modify these terms at any time. Changes will be effective upon posting to our website. Continued use of our services after changes constitutes acceptance of the modified terms.
            </p>

            <h2>14. Contact Information</h2>
            <p>
              For questions about these Terms of Service, please contact us:
            </p>
            <ul>
              <li>Email: legal@aerialshots.media</li>
              <li>Phone: (407) 555-1234</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  )
}
