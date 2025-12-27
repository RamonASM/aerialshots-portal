'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft,
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
  Copy,
  Check,
} from 'lucide-react'

const endpoints = [
  {
    id: 'overview',
    name: 'Overview',
    method: 'GET',
    path: '/api/v1/location/overview',
    description: 'Returns all location data in a single call. Best for getting a complete picture.',
    icon: MapPin,
    params: [
      { name: 'lat', type: 'number', required: true, description: 'Latitude (-90 to 90)' },
      { name: 'lng', type: 'number', required: true, description: 'Longitude (-180 to 180)' },
    ],
    example: {
      request: `curl -X GET "https://api.aerialshots.media/v1/location/overview?lat=28.5383&lng=-81.3792" \\
  -H "X-API-Key: your_api_key"`,
      response: `{
  "success": true,
  "data": {
    "location": { "lat": 28.5383, "lng": -81.3792 },
    "attractions": {
      "themeparks": [...],
      "airports": {...},
      "beaches": [...]
    },
    "dining": {
      "trending": [...],
      "newOpenings": [...],
      "topRated": [...]
    },
    "events": {
      "upcoming": [...],
      "thisWeek": [...],
      "family": [...]
    },
    "movies": {
      "nowPlaying": [...],
      "theaters": [...]
    },
    "commute": {
      "destinations": [...],
      "summary": {...}
    },
    "scores": {
      "walkScore": 72,
      "transitScore": 45,
      "bikeScore": 68
    }
  },
  "meta": {
    "requestId": "abc123",
    "cached": false,
    "responseTime": 1234
  }
}`,
    },
  },
  {
    id: 'attractions',
    name: 'Attractions',
    method: 'GET',
    path: '/api/v1/location/attractions',
    description: 'Theme parks with real-time wait times, airports, beaches, and museums.',
    icon: Sparkles,
    params: [
      { name: 'lat', type: 'number', required: true, description: 'Latitude' },
      { name: 'lng', type: 'number', required: true, description: 'Longitude' },
      { name: 'include_wait_times', type: 'boolean', required: false, description: 'Include live ride wait times (default: true)' },
      { name: 'max_distance', type: 'number', required: false, description: 'Maximum distance in miles (default: 75)' },
    ],
    example: {
      request: `curl -X GET "https://api.aerialshots.media/v1/location/attractions?lat=28.5383&lng=-81.3792" \\
  -H "X-API-Key: your_api_key"`,
      response: `{
  "success": true,
  "data": {
    "themeparks": [{
      "id": "magic-kingdom",
      "name": "Magic Kingdom",
      "distanceMiles": 25.3,
      "driveDurationMinutes": 35,
      "driveDurationWithTraffic": 42,
      "topRides": [{
        "name": "Space Mountain",
        "waitMinutes": 45,
        "isOpen": true
      }]
    }],
    "airports": {
      "mco": { "name": "Orlando International", "distance": "18 mi", "duration": "28 min" },
      "sfb": { "name": "Orlando Sanford", "distance": "32 mi", "duration": "45 min" }
    },
    "beaches": [{
      "name": "Cocoa Beach",
      "distanceMiles": 52,
      "driveDuration": "55 min"
    }]
  }
}`,
    },
  },
  {
    id: 'dining',
    name: 'Dining',
    method: 'GET',
    path: '/api/v1/location/dining',
    description: 'Restaurants with Yelp ratings, trending spots, new openings, and category filters.',
    icon: Utensils,
    params: [
      { name: 'lat', type: 'number', required: true, description: 'Latitude' },
      { name: 'lng', type: 'number', required: true, description: 'Longitude' },
      { name: 'search', type: 'string', required: false, description: 'Search term (e.g., "sushi", "brunch")' },
      { name: 'category', type: 'string', required: false, description: 'Filter by category: brunch, italian, asian, seafood, bars' },
      { name: 'limit', type: 'number', required: false, description: 'Max results (default: 20, max: 50)' },
    ],
    example: {
      request: `curl -X GET "https://api.aerialshots.media/v1/location/dining?lat=28.5383&lng=-81.3792&category=brunch" \\
  -H "X-API-Key: your_api_key"`,
      response: `{
  "success": true,
  "data": {
    "category": {
      "name": "brunch",
      "results": [{
        "id": "abc123",
        "name": "The Brunch Spot",
        "cuisine": ["Breakfast & Brunch", "American"],
        "rating": 4.5,
        "reviewCount": 234,
        "priceLevel": 2,
        "distanceMiles": 1.2,
        "address": "123 Main St, Orlando, FL",
        "highlights": ["Hot & New", "Highly Rated"]
      }]
    }
  }
}`,
    },
  },
  {
    id: 'events',
    name: 'Events',
    method: 'GET',
    path: '/api/v1/location/events',
    description: 'Local events from Ticketmaster and Eventbrite. Filter by category or time.',
    icon: Calendar,
    params: [
      { name: 'lat', type: 'number', required: true, description: 'Latitude' },
      { name: 'lng', type: 'number', required: true, description: 'Longitude' },
      { name: 'category', type: 'string', required: false, description: 'Filter: music, arts, sports, food, family, community' },
      { name: 'filter', type: 'string', required: false, description: 'Time filter: free, family, weekend, thisWeek' },
      { name: 'radius', type: 'number', required: false, description: 'Radius in miles (default: 25)' },
    ],
    example: {
      request: `curl -X GET "https://api.aerialshots.media/v1/location/events?lat=28.5383&lng=-81.3792&filter=thisWeek" \\
  -H "X-API-Key: your_api_key"`,
      response: `{
  "success": true,
  "data": {
    "upcoming": [...],
    "thisWeek": [{
      "id": "evt123",
      "name": "Orlando Magic vs. Miami Heat",
      "date": "2024-12-28",
      "time": "7:00 PM",
      "venue": "Amway Center",
      "category": "sports",
      "priceRange": "$45 - $250",
      "ticketUrl": "https://..."
    }],
    "sources": {
      "ticketmaster": 15,
      "eventbrite": 23
    }
  }
}`,
    },
  },
  {
    id: 'movies',
    name: 'Movies',
    method: 'GET',
    path: '/api/v1/location/movies',
    description: 'Now playing and upcoming movies from TMDb, plus nearby theaters.',
    icon: Film,
    params: [
      { name: 'lat', type: 'number', required: true, description: 'Latitude' },
      { name: 'lng', type: 'number', required: true, description: 'Longitude' },
      { name: 'search', type: 'string', required: false, description: 'Search for a movie' },
      { name: 'filter', type: 'string', required: false, description: 'now_playing, upcoming, popular, top_rated' },
      { name: 'theaters_only', type: 'boolean', required: false, description: 'Only return nearby theaters' },
    ],
    example: {
      request: `curl -X GET "https://api.aerialshots.media/v1/location/movies?lat=28.5383&lng=-81.3792" \\
  -H "X-API-Key: your_api_key"`,
      response: `{
  "success": true,
  "data": {
    "nowPlaying": [{
      "id": 123,
      "title": "Movie Title",
      "overview": "...",
      "posterUrl": "https://image.tmdb.org/...",
      "releaseDate": "2024-12-20",
      "rating": 8.2,
      "genres": ["Action", "Adventure"]
    }],
    "comingSoon": [...],
    "theaters": [{
      "id": "theater123",
      "name": "AMC Disney Springs",
      "address": "...",
      "distanceMiles": 3.2,
      "chain": "AMC"
    }]
  }
}`,
    },
  },
  {
    id: 'news',
    name: 'News',
    method: 'GET',
    path: '/api/v1/location/news',
    description: 'Local news, Reddit discussions, and curated community updates.',
    icon: Newspaper,
    params: [
      { name: 'lat', type: 'number', required: true, description: 'Latitude' },
      { name: 'lng', type: 'number', required: true, description: 'Longitude' },
      { name: 'source', type: 'string', required: false, description: 'Filter: news, reddit, curated, real_estate, business' },
      { name: 'limit', type: 'number', required: false, description: 'Max results (default: 15)' },
    ],
    example: {
      request: `curl -X GET "https://api.aerialshots.media/v1/location/news?lat=28.5383&lng=-81.3792" \\
  -H "X-API-Key: your_api_key"`,
      response: `{
  "success": true,
  "data": {
    "articles": [{
      "id": "abc123",
      "title": "Orlando Real Estate Market Update",
      "source": "Orlando Sentinel",
      "publishedAt": "2024-12-24T10:00:00Z",
      "url": "https://..."
    }],
    "discussions": [{
      "id": "reddit123",
      "title": "Best neighborhoods in Orlando?",
      "subreddit": "orlando",
      "score": 156,
      "commentCount": 89
    }],
    "realEstateNews": [...],
    "businessNews": [...]
  }
}`,
    },
  },
  {
    id: 'commute',
    name: 'Commute',
    method: 'GET',
    path: '/api/v1/location/commute',
    description: 'Travel times to theme parks, airports, beaches, and downtown areas.',
    icon: Car,
    params: [
      { name: 'lat', type: 'number', required: true, description: 'Latitude' },
      { name: 'lng', type: 'number', required: true, description: 'Longitude' },
      { name: 'destination', type: 'string', required: false, description: 'Specific destination key (e.g., magicKingdom, mco)' },
      { name: 'category', type: 'string', required: false, description: 'Category: airports, beaches, themeparks, downtown' },
    ],
    example: {
      request: `curl -X GET "https://api.aerialshots.media/v1/location/commute?lat=28.5383&lng=-81.3792&destination=magicKingdom" \\
  -H "X-API-Key: your_api_key"`,
      response: `{
  "success": true,
  "data": {
    "destination": {
      "key": "magicKingdom",
      "name": "Magic Kingdom",
      "lat": 28.4177,
      "lng": -81.5812
    },
    "from": { "lat": 28.5383, "lng": -81.3792 },
    "distance": "25 mi",
    "duration": "35 min",
    "durationInTraffic": "42 min"
  }
}`,
    },
  },
  {
    id: 'lifestyle',
    name: 'Lifestyle',
    method: 'GET',
    path: '/api/v1/location/lifestyle',
    description: 'Gyms, fitness centers, parks, recreation, and sports venues.',
    icon: Activity,
    params: [
      { name: 'lat', type: 'number', required: true, description: 'Latitude' },
      { name: 'lng', type: 'number', required: true, description: 'Longitude' },
      { name: 'category', type: 'string', required: false, description: 'Filter: fitness, parks, recreation, sports' },
      { name: 'radius', type: 'number', required: false, description: 'Radius in meters (default: 8000)' },
    ],
    example: {
      request: `curl -X GET "https://api.aerialshots.media/v1/location/lifestyle?lat=28.5383&lng=-81.3792&category=fitness" \\
  -H "X-API-Key: your_api_key"`,
      response: `{
  "success": true,
  "data": {
    "category": "fitness",
    "places": [{
      "id": "gym123",
      "name": "LA Fitness",
      "type": "gym",
      "rating": 4.2,
      "distanceMiles": 0.8,
      "address": "...",
      "isOpen": true
    }],
    "count": 12
  }
}`,
    },
  },
  {
    id: 'essentials',
    name: 'Essentials',
    method: 'GET',
    path: '/api/v1/location/essentials',
    description: 'Grocery stores, pharmacies, banks, and gas stations.',
    icon: ShoppingBag,
    params: [
      { name: 'lat', type: 'number', required: true, description: 'Latitude' },
      { name: 'lng', type: 'number', required: true, description: 'Longitude' },
      { name: 'category', type: 'string', required: false, description: 'Filter: grocery, pharmacy, banks, gas' },
      { name: 'open_now', type: 'boolean', required: false, description: 'Only show open locations' },
      { name: 'radius', type: 'number', required: false, description: 'Radius in meters (default: 5000)' },
    ],
    example: {
      request: `curl -X GET "https://api.aerialshots.media/v1/location/essentials?lat=28.5383&lng=-81.3792&category=grocery" \\
  -H "X-API-Key: your_api_key"`,
      response: `{
  "success": true,
  "data": {
    "category": "grocery",
    "places": [{
      "id": "store123",
      "name": "Publix Super Market",
      "distanceMiles": 0.5,
      "address": "...",
      "isOpen": true
    }],
    "count": 8
  }
}`,
    },
  },
  {
    id: 'scores',
    name: 'Scores',
    method: 'GET',
    path: '/api/v1/location/scores',
    description: 'Walk Score, Transit Score, and Bike Score with explanations.',
    icon: Gauge,
    params: [
      { name: 'lat', type: 'number', required: true, description: 'Latitude' },
      { name: 'lng', type: 'number', required: true, description: 'Longitude' },
      { name: 'address', type: 'string', required: false, description: 'Address for more accurate results' },
    ],
    example: {
      request: `curl -X GET "https://api.aerialshots.media/v1/location/scores?lat=28.5383&lng=-81.3792" \\
  -H "X-API-Key: your_api_key"`,
      response: `{
  "success": true,
  "data": {
    "scores": {
      "walkScore": {
        "score": 72,
        "description": "Very Walkable",
        "explanation": "Most errands can be accomplished on foot"
      },
      "transitScore": {
        "score": 45,
        "description": "Some Transit"
      },
      "bikeScore": {
        "score": 68,
        "description": "Bikeable"
      }
    },
    "overall": {
      "score": 65,
      "description": "Good Livability"
    }
  }
}`,
    },
  },
]

