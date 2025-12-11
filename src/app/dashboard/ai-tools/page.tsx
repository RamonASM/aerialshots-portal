'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import {
  FileText,
  Share2,
  MapPin,
  Users,
  Video,
  Sparkles,
  Loader2,
  Copy,
  Check,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Database } from '@/lib/supabase/types'

interface AITool {
  id: string
  name: string
  description: string
  cost: number
  icon: React.ElementType
  color: string
  endpoint: string
  fields: Array<{
    name: string
    label: string
    type: 'text' | 'number' | 'textarea' | 'select'
    required?: boolean
    options?: string[]
  }>
}

const aiTools: AITool[] = [
  {
    id: 'listing_description',
    name: 'Listing Description',
    description: 'Generate 3 MLS-ready descriptions',
    cost: 25,
    icon: FileText,
    color: 'blue',
    endpoint: '/api/ai/listing-description',
    fields: [
      { name: 'address', label: 'Address', type: 'text', required: true },
      { name: 'city', label: 'City', type: 'text', required: true },
      { name: 'beds', label: 'Bedrooms', type: 'number', required: true },
      { name: 'baths', label: 'Bathrooms', type: 'number', required: true },
      { name: 'sqft', label: 'Square Feet', type: 'number', required: true },
      { name: 'features', label: 'Key Features (comma separated)', type: 'textarea' },
    ],
  },
  {
    id: 'social_captions',
    name: 'Social Captions',
    description: '5 platform-specific captions',
    cost: 20,
    icon: Share2,
    color: 'pink',
    endpoint: '/api/ai/social-captions',
    fields: [
      { name: 'address', label: 'Address', type: 'text', required: true },
      { name: 'city', label: 'City', type: 'text', required: true },
      { name: 'beds', label: 'Bedrooms', type: 'number', required: true },
      { name: 'baths', label: 'Bathrooms', type: 'number', required: true },
      { name: 'sqft', label: 'Square Feet', type: 'number', required: true },
      { name: 'price', label: 'Price (optional)', type: 'number' },
    ],
  },
  {
    id: 'neighborhood_guide',
    name: 'Neighborhood Guide',
    description: 'Local area marketing content',
    cost: 30,
    icon: MapPin,
    color: 'green',
    endpoint: '/api/ai/neighborhood-guide',
    fields: [
      { name: 'city', label: 'City', type: 'text', required: true },
      { name: 'neighborhood', label: 'Neighborhood', type: 'text' },
      { name: 'nearbyPlaces', label: 'Nearby Places (comma separated)', type: 'textarea' },
    ],
  },
  {
    id: 'buyer_personas',
    name: 'Buyer Personas',
    description: '3 ideal buyer profiles',
    cost: 35,
    icon: Users,
    color: 'purple',
    endpoint: '/api/ai/buyer-personas',
    fields: [
      { name: 'beds', label: 'Bedrooms', type: 'number', required: true },
      { name: 'baths', label: 'Bathrooms', type: 'number', required: true },
      { name: 'sqft', label: 'Square Feet', type: 'number', required: true },
      { name: 'price', label: 'Price (optional)', type: 'number' },
      { name: 'neighborhood', label: 'Neighborhood', type: 'text' },
    ],
  },
  {
    id: 'video_script',
    name: 'Video Script',
    description: 'Walkthrough narration script',
    cost: 40,
    icon: Video,
    color: 'amber',
    endpoint: '/api/ai/video-script',
    fields: [
      { name: 'address', label: 'Address', type: 'text', required: true },
      { name: 'city', label: 'City', type: 'text', required: true },
      { name: 'beds', label: 'Bedrooms', type: 'number', required: true },
      { name: 'baths', label: 'Bathrooms', type: 'number', required: true },
      { name: 'sqft', label: 'Square Feet', type: 'number', required: true },
      { name: 'features', label: 'Key Features (comma separated)', type: 'textarea' },
      { name: 'duration', label: 'Duration (seconds)', type: 'number' },
    ],
  },
]

