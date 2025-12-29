'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Save,
  Eye,
  ExternalLink,
  MapPin,
  FileText,
  Home,
  GraduationCap,
  TrendingUp,
  Settings,
  Image as ImageIcon,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RichTextEditor } from '@/components/cms/editors/RichTextEditor'
import {
  JSONEditor,
  communityHighlightsSchema,
  communityLifestyleSchema,
  communitySchoolsSchema,
} from '@/components/cms/editors/JSONEditor'
import { PublishPanel } from '@/components/cms/publishing/PublishPanel'
import { SkeletonCard } from '@/components/ui/skeleton'

interface Community {
  id: string
  name: string
  slug: string
  city: string | null
  state: string | null
  description: string | null
  hero_image_url: string | null
  is_published: boolean
  lat: number | null
  lng: number | null
  overview_content: Record<string, unknown> | null
  lifestyle_content: Record<string, unknown> | null
  market_snapshot: Record<string, unknown> | null
  schools_info: Record<string, unknown> | null
  subdivisions: Record<string, unknown>[] | null
  quick_facts: Record<string, unknown> | null
  seo_title: string | null
  seo_description: string | null
  created_at: string
  updated_at: string
}

export default function CommunityEditorPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = use(params)
  const router = useRouter()
  const isNew = slug === 'new'

  const [community, setCommunity] = useState<Partial<Community>>({
    name: '',
    slug: '',
    city: '',
    state: 'FL',
    description: '',
    hero_image_url: '',
    is_published: false,
    overview_content: {},
    lifestyle_content: {},
    market_snapshot: {},
    schools_info: {},
    subdivisions: [],
    quick_facts: {},
    seo_title: '',
    seo_description: '',
  })
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [overviewHtml, setOverviewHtml] = useState('')

  useEffect(() => {
    if (!isNew) {
      fetchCommunity()
    }
  }, [slug, isNew])

  async function fetchCommunity() {
    try {
      const res = await fetch(`/api/admin/content/communities/${slug}`)
      if (res.ok) {
        const data = await res.json()
        setCommunity(data.community)
        // Convert overview_content to HTML if it exists
        if (data.community?.overview_content?.html) {
          setOverviewHtml(data.community.overview_content.html)
        }
      } else if (res.status === 404) {
        router.push('/admin/content/communities')
      }
    } catch (error) {
      console.error('Error fetching community:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(publish = false) {
    setSaving(true)
    try {
      const payload = {
        ...community,
        is_published: publish ? true : community.is_published,
        overview_content: { ...community.overview_content, html: overviewHtml },
      }

      const url = isNew
        ? '/api/admin/communities'
        : `/api/admin/content/communities/${slug}`

      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const data = await res.json()
        if (isNew && data.community?.slug) {
          router.push(`/admin/content/communities/${data.community.slug}`)
        } else {
          setCommunity(data.community)
        }
      }
    } catch (error) {
      console.error('Error saving community:', error)
    } finally {
      setSaving(false)
    }
  }

  function generateSlug(name: string) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <SkeletonCard className="h-10 w-10" />
          <SkeletonCard className="h-8 w-64" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SkeletonCard className="h-96" />
          </div>
          <SkeletonCard className="h-96" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/content/communities">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
              {isNew ? 'New Community' : community.name}
            </h1>
            {!isNew && community.slug && (
              <p className="text-sm text-neutral-500">/community/{community.slug}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isNew && community.is_published && (
            <Link href={`/community/${community.slug}`} target="_blank">
              <Button variant="outline" size="sm">
                <ExternalLink className="mr-2 h-4 w-4" />
                View Live
              </Button>
            </Link>
          )}
          <Button onClick={() => handleSave(false)} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button
            onClick={() => handleSave(true)}
            disabled={saving}
            variant="default"
            className="bg-green-600 hover:bg-green-700"
          >
            <Eye className="mr-2 h-4 w-4" />
            {community.is_published ? 'Update' : 'Publish'}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Editor Area */}
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="lifestyle" className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                Lifestyle
              </TabsTrigger>
              <TabsTrigger value="market" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Market
              </TabsTrigger>
              <TabsTrigger value="schools" className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                Schools
              </TabsTrigger>
              <TabsTrigger value="seo" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                SEO
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <Card>
                <CardHeader>
                  <CardTitle>Overview Content</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Community Description</Label>
                    <RichTextEditor
                      content={overviewHtml}
                      onChange={setOverviewHtml}
                      placeholder="Write an engaging overview of this community..."
                      minHeight="300px"
                    />
                  </div>

                  <div>
                    <Label>Highlights</Label>
                    <JSONEditor
                      value={community.overview_content || {}}
                      onChange={(val) =>
                        setCommunity({ ...community, overview_content: val })
                      }
                      schema={communityHighlightsSchema}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="lifestyle">
              <Card>
                <CardHeader>
                  <CardTitle>Lifestyle & Amenities</CardTitle>
                </CardHeader>
                <CardContent>
                  <JSONEditor
                    value={community.lifestyle_content || {}}
                    onChange={(val) =>
                      setCommunity({ ...community, lifestyle_content: val })
                    }
                    schema={communityLifestyleSchema}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="market">
              <Card>
                <CardHeader>
                  <CardTitle>Market Snapshot</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label>Median Price</Label>
                      <Input
                        type="number"
                        value={(community.market_snapshot as Record<string, unknown>)?.median_price as number || ''}
                        onChange={(e) =>
                          setCommunity({
                            ...community,
                            market_snapshot: {
                              ...(community.market_snapshot || {}),
                              median_price: parseInt(e.target.value) || 0,
                            },
                          })
                        }
                        placeholder="450000"
                      />
                    </div>
                    <div>
                      <Label>Avg Days on Market</Label>
                      <Input
                        type="number"
                        value={(community.market_snapshot as Record<string, unknown>)?.avg_dom as number || ''}
                        onChange={(e) =>
                          setCommunity({
                            ...community,
                            market_snapshot: {
                              ...(community.market_snapshot || {}),
                              avg_dom: parseInt(e.target.value) || 0,
                            },
                          })
                        }
                        placeholder="45"
                      />
                    </div>
                    <div>
                      <Label>YoY Price Change (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={(community.market_snapshot as Record<string, unknown>)?.yoy_change as number || ''}
                        onChange={(e) =>
                          setCommunity({
                            ...community,
                            market_snapshot: {
                              ...(community.market_snapshot || {}),
                              yoy_change: parseFloat(e.target.value) || 0,
                            },
                          })
                        }
                        placeholder="5.2"
                      />
                    </div>
                    <div>
                      <Label>Active Listings</Label>
                      <Input
                        type="number"
                        value={(community.market_snapshot as Record<string, unknown>)?.active_listings as number || ''}
                        onChange={(e) =>
                          setCommunity({
                            ...community,
                            market_snapshot: {
                              ...(community.market_snapshot || {}),
                              active_listings: parseInt(e.target.value) || 0,
                            },
                          })
                        }
                        placeholder="24"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="schools">
              <Card>
                <CardHeader>
                  <CardTitle>Schools Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <JSONEditor
                    value={community.schools_info || {}}
                    onChange={(val) =>
                      setCommunity({ ...community, schools_info: val })
                    }
                    schema={communitySchoolsSchema}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="seo">
              <Card>
                <CardHeader>
                  <CardTitle>SEO Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>SEO Title</Label>
                    <Input
                      value={community.seo_title || ''}
                      onChange={(e) =>
                        setCommunity({ ...community, seo_title: e.target.value })
                      }
                      placeholder="Living in [Community Name] | Neighborhood Guide"
                    />
                    <p className="mt-1 text-xs text-neutral-500">
                      {(community.seo_title?.length || 0)}/60 characters
                    </p>
                  </div>

                  <div>
                    <Label>SEO Description</Label>
                    <Textarea
                      value={community.seo_description || ''}
                      onChange={(e) =>
                        setCommunity({ ...community, seo_description: e.target.value })
                      }
                      placeholder="Discover everything about living in [Community Name]. Explore homes, schools, amenities, and lifestyle..."
                      rows={3}
                    />
                    <p className="mt-1 text-xs text-neutral-500">
                      {(community.seo_description?.length || 0)}/160 characters
                    </p>
                  </div>

                  {/* SEO Preview */}
                  <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800">
                    <p className="text-xs text-neutral-500">Google Preview</p>
                    <div className="mt-2">
                      <p className="text-lg text-blue-600">
                        {community.seo_title || community.name || 'Page Title'}
                      </p>
                      <p className="text-sm text-green-700">
                        yoursite.com/community/{community.slug || 'community-name'}
                      </p>
                      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                        {community.seo_description ||
                          community.description ||
                          'Page description will appear here...'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Basic Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Name *</Label>
                <Input
                  value={community.name || ''}
                  onChange={(e) => {
                    const name = e.target.value
                    setCommunity({
                      ...community,
                      name,
                      slug: isNew ? generateSlug(name) : community.slug,
                    })
                  }}
                  placeholder="Celebration"
                />
              </div>

              <div>
                <Label>Slug *</Label>
                <Input
                  value={community.slug || ''}
                  onChange={(e) =>
                    setCommunity({ ...community, slug: e.target.value })
                  }
                  placeholder="celebration"
                  disabled={!isNew}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>City</Label>
                  <Input
                    value={community.city || ''}
                    onChange={(e) =>
                      setCommunity({ ...community, city: e.target.value })
                    }
                    placeholder="Celebration"
                  />
                </div>
                <div>
                  <Label>State</Label>
                  <Input
                    value={community.state || ''}
                    onChange={(e) =>
                      setCommunity({ ...community, state: e.target.value })
                    }
                    placeholder="FL"
                  />
                </div>
              </div>

              <div>
                <Label>Short Description</Label>
                <Textarea
                  value={community.description || ''}
                  onChange={(e) =>
                    setCommunity({ ...community, description: e.target.value })
                  }
                  placeholder="A master-planned community near Walt Disney World..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Hero Image */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Hero Image
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {community.hero_image_url ? (
                <div className="relative aspect-video overflow-hidden rounded-lg">
                  <img
                    src={community.hero_image_url}
                    alt="Hero"
                    className="h-full w-full object-cover"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute right-2 top-2"
                    onClick={() =>
                      setCommunity({ ...community, hero_image_url: '' })
                    }
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="flex aspect-video items-center justify-center rounded-lg border-2 border-dashed border-neutral-200 dark:border-neutral-700">
                  <div className="text-center">
                    <ImageIcon className="mx-auto h-8 w-8 text-neutral-400" />
                    <p className="mt-2 text-sm text-neutral-500">No image</p>
                  </div>
                </div>
              )}
              <Input
                placeholder="Image URL"
                value={community.hero_image_url || ''}
                onChange={(e) =>
                  setCommunity({ ...community, hero_image_url: e.target.value })
                }
              />
            </CardContent>
          </Card>

          {/* Publish Panel */}
          <PublishPanel
            status={community.is_published ? 'published' : 'draft'}
            onSaveDraft={() => handleSave(false)}
            onPublish={() => handleSave(true)}
            onUnpublish={async () => {
              setCommunity({ ...community, is_published: false })
              await handleSave(false)
            }}
            lastSavedAt={community.updated_at}
            previewUrl={
              community.slug ? `/community/${community.slug}` : undefined
            }
            liveUrl={
              community.is_published && community.slug
                ? `/community/${community.slug}`
                : undefined
            }
            hasUnsavedChanges={false}
          />
        </div>
      </div>
    </div>
  )
}
