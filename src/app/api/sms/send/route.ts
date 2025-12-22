import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendSMS, formatPhoneForTwilio, smsTemplates } from '@/lib/integrations/twilio/client'
import { requireStaffOrOwner } from '@/lib/middleware/auth'
import { handleApiError, badRequest } from '@/lib/utils/errors'

export async function POST(request: NextRequest) {
  return handleApiError(async () => {
    const supabase = await createClient()

    const body = await request.json()
    const {
      agent_id,
      listing_id,
      template,
      language = 'en',
    } = body

    if (!agent_id || !template) {
      throw badRequest('Agent ID and template are required')
    }

    // Security: Verify caller is staff or the agent themselves
    await requireStaffOrOwner(supabase, agent_id)

    // Validate template
    if (!smsTemplates[template as keyof typeof smsTemplates]) {
      return NextResponse.json(
        { error: 'Invalid template' },
        { status: 400 }
      )
    }

    // Get agent info
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('name, phone')
      .eq('id', agent_id)
      .single()

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      )
    }

    if (!agent.phone) {
      return NextResponse.json(
        { error: 'Agent has no phone number' },
        { status: 400 }
      )
    }

    const formattedPhone = formatPhoneForTwilio(agent.phone)
    if (!formattedPhone) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      )
    }

    // Get listing info if needed
    let listing = null
    if (listing_id) {
      const { data } = await supabase
        .from('listings')
        .select('address, city, state')
        .eq('id', listing_id)
        .single()
      listing = data
    }

    // Build variables
    const variables: Record<string, string> = {
      agentName: agent.name.split(' ')[0], // First name only
    }

    if (listing) {
      variables.address = listing.address
      variables.portalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/delivery/${listing_id}`
    }

    // Send SMS
    const result = await sendSMS({
      to: formattedPhone,
      template: template as keyof typeof smsTemplates,
      language: language as 'en' | 'es',
      variables,
    })

    // Log communication
    await supabase.from('communications').insert({
      agent_id,
      listing_id: listing_id || null,
      channel: 'sms',
      direction: 'outbound',
      to_address: formattedPhone,
      template_key: template,
      status: result.success ? 'sent' : 'failed',
      external_id: result.messageId || null,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send SMS' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
    })
  })
}
