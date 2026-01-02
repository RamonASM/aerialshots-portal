import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { BreadcrumbJsonLd } from '@/lib/seo/json-ld'

export const metadata: Metadata = {
  title: 'Privacy Policy | Aerial Shots Media',
  description: 'Privacy Policy for Aerial Shots Media. Learn how we collect, use, and protect your personal information.',
}

export default function PrivacyPage() {
  const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://aerialshots.media'

  return (
    <main className="min-h-screen bg-black">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: SITE_URL },
          { name: 'Privacy Policy', url: `${SITE_URL}/legal/privacy` },
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
            Privacy Policy
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
            <h2>1. Introduction</h2>
            <p>
              Aerial Shots Media (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our services or visit our website.
            </p>

            <h2>2. Information We Collect</h2>
            <h3>2.1 Information You Provide</h3>
            <p>We collect information you voluntarily provide, including:</p>
            <ul>
              <li><strong>Account Information:</strong> Name, email address, phone number, and business information when you create an account</li>
              <li><strong>Booking Information:</strong> Property addresses, scheduling preferences, and service selections</li>
              <li><strong>Payment Information:</strong> Credit card details, billing address (processed securely through Stripe)</li>
              <li><strong>Communications:</strong> Messages, feedback, and support requests</li>
            </ul>

            <h3>2.2 Information Automatically Collected</h3>
            <p>When you use our services, we automatically collect:</p>
            <ul>
              <li><strong>Device Information:</strong> IP address, browser type, operating system</li>
              <li><strong>Usage Data:</strong> Pages visited, time spent, click patterns</li>
              <li><strong>Location Data:</strong> General geographic location based on IP address</li>
              <li><strong>Cookies:</strong> Session and preference data (see Cookie Policy below)</li>
            </ul>

            <h3>2.3 Property Information</h3>
            <p>When providing our services, we capture:</p>
            <ul>
              <li>Property photographs and videos</li>
              <li>Property measurements and floor plans</li>
              <li>3D scan data for virtual tours</li>
              <li>GPS coordinates for drone operations</li>
            </ul>

            <h2>3. How We Use Your Information</h2>
            <p>We use collected information to:</p>
            <ul>
              <li>Provide and improve our photography and media services</li>
              <li>Process bookings and payments</li>
              <li>Communicate about appointments, deliveries, and updates</li>
              <li>Send marketing communications (with your consent)</li>
              <li>Analyze usage patterns to improve our platform</li>
              <li>Comply with legal obligations</li>
              <li>Protect against fraud and unauthorized access</li>
            </ul>

            <h2>4. Information Sharing</h2>
            <p>We may share your information with:</p>
            <ul>
              <li><strong>Service Providers:</strong> Payment processors (Stripe), email services (Resend), SMS providers (Twilio)</li>
              <li><strong>Team Members:</strong> Photographers, videographers, and editors assigned to your project</li>
              <li><strong>Third-Party Integrations:</strong> MLS systems, property platforms (when you authorize)</li>
              <li><strong>Legal Authorities:</strong> When required by law or to protect our rights</li>
            </ul>
            <p>We do not sell your personal information to third parties.</p>

            <h2>5. Data Security</h2>
            <p>We implement industry-standard security measures including:</p>
            <ul>
              <li>SSL/TLS encryption for data in transit</li>
              <li>Encrypted storage for sensitive data</li>
              <li>Regular security audits and updates</li>
              <li>Access controls and authentication</li>
              <li>Secure payment processing through PCI-compliant providers</li>
            </ul>
            <p>While we strive to protect your information, no method of electronic storage is 100% secure.</p>

            <h2>6. Data Retention</h2>
            <p>We retain your information as follows:</p>
            <ul>
              <li><strong>Account Data:</strong> Until you request deletion</li>
              <li><strong>Media Files:</strong> 12 months from delivery (longer with premium storage)</li>
              <li><strong>Transaction Records:</strong> 7 years (for tax and legal compliance)</li>
              <li><strong>Communication Logs:</strong> 3 years</li>
            </ul>

            <h2>7. Your Rights</h2>
            <p>Depending on your location, you may have the right to:</p>
            <ul>
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Update inaccurate information</li>
              <li><strong>Deletion:</strong> Request removal of your data</li>
              <li><strong>Portability:</strong> Receive your data in a structured format</li>
              <li><strong>Opt-Out:</strong> Unsubscribe from marketing communications</li>
            </ul>
            <p>To exercise these rights, contact us at privacy@aerialshots.media.</p>

            <h2>8. Cookie Policy</h2>
            <p>We use cookies and similar technologies for:</p>
            <ul>
              <li><strong>Essential Cookies:</strong> Required for site functionality</li>
              <li><strong>Analytics Cookies:</strong> Help us understand usage patterns</li>
              <li><strong>Preference Cookies:</strong> Remember your settings</li>
            </ul>
            <p>You can manage cookie preferences through your browser settings.</p>

            <h2>9. Third-Party Links</h2>
            <p>
              Our website may contain links to third-party sites. We are not responsible for the privacy practices of external sites and encourage you to review their policies.
            </p>

            <h2>10. Children&apos;s Privacy</h2>
            <p>
              Our services are not directed to individuals under 18. We do not knowingly collect personal information from children. If we become aware of such collection, we will delete the information promptly.
            </p>

            <h2>11. California Privacy Rights (CCPA)</h2>
            <p>California residents have additional rights including:</p>
            <ul>
              <li>Right to know what personal information is collected</li>
              <li>Right to delete personal information</li>
              <li>Right to opt-out of sale of personal information (we do not sell data)</li>
              <li>Right to non-discrimination for exercising privacy rights</li>
            </ul>

            <h2>12. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy periodically. Changes will be posted on this page with an updated revision date. Significant changes will be communicated via email.
            </p>

            <h2>13. Contact Us</h2>
            <p>For privacy-related questions or concerns:</p>
            <ul>
              <li>Email: privacy@aerialshots.media</li>
              <li>Phone: (407) 555-1234</li>
              <li>Address: Central Florida</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  )
}
