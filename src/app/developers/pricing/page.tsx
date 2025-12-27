'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Check, Zap, Building, Rocket } from 'lucide-react'

const plans = [
  {
    name: 'Free',
    description: 'Perfect for getting started and testing',
    price: '$0',
    period: 'forever',
    icon: Zap,
    features: [
      '100 requests per day',
      '10 requests per minute',
      'All location endpoints',
      'Theme park wait times',
      'Community support',
    ],
    limitations: [
      'No priority support',
      'Standard rate limits',
    ],
    cta: 'Get Started Free',
    href: '/developers/keys',
    popular: false,
  },
  {
    name: 'Pro',
    description: 'For developers building production apps',
    price: '$29',
    period: 'per month',
    icon: Rocket,
    features: [
      '10,000 requests per month',
      '60 requests per minute',
      'All location endpoints',
      'Theme park wait times',
      'Real-time traffic data',
      'Priority email support',
      'Usage analytics dashboard',
    ],
    limitations: [],
    cta: 'Start Pro Trial',
    href: '/developers/keys?plan=pro',
    popular: true,
  },
  {
    name: 'Business',
    description: 'For teams and high-volume applications',
    price: '$99',
    period: 'per month',
    icon: Building,
    features: [
      '100,000 requests per month',
      '300 requests per minute',
      'All location endpoints',
      'Theme park wait times',
      'Real-time traffic data',
      'Webhooks & notifications',
      'Priority phone support',
      'Custom caching rules',
      'SLA guarantee (99.9%)',
    ],
    limitations: [],
    cta: 'Start Business Trial',
    href: '/developers/keys?plan=business',
    popular: false,
  },
]

const enterpriseFeatures = [
  'Unlimited API requests',
  'Custom rate limits',
  'Dedicated infrastructure',
  'Custom endpoints',
  'On-premise deployment option',
  'Dedicated account manager',
  'Custom SLA',
  'White-label options',
]

