'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Eye,
  Download,
  FileDown,
  Target,
  Zap,
  Crown,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Calendar,
  MapPin,
  Clock,
  Sparkles,
  Award,
  ChevronRight,
} from 'lucide-react'
import type { AnalyticsDashboardData } from '@/lib/analytics/types'

interface BenchmarkData {
  metric: string
  yourValue: number
  marketAvg: number
  topPerformers: number
  percentile: number
  unit: string
}

interface PredictiveInsight {
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  actionable: boolean
  action?: string
}

function BenchmarkCard({ data }: { data: BenchmarkData }) {
  const isAboveAvg = data.yourValue > data.marketAvg
  const percentDiff = Math.abs(((data.yourValue - data.marketAvg) / data.marketAvg) * 100)

  return (
    <div className="p-4 bg-neutral-800/50 rounded-lg border border-neutral-700">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-neutral-400">{data.metric}</span>
        <Badge
          variant="secondary"
          className={
            isAboveAvg
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'bg-amber-500/20 text-amber-400'
          }
        >
          Top {data.percentile}%
        </Badge>
      </div>

      <div className="space-y-2">
        <div className="flex items-end gap-2">
          <span className="text-2xl font-bold text-white">
            {data.yourValue.toLocaleString()}
          </span>
          <span className="text-sm text-neutral-500 mb-1">{data.unit}</span>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <span className="text-neutral-500">Market Avg:</span>
            <span className="text-neutral-300">{data.marketAvg.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-neutral-500">Top 10%:</span>
            <span className="text-neutral-300">{data.topPerformers.toLocaleString()}</span>
          </div>
        </div>

        <div className="h-2 bg-neutral-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${isAboveAvg ? 'bg-emerald-500' : 'bg-amber-500'}`}
            style={{ width: `${Math.min(data.percentile, 100)}%` }}
          />
        </div>

        <div className={`flex items-center gap-1 text-xs ${isAboveAvg ? 'text-emerald-400' : 'text-amber-400'}`}>
          {isAboveAvg ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          <span>{percentDiff.toFixed(1)}% {isAboveAvg ? 'above' : 'below'} market average</span>
        </div>
      </div>
    </div>
  )
}

function InsightCard({ insight }: { insight: PredictiveInsight }) {
  const impactColors = {
    high: 'border-emerald-500/50 bg-emerald-500/10',
    medium: 'border-blue-500/50 bg-blue-500/10',
    low: 'border-neutral-500/50 bg-neutral-500/10',
  }

  const impactBadgeColors = {
    high: 'bg-emerald-500/20 text-emerald-400',
    medium: 'bg-blue-500/20 text-blue-400',
    low: 'bg-neutral-500/20 text-neutral-400',
  }

  return (
    <div className={`p-4 rounded-lg border ${impactColors[insight.impact]}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-400" />
          <span className="font-medium text-white">{insight.title}</span>
        </div>
        <Badge variant="secondary" className={impactBadgeColors[insight.impact]}>
          {insight.impact} impact
        </Badge>
      </div>
      <p className="text-sm text-neutral-400 mb-3">{insight.description}</p>
      {insight.actionable && insight.action && (
        <Button size="sm" variant="outline" className="border-neutral-700 text-neutral-300 hover:bg-neutral-800">
          {insight.action} <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      )}
    </div>
  )
}

function PerformanceRadar({ data }: { data: AnalyticsDashboardData }) {
  // Simple radar representation using bars
  const metrics = [
    { label: 'Views', value: 85 },
    { label: 'Engagement', value: 72 },
    { label: 'Leads', value: 68 },
    { label: 'Downloads', value: 90 },
    { label: 'Retention', value: 78 },
  ]

  return (
    <Card className="bg-neutral-900 border-neutral-800">
      <CardHeader>
        <CardTitle className="text-lg text-white flex items-center gap-2">
          <Target className="h-5 w-5 text-blue-500" />
          Performance Score
        </CardTitle>
        <CardDescription className="text-neutral-400">
          Overall rating: 79/100
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {metrics.map((metric) => (
            <div key={metric.label} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-400">{metric.label}</span>
                <span className="text-white font-medium">{metric.value}</span>
              </div>
              <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full"
                  style={{ width: `${metric.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default function InsightsPage() {
  const [data, setData] = useState<AnalyticsDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('benchmarks')

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/analytics/dashboard')
        if (res.ok) {
          const analyticsData = await res.json()
          setData(analyticsData)
        }
      } catch (error) {
        console.error('Failed to load insights:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Generate benchmark data
  const benchmarks: BenchmarkData[] = data ? [
    {
      metric: 'Avg. Views per Listing',
      yourValue: data.activeListings > 0 ? Math.round(data.pageViews.totalViews / data.activeListings) : 0,
      marketAvg: data.benchmarks.avgViewsPerListing,
      topPerformers: Math.round(data.benchmarks.avgViewsPerListing * 2.5),
      percentile: 75,
      unit: 'views',
    },
    {
      metric: 'Session Duration',
      yourValue: data.pageViews.avgDurationSeconds || 0,
      marketAvg: data.benchmarks.avgSessionDuration,
      topPerformers: Math.round(data.benchmarks.avgSessionDuration * 1.8),
      percentile: 68,
      unit: 'seconds',
    },
    {
      metric: 'Lead Conversion Rate',
      yourValue: data.leads.conversionRate,
      marketAvg: data.benchmarks.avgLeadConversionRate,
      topPerformers: data.benchmarks.avgLeadConversionRate * 2,
      percentile: 82,
      unit: '%',
    },
    {
      metric: 'Download Rate',
      yourValue: data.pageViews.totalViews > 0
        ? Math.round((data.downloads.totalDownloads / data.pageViews.totalViews) * 100)
        : 0,
      marketAvg: data.benchmarks.avgDownloadRate,
      topPerformers: Math.round(data.benchmarks.avgDownloadRate * 1.5),
      percentile: 71,
      unit: '%',
    },
  ] : []

  // Generate predictive insights
  const insights: PredictiveInsight[] = [
    {
      title: 'Video Listings Perform 40% Better',
      description: 'Listings with professional video receive 40% more views and 2.3x more leads on average.',
      impact: 'high',
      actionable: true,
      action: 'Add Video to Listings',
    },
    {
      title: 'Peak Viewing Hours Identified',
      description: 'Your listings get the most views between 7-9 PM. Consider scheduling social posts during this window.',
      impact: 'medium',
      actionable: true,
      action: 'View Best Times',
    },
    {
      title: 'Mobile Traffic Increasing',
      description: '67% of your traffic comes from mobile devices. Ensure your listings are mobile-optimized.',
      impact: 'medium',
      actionable: false,
    },
    {
      title: 'Geographic Opportunity',
      description: 'You have strong engagement in Winter Park but limited presence. Consider expanding there.',
      impact: 'high',
      actionable: true,
      action: 'View Market Analysis',
    },
  ]

  const handleExportPDF = () => {
    // Open print dialog for PDF
    window.print()
  }

  const handleExportCSV = () => {
    // Download CSV
    window.location.href = '/api/analytics/export?format=csv&range=30'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-neutral-800 rounded w-48" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-48 bg-neutral-900 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-white">Premium Insights</h1>
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                <Crown className="h-3 w-3 mr-1" />
                Pro
              </Badge>
            </div>
            <p className="text-neutral-400">Deep analytics and market intelligence</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="border-neutral-700" onClick={handleExportCSV}>
              <FileDown className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleExportPDF}>
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-neutral-900 border border-neutral-800">
            <TabsTrigger value="benchmarks" className="data-[state=active]:bg-neutral-800">
              <BarChart3 className="h-4 w-4 mr-2" />
              Benchmarks
            </TabsTrigger>
            <TabsTrigger value="predictions" className="data-[state=active]:bg-neutral-800">
              <Zap className="h-4 w-4 mr-2" />
              Predictive Insights
            </TabsTrigger>
            <TabsTrigger value="trends" className="data-[state=active]:bg-neutral-800">
              <TrendingUp className="h-4 w-4 mr-2" />
              Market Trends
            </TabsTrigger>
          </TabsList>

          <TabsContent value="benchmarks" className="space-y-6">
            {/* Benchmark Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {benchmarks.map((benchmark) => (
                <BenchmarkCard key={benchmark.metric} data={benchmark} />
              ))}
            </div>

            {/* Performance and Ranking */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <PerformanceRadar data={data!} />

              <Card className="bg-neutral-900 border-neutral-800 lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    <Award className="h-5 w-5 text-amber-500" />
                    Your Ranking
                  </CardTitle>
                  <CardDescription className="text-neutral-400">
                    Compared to 247 agents in your market
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-lg border border-amber-500/20">
                      <div>
                        <p className="text-sm text-neutral-400">Overall Ranking</p>
                        <p className="text-3xl font-bold text-white">#23</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-emerald-400 flex items-center gap-1 justify-end">
                          <ArrowUpRight className="h-4 w-4" />
                          +5 from last month
                        </p>
                        <p className="text-xs text-neutral-500">Top 10% in your area</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-3 bg-neutral-800/50 rounded-lg">
                        <p className="text-2xl font-bold text-white">#18</p>
                        <p className="text-xs text-neutral-400">Views Ranking</p>
                      </div>
                      <div className="text-center p-3 bg-neutral-800/50 rounded-lg">
                        <p className="text-2xl font-bold text-white">#31</p>
                        <p className="text-xs text-neutral-400">Leads Ranking</p>
                      </div>
                      <div className="text-center p-3 bg-neutral-800/50 rounded-lg">
                        <p className="text-2xl font-bold text-white">#12</p>
                        <p className="text-xs text-neutral-400">Engagement</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="predictions" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {insights.map((insight, i) => (
                <InsightCard key={i} insight={insight} />
              ))}
            </div>

            <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-500/20 rounded-lg">
                    <Sparkles className="h-6 w-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">AI-Powered Recommendations</h3>
                    <p className="text-neutral-400 mb-4">
                      Based on your performance data and market trends, here are personalized recommendations to boost your results.
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-neutral-300">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>Add twilight photos to increase engagement by 25%</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-neutral-300">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>Post Just Listed graphics between 6-8 PM for best reach</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-neutral-300">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>Consider 3D tours for listings over $500K</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader>
                <CardTitle className="text-lg text-white">Market Trends</CardTitle>
                <CardDescription className="text-neutral-400">
                  Central Florida real estate media market analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-neutral-800/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                        <span className="text-sm text-neutral-400">Video Adoption</span>
                      </div>
                      <p className="text-2xl font-bold text-white">+34%</p>
                      <p className="text-xs text-neutral-500">Year over year</p>
                    </div>
                    <div className="p-4 bg-neutral-800/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                        <span className="text-sm text-neutral-400">3D Tour Views</span>
                      </div>
                      <p className="text-2xl font-bold text-white">+52%</p>
                      <p className="text-xs text-neutral-500">Year over year</p>
                    </div>
                    <div className="p-4 bg-neutral-800/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingDown className="h-4 w-4 text-amber-500" />
                        <span className="text-sm text-neutral-400">Photo-Only Listings</span>
                      </div>
                      <p className="text-2xl font-bold text-white">-18%</p>
                      <p className="text-xs text-neutral-500">Year over year</p>
                    </div>
                  </div>

                  <div className="border-t border-neutral-800 pt-6">
                    <h4 className="text-sm font-medium text-white mb-4">Hot Markets</h4>
                    <div className="space-y-3">
                      {[
                        { name: 'Winter Park', growth: '+28%', listings: 145 },
                        { name: 'Lake Nona', growth: '+42%', listings: 89 },
                        { name: 'Dr. Phillips', growth: '+19%', listings: 112 },
                        { name: 'Baldwin Park', growth: '+15%', listings: 67 },
                      ].map((market) => (
                        <div key={market.name} className="flex items-center justify-between p-3 bg-neutral-800/30 rounded-lg">
                          <div className="flex items-center gap-3">
                            <MapPin className="h-4 w-4 text-neutral-500" />
                            <span className="text-white">{market.name}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-neutral-400">{market.listings} listings</span>
                            <Badge className="bg-emerald-500/20 text-emerald-400">
                              {market.growth}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
