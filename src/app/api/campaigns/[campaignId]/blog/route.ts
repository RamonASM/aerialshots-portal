import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateBlogPost, exportBlogAsMarkdown, exportBlogAsHTML } from '@/lib/listinglaunch/blog-generator'
import { LISTINGLAUNCH_CREDITS } from '@/lib/listinglaunch/credits'
import type { NeighborhoodResearchData, GeneratedQuestion } from '@/lib/supabase/types'

interface RouteParams {
  params: Promise<{ campaignId: string }>
}

// POST - Generate blog post
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { campaignId } = await params
    const supabase = createAdminClient()

    // Get campaign with all necessary data
    const { data: campaign, error: campaignError } = await supabase
      .from('listing_campaigns')
      .select(`
        id,
        status,
        neighborhood_data,
        generated_questions,
        agent_answers,
        blog_post_content,
        listing:listings(
          id,
          address,
          city,
          state,
          zip,
          beds,
          baths,
          sqft,
          price
        ),
        agent:agents(
          id,
          name,
          phone,
          email
        )
      `)
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Check if already has blog content
    if (campaign.blog_post_content && Object.keys(campaign.blog_post_content).length > 0) {
      return NextResponse.json({
        blog: campaign.blog_post_content,
        cached: true,
      })
    }

    // Verify campaign has necessary data
    if (!campaign.neighborhood_data || !campaign.agent_answers) {
      return NextResponse.json(
        { error: 'Campaign must complete research and questions before generating blog' },
        { status: 400 }
      )
    }

    const listing = campaign.listing as {
      id: string
      address: string
      city: string | null
      state: string | null
      zip: string | null
      beds: number | null
      baths: number | null
      sqft: number | null
      price: number | null
    }

    const agent = campaign.agent as {
      id: string
      name: string
      phone: string | null
      email: string | null
    }

    // Check agent credit balance
    const { data: agentData } = await supabase
      .from('agents')
      .select('credit_balance')
      .eq('id', agent.id)
      .single()

    const creditBalance = agentData?.credit_balance || 0
    const requiredCredits = LISTINGLAUNCH_CREDITS.BLOG_GENERATION

    if (creditBalance < requiredCredits) {
      return NextResponse.json(
        {
          error: `Insufficient credits. Blog generation requires ${requiredCredits} credits, you have ${creditBalance}.`,
          requiredCredits,
          currentBalance: creditBalance,
        },
        { status: 402 } // Payment Required
      )
    }

    // Generate blog post
    const blog = await generateBlogPost(
      {
        address: listing.address,
        city: listing.city || '',
        state: listing.state || 'FL',
        zip: listing.zip || undefined,
        beds: listing.beds || 0,
        baths: listing.baths || 0,
        sqft: listing.sqft || 0,
        price: listing.price || undefined,
      },
      {
        name: agent.name,
        phone: agent.phone || undefined,
        email: agent.email || undefined,
      },
      campaign.neighborhood_data as unknown as NeighborhoodResearchData,
      (campaign.generated_questions as unknown as GeneratedQuestion[]) || [],
      (campaign.agent_answers as unknown as Record<string, string>) || {}
    )

    // Deduct credits for blog generation
    const newBalance = creditBalance - requiredCredits
    await supabase
      .from('agents')
      .update({ credit_balance: newBalance })
      .eq('id', agent.id)

    // Log the credit transaction
    await supabase.from('credit_transactions').insert({
      agent_id: agent.id,
      amount: -requiredCredits,
      type: 'asm_ai_tool',
      description: `[ListingLaunch] Generated blog post for ${listing.address}`,
    })

    // Save blog to campaign
    const { error: updateError } = await supabase
      .from('listing_campaigns')
      .update({
        blog_post_content: blog as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaignId)

    if (updateError) {
      console.error('Error saving blog:', updateError)
    }

    // Also save to listing_blog_posts table
    await supabase
      .from('listing_blog_posts')
      .upsert({
        campaign_id: campaignId,
        title: blog.title,
        slug: blog.slug,
        meta_description: blog.metaDescription,
        content: JSON.stringify(blog.sections),
        seo_keywords: blog.seoKeywords,
        status: 'draft' as const,
      }, {
        onConflict: 'campaign_id',
      })

    return NextResponse.json({
      blog,
      cached: false,
    })
  } catch (error) {
    console.error('Blog generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate blog post' },
      { status: 500 }
    )
  }
}

// GET - Get blog post with optional format
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { campaignId } = await params
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'json'

    const supabase = createAdminClient()

    const { data: campaign, error } = await supabase
      .from('listing_campaigns')
      .select('blog_post_content')
      .eq('id', campaignId)
      .single()

    if (error || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    if (!campaign.blog_post_content) {
      return NextResponse.json(
        { error: 'No blog post generated yet' },
        { status: 404 }
      )
    }

    const blog = campaign.blog_post_content as unknown as {
      title: string
      metaDescription: string
      slug: string
      sections: Array<{ title: string; content: string; keywords?: string[] }>
      seoKeywords: string[]
      estimatedReadTime: number
    }

    // Return in requested format
    const blogWithTokens = { ...blog, tokensUsed: 0 }
    switch (format) {
      case 'markdown':
        const markdown = exportBlogAsMarkdown(blogWithTokens)
        return new NextResponse(markdown, {
          headers: {
            'Content-Type': 'text/markdown',
            'Content-Disposition': `attachment; filename="${blog.slug}.md"`,
          },
        })

      case 'html':
        const html = exportBlogAsHTML(blogWithTokens)
        return new NextResponse(html, {
          headers: {
            'Content-Type': 'text/html',
            'Content-Disposition': `attachment; filename="${blog.slug}.html"`,
          },
        })

      default:
        return NextResponse.json({ blog })
    }
  } catch (error) {
    console.error('Blog fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch blog post' },
      { status: 500 }
    )
  }
}