const faqs = [
  {
    question: 'What counts as a request?',
    answer: 'Each API call counts as one request. The /overview endpoint that returns all data still counts as a single request, making it very cost-effective.',
  },
  {
    question: 'What happens if I exceed my limits?',
    answer: 'You\'ll receive a 429 error with rate limit headers. We recommend implementing exponential backoff. You can upgrade your plan anytime to increase limits.',
  },
  {
    question: 'Can I change plans anytime?',
    answer: 'Yes! You can upgrade or downgrade at any time. When upgrading, you get immediate access to higher limits. When downgrading, changes take effect at the next billing cycle.',
  },
  {
    question: 'Is there a free trial for paid plans?',
    answer: 'Yes, Pro and Business plans come with a 14-day free trial. No credit card required to start.',
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards through Stripe. Enterprise customers can also pay by invoice.',
  },
  {
    question: 'Do you offer refunds?',
    answer: 'We offer a 30-day money-back guarantee for all paid plans. If you\'re not satisfied, contact us for a full refund.',
  },
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/developers">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <h1 className="text-xl font-bold">API Pricing</h1>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Simple, Transparent Pricing
        </h2>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Start free, scale as you grow. No hidden fees, no surprises.
        </p>
      </section>

      {/* Pricing Cards */}
      <section className="container mx-auto px-4 pb-16">
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative ${
                plan.popular ? 'border-primary shadow-lg scale-105' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary">Most Popular</Badge>
                </div>
              )}
              <CardHeader className="text-center pb-2">
                <plan.icon className={`h-10 w-10 mx-auto mb-2 ${
                  plan.popular ? 'text-primary' : 'text-muted-foreground'
                }`} />
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="text-center pb-4">
                <div className="mb-6">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground ml-1">/{plan.period}</span>
                </div>
                <ul className="space-y-3 text-left">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                  {plan.limitations.map((limitation) => (
                    <li key={limitation} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="w-4 h-4 shrink-0" />
                      <span>{limitation}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  variant={plan.popular ? 'default' : 'outline'}
                  asChild
                >
                  <Link href={plan.href}>{plan.cta}</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>

      {/* Enterprise */}
      <section className="container mx-auto px-4 py-16">
        <Card className="max-w-4xl mx-auto bg-gradient-to-r from-primary/5 to-purple-500/5">
          <CardContent className="p-8 md:p-12">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <Badge variant="secondary" className="mb-4">Enterprise</Badge>
                <h3 className="text-2xl font-bold mb-4">Need Custom Solutions?</h3>
                <p className="text-muted-foreground mb-6">
                  For large-scale applications, custom integrations, or specific requirements,
                  our enterprise plan offers unlimited flexibility.
                </p>
                <Button asChild>
                  <Link href="mailto:api@aerialshots.media?subject=Enterprise API Inquiry">
                    Contact Sales
                  </Link>
                </Button>
              </div>
              <div>
                <ul className="grid grid-cols-1 gap-2">
                  {enterpriseFeatures.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Comparison Table */}
      <section className="container mx-auto px-4 py-16">
        <h3 className="text-2xl font-bold text-center mb-8">Compare Plans</h3>
        <div className="max-w-4xl mx-auto overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-4 pr-4">Feature</th>
                <th className="text-center py-4 px-4">Free</th>
                <th className="text-center py-4 px-4">Pro</th>
                <th className="text-center py-4 px-4">Business</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-4 pr-4">Monthly Requests</td>
                <td className="text-center py-4 px-4">3,000</td>
                <td className="text-center py-4 px-4">10,000</td>
                <td className="text-center py-4 px-4">100,000</td>
              </tr>
              <tr className="border-b">
                <td className="py-4 pr-4">Rate Limit (per minute)</td>
                <td className="text-center py-4 px-4">10</td>
                <td className="text-center py-4 px-4">60</td>
                <td className="text-center py-4 px-4">300</td>
              </tr>
              <tr className="border-b">
                <td className="py-4 pr-4">Location Endpoints</td>
                <td className="text-center py-4 px-4"><Check className="h-4 w-4 text-green-500 mx-auto" /></td>
                <td className="text-center py-4 px-4"><Check className="h-4 w-4 text-green-500 mx-auto" /></td>
                <td className="text-center py-4 px-4"><Check className="h-4 w-4 text-green-500 mx-auto" /></td>
              </tr>
              <tr className="border-b">
                <td className="py-4 pr-4">Theme Park Wait Times</td>
                <td className="text-center py-4 px-4"><Check className="h-4 w-4 text-green-500 mx-auto" /></td>
                <td className="text-center py-4 px-4"><Check className="h-4 w-4 text-green-500 mx-auto" /></td>
                <td className="text-center py-4 px-4"><Check className="h-4 w-4 text-green-500 mx-auto" /></td>
              </tr>
              <tr className="border-b">
                <td className="py-4 pr-4">Real-time Traffic</td>
                <td className="text-center py-4 px-4 text-muted-foreground">-</td>
                <td className="text-center py-4 px-4"><Check className="h-4 w-4 text-green-500 mx-auto" /></td>
                <td className="text-center py-4 px-4"><Check className="h-4 w-4 text-green-500 mx-auto" /></td>
              </tr>
              <tr className="border-b">
                <td className="py-4 pr-4">Usage Analytics</td>
                <td className="text-center py-4 px-4 text-muted-foreground">-</td>
                <td className="text-center py-4 px-4"><Check className="h-4 w-4 text-green-500 mx-auto" /></td>
                <td className="text-center py-4 px-4"><Check className="h-4 w-4 text-green-500 mx-auto" /></td>
              </tr>
              <tr className="border-b">
                <td className="py-4 pr-4">Webhooks</td>
                <td className="text-center py-4 px-4 text-muted-foreground">-</td>
                <td className="text-center py-4 px-4 text-muted-foreground">-</td>
                <td className="text-center py-4 px-4"><Check className="h-4 w-4 text-green-500 mx-auto" /></td>
              </tr>
              <tr className="border-b">
                <td className="py-4 pr-4">SLA Guarantee</td>
                <td className="text-center py-4 px-4 text-muted-foreground">-</td>
                <td className="text-center py-4 px-4 text-muted-foreground">-</td>
                <td className="text-center py-4 px-4">99.9%</td>
              </tr>
              <tr>
                <td className="py-4 pr-4">Support</td>
                <td className="text-center py-4 px-4">Community</td>
                <td className="text-center py-4 px-4">Email</td>
                <td className="text-center py-4 px-4">Phone + Email</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQs */}
      <section className="container mx-auto px-4 py-16">
        <h3 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h3>
        <div className="max-w-3xl mx-auto grid gap-6">
          {faqs.map((faq) => (
            <Card key={faq.question}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">{faq.question}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{faq.answer}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-16">
        <Card className="text-center max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl">Ready to Get Started?</CardTitle>
            <CardDescription>
              Join developers building location-aware applications with Life Here API.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/developers/keys">Get Free API Key</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/developers/docs">Read the Docs</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
