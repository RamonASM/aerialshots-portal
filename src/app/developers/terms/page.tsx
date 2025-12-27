import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'API Terms of Service | Life Here API',
  description: 'Terms of Service for the Life Here API by Aerial Shots Media',
}

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <article className="prose prose-invert prose-lg max-w-none">
          <h1 className="text-3xl font-bold text-white mb-2">Life Here API - Terms of Service</h1>
          <p className="text-[#636366] text-sm mb-8">
            Effective Date: December 27, 2024 | Last Updated: December 27, 2024
          </p>

          <p className="text-[#a1a1a6]">
            These Terms of Service (&quot;Terms&quot;) govern your access to and use of the Life Here API
            (&quot;API&quot; or &quot;Service&quot;) provided by Aerial Shots Media LLC (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;).
            By accessing or using the API, you agree to be bound by these Terms.
          </p>

          <hr className="border-white/10 my-8" />

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">1. Acceptance of Terms</h2>
            <p className="text-[#a1a1a6]">
              By subscribing to, accessing, or using the Life Here API, you acknowledge that you have read,
              understood, and agree to be bound by these Terms. If you are using the API on behalf of an
              organization, you represent that you have the authority to bind that organization to these Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">2. Description of Service</h2>
            <p className="text-[#a1a1a6] mb-4">
              The Life Here API provides location intelligence data for Central Florida, including:
            </p>
            <ul className="list-disc list-inside text-[#a1a1a6] space-y-1">
              <li>Life Here Scores (Dining, Convenience, Lifestyle, Commute)</li>
              <li>Theme park proximity and wait time data</li>
              <li>Beach access information</li>
              <li>Local dining and entertainment data</li>
              <li>Community events and news</li>
              <li>Commute time calculations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">3. API Keys and Security</h2>
            <p className="text-[#a1a1a6]">
              API keys are confidential and should be treated as passwords. You are responsible for keeping
              your API keys secure, all activity under your keys, and immediately notifying us of unauthorized use.
              You may not share, sell, or transfer your API keys to third parties.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">4. Permitted Use</h2>
            <p className="text-[#a1a1a6] mb-4">You may use the API to:</p>
            <ul className="list-disc list-inside text-[#a1a1a6] space-y-1 mb-4">
              <li>Build applications that provide value to end users</li>
              <li>Integrate location intelligence into real estate platforms</li>
              <li>Enhance travel, relocation, or lifestyle applications</li>
              <li>Conduct research and analysis (with appropriate attribution)</li>
            </ul>
            <p className="text-[#a1a1a6] mb-4">You may NOT:</p>
            <ul className="list-disc list-inside text-[#a1a1a6] space-y-1">
              <li>Resell, redistribute, or sublicense raw API data</li>
              <li>Use the API for any illegal or unauthorized purpose</li>
              <li>Circumvent rate limits or authentication mechanisms</li>
              <li>Store bulk data to create a competing service</li>
              <li>Misrepresent the source of data to end users</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">5. Rate Limits and Quotas</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-[#a1a1a6] border-collapse">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-2 text-white">Tier</th>
                    <th className="text-left py-2 text-white">Requests/Month</th>
                    <th className="text-left py-2 text-white">Rate Limit</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-white/5">
                    <td className="py-2">Free</td>
                    <td className="py-2">100/day</td>
                    <td className="py-2">10/min</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-2">Pro</td>
                    <td className="py-2">10,000/month</td>
                    <td className="py-2">60/min</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-2">Business</td>
                    <td className="py-2">100,000/month</td>
                    <td className="py-2">300/min</td>
                  </tr>
                  <tr>
                    <td className="py-2">Enterprise</td>
                    <td className="py-2">Custom</td>
                    <td className="py-2">Custom</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">6. Data and Attribution</h2>
            <p className="text-[#a1a1a6]">
              The API aggregates data from various third-party sources. We do not guarantee accuracy or
              timeliness of third-party data. When displaying data from the Life Here API to end users,
              include appropriate attribution such as &quot;Powered by Life Here API&quot; or &quot;Data by Aerial Shots Media.&quot;
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">7. Disclaimer of Warranties</h2>
            <p className="text-[#a1a1a6] uppercase text-sm">
              THE API IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND,
              EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
              NON-INFRINGEMENT, OR ACCURACY OF DATA.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">8. Limitation of Liability</h2>
            <p className="text-[#a1a1a6] uppercase text-sm">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, AERIAL SHOTS MEDIA LLC SHALL NOT BE LIABLE FOR
              ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES. OUR TOTAL LIABILITY
              SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE 12 MONTHS PRECEDING THE CLAIM.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">9. Termination</h2>
            <p className="text-[#a1a1a6]">
              You may stop using the API at any time. We may suspend or terminate your access immediately
              if you violate these Terms, pose a security risk, or as required by law. Upon termination,
              you must stop all use of API data and delete any cached data.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">10. Governing Law</h2>
            <p className="text-[#a1a1a6]">
              These Terms are governed by the laws of the State of Florida. Any disputes shall be resolved
              through binding arbitration in Orange County, Florida.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">11. Contact</h2>
            <p className="text-[#a1a1a6]">
              For questions about these Terms or the API:
            </p>
            <div className="mt-4 p-4 bg-white/[0.02] rounded-lg border border-white/[0.06]">
              <p className="text-white font-medium">Aerial Shots Media LLC</p>
              <p className="text-[#a1a1a6]">Email: api@aerialshots.media</p>
              <p className="text-[#a1a1a6]">Website: https://aerialshots.media</p>
              <p className="text-[#a1a1a6]">Developer Portal: https://app.aerialshots.media/developers</p>
            </div>
          </section>

          <hr className="border-white/10 my-8" />

          <p className="text-[#636366] text-sm">
            By using the Life Here API, you acknowledge that you have read and agree to these Terms of Service.
          </p>
          <p className="text-[#636366] text-sm mt-4">
            <strong>Aerial Shots Media LLC</strong><br />
            Orlando, Florida
          </p>
        </article>
      </div>
    </div>
  )
}
