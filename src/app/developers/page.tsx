'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  MapPin,
  Utensils,
  Calendar,
  Film,
  Newspaper,
  Car,
  Activity,
  ShoppingBag,
  Gauge,
  Sparkles,
  ArrowRight,
  Code2,
  Zap,
  Shield,
  Globe,
  Check,
  Star,
  Waves,
  Plane,
  Castle,
  Building2,
  Timer,
  TrendingUp,
  Users,
  Home,
  ChevronRight,
  Copy,
  ExternalLink,
} from 'lucide-react'

// Score visualization data
const lifeHereScores = [
  { name: 'Dining', score: 85, color: 'from-orange-500 to-red-500', description: 'Restaurant variety & quality' },
  { name: 'Convenience', score: 78, color: 'from-green-500 to-emerald-500', description: 'Essential services nearby' },
  { name: 'Lifestyle', score: 92, color: 'from-purple-500 to-pink-500', description: 'Recreation & entertainment' },
  { name: 'Commute', score: 71, color: 'from-blue-500 to-cyan-500', description: 'Travel times to destinations' },
]

// Theme park data for Time to Magic
const themeparks = [
  { name: 'Magic Kingdom', icon: '🏰', drive: 25, total: 55, color: 'from-blue-600 to-purple-600' },
  { name: 'EPCOT', icon: '🌐', drive: 22, total: 38, color: 'from-purple-600 to-pink-600' },
  { name: 'Hollywood Studios', icon: '🎬', drive: 23, total: 37, color: 'from-red-600 to-orange-600' },
  { name: 'Animal Kingdom', icon: '🦁', drive: 28, total: 42, color: 'from-green-600 to-emerald-600' },
  { name: 'Universal Studios', icon: '🎢', drive: 18, total: 35, color: 'from-yellow-500 to-orange-500' },
  { name: 'Islands of Adventure', icon: '🦖', drive: 18, total: 35, color: 'from-teal-500 to-cyan-500' },
]

// Beach data for dual-coast
const beaches = {
  atlantic: [
    { name: 'Cocoa Beach', drive: 45, surfRating: 'Great' },
    { name: 'New Smyrna Beach', drive: 55, surfRating: 'Excellent' },
    { name: 'Daytona Beach', drive: 60, surfRating: 'Good' },
  ],
  gulf: [
    { name: 'Clearwater Beach', drive: 95, surfRating: 'Calm' },
    { name: 'St. Pete Beach', drive: 100, surfRating: 'Calm' },
    { name: 'Siesta Key', drive: 120, surfRating: 'Calm' },
  ],
}

const endpoints = [
  { name: 'Overview', path: '/overview', description: 'Everything in one call', icon: MapPin, highlight: true },
  { name: 'Scores', path: '/scores', description: 'Life Here Score system', icon: Gauge, highlight: true },
  { name: 'Attractions', path: '/attractions', description: 'Theme parks & Time to Magic', icon: Sparkles },
  { name: 'Dining', path: '/dining', description: 'Restaurants with Yelp data', icon: Utensils },
  { name: 'Events', path: '/events', description: 'Ticketmaster + Eventbrite', icon: Calendar },
  { name: 'Movies', path: '/movies', description: 'Now playing & theaters', icon: Film },
  { name: 'News', path: '/news', description: 'Local news & discussions', icon: Newspaper },
  { name: 'Commute', path: '/commute', description: 'Travel times anywhere', icon: Car },
  { name: 'Lifestyle', path: '/lifestyle', description: 'Gyms, parks, recreation', icon: Activity },
  { name: 'Essentials', path: '/essentials', description: 'Grocery, pharmacy, banks', icon: ShoppingBag },
]

const useCases = [
  {
    title: 'Real Estate Platforms',
    description: 'Enrich property listings with lifestyle data that helps buyers understand what it\'s like to live there.',
    icon: Home,
    stats: '3x more engagement',
  },
  {
    title: 'Relocation Services',
    description: 'Help families find their perfect neighborhood based on commute, schools, dining, and recreation.',
    icon: Users,
    stats: '40% faster decisions',
  },
  {
    title: 'Travel & Tourism',
    description: 'Show tourists theme park proximity, beach access, and local events for vacation planning.',
    icon: Plane,
    stats: '2x booking conversions',
  },
  {
    title: 'Corporate Relocations',
    description: 'Provide comprehensive area intelligence for employees moving to Central Florida.',
    icon: Building2,
    stats: 'Fortune 500 trusted',
  },
]

