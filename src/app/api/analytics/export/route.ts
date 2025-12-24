import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get agent
    const { data: agent } = await supabase
      .from('agents')
      .select('id, name')
      .eq('email', user.email)
      .single()

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    const searchParams = request.nextUrl.searchParams
    const format = searchParams.get('format') || 'csv'
    const dateRange = searchParams.get('range') || '30' // days

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - parseInt(dateRange))

    // Fetch all analytics data
    const [pageViewsResult, downloadsResult, leadsResult] = await Promise.all([
      (supabase as any)
        .from('page_views')
        .select('*')
        .eq('agent_id', agent.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false }),

      (supabase as any)
        .from('media_downloads')
        .select('*')
        .eq('agent_id', agent.id)
        .gte('downloaded_at', startDate.toISOString())
        .order('downloaded_at', { ascending: false }),

      (supabase as any)
        .from('lead_conversions')
        .select('*')
        .eq('agent_id', agent.id)
        .gte('converted_at', startDate.toISOString())
        .order('converted_at', { ascending: false }),
    ])

    const pageViews = pageViewsResult.data || []
    const downloads = downloadsResult.data || []
    const leads = leadsResult.data || []

    if (format === 'csv') {
      // Generate CSV content
      const csvRows: string[] = []

      // Summary section
      csvRows.push('Analytics Report')
      csvRows.push(`Agent: ${agent.name}`)
      csvRows.push(`Generated: ${new Date().toISOString()}`)
      csvRows.push(`Date Range: Last ${dateRange} days`)
      csvRows.push('')

      // Summary metrics
      csvRows.push('Summary')
      csvRows.push(`Total Page Views,${pageViews.length}`)
      csvRows.push(`Unique Visitors,${new Set(pageViews.map((v: any) => v.visitor_id)).size}`)
      csvRows.push(`Total Downloads,${downloads.length}`)
      csvRows.push(`Total Leads,${leads.length}`)
      csvRows.push('')

      // Page Views detail
      csvRows.push('Page Views')
      csvRows.push('Date,Page Type,Visitor ID,Device,Browser,OS,Duration (s),Scroll Depth,Referrer')
      pageViews.forEach((view: any) => {
        csvRows.push([
          new Date(view.created_at).toISOString(),
          view.page_type || '',
          view.visitor_id || '',
          view.device_type || '',
          view.browser || '',
          view.os || '',
          view.duration_seconds || '',
          view.scroll_depth || '',
          view.referrer || '',
        ].join(','))
      })
      csvRows.push('')

      // Downloads detail
      csvRows.push('Downloads')
      csvRows.push('Date,Asset Type,File Name,Visitor ID')
      downloads.forEach((download: any) => {
        csvRows.push([
          new Date(download.downloaded_at).toISOString(),
          download.asset_type || '',
          download.file_name || '',
          download.visitor_id || '',
        ].join(','))
      })
      csvRows.push('')

      // Leads detail
      csvRows.push('Lead Conversions')
      csvRows.push('Date,Conversion Type,Lead Name,Lead Email,Lead Phone')
      leads.forEach((lead: any) => {
        csvRows.push([
          new Date(lead.converted_at).toISOString(),
          lead.conversion_type || '',
          lead.lead_name || '',
          lead.lead_email || '',
          lead.lead_phone || '',
        ].join(','))
      })

      const csv = csvRows.join('\n')

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="analytics-report-${dateRange}d.csv"`,
        },
      })
    }

    // JSON format
    return NextResponse.json({
      agent: agent.name,
      generatedAt: new Date().toISOString(),
      dateRange: `${dateRange} days`,
      summary: {
        totalPageViews: pageViews.length,
        uniqueVisitors: new Set(pageViews.map((v: any) => v.visitor_id)).size,
        totalDownloads: downloads.length,
        totalLeads: leads.length,
      },
      pageViews: pageViews.map((v: any) => ({
        date: v.created_at,
        pageType: v.page_type,
        device: v.device_type,
        browser: v.browser,
        duration: v.duration_seconds,
        scrollDepth: v.scroll_depth,
      })),
      downloads: downloads.map((d: any) => ({
        date: d.downloaded_at,
        assetType: d.asset_type,
        fileName: d.file_name,
      })),
      leads: leads.map((l: any) => ({
        date: l.converted_at,
        type: l.conversion_type,
        name: l.lead_name,
        email: l.lead_email,
      })),
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
