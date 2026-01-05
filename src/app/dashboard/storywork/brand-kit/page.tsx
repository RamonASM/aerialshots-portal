'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import {
  ArrowLeft,
  Palette,
  Type,
  Image,
  Loader2,
  Save,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Database } from '@/lib/supabase/types'

const fontOptions = [
  { value: 'Inter', label: 'Inter (Modern)' },
  { value: 'Playfair Display', label: 'Playfair Display (Elegant)' },
  { value: 'Montserrat', label: 'Montserrat (Clean)' },
  { value: 'Roboto', label: 'Roboto (Professional)' },
  { value: 'Poppins', label: 'Poppins (Friendly)' },
]

export default function BrandKitPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [brandKit, setBrandKit] = useState({
    name: 'My Brand',
    primary_color: '#ff4533',
    secondary_color: '#000000',
    font_family: 'Inter',
    logo_url: '',
    headshot_url: '',
  })
  const [error, setError] = useState<string | null>(null)

  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function loadBrandKit() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data: agent } = await supabase
        .from('agents')
        .select('id, brand_color, headshot_url, logo_url')
        .eq('email', user.email!)
        .single()

      if (!agent) {
        router.push('/login')
        return
      }

      // Try to get existing brand kit
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existingKit } = await (supabase as any)
        .from('brand_kits')
        .select('*')
        .eq('agent_id', agent.id)
        .eq('is_default', true)
        .single() as { data: { name: string | null; primary_color: string | null; secondary_color: string | null; font_family: string | null; logo_url: string | null } | null }

      if (existingKit) {
        setBrandKit({
          name: existingKit.name || '',
          primary_color: existingKit.primary_color || '#ff4533',
          secondary_color: existingKit.secondary_color || '#000000',
          font_family: existingKit.font_family || 'Inter',
          logo_url: existingKit.logo_url || agent.logo_url || '',
          headshot_url: agent.headshot_url || '',
        })
      } else {
        // Use agent defaults
        setBrandKit((prev) => ({
          ...prev,
          primary_color: agent.brand_color || '#ff4533',
          logo_url: agent.logo_url || '',
          headshot_url: agent.headshot_url || '',
        }))
      }

      setLoading(false)
    }

    loadBrandKit()
  }, [supabase, router])

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data: agent } = await supabase
        .from('agents')
        .select('id')
        .eq('email', user.email!)
        .single()

      if (!agent) {
        setError('Agent not found')
        setSaving(false)
        return
      }

      // Check if brand kit exists
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existingKit } = await (supabase as any)
        .from('brand_kits')
        .select('id')
        .eq('agent_id', agent.id)
        .eq('is_default', true)
        .single() as { data: { id: string } | null }

      if (existingKit) {
        // Update
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('brand_kits')
          .update({
            name: brandKit.name,
            primary_color: brandKit.primary_color,
            secondary_color: brandKit.secondary_color,
            font_family: brandKit.font_family,
            logo_url: brandKit.logo_url || null,
            headshot_url: brandKit.headshot_url || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingKit.id)
      } else {
        // Create
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from('brand_kits').insert({
          agent_id: agent.id,
          name: brandKit.name,
          primary_color: brandKit.primary_color,
          secondary_color: brandKit.secondary_color,
          font_family: brandKit.font_family,
          logo_url: brandKit.logo_url || null,
          headshot_url: brandKit.headshot_url || null,
          is_default: true,
        })
      }

      router.push('/dashboard/storywork')
    } catch (err) {
      console.error('Error saving brand kit:', err)
      setError('Failed to save brand kit')
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/storywork">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Brand Kit</h1>
          <p className="mt-1 text-neutral-600">
            Customize your carousel branding.
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Settings */}
        <div className="space-y-6">
          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                <Palette className="h-5 w-5 text-purple-600" />
              </div>
              <h2 className="font-semibold text-neutral-900">Colors</h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="primary_color">Primary Color</Label>
                <div className="mt-1 flex gap-2">
                  <Input
                    id="primary_color"
                    type="color"
                    value={brandKit.primary_color}
                    onChange={(e) =>
                      setBrandKit((prev) => ({
                        ...prev,
                        primary_color: e.target.value,
                      }))
                    }
                    className="h-10 w-16 cursor-pointer p-1"
                  />
                  <Input
                    type="text"
                    value={brandKit.primary_color}
                    onChange={(e) =>
                      setBrandKit((prev) => ({
                        ...prev,
                        primary_color: e.target.value,
                      }))
                    }
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="secondary_color">Secondary Color</Label>
                <div className="mt-1 flex gap-2">
                  <Input
                    id="secondary_color"
                    type="color"
                    value={brandKit.secondary_color}
                    onChange={(e) =>
                      setBrandKit((prev) => ({
                        ...prev,
                        secondary_color: e.target.value,
                      }))
                    }
                    className="h-10 w-16 cursor-pointer p-1"
                  />
                  <Input
                    type="text"
                    value={brandKit.secondary_color}
                    onChange={(e) =>
                      setBrandKit((prev) => ({
                        ...prev,
                        secondary_color: e.target.value,
                      }))
                    }
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <Type className="h-5 w-5 text-blue-600" />
              </div>
              <h2 className="font-semibold text-neutral-900">Typography</h2>
            </div>

            <div>
              <Label htmlFor="font_family">Font Family</Label>
              <select
                id="font_family"
                value={brandKit.font_family}
                onChange={(e) =>
                  setBrandKit((prev) => ({
                    ...prev,
                    font_family: e.target.value,
                  }))
                }
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
              >
                {fontOptions.map((font) => (
                  <option key={font.value} value={font.value}>
                    {font.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                <Image className="h-5 w-5 text-green-600" />
              </div>
              <h2 className="font-semibold text-neutral-900">Images</h2>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="logo_url">Logo URL</Label>
                <Input
                  id="logo_url"
                  type="url"
                  value={brandKit.logo_url}
                  onChange={(e) =>
                    setBrandKit((prev) => ({ ...prev, logo_url: e.target.value }))
                  }
                  placeholder="https://..."
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="headshot_url">Headshot URL</Label>
                <Input
                  id="headshot_url"
                  type="url"
                  value={brandKit.headshot_url}
                  onChange={(e) =>
                    setBrandKit((prev) => ({
                      ...prev,
                      headshot_url: e.target.value,
                    }))
                  }
                  placeholder="https://..."
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Brand Kit
              </>
            )}
          </Button>
        </div>

        {/* Preview */}
        <div>
          <h2 className="mb-4 font-semibold text-neutral-900">Preview</h2>
          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <div
              className="aspect-square rounded-lg p-6"
              style={{ backgroundColor: brandKit.primary_color }}
            >
              <div className="flex h-full flex-col justify-between">
                <div>
                  {brandKit.logo_url && (
                    <img
                      src={brandKit.logo_url}
                      alt="Logo"
                      className="h-12 w-auto"
                    />
                  )}
                </div>
                <div>
                  <h3
                    className="text-2xl font-bold text-white"
                    style={{ fontFamily: brandKit.font_family }}
                  >
                    Sample Headline
                  </h3>
                  <p
                    className="mt-2 text-white/80"
                    style={{ fontFamily: brandKit.font_family }}
                  >
                    This is what your carousel slides will look like.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {brandKit.headshot_url && (
                    <img
                      src={brandKit.headshot_url}
                      alt="Headshot"
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  )}
                  <div>
                    <p
                      className="text-sm font-medium text-white"
                      style={{ fontFamily: brandKit.font_family }}
                    >
                      Your Name
                    </p>
                    <p
                      className="text-xs text-white/60"
                      style={{ fontFamily: brandKit.font_family }}
                    >
                      Real Estate Agent
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