export default function AIToolsPage() {
  const [selectedTool, setSelectedTool] = useState<AITool | null>(null)
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<unknown>(null)
  const [error, setError] = useState<string | null>(null)
  const [creditBalance, setCreditBalance] = useState<number>(0)
  const [copied, setCopied] = useState<string | null>(null)

  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function loadBalance() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        const { data: agent } = await supabase
          .from('agents')
          .select('credit_balance')
          .eq('email', user.email!)
          .single()
        setCreditBalance(agent?.credit_balance || 0)
      }
    }
    loadBalance()
  }, [supabase])

  const handleSubmit = async () => {
    if (!selectedTool) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      // Transform comma-separated fields to arrays
      const body: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(formData)) {
        if (key === 'features' || key === 'nearbyPlaces') {
          body[key] = value
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        } else if (
          selectedTool.fields.find((f) => f.name === key)?.type === 'number'
        ) {
          body[key] = parseFloat(value) || 0
        } else {
          body[key] = value
        }
      }

      const response = await fetch(selectedTool.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate content')
      }

      setResult(data)
      if (data.newBalance !== undefined) {
        setCreditBalance(data.newBalance)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const renderResult = () => {
    if (!result) return null

    const data = result as Record<string, unknown>

    // Listing descriptions
    if (data.descriptions && Array.isArray(data.descriptions)) {
      return (
        <div className="space-y-4">
          {data.descriptions.map((desc: string, i: number) => (
            <div key={i} className="rounded-lg border border-neutral-200 bg-white p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-neutral-500">
                  Version {i + 1}
                </span>
                <button
                  onClick={() => copyToClipboard(desc, `desc-${i}`)}
                  className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700"
                >
                  {copied === `desc-${i}` ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  Copy
                </button>
              </div>
              <p className="whitespace-pre-wrap text-neutral-700">{desc}</p>
            </div>
          ))}
        </div>
      )
    }

    // Social captions
    if (data.captions && typeof data.captions === 'object') {
      const captions = data.captions as Record<string, string>
      return (
        <div className="space-y-4">
          {Object.entries(captions).map(([platform, caption]) => (
            <div key={platform} className="rounded-lg border border-neutral-200 bg-white p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium capitalize text-neutral-500">
                  {platform}
                </span>
                <button
                  onClick={() => copyToClipboard(caption, platform)}
                  className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700"
                >
                  {copied === platform ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  Copy
                </button>
              </div>
              <p className="whitespace-pre-wrap text-neutral-700">{caption}</p>
            </div>
          ))}
        </div>
      )
    }

    // Neighborhood guide
    if (data.guide && typeof data.guide === 'object') {
      const guide = data.guide as Record<string, string>
      return (
        <div className="space-y-4">
          {Object.entries(guide).map(([section, content]) => (
            <div key={section} className="rounded-lg border border-neutral-200 bg-white p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium capitalize text-neutral-500">
                  {section.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                <button
                  onClick={() => copyToClipboard(content, section)}
                  className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700"
                >
                  {copied === section ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  Copy
                </button>
              </div>
              <p className="whitespace-pre-wrap text-neutral-700">{content}</p>
            </div>
          ))}
        </div>
      )
    }

    // Buyer personas
    if (data.personas && Array.isArray(data.personas)) {
      return (
        <div className="space-y-4">
          {data.personas.map((persona: Record<string, string>, i: number) => (
            <div key={i} className="rounded-lg border border-neutral-200 bg-white p-4">
              <h3 className="mb-2 font-semibold text-neutral-900">{persona.name}</h3>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="font-medium text-neutral-500">Demographics:</span>{' '}
                  {persona.demographics}
                </p>
                <p>
                  <span className="font-medium text-neutral-500">Motivations:</span>{' '}
                  {persona.motivations}
                </p>
                <p>
                  <span className="font-medium text-neutral-500">Pain Points:</span>{' '}
                  {persona.painPoints}
                </p>
                <p>
                  <span className="font-medium text-neutral-500">Marketing Message:</span>{' '}
                  {persona.marketingMessage}
                </p>
              </div>
            </div>
          ))}
        </div>
      )
    }

    // Video script
    if (data.script && typeof data.script === 'object') {
      const script = data.script as { scenes: Array<Record<string, string>> }
      return (
        <div className="space-y-4">
          {script.scenes?.map((scene, i) => (
            <div key={i} className="rounded-lg border border-neutral-200 bg-white p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-neutral-500">
                  {scene.timestamp || `Scene ${i + 1}`} - {scene.location}
                </span>
                <button
                  onClick={() => copyToClipboard(scene.narration, `scene-${i}`)}
                  className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700"
                >
                  {copied === `scene-${i}` ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  Copy
                </button>
              </div>
              <p className="whitespace-pre-wrap text-neutral-700">{scene.narration}</p>
              {scene.shotNotes && (
                <p className="mt-2 text-xs text-neutral-500">Shot Notes: {scene.shotNotes}</p>
              )}
            </div>
          ))}
        </div>
      )
    }

    // Fallback
    return (
      <pre className="overflow-auto rounded-lg bg-neutral-100 p-4 text-sm">
        {JSON.stringify(result, null, 2)}
      </pre>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">AI Tools</h1>
          <p className="mt-1 text-neutral-600">
            Generate marketing content for your listings.
          </p>
        </div>
        <div className="rounded-lg bg-neutral-100 px-4 py-2">
          <span className="text-sm text-neutral-500">Credits:</span>
          <span className="ml-2 font-semibold text-neutral-900">{creditBalance}</span>
        </div>
      </div>

      {!selectedTool ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {aiTools.map((tool) => {
            const Icon = tool.icon
            const canAfford = creditBalance >= tool.cost
            return (
              <button
                key={tool.id}
                onClick={() => canAfford && setSelectedTool(tool)}
                disabled={!canAfford}
                className={`rounded-lg border p-6 text-left transition-all ${
                  canAfford
                    ? 'border-neutral-200 bg-white hover:border-neutral-300 hover:shadow-md'
                    : 'cursor-not-allowed border-neutral-100 bg-neutral-50 opacity-60'
                }`}
              >
                <div className={`mb-4 inline-flex rounded-lg bg-${tool.color}-100 p-3`}>
                  <Icon className={`h-6 w-6 text-${tool.color}-600`} />
                </div>
                <h3 className="font-semibold text-neutral-900">{tool.name}</h3>
                <p className="mt-1 text-sm text-neutral-500">{tool.description}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-sm text-neutral-500">
                    <Sparkles className="h-4 w-4" />
                    {tool.cost} credits
                  </span>
                  <ChevronRight className="h-5 w-5 text-neutral-400" />
                </div>
              </button>
            )
          })}
        </div>
      ) : (
        <div className="space-y-6">
          <button
            onClick={() => {
              setSelectedTool(null)
              setFormData({})
              setResult(null)
              setError(null)
            }}
            className="flex items-center gap-2 text-neutral-500 hover:text-neutral-700"
          >
            ← Back to tools
          </button>

          <div className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-6">
              <div className="rounded-lg border border-neutral-200 bg-white p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div
                    className={`inline-flex rounded-lg bg-${selectedTool.color}-100 p-2`}
                  >
                    <selectedTool.icon
                      className={`h-5 w-5 text-${selectedTool.color}-600`}
                    />
                  </div>
                  <div>
                    <h2 className="font-semibold text-neutral-900">
                      {selectedTool.name}
                    </h2>
                    <p className="text-sm text-neutral-500">
                      {selectedTool.cost} credits
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {selectedTool.fields.map((field) => (
                    <div key={field.name}>
                      <Label htmlFor={field.name}>
                        {field.label}
                        {field.required && <span className="text-red-500">*</span>}
                      </Label>
                      {field.type === 'textarea' ? (
                        <Textarea
                          id={field.name}
                          value={formData[field.name] || ''}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              [field.name]: e.target.value,
                            }))
                          }
                          className="mt-1"
                          rows={3}
                        />
                      ) : (
                        <Input
                          id={field.name}
                          type={field.type}
                          value={formData[field.name] || ''}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              [field.name]: e.target.value,
                            }))
                          }
                          className="mt-1"
                          required={field.required}
                        />
                      )}
                    </div>
                  ))}
                </div>

                {error && (
                  <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                    {error}
                  </div>
                )}

                <Button
                  onClick={handleSubmit}
                  disabled={loading || creditBalance < selectedTool.cost}
                  className="mt-6 w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate ({selectedTool.cost} credits)
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div>
              {result ? (
                <div>
                  <h3 className="mb-4 font-semibold text-neutral-900">Results</h3>
                  {renderResult()}
                </div>
              ) : (
                <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-neutral-50">
                  <p className="text-neutral-500">
                    Fill in the form and click Generate to see results
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
