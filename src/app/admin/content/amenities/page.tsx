'use client'

import { useState, useEffect } from 'react'
import {
  Plus,
  Search,
  Waves,
  Dumbbell,
  Users,
  Shield,
  Car,
  Trees,
  Wifi,
  Bell,
  Building,
  Edit,
  Trash2,
  MapPin,
  Clock,
  Check,
  X,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface AmenityCategory {
  id: string
  name: string
  slug: string
  icon: string
}

interface Amenity {
  id: string
  name: string
  description: string | null
  category_id: string | null
  community_id: string | null
  address: string | null
  lat: number | null
  lng: number | null
  image_url: string | null
  access_type: string | null
  tags: string[] | null
  is_verified: boolean
  category?: AmenityCategory
}

// Icon mapping
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Waves,
  Dumbbell,
  Users,
  Shield,
  Car,
  Trees,
  Wifi,
  Bell,
  Building,
}

export default function AmenitiesPage() {
  const [amenities, setAmenities] = useState<Amenity[]>([])
  const [categories, setCategories] = useState<AmenityCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingAmenity, setEditingAmenity] = useState<Amenity | null>(null)

  useEffect(() => {
    fetchData()
  }, [selectedCategory, searchQuery])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      // Fetch categories
      const catRes = await fetch('/api/admin/content/amenity-categories')
      if (catRes.ok) {
        const catData = await catRes.json()
        setCategories(catData.categories || [])
      }

      // Fetch amenities
      const params = new URLSearchParams()
      if (selectedCategory) params.set('categoryId', selectedCategory)
      if (searchQuery) params.set('search', searchQuery)

      const res = await fetch(`/api/amenities?${params}`)
      if (res.ok) {
        const data = await res.json()
        setAmenities(data.amenities || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this amenity?')) return

    try {
      const res = await fetch(`/api/amenities?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setAmenities((prev) => prev.filter((a) => a.id !== id))
      }
    } catch (error) {
      console.error('Error deleting amenity:', error)
    }
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[28px] font-semibold text-white">Community Amenities</h1>
            <p className="text-[#a1a1a6] mt-1">
              Manage reusable amenity data for listings and communities
            </p>
          </div>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Amenity
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#636366]" />
            <input
              type="text"
              placeholder="Search amenities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-white/[0.08] bg-[#1c1c1e] pl-10 pr-4 py-2.5 text-white placeholder:text-[#636366] focus:border-[#0077ff] focus:outline-none"
            />
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
            <button
              onClick={() => setSelectedCategory(null)}
              className={cn(
                'flex-shrink-0 rounded-lg px-3 py-2 text-sm transition-colors',
                !selectedCategory
                  ? 'bg-[#0077ff] text-white'
                  : 'bg-[#1c1c1e] text-[#a1a1a6] hover:text-white'
              )}
            >
              All
            </button>
            {categories.map((cat) => {
              const Icon = iconMap[cat.icon] || Building
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    'flex-shrink-0 flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                    selectedCategory === cat.id
                      ? 'bg-[#0077ff] text-white'
                      : 'bg-[#1c1c1e] text-[#a1a1a6] hover:text-white'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {cat.name}
                </button>
              )
            })}
          </div>
        </div>

        {/* Amenities Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#0077ff]" />
          </div>
        ) : amenities.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {amenities.map((amenity) => {
              const Icon = amenity.category?.icon
                ? iconMap[amenity.category.icon] || Building
                : Building

              return (
                <div
                  key={amenity.id}
                  className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-4"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0077ff]/20">
                        <Icon className="h-5 w-5 text-[#0077ff]" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{amenity.name}</h3>
                        <p className="text-xs text-[#636366]">
                          {amenity.category?.name || 'Uncategorized'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {amenity.is_verified && (
                        <span className="rounded-full bg-green-500/20 p-1">
                          <Check className="h-3 w-3 text-green-500" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {amenity.description && (
                    <p className="mt-3 text-sm text-[#a1a1a6] line-clamp-2">
                      {amenity.description}
                    </p>
                  )}

                  {/* Meta */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {amenity.address && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-1 text-[11px] text-[#636366]">
                        <MapPin className="h-3 w-3" />
                        {amenity.address.split(',')[0]}
                      </span>
                    )}
                    {amenity.access_type && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-1 text-[11px] text-[#636366]">
                        <Shield className="h-3 w-3" />
                        {amenity.access_type}
                      </span>
                    )}
                  </div>

                  {/* Tags */}
                  {amenity.tags && amenity.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {amenity.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="rounded bg-[#0077ff]/10 px-2 py-0.5 text-[10px] text-[#0077ff]"
                        >
                          {tag}
                        </span>
                      ))}
                      {amenity.tags.length > 3 && (
                        <span className="text-[10px] text-[#636366]">
                          +{amenity.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-4 flex gap-2 pt-3 border-t border-white/[0.08]">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setEditingAmenity(amenity)}
                    >
                      <Edit className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-400 hover:text-red-300 hover:border-red-400/30"
                      onClick={() => handleDelete(amenity.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-12 text-center">
            <Building className="mx-auto h-12 w-12 text-[#636366]" />
            <h3 className="mt-4 font-semibold text-white">No Amenities Found</h3>
            <p className="mt-2 text-sm text-[#a1a1a6]">
              {searchQuery || selectedCategory
                ? 'Try adjusting your filters'
                : 'Add your first amenity to get started'}
            </p>
            <Button className="mt-4" onClick={() => setIsAddModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Amenity
            </Button>
          </div>
        )}

        {/* Add/Edit Modal */}
        {(isAddModalOpen || editingAmenity) && (
          <AmenityModal
            amenity={editingAmenity}
            categories={categories}
            onClose={() => {
              setIsAddModalOpen(false)
              setEditingAmenity(null)
            }}
            onSave={() => {
              setIsAddModalOpen(false)
              setEditingAmenity(null)
              fetchData()
            }}
          />
        )}
      </div>
    </div>
  )
}

interface AmenityModalProps {
  amenity: Amenity | null
  categories: AmenityCategory[]
  onClose: () => void
  onSave: () => void
}

function AmenityModal({ amenity, categories, onClose, onSave }: AmenityModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: amenity?.name || '',
    description: amenity?.description || '',
    categoryId: amenity?.category_id || '',
    address: amenity?.address || '',
    accessType: amenity?.access_type || '',
    tags: (amenity?.tags || []).join(', '),
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const payload = {
        ...(amenity && { id: amenity.id }),
        name: formData.name,
        description: formData.description || undefined,
        categoryId: formData.categoryId || undefined,
        address: formData.address || undefined,
        accessType: formData.accessType || undefined,
        tags: formData.tags
          ? formData.tags.split(',').map((t) => t.trim()).filter(Boolean)
          : undefined,
      }

      const res = await fetch('/api/amenities', {
        method: amenity ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        onSave()
      }
    } catch (error) {
      console.error('Error saving amenity:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-lg rounded-xl border border-white/[0.08] bg-[#1c1c1e]">
        <div className="flex items-center justify-between border-b border-white/[0.08] p-4">
          <h2 className="text-lg font-semibold text-white">
            {amenity ? 'Edit Amenity' : 'Add Amenity'}
          </h2>
          <button onClick={onClose} className="text-[#636366] hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm text-[#a1a1a6] mb-1">Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded-lg border border-white/[0.08] bg-[#0a0a0a] px-3 py-2.5 text-white placeholder:text-[#636366] focus:border-[#0077ff] focus:outline-none"
              placeholder="e.g., Resort-Style Pool"
            />
          </div>

          <div>
            <label className="block text-sm text-[#a1a1a6] mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-white/[0.08] bg-[#0a0a0a] px-3 py-2.5 text-white placeholder:text-[#636366] focus:border-[#0077ff] focus:outline-none resize-none"
              placeholder="Describe this amenity..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#a1a1a6] mb-1">Category</label>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className="w-full rounded-lg border border-white/[0.08] bg-[#0a0a0a] px-3 py-2.5 text-white focus:border-[#0077ff] focus:outline-none"
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-[#a1a1a6] mb-1">Access Type</label>
              <select
                value={formData.accessType}
                onChange={(e) => setFormData({ ...formData, accessType: e.target.value })}
                className="w-full rounded-lg border border-white/[0.08] bg-[#0a0a0a] px-3 py-2.5 text-white focus:border-[#0077ff] focus:outline-none"
              >
                <option value="">Select access</option>
                <option value="public">Public</option>
                <option value="residents">Residents Only</option>
                <option value="members">Members Only</option>
                <option value="private">Private</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-[#a1a1a6] mb-1">Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full rounded-lg border border-white/[0.08] bg-[#0a0a0a] px-3 py-2.5 text-white placeholder:text-[#636366] focus:border-[#0077ff] focus:outline-none"
              placeholder="123 Main St, Orlando, FL"
            />
          </div>

          <div>
            <label className="block text-sm text-[#a1a1a6] mb-1">Tags (comma-separated)</label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              className="w-full rounded-lg border border-white/[0.08] bg-[#0a0a0a] px-3 py-2.5 text-white placeholder:text-[#636366] focus:border-[#0077ff] focus:outline-none"
              placeholder="heated, saltwater, adults-only"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Amenity'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