const codeExamples = {
  curl: `curl -X GET "https://app.aerialshots.media/api/v1/location/overview" \\
  -H "X-API-Key: lh_live_your_key_here" \\
  -G \\
  -d "lat=28.5383" \\
  -d "lng=-81.3792"`,
  javascript: `const response = await fetch(
  'https://app.aerialshots.media/api/v1/location/overview?' +
  new URLSearchParams({ lat: '28.5383', lng: '-81.3792' }),
  {
    headers: {
      'X-API-Key': 'lh_live_your_key_here'
    }
  }
);

const data = await response.json();
console.log(data.scores.lifeHereScore); // 84`,
  python: `import requests

response = requests.get(
    'https://app.aerialshots.media/api/v1/location/overview',
    headers={'X-API-Key': 'lh_live_your_key_here'},
    params={'lat': 28.5383, 'lng': -81.3792}
)

data = response.json()
print(data['scores']['lifeHereScore'])  # 84`,
  typescript: `import type { LifeHereResponse } from '@lifehere/types';

async function getLocationData(lat: number, lng: number) {
  const res = await fetch(
    \`https://app.aerialshots.media/api/v1/location/overview?\` +
    \`lat=\${lat}&lng=\${lng}\`,
    { headers: { 'X-API-Key': process.env.LIFEHERE_API_KEY! } }
  );

  return res.json() as Promise<LifeHereResponse>;
}`,
}

const pricingTiers = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for testing and small projects',
    requests: '100/day',
    rateLimit: '10/min',
    features: ['All endpoints access', 'Community support', 'Basic documentation'],
    cta: 'Get Started Free',
    popular: false,
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/month',
    description: 'For growing applications',
    requests: '10,000/month',
    rateLimit: '60/min',
    features: ['All endpoints access', 'Email support (48hr)', 'Caching headers', 'Usage analytics'],
    cta: 'Start Pro Trial',
    popular: true,
  },
  {
    name: 'Business',
    price: '$99',
    period: '/month',
    description: 'For production applications',
    requests: '100,000/month',
    rateLimit: '300/min',
    features: ['All endpoints access', 'Priority support (24hr)', 'Webhooks', 'Custom caching', 'SLA guarantee'],
    cta: 'Contact Sales',
    popular: false,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For large-scale deployments',
    requests: 'Unlimited',
    rateLimit: 'Custom',
    features: ['Dedicated infrastructure', 'Dedicated support', 'Custom endpoints', 'On-premise option', 'White-label'],
    cta: 'Contact Sales',
    popular: false,
  },
]

