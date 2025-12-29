'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import {
  MapPin,
  Plus,
  Search,
  Edit2,
  Trash2,
  Users,
  Loader2,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

interface Territory {
  id: string
  name: string
  description: string | null
  zip_codes: string[]
  cities: string[]
  is_active: boolean
  assigned_staff: number
  created_at: string
}

interface StaffMember {
  id: string
  name: string
  role: string
}

export default function TerritoriesPage() {
  const [territories, setTerritories] = useState<Territory[]>([])
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingTerritory, setEditingTerritory] = useState<Territory | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    zip_codes: '',
    cities: '',
    is_active: true,
  })

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [terrResponse, staffResponse] = await Promise.all([
        fetch('/api/admin/team/territories'),
        fetch('/api/admin/team/staff'),
      ])

      if (terrResponse.ok) {
        const data = await terrResponse.json()
        setTerritories(data.territories || [])
      }

      if (staffResponse.ok) {
        const data = await staffResponse.json()
        setStaff(data.staff || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const openCreateModal = () => {
    setEditingTerritory(null)
    setFormData({
      name: '',
      description: '',
      zip_codes: '',
      cities: '',
      is_active: true,
    })
    setShowModal(true)
  }

  const openEditModal = (territory: Territory) => {
    setEditingTerritory(territory)
    setFormData({
      name: territory.name,
      description: territory.description || '',
      zip_codes: territory.zip_codes.join(', '),
      cities: territory.cities.join(', '),
      is_active: territory.is_active,
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!formData.name.trim()) return

    setSaving(true)
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        zip_codes: formData.zip_codes.split(',').map((z) => z.trim()).filter(Boolean),
        cities: formData.cities.split(',').map((c) => c.trim()).filter(Boolean),
        is_active: formData.is_active,
      }

      const url = editingTerritory
        ? `/api/admin/team/territories/${editingTerritory.id}`
        : '/api/admin/team/territories'

      const response = await fetch(url, {
        method: editingTerritory ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error('Failed to save')

      setShowModal(false)
      fetchData()
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Failed to save territory')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this territory? Staff assignments will be removed.')) return

    try {
      const response = await fetch(`/api/admin/team/territories/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete')
      fetchData()
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Failed to delete territory')
    }
  }

  const filteredTerritories = territories.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.cities.some((c) => c.toLowerCase().includes(search.toLowerCase())) ||
      t.zip_codes.some((z) => z.includes(search))
  )

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Service Territories
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400">
            Define geographic service areas for your team
          </p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="mr-2 h-4 w-4" />
          Add Territory
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <input
          type="text"
          placeholder="Search by name, city, or ZIP..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
        />
      </div>

      {/* Territories Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
        </div>
      ) : filteredTerritories.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-12 text-center dark:border-neutral-700 dark:bg-neutral-900">
          <MapPin className="mx-auto h-12 w-12 text-neutral-400" />
          <h3 className="mt-4 text-lg font-medium text-neutral-900 dark:text-white">
            No territories defined
          </h3>
          <p className="mt-2 text-neutral-500">
            Create service territories to organize your team by geographic area.
          </p>
          <Button onClick={openCreateModal} className="mt-4">
            <Plus className="mr-2 h-4 w-4" />
            Create Territory
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTerritories.map((territory) => (
            <div
              key={territory.id}
              className="rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
                    <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-900 dark:text-white">
                      {territory.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      {territory.is_active ? (
                        <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                          <CheckCircle className="h-3 w-3" />
                          Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-neutral-500">
                          <XCircle className="h-3 w-3" />
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEditModal(territory)}
                    className="rounded p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(territory.id)}
                    className="rounded p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {territory.description && (
                <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
                  {territory.description}
                </p>
              )}

              <div className="mt-4 space-y-2">
                {territory.cities.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-neutral-500">Cities:</span>
                    <p className="text-sm text-neutral-700 dark:text-neutral-300">
                      {territory.cities.slice(0, 3).join(', ')}
                      {territory.cities.length > 3 && ` +${territory.cities.length - 3} more`}
                    </p>
                  </div>
                )}
                {territory.zip_codes.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-neutral-500">ZIP Codes:</span>
                    <p className="text-sm text-neutral-700 dark:text-neutral-300">
                      {territory.zip_codes.slice(0, 5).join(', ')}
                      {territory.zip_codes.length > 5 && ` +${territory.zip_codes.length - 5} more`}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center gap-2 border-t border-neutral-100 pt-4 dark:border-neutral-800">
                <Users className="h-4 w-4 text-neutral-400" />
                <span className="text-sm text-neutral-500">
                  {territory.assigned_staff} team member{territory.assigned_staff !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal with Focus Trap and ARIA */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingTerritory ? 'Edit Territory' : 'Create Territory'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label htmlFor="territory-name" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Name *
              </label>
              <input
                id="territory-name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Orlando Metro"
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="territory-description" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Description
              </label>
              <textarea
                id="territory-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description..."
                rows={2}
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="territory-cities" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Cities (comma-separated)
              </label>
              <input
                id="territory-cities"
                type="text"
                value={formData.cities}
                onChange={(e) => setFormData({ ...formData, cities: e.target.value })}
                placeholder="Orlando, Winter Park, Kissimmee"
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="territory-zip-codes" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                ZIP Codes (comma-separated)
              </label>
              <input
                id="territory-zip-codes"
                type="text"
                value={formData.zip_codes}
                onChange={(e) => setFormData({ ...formData, zip_codes: e.target.value })}
                placeholder="32801, 32803, 32804"
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-4 w-4 rounded border-neutral-300"
                aria-describedby="is_active_description"
              />
              <label htmlFor="is_active" className="text-sm text-neutral-700 dark:text-neutral-300">
                Territory is active
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !formData.name.trim()}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Territory'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
