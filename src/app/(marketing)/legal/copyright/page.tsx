import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { BreadcrumbJsonLd } from '@/lib/seo/json-ld'

export const metadata: Metadata = {
  title: 'Copyright Notice | Aerial Shots Media',
  description: 'Copyright and intellectual property information for Aerial Shots Media.',
}

export default function CopyrightPage() {
  const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://aerialshots.media'
  const currentYear = new Date().getFullYear()

  return (
    <main className="min-h-screen bg-black">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: SITE_URL },
          { name: 'Copyright', url: `${SITE_URL}/legal/copyright` },
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
            Copyright Notice
          </h1>
          <p className="mt-4 text-muted-foreground">
            Intellectual Property Information
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="container">
          <div className="max-w-3xl prose prose-invert prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground">
            <h2>Copyright Statement</h2>
            <p>
              Copyright {currentYear} Aerial Shots Media. All rights reserved.
            </p>
            <p>
              All content on this website, including but not limited to text, graphics, logos, images, photographs, videos, audio clips, and software, is the property of Aerial Shots Media or its content suppliers and is protected by United States and international copyright laws.
            </p>

            <h2>Photography and Media Copyright</h2>
            <h3>Ownership</h3>
            <p>
              All photographs, videos, 3D tours, floor plans, and other media created by Aerial Shots Media remain the intellectual property of Aerial Shots Media unless otherwise specified in a written agreement.
            </p>

            <h3>Client License</h3>
            <p>
              Upon full payment for services, clients receive a non-exclusive, perpetual license to use the delivered media for the following purposes:
            </p>
            <ul>
              <li>Marketing the specific property photographed</li>
              <li>MLS listings and real estate platforms</li>
              <li>Personal and company websites</li>
              <li>Social media marketing</li>
              <li>Print materials (brochures, flyers, postcards)</li>
              <li>Email marketing campaigns</li>
            </ul>

            <h3>Restrictions</h3>
            <p>The client license does NOT include the right to:</p>
            <ul>
              <li>Resell, sublicense, or transfer the media to third parties</li>
              <li>Use media for properties other than the one photographed</li>
              <li>Remove or alter watermarks or metadata</li>
              <li>Claim authorship or copyright ownership</li>
              <li>Use media in a manner that damages the reputation of Aerial Shots Media</li>
              <li>Enter media into competitions without written permission</li>
            </ul>

            <h3>Portfolio Rights</h3>
            <p>
              Aerial Shots Media retains the right to use all created media for portfolio, marketing, advertising, and promotional purposes. If you require an exclusive license or wish to restrict our portfolio use, please contact us before booking to discuss additional licensing arrangements.
            </p>

            <h2>Trademarks</h2>
            <p>
              &quot;Aerial Shots Media,&quot; the Aerial Shots Media logo, and all related names, logos, product and service names, designs, and slogans are trademarks of Aerial Shots Media. You may not use these marks without prior written permission.
            </p>

            <h2>Website Content</h2>
            <p>
              You may view and download content from this website solely for your personal, non-commercial use, provided that you:
            </p>
            <ul>
              <li>Keep all copyright and proprietary notices intact</li>
              <li>Do not modify the content in any way</li>
              <li>Do not use the content for commercial purposes without authorization</li>
            </ul>

            <h2>User-Submitted Content</h2>
            <p>
              By submitting content (reviews, testimonials, comments) to Aerial Shots Media, you grant us a non-exclusive, royalty-free, perpetual license to use, reproduce, and display such content for marketing and promotional purposes.
            </p>

            <h2>DMCA Notice</h2>
            <p>
              If you believe that any content on our website infringes your copyright, please send a notice to our designated copyright agent containing:
            </p>
            <ul>
              <li>Your physical or electronic signature</li>
              <li>Identification of the copyrighted work</li>
              <li>Identification of the infringing material and its location</li>
              <li>Your contact information</li>
              <li>A statement of good faith belief</li>
              <li>A statement of accuracy under penalty of perjury</li>
            </ul>
            <p>
              Send DMCA notices to: legal@aerialshots.media
            </p>

            <h2>Third-Party Content</h2>
            <p>
              Some content on this website may include materials from third parties. These materials are used with permission or under applicable licenses. Third-party content remains the property of their respective owners.
            </p>

            <h2>Fair Use</h2>
            <p>
              This website may contain copyrighted material whose use has not been specifically authorized by the copyright owner. Such material is made available for educational, research, commentary, or news reporting purposes. We believe this constitutes fair use under Section 107 of the U.S. Copyright Act.
            </p>

            <h2>Enforcement</h2>
            <p>
              We actively protect our intellectual property rights. Unauthorized use of our copyrighted materials may result in legal action, including claims for damages and injunctive relief.
            </p>

            <h2>Contact</h2>
            <p>
              For copyright inquiries, licensing requests, or permissions:
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
