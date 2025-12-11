'use client'

import { useState } from 'react'
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

export default function NewCuratedItemPage() {
  const router = useRouter()
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
    formState: { errors },
  } = useForm<CuratedItemForm>({
    defaultValues: {
      radius_miles: '5',
      category: 'development',
    },
  })

  const watchLat = watch('lat')
  const watchLng = watch('lng')

  const onSubmit = async (data: CuratedItemForm) => {
    setSaving(true)
    setError(null)

    const { error: insertError } = await supabase.from('curated_items').insert({
      title: data.title,
      description: data.description || null,
      source_url: data.source_url || null,
      category: data.category,
      lat: parseFloat(data.lat),
      lng: parseFloat(data.lng),
      radius_miles: parseFloat(data.radius_miles) || 5,
      expires_at: data.expires_at || null,
    })

    if (insertError) {
      setError('Failed to create item. Please try again.')
      setSaving(false)
      return
    }

    router.push('/admin/curation')
    router.refresh()
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
          <h1 className="text-2xl font-bold text-neutral-900">Add Curated Item</h1>
          <p className="mt-1 text-neutral-600">
            Add neighborhood content that appears on lifestyle pages.
          </p>
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
                placeholder="e.g., New Publix Opening"
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
                placeholder="Brief description of the development or news..."
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
                placeholder="https://..."
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
              <p className="mt-1 text-xs text-neutral-500">
                Leave empty for no expiration
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <h2 className="mb-4 font-semibold text-neutral-900">Location</h2>
          <p className="mb-4 text-sm text-neutral-600">
            Enter the coordinates and radius for this content. It will appear on
            lifestyle pages for properties within this radius.
          </p>

          <div className="grid gap-6 sm:grid-cols-3">
            <div>
              <Label htmlFor="lat">Latitude *</Label>
              <Input
                id="lat"
                type="number"
                step="any"
                {...register('lat', { required: 'Latitude is required' })}
                placeholder="28.5383"
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
                placeholder="-81.3792"
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

          {/* Map Preview */}
          {watchLat && watchLng && (
            <div className="mt-4">
              <p className="mb-2 text-sm text-neutral-600">Preview Location:</p>
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
              'Create Item'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