export default function DevelopersPage() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [selectedLang, setSelectedLang] = useState('curl')

  const copyCode = (lang: string, code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(lang)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-hidden">
      {/* Hero Section with Animated Background */}
      <section className="relative">
        {/* Animated gradient orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute top-40 right-1/4 w-[400px] h-[400px] bg-purple-500/20 rounded-full blur-[100px] animate-pulse delay-1000" />
          <div className="absolute bottom-20 left-1/3 w-[300px] h-[300px] bg-cyan-500/15 rounded-full blur-[80px] animate-pulse delay-500" />
        </div>

        {/* Grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />

        <div className="relative container mx-auto px-4 pt-20 pb-32">
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8">
              <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm text-white/70">Life Here API v1.0</span>
            </div>

            {/* Main heading */}
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
              <span className="bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
                Location Intelligence
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                for Central Florida
              </span>
            </h1>

            <p className="text-xl text-white/60 max-w-2xl mb-10 leading-relaxed">
              The only API that combines real estate data with lifestyle storytelling.
              Theme parks, dining, beaches, commute times, and our proprietary
              <span className="text-white font-medium"> Life Here Score</span> — all in one call.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-16">
              <Button
                size="lg"
                className="bg-white text-black hover:bg-white/90 text-base px-8 h-12"
                asChild
              >
                <Link href="/developers/keys">
                  Get Free API Key <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/20 bg-white/5 hover:bg-white/10 text-base px-8 h-12"
                asChild
              >
                <Link href="/developers/docs">
                  View Documentation
                </Link>
              </Button>
            </div>

            {/* Stats bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-8 border-t border-white/10 w-full max-w-3xl">
              {[
                { value: '10+', label: 'API Endpoints' },
                { value: '99.9%', label: 'Uptime SLA' },
                { value: '<50ms', label: 'Avg Response' },
                { value: '1M+', label: 'Monthly Requests' },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-2xl md:text-3xl font-bold text-white">{stat.value}</div>
                  <div className="text-sm text-white/50">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Life Here Score Section */}
      <section className="relative py-24 bg-gradient-to-b from-transparent via-white/[0.02] to-transparent">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-gradient-to-r from-orange-500/20 to-red-500/20 text-orange-300 border-orange-500/30">
              Proprietary Scoring System
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              The Life Here Score™
            </h2>
            <p className="text-xl text-white/60 max-w-2xl mx-auto">
              Our proprietary 0-100 scoring system that tells buyers what it&apos;s really like
              to live at a location. Four key dimensions, one powerful insight.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            {/* Score visualization */}
            <div className="space-y-6">
              {lifeHereScores.map((score, i) => (
                <div key={score.name} className="group">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-medium text-white">{score.name}</span>
                      <span className="text-sm text-white/40 ml-2">{score.description}</span>
                    </div>
                    <span className="text-2xl font-bold tabular-nums">{score.score}</span>
                  </div>
                  <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${score.color} rounded-full transition-all duration-1000 ease-out`}
                      style={{ width: `${score.score}%`, animationDelay: `${i * 100}ms` }}
                    />
                  </div>
                </div>
              ))}

              {/* Overall score */}
              <div className="mt-8 pt-8 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xl font-semibold text-white">Overall Life Here Score</span>
                    <div className="text-sm text-white/50">Balanced lifestyle profile</div>
                  </div>
                  <div className="text-right">
                    <span className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">84</span>
                    <div className="text-sm text-green-400">Excellent</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Code/Response preview */}
            <div className="bg-[#111] rounded-xl border border-white/10 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/[0.02]">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <span className="text-xs text-white/40 ml-2">GET /api/v1/location/scores</span>
              </div>
              <pre className="p-6 text-sm text-white/70 overflow-x-auto">
{`{
  "success": true,
  "data": {
    "lifeHereScore": {
      "overall": 84,
      "label": "Excellent",
      "profile": "balanced",
      "scores": {
        "dining": { "score": 85, "label": "Excellent" },
        "convenience": { "score": 78, "label": "Excellent" },
        "lifestyle": { "score": 92, "label": "Exceptional" },
        "commute": { "score": 71, "label": "Excellent" }
      }
    },
    "timeToMagic": {
      "magicKingdom": { "totalMinutes": 55 },
      "universal": { "totalMinutes": 35 }
    },
    "beachAccess": {
      "dualCoastScore": 88,
      "nearestAtlantic": "Cocoa Beach (45 min)",
      "nearestGulf": "Clearwater (95 min)"
    }
  }
}`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Time to Magic Section */}
      <section className="relative py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 border-purple-500/30">
              <Castle className="w-3 h-3 mr-1" /> Central Florida Exclusive
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Time to Magic™
            </h2>
            <p className="text-xl text-white/60 max-w-2xl mx-auto">
              For any address, calculate the total time from front door to first ride —
              including drive time, parking, and gate entry.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {themeparks.map((park) => (
              <Card
                key={park.name}
                className="bg-white/[0.02] border-white/10 hover:border-white/20 transition-all duration-300 group overflow-hidden"
              >
                <div className={`h-1 bg-gradient-to-r ${park.color}`} />
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <span className="text-3xl mb-2 block">{park.icon}</span>
                      <h3 className="font-semibold text-white">{park.name}</h3>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-white">{park.total}</div>
                      <div className="text-xs text-white/40">min total</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-white/50">
                    <Car className="w-4 h-4" />
                    <span>{park.drive} min drive</span>
                    <span className="text-white/20">•</span>
                    <Timer className="w-4 h-4" />
                    <span>{park.total - park.drive} min to gate</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <p className="text-center text-white/40 text-sm mt-8">
            Times shown are from Downtown Orlando. Your results calculated from any lat/lng coordinates.
          </p>
        </div>
      </section>

      {/* Beach Access Section */}
      <section className="relative py-24 bg-gradient-to-b from-transparent via-blue-500/[0.03] to-transparent">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border-cyan-500/30">
              <Waves className="w-3 h-3 mr-1" /> Dual-Coast Access
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Beach Access Profile
            </h2>
            <p className="text-xl text-white/60 max-w-2xl mx-auto">
              Central Florida&apos;s unique position between the Atlantic and Gulf coasts
              means beach days are always within reach.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Atlantic Coast */}
            <Card className="bg-white/[0.02] border-white/10">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                    <span className="text-2xl">🌊</span>
                  </div>
                  <div>
                    <CardTitle className="text-white">Atlantic Coast</CardTitle>
                    <CardDescription className="text-white/50">East beaches • Surf-friendly</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {beaches.atlantic.map((beach) => (
                  <div key={beach.name} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <div>
                      <div className="font-medium text-white">{beach.name}</div>
                      <div className="text-xs text-white/40">Surf: {beach.surfRating}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-cyan-400">{beach.drive} min</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Gulf Coast */}
            <Card className="bg-white/[0.02] border-white/10">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center">
                    <span className="text-2xl">🌅</span>
                  </div>
                  <div>
                    <CardTitle className="text-white">Gulf Coast</CardTitle>
                    <CardDescription className="text-white/50">West beaches • Calm waters</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {beaches.gulf.map((beach) => (
                  <div key={beach.name} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <div>
                      <div className="font-medium text-white">{beach.name}</div>
                      <div className="text-xs text-white/40">Waters: {beach.surfRating}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-orange-400">{beach.drive} min</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Dual coast score */}
          <div className="mt-12 text-center">
            <div className="inline-flex items-center gap-4 px-8 py-4 rounded-2xl bg-white/[0.03] border border-white/10">
              <div className="text-left">
                <div className="text-sm text-white/50">Dual-Coast Score</div>
                <div className="text-xs text-white/30">Based on access to both coasts</div>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-orange-400 bg-clip-text text-transparent">
                88
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* API Endpoints Grid */}
      <section className="relative py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-white/5 text-white/70 border-white/10">
              <Code2 className="w-3 h-3 mr-1" /> RESTful API
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              10 Powerful Endpoints
            </h2>
            <p className="text-xl text-white/60 max-w-2xl mx-auto">
              One API call returns everything you need to tell the complete story of any location in Central Florida.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4 max-w-6xl mx-auto">
            {endpoints.map((endpoint) => (
              <Card
                key={endpoint.path}
                className={`bg-white/[0.02] border-white/10 hover:border-white/20 transition-all duration-300 cursor-pointer group ${
                  endpoint.highlight ? 'ring-1 ring-blue-500/30' : ''
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      endpoint.highlight
                        ? 'bg-gradient-to-br from-blue-500/20 to-purple-500/20'
                        : 'bg-white/5'
                    }`}>
                      <endpoint.icon className={`w-5 h-5 ${endpoint.highlight ? 'text-blue-400' : 'text-white/60'}`} />
                    </div>
                    <div>
                      <h3 className="font-medium text-white text-sm">{endpoint.name}</h3>
                    </div>
                  </div>
                  <p className="text-xs text-white/40 mb-2">{endpoint.description}</p>
                  <code className="text-[10px] text-blue-400/70 font-mono">/api/v1/location{endpoint.path}</code>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Code Examples Section */}
      <section className="relative py-24 bg-gradient-to-b from-transparent via-white/[0.02] to-transparent">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-white/5 text-white/70 border-white/10">
              Developer Experience
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Simple Integration
            </h2>
            <p className="text-xl text-white/60 max-w-2xl mx-auto">
              Get started in minutes with your favorite language. JSON responses, comprehensive documentation, and helpful error messages.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <Tabs value={selectedLang} onValueChange={setSelectedLang} className="w-full">
              <div className="flex items-center justify-between mb-4">
                <TabsList className="bg-white/5 border border-white/10">
                  <TabsTrigger value="curl" className="data-[state=active]:bg-white/10">cURL</TabsTrigger>
                  <TabsTrigger value="javascript" className="data-[state=active]:bg-white/10">JavaScript</TabsTrigger>
                  <TabsTrigger value="python" className="data-[state=active]:bg-white/10">Python</TabsTrigger>
                  <TabsTrigger value="typescript" className="data-[state=active]:bg-white/10">TypeScript</TabsTrigger>
                </TabsList>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white/50 hover:text-white"
                  onClick={() => copyCode(selectedLang, codeExamples[selectedLang as keyof typeof codeExamples])}
                >
                  {copiedCode === selectedLang ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </>
                  )}
                </Button>
              </div>

              <div className="bg-[#111] rounded-xl border border-white/10 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/[0.02]">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  </div>
                </div>
                {Object.entries(codeExamples).map(([lang, code]) => (
                  <TabsContent key={lang} value={lang} className="m-0">
                    <pre className="p-6 text-sm text-white/70 overflow-x-auto">
                      <code>{code}</code>
                    </pre>
                  </TabsContent>
                ))}
              </div>
            </Tabs>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="relative py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-white/5 text-white/70 border-white/10">
              <TrendingUp className="w-3 h-3 mr-1" /> Use Cases
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Built for Real Applications
            </h2>
            <p className="text-xl text-white/60 max-w-2xl mx-auto">
              See how companies use the Life Here API to create better experiences for their users.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {useCases.map((useCase) => (
              <Card
                key={useCase.title}
                className="bg-white/[0.02] border-white/10 hover:border-white/20 transition-all duration-300"
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center shrink-0">
                      <useCase.icon className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white mb-1">{useCase.title}</h3>
                      <p className="text-sm text-white/50 mb-3">{useCase.description}</p>
                      <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
                        {useCase.stats}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="relative py-24 bg-gradient-to-b from-transparent via-white/[0.02] to-transparent">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-white/5 text-white/70 border-white/10">
              Simple Pricing
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Start Free, Scale as You Grow
            </h2>
            <p className="text-xl text-white/60 max-w-2xl mx-auto">
              No credit card required. Upgrade when you&apos;re ready.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {pricingTiers.map((tier) => (
              <Card
                key={tier.name}
                className={`bg-white/[0.02] border-white/10 relative overflow-hidden ${
                  tier.popular ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                {tier.popular && (
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs text-center py-1 font-medium">
                    Most Popular
                  </div>
                )}
                <CardHeader className={tier.popular ? 'pt-10' : ''}>
                  <CardTitle className="text-white">{tier.name}</CardTitle>
                  <CardDescription className="text-white/50">{tier.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-white">{tier.price}</span>
                    <span className="text-white/50">{tier.period}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 mb-6">
                    <div className="flex items-center justify-between py-2 border-b border-white/5">
                      <span className="text-sm text-white/50">Requests</span>
                      <span className="text-sm font-medium text-white">{tier.requests}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-white/5">
                      <span className="text-sm text-white/50">Rate Limit</span>
                      <span className="text-sm font-medium text-white">{tier.rateLimit}</span>
                    </div>
                  </div>
                  <ul className="space-y-3 mb-6">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm text-white/70">
                        <Check className="w-4 h-4 text-green-400 shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full ${
                      tier.popular
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600'
                        : 'bg-white/10 hover:bg-white/20'
                    }`}
                    asChild
                  >
                    <Link href={tier.name === 'Enterprise' || tier.name === 'Business' ? '/contact' : '/developers/keys'}>
                      {tier.cta}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 mb-8">
              <Zap className="w-8 h-8 text-blue-400" />
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-white/60 mb-10 max-w-2xl mx-auto">
              Join developers building the next generation of real estate and travel applications
              with Central Florida&apos;s most comprehensive location intelligence API.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-white text-black hover:bg-white/90 text-base px-8 h-12"
                asChild
              >
                <Link href="/developers/keys">
                  Get Free API Key <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/20 bg-white/5 hover:bg-white/10 text-base px-8 h-12"
                asChild
              >
                <Link href="/developers/docs">
                  Read the Docs <ExternalLink className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10">
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-white" />
                </div>
                <span className="font-semibold text-white">Life Here API</span>
              </div>
              <p className="text-sm text-white/50">
                Location intelligence for Central Florida. Built by Aerial Shots Media.
              </p>
            </div>

            <div>
              <h4 className="font-medium text-white mb-4">Product</h4>
              <ul className="space-y-2">
                <li><Link href="/developers/docs" className="text-sm text-white/50 hover:text-white">Documentation</Link></li>
                <li><Link href="/developers/pricing" className="text-sm text-white/50 hover:text-white">Pricing</Link></li>
                <li><Link href="/developers/keys" className="text-sm text-white/50 hover:text-white">API Keys</Link></li>
                <li><Link href="/developers/changelog" className="text-sm text-white/50 hover:text-white">Changelog</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-white mb-4">Resources</h4>
              <ul className="space-y-2">
                <li><Link href="/developers/docs#quickstart" className="text-sm text-white/50 hover:text-white">Quick Start</Link></li>
                <li><Link href="/developers/docs#endpoints" className="text-sm text-white/50 hover:text-white">API Reference</Link></li>
                <li><Link href="/developers/docs#examples" className="text-sm text-white/50 hover:text-white">Examples</Link></li>
                <li><Link href="/developers/status" className="text-sm text-white/50 hover:text-white">Status</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-white mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><Link href="/developers/terms" className="text-sm text-white/50 hover:text-white">Terms of Service</Link></li>
                <li><Link href="/privacy" className="text-sm text-white/50 hover:text-white">Privacy Policy</Link></li>
                <li><Link href="/developers/sla" className="text-sm text-white/50 hover:text-white">SLA</Link></li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-white/10">
            <p className="text-sm text-white/40">
              © {new Date().getFullYear()} Aerial Shots Media LLC. All rights reserved.
            </p>
            <div className="flex items-center gap-4 mt-4 md:mt-0">
              <Link href="https://twitter.com/aerialshotsmedia" className="text-white/40 hover:text-white">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </Link>
              <Link href="https://github.com/aerialshotsmedia" className="text-white/40 hover:text-white">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
