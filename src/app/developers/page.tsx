'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
} from 'lucide-react'

const endpoints = [
  {
    name: 'Overview',
    path: '/api/v1/location/overview',
    description: 'All location data in one call',
    icon: MapPin,
  },
  {
    name: 'Attractions',
    path: '/api/v1/location/attractions',
    description: 'Theme parks, airports, beaches, museums',
    icon: Sparkles,
  },
  {
    name: 'Dining',
    path: '/api/v1/location/dining',
    description: 'Trending restaurants, new openings, categories',
    icon: Utensils,
  },
  {
    name: 'Events',
    path: '/api/v1/location/events',
    description: 'Local events from Ticketmaster & Eventbrite',
    icon: Calendar,
  },
  {
    name: 'Movies',
    path: '/api/v1/location/movies',
    description: 'Now playing, upcoming, nearby theaters',
    icon: Film,
  },
  {
    name: 'News',
    path: '/api/v1/location/news',
    description: 'Local news, Reddit discussions, updates',
    icon: Newspaper,
  },
  {
    name: 'Commute',
    path: '/api/v1/location/commute',
    description: 'Travel times to key destinations',
    icon: Car,
  },
  {
    name: 'Lifestyle',
    path: '/api/v1/location/lifestyle',
    description: 'Fitness, parks, recreation, sports',
    icon: Activity,
  },
  {
    name: 'Essentials',
    path: '/api/v1/location/essentials',
    description: 'Grocery, pharmacy, banks, gas',
    icon: ShoppingBag,
  },
  {
    name: 'Scores',
    path: '/api/v1/location/scores',
    description: 'Walk, Transit, and Bike scores',
    icon: Gauge,
  },
]

const features = [
  {
    icon: Zap,
    title: 'Real-Time Data',
    description: 'Live theme park wait times, current events, and up-to-date restaurant info',
  },
  {
    icon: Globe,
    title: 'Central Florida Focus',
    description: 'Unique insights for Disney, Universal, airports, beaches, and local hotspots',
  },
  {
    icon: Code2,
    title: 'Developer Friendly',
    description: 'RESTful API with JSON responses, comprehensive documentation, and SDKs',
  },
  {
    icon: Shield,
    title: 'Secure & Reliable',
    description: 'API key authentication, rate limiting, and 99.9% uptime guarantee',
  },
]

export default function DevelopersPage() {
  const [copied, setCopied] = useState(false)

  const exampleCode = `curl -X GET "https://api.aerialshots.media/v1/location/overview?lat=28.5383&lng=-81.3792" \\
  -H "X-API-Key: your_api_key_here"`

  const copyCode = () => {
    navigator.clipboard.writeText(exampleCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <Badge variant="secondary" className="mb-4">
          Life Here API
        </Badge>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
          Location Intelligence
          <br />
          <span className="text-primary">for Central Florida</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          The only API that combines real estate data with lifestyle storytelling.
          Theme parks, dining, events, commute times, and more — all in one call.
        </p>
        <div className="flex gap-4 justify-center">
          <Button size="lg" asChild>
            <Link href="/developers/keys">
              Get API Key <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/developers/docs">View Documentation</Link>
          </Button>
        </div>
      </section>

      {/* Code Example */}
      <section className="container mx-auto px-4 pb-16">
        <Card className="max-w-3xl mx-auto bg-zinc-950 border-zinc-800">
          <CardContent className="p-0">
            <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <button
                onClick={copyCode}
                className="text-xs text-zinc-400 hover:text-white transition-colors"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre className="p-4 text-sm text-zinc-300 overflow-x-auto">
              <code>{exampleCode}</code>
            </pre>
          </CardContent>
        </Card>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Why Life Here API?</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <Card key={feature.title}>
              <CardHeader>
                <feature.icon className="h-10 w-10 text-primary mb-2" />
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Endpoints Grid */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-4">API Endpoints</h2>
        <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
          10 powerful endpoints covering everything you need to tell the story of a location
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {endpoints.map((endpoint) => (
            <Card
              key={endpoint.path}
              className="hover:border-primary/50 transition-colors cursor-pointer"
            >
              <CardHeader className="pb-2">
                <endpoint.icon className="h-6 w-6 text-primary mb-2" />
                <CardTitle className="text-base">{endpoint.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{endpoint.description}</p>
                <code className="text-xs text-primary/70 block mt-2 truncate">
                  {endpoint.path}
                </code>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Time to Magic Section */}
      <section className="container mx-auto px-4 py-16">
        <Card className="bg-gradient-to-r from-primary/10 to-purple-500/10 border-primary/20">
          <CardContent className="p-8 md:p-12">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <Badge variant="secondary" className="mb-4">
                  Central Florida Exclusive
                </Badge>
                <h3 className="text-2xl md:text-3xl font-bold mb-4">
                  "Time to Magic" Feature
                </h3>
                <p className="text-muted-foreground mb-6">
                  For any property, instantly calculate:
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Time to Magic Kingdom front gate
                  </li>
                  <li className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Current wait for Space Mountain
                  </li>
                  <li className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Time to MCO airport
                  </li>
                  <li className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Time to nearest beach
                  </li>
                </ul>
              </div>
              <div className="bg-background/50 rounded-lg p-6">
                <pre className="text-xs overflow-x-auto">
{`{
  "themeparks": [{
    "name": "Magic Kingdom",
    "distanceMiles": 25.3,
    "driveDurationMinutes": 35,
    "topRides": [{
      "name": "Space Mountain",
      "currentWaitMinutes": 45
    }]
  }],
  "airports": {
    "mco": { "duration": "28 min" }
  },
  "beaches": [{
    "name": "Cocoa Beach",
    "duration": "55 min"
  }]
}`}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Pricing CTA */}
      <section className="container mx-auto px-4 py-16">
        <Card className="text-center">
          <CardHeader>
            <CardTitle className="text-2xl">Ready to Get Started?</CardTitle>
            <CardDescription>
              Start with 100 free requests per day. Upgrade anytime.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/developers/pricing">View Pricing</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/developers/keys">Get Free API Key</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* RapidAPI Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 p-8 rounded-xl bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-xl font-bold">Also Available on RapidAPI</h3>
              <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
            </div>
            <p className="text-muted-foreground">
              Access the Life Here API through RapidAPI Hub for easy integration and billing.
            </p>
          </div>
          <Button variant="outline" disabled>
            View on RapidAPI
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 border-t">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Aerial Shots Media. Life Here API.
          </p>
          <div className="flex gap-6 text-sm">
            <Link href="/developers/docs" className="text-muted-foreground hover:text-foreground">
              Documentation
            </Link>
            <Link href="/developers/pricing" className="text-muted-foreground hover:text-foreground">
              Pricing
            </Link>
            <Link href="/developers/keys" className="text-muted-foreground hover:text-foreground">
              API Keys
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
