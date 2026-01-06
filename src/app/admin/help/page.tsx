import { redirect } from 'next/navigation'
import { currentUser } from '@clerk/nextjs/server'
import {
  HelpCircle,
  Mail,
  Phone,
  MessageSquare,
  FileText,
  ExternalLink,
  ChevronRight,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

const faqItems = [
  {
    question: 'How do I add a new team member?',
    answer: 'Go to Settings → Team Management and click "Add Team Member". Fill in their details and assign their role.',
  },
  {
    question: 'How do I configure payout splits?',
    answer: 'Navigate to Team → Payouts to configure revenue splits for photographers, videographers, and partners.',
  },
  {
    question: 'How does the QC workflow work?',
    answer: 'After a photographer uploads media, it goes to the QC queue. QC specialists review and either approve or request revisions.',
  },
  {
    question: 'How do I set up Stripe Connect for payouts?',
    answer: 'Team members can onboard to Stripe Connect from their settings page. Once connected, payouts are automatic after QC approval.',
  },
  {
    question: 'How do I manage service territories?',
    answer: 'Go to Team → Territories to assign geographic service areas to your photographers and videographers.',
  },
]

const supportLinks = [
  {
    title: 'Documentation',
    description: 'Browse our comprehensive guides and tutorials',
    href: 'https://docs.aerialshots.media',
    icon: FileText,
  },
  {
    title: 'Email Support',
    description: 'support@aerialshots.media',
    href: 'mailto:support@aerialshots.media',
    icon: Mail,
  },
  {
    title: 'Phone Support',
    description: '(407) 555-0123 • Mon-Fri 9am-5pm ET',
    href: 'tel:+14075550123',
    icon: Phone,
  },
]

export default async function AdminHelpPage() {
  const user = await currentUser()

  if (!user) {
    redirect('/sign-in/partner')
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500">
          <HelpCircle className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-white">Help & Support</h1>
          <p className="text-[15px] text-[#a1a1a6]">Find answers and get assistance</p>
        </div>
      </div>

      {/* Support Options */}
      <div className="grid gap-4 sm:grid-cols-3">
        {supportLinks.map((link) => (
          <a key={link.title} href={link.href} target="_blank" rel="noopener noreferrer">
            <Card variant="interactive" className="h-full">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1c1c1e]">
                    <link.icon className="h-5 w-5 text-[#a1a1a6]" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[15px] font-medium text-white">{link.title}</p>
                      <ExternalLink className="h-3.5 w-3.5 text-[#636366]" />
                    </div>
                    <p className="mt-0.5 text-[13px] text-[#a1a1a6]">{link.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </a>
        ))}
      </div>

      {/* FAQ Section */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Frequently Asked Questions
          </CardTitle>
          <CardDescription>Quick answers to common questions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {faqItems.map((item, index) => (
            <div
              key={index}
              className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-4"
            >
              <h3 className="flex items-center gap-2 text-[15px] font-medium text-white">
                <ChevronRight className="h-4 w-4 text-blue-500" />
                {item.question}
              </h3>
              <p className="mt-2 pl-6 text-[14px] leading-relaxed text-[#a1a1a6]">
                {item.answer}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Contact CTA */}
      <Card variant="glass">
        <CardContent className="flex items-center justify-between py-6">
          <div>
            <h3 className="text-[17px] font-semibold text-white">Still need help?</h3>
            <p className="mt-1 text-[14px] text-[#a1a1a6]">
              Our support team is ready to assist you with any questions.
            </p>
          </div>
          <Button asChild>
            <a href="mailto:support@aerialshots.media">
              <Mail className="mr-2 h-4 w-4" />
              Contact Support
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
