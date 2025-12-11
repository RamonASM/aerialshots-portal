'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { createBrowserClient } from '@supabase/ssr'
import { Camera, Loader2, Save, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import type { Database } from '@/lib/supabase/types'

type Agent = Database['public']['Tables']['agents']['Row']

interface ProfileFormData {
  name: string
  phone: string
  bio: string
  instagram_url: string
  brand_color: string
}

export default function ProfilePage() {
  const [agent, setAgent] = useState<Agent | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploadingHeadshot, setUploadingHeadshot] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ProfileFormData>()

  const brandColor = watch('brand_color') || '#ff4533'

  useEffect(() => {
    async function loadAgent() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) return

      const { data } = await supabase
        .from('agents')
        .select('*')
        .eq('email', user.email)
        .single()

      if (data) {
        setAgent(data)
        reset({
          name: data.name,
          phone: data.phone || '',
          bio: data.bio || '',
          instagram_url: data.instagram_url || '',
          brand_color: data.brand_color || '#ff4533',
        })
      }
      setLoading(false)
    }

    loadAgent()
  }, [supabase, reset])

  const onSubmit = async (data: ProfileFormData) => {
    if (!agent) return

    setSaving(true)
    setSaved(false)

    const { error } = await supabase
      .from('agents')
      .update({
        name: data.name,
        phone: data.phone || null,
        bio: data.bio || null,
        instagram_url: data.instagram_url || null,
        brand_color: data.brand_color,
        updated_at: new Date().toISOString(),
      })
      .eq('id', agent.id)

    if (!error) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }

    setSaving(false)
  }

  const handleImageUpload = async (
    file: File,
    type: 'headshot' | 'logo'
  ) => {
    if (!agent) return

    const setUploading = type === 'headshot' ? setUploadingHeadshot : setUploadingLogo

    setUploading(true)

    const fileExt = file.name.split('.').pop()
    const fileName = `${agent.id}/${type}-${Date.now()}.${fileExt}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('agent-assets')
      .upload(fileName, file, { upsert: true })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('agent-assets')
      .getPublicUrl(fileName)

    const updateField = type === 'headshot' ? 'headshot_url' : 'logo_url'

    await supabase
      .from('agents')
      .update({ [updateField]: publicUrl })
      .eq('id', agent.id)

    setAgent({ ...agent, [updateField]: publicUrl })
    setUploading(false)
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
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Profile Settings</h1>
        <p className="mt-1 text-neutral-600">
          Manage your profile and branding for property pages.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Images Section */}
        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <h2 className="font-semibold text-neutral-900">Photos</h2>
          <p className="mt-1 text-sm text-neutral-600">
            Your headshot and logo appear on delivery and lifestyle pages.
          </p>

          <div className="mt-6 flex flex-wrap gap-8">
            {/* Headshot */}
            <div>
              <Label>Headshot</Label>
              <div className="mt-2 flex items-center gap-4">
                <div className="relative h-24 w-24 overflow-hidden rounded-full bg-neutral-100">
                  {agent?.headshot_url ? (
                    <img
                      src={agent.headshot_url}
                      alt="Headshot"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-neutral-400">
                      {agent?.name?.charAt(0) || '?'}
                    </div>
                  )}
                  {uploadingHeadshot && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <Loader2 className="h-6 w-6 animate-spin text-white" />
                    </div>
                  )}
                </div>
                <label className="cursor-pointer">
                  <Button variant="outline" size="sm" type="button" asChild>
                    <span>
                      <Camera className="mr-2 h-4 w-4" />
                      Upload
                    </span>
                  </Button>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleImageUpload(file, 'headshot')
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Logo */}
            <div>
              <Label>Logo</Label>
              <div className="mt-2 flex items-center gap-4">
                <div className="flex h-24 w-40 items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50">
                  {agent?.logo_url ? (
                    <img
                      src={agent.logo_url}
                      alt="Logo"
                      className="max-h-20 max-w-36 object-contain"
                    />
                  ) : (
                    <span className="text-sm text-neutral-400">No logo</span>
                  )}
                  {uploadingLogo && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <Loader2 className="h-6 w-6 animate-spin text-white" />
                    </div>
                  )}
                </div>
                <label className="cursor-pointer">
                  <Button variant="outline" size="sm" type="button" asChild>
                    <span>
                      <Camera className="mr-2 h-4 w-4" />
                      Upload
                    </span>
                  </Button>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleImageUpload(file, 'logo')
                    }}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Basic Info Section */}
        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <h2 className="font-semibold text-neutral-900">Basic Information</h2>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div>
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                {...register('name', { required: 'Name is required' })}
                className="mt-1"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                {...register('phone')}
                placeholder="(555) 123-4567"
                className="mt-1"
              />
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                {...register('bio')}
                placeholder="Tell potential clients about yourself..."
                rows={4}
                className="mt-1"
              />
              <p className="mt-1 text-sm text-neutral-500">
                Appears on your property pages and portfolio.
              </p>
            </div>

            <div>
              <Label htmlFor="instagram_url">Instagram URL</Label>
              <Input
                id="instagram_url"
                {...register('instagram_url')}
                placeholder="https://instagram.com/yourusername"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="brand_color">Brand Color</Label>
              <div className="mt-1 flex items-center gap-3">
                <input
                  type="color"
                  id="brand_color"
                  {...register('brand_color')}
                  className="h-10 w-16 cursor-pointer rounded border border-neutral-200"
                />
                <div
                  className="h-10 flex-1 rounded-lg px-4 py-2 text-white"
                  style={{ backgroundColor: brandColor }}
                >
                  Preview
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end gap-4">
          {saved && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span>Saved!</span>
            </div>
          )}
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