export default function DocsPage() {
  const [activeEndpoint, setActiveEndpoint] = useState('overview')
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const endpoint = endpoints.find((e) => e.id === activeEndpoint) || endpoints[0]

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(id)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/developers">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
            <h1 className="text-xl font-bold">API Documentation</h1>
          </div>
          <Button asChild>
            <Link href="/developers/keys">Get API Key</Link>
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-[250px_1fr] gap-8">
          {/* Sidebar */}
          <aside className="space-y-2">
            <h2 className="font-semibold mb-4">Endpoints</h2>
            {endpoints.map((ep) => (
              <button
                key={ep.id}
                onClick={() => setActiveEndpoint(ep.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left transition-colors ${
                  activeEndpoint === ep.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                <ep.icon className="h-4 w-4" />
                {ep.name}
              </button>
            ))}
          </aside>

          {/* Content */}
          <main className="space-y-8">
            {/* Endpoint Header */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="secondary">{endpoint.method}</Badge>
                <code className="text-sm bg-muted px-2 py-1 rounded">{endpoint.path}</code>
              </div>
              <h2 className="text-2xl font-bold mb-2">{endpoint.name}</h2>
              <p className="text-muted-foreground">{endpoint.description}</p>
            </div>

            {/* Authentication */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Authentication</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-medium mb-2">Direct API Access</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Pass your API key in the <code className="bg-muted px-1">X-API-Key</code> header.
                  </p>
                  <pre className="bg-zinc-950 text-zinc-300 p-4 rounded-lg text-sm overflow-x-auto">
                    X-API-Key: lh_live_xxxxxxxxxxxxxxxx
                  </pre>
                </div>

                <div className="border-t pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium">Via RapidAPI</h4>
                    <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    The Life Here API is also available on RapidAPI Hub. Use your RapidAPI key for authentication:
                  </p>
                  <pre className="bg-zinc-950 text-zinc-300 p-4 rounded-lg text-sm overflow-x-auto">
{`X-RapidAPI-Key: your_rapidapi_key
X-RapidAPI-Host: life-here-api.p.rapidapi.com`}
                  </pre>
                  <p className="text-sm text-muted-foreground mt-4">
                    RapidAPI handles billing and rate limiting based on your subscription tier.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Parameters */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Parameters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 pr-4">Name</th>
                        <th className="text-left py-2 pr-4">Type</th>
                        <th className="text-left py-2 pr-4">Required</th>
                        <th className="text-left py-2">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {endpoint.params.map((param) => (
                        <tr key={param.name} className="border-b last:border-0">
                          <td className="py-2 pr-4">
                            <code className="bg-muted px-1">{param.name}</code>
                          </td>
                          <td className="py-2 pr-4 text-muted-foreground">{param.type}</td>
                          <td className="py-2 pr-4">
                            {param.required ? (
                              <Badge variant="destructive" className="text-xs">Required</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">Optional</Badge>
                            )}
                          </td>
                          <td className="py-2 text-muted-foreground">{param.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Example */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Example</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs defaultValue="request">
                  <TabsList>
                    <TabsTrigger value="request">Request</TabsTrigger>
                    <TabsTrigger value="response">Response</TabsTrigger>
                  </TabsList>
                  <TabsContent value="request">
                    <div className="relative">
                      <pre className="bg-zinc-950 text-zinc-300 p-4 rounded-lg text-sm overflow-x-auto">
                        {endpoint.example.request}
                      </pre>
                      <button
                        onClick={() => copyCode(endpoint.example.request, 'request')}
                        className="absolute top-2 right-2 p-2 hover:bg-zinc-800 rounded"
                      >
                        {copiedCode === 'request' ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4 text-zinc-400" />
                        )}
                      </button>
                    </div>
                  </TabsContent>
                  <TabsContent value="response">
                    <div className="relative">
                      <pre className="bg-zinc-950 text-zinc-300 p-4 rounded-lg text-sm overflow-x-auto max-h-96">
                        {endpoint.example.response}
                      </pre>
                      <button
                        onClick={() => copyCode(endpoint.example.response, 'response')}
                        className="absolute top-2 right-2 p-2 hover:bg-zinc-800 rounded"
                      >
                        {copiedCode === 'response' ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4 text-zinc-400" />
                        )}
                      </button>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Rate Limits */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Rate Limits</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Rate limits are returned in response headers:
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 pr-4">Header</th>
                        <th className="text-left py-2">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-2 pr-4"><code>X-RateLimit-Limit</code></td>
                        <td className="py-2 text-muted-foreground">Requests allowed per minute</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 pr-4"><code>X-RateLimit-Remaining</code></td>
                        <td className="py-2 text-muted-foreground">Requests remaining this minute</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 pr-4"><code>X-RateLimit-Reset</code></td>
                        <td className="py-2 text-muted-foreground">Unix timestamp when limits reset</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4"><code>X-Monthly-Remaining</code></td>
                        <td className="py-2 text-muted-foreground">Requests remaining this month</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Error Codes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Error Codes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 pr-4">Code</th>
                        <th className="text-left py-2 pr-4">Status</th>
                        <th className="text-left py-2">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-2 pr-4"><code>MISSING_API_KEY</code></td>
                        <td className="py-2 pr-4">401</td>
                        <td className="py-2 text-muted-foreground">API key not provided</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 pr-4"><code>INVALID_API_KEY</code></td>
                        <td className="py-2 pr-4">401</td>
                        <td className="py-2 text-muted-foreground">API key is invalid or inactive</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 pr-4"><code>RATE_LIMIT_EXCEEDED</code></td>
                        <td className="py-2 pr-4">429</td>
                        <td className="py-2 text-muted-foreground">Too many requests</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 pr-4"><code>MONTHLY_LIMIT_EXCEEDED</code></td>
                        <td className="py-2 pr-4">429</td>
                        <td className="py-2 text-muted-foreground">Monthly quota exceeded</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 pr-4"><code>INVALID_COORDINATES</code></td>
                        <td className="py-2 pr-4">400</td>
                        <td className="py-2 text-muted-foreground">Invalid lat/lng values</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4"><code>INTERNAL_ERROR</code></td>
                        <td className="py-2 pr-4">500</td>
                        <td className="py-2 text-muted-foreground">Server error</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </div>
  )
}
