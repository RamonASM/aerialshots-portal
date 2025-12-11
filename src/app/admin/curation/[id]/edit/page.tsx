'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { createBrowserClient } from '@supabase/ssr'
import { ArrowLeft, Loader2, MapPin } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import type { Database } from '@/lib/supabase/types'
import { use } from 'react'

interface CuratedItemForm {
  title: string
  description: string
  source_url: string
  category: string
  lat: string
  lng: string
  radius_miles: string
  expires_at: string
}

const categories = [
  { value: 'development', label: 'New Development' },
  { value: 'infrastructure', label: 'Infrastructure' },
  { value: 'business', label: 'New Business' },
  { value: 'event', label: 'Community Event' },
  { value: 'school', label: 'Education' },
  { value: 'park', label: 'Parks & Recreation' },
]

export default function EditCuratedItemPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<CuratedItemForm>()

  const watchLat = watch('lat')
  const watchLng = watch('lng')

  useEffect(() => {
    async function loadItem() {
      const { data } = await supabase
        .from('curated_items')
        .select('*')
        .eq('id', id)
        .single()

      if (data) {
        reset({
          title: data.title,
          description: data.description || '',
          source_url: data.source_url || '',
          category: data.category,
          lat: String(data.lat),
          lng: String(data.lng),
          radius_miles: String(data.radius_miles),
          expires_at: data.expires_at?.split('T')[0] || '',
        })
      }
      setLoading(false)
    }

    loadItem()
  }, [id, supabase, reset])

  const onSubmit = async (data: CuratedItemForm) => {
    setSaving(true)
    setError(null)

    const { error: updateError } = await supabase
      .from('curated_items')
      .update({
        title: data.title,
        description: data.description || null,
        source_url: data.source_url || null,
        category: data.category,
        lat: parseFloat(data.lat),
        lng: parseFloat(data.lng),
        radius_miles: parseFloat(data.radius_miles) || 5,
        expires_at: data.expires_at || null,
      })
      .eq('id', id)

    if (updateError) {
      setError('Failed to update item. Please try again.')
      setSaving(false)
      return
    }

    router.push('/admin/curation')
    router.refresh()
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
          <Link href="/admin/curation">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Edit Curated Item</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <h2 className="mb-4 font-semibold text-neutral-900">Basic Information</h2>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                {...register('title', { required: 'Title is required' })}
                className="mt-1"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                rows={3}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="category">Category *</Label>
              <select
                id="category"
                {...register('category', { required: true })}
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="source_url">Source URL</Label>
              <Input
                id="source_url"
                type="url"
                {...register('source_url')}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="expires_at">Expiration Date</Label>
              <Input
                id="expires_at"
                type="date"
                {...register('expires_at')}
                className="mt-1"
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <h2 className="mb-4 font-semibold text-neutral-900">Location</h2>

          <div className="grid gap-6 sm:grid-cols-3">
            <div>
              <Label htmlFor="lat">Latitude *</Label>
              <Input
                id="lat"
                type="number"
                step="any"
                {...register('lat', { required: 'Latitude is required' })}
                className="mt-1"
              />
              {errors.lat && (
                <p className="mt-1 text-sm text-red-600">{errors.lat.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="lng">Longitude *</Label>
              <Input
                id="lng"
                type="number"
                step="any"
                {...register('lng', { required: 'Longitude is required' })}
                className="mt-1"
              />
              {errors.lng && (
                <p className="mt-1 text-sm text-red-600">{errors.lng.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="radius_miles">Radius (miles)</Label>
              <Input
                id="radius_miles"
                type="number"
                step="0.5"
                {...register('radius_miles')}
                className="mt-1"
              />
            </div>
          </div>

          {watchLat && watchLng && (
            <div className="mt-4">
              <a
                href={`https://www.google.com/maps?q=${watchLat},${watchLng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[#ff4533] hover:underline"
              >
                <MapPin className="h-4 w-4" />
                View on Google Maps
              </a>
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-red-600">{error}</div>
        )}

        <div className="flex justify-end gap-4">
          <Button variant="outline" asChild>
            <Link href="/admin/curation">Cancel</Link>
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
