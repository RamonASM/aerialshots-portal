'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Plus,
  Edit2,
  Trash2,
  UserCheck,
  UserX,
  Loader2,
  AlertCircle,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

interface Staff {
  id: string
  email: string
  name: string
  role: string
  phone: string | null
  is_active: boolean
  created_at: string
}

const ROLES = [
  { value: 'admin', label: 'Admin', description: 'Full access to all features' },
  { value: 'photographer', label: 'Photographer', description: 'Access to ops and scheduling' },
  { value: 'qc', label: 'QC Specialist', description: 'Access to quality control' },
  { value: 'va', label: 'Virtual Assistant', description: 'Access to care and operations' },
  { value: 'editor', label: 'Editor', description: 'Access to curation and editing' },
]

const getRoleBadgeColor = (role: string) => {
  switch (role) {
    case 'admin':
      return 'bg-red-100 text-red-800'
    case 'photographer':
      return 'bg-blue-100 text-blue-800'
    case 'qc':
      return 'bg-green-100 text-green-800'
    case 'va':
      return 'bg-purple-100 text-purple-800'
    case 'editor':
      return 'bg-orange-100 text-orange-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export default function TeamPage() {
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form states
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: 'photographer',
    phone: '',
  })

  const fetchStaff = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/staff')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch staff')
      }

      setStaff(data.staff)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load staff')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStaff()
  }, [fetchStaff])

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add staff member')
      }

      setStaff([data.staff, ...staff])
      setIsAddModalOpen(false)
      setFormData({ email: '', name: '', role: 'photographer', phone: '' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add staff')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStaff) return

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/staff/${selectedStaff.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          role: formData.role,
          phone: formData.phone || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update staff member')
      }

      setStaff(staff.map((s) => (s.id === selectedStaff.id ? data.staff : s)))
      setIsEditModalOpen(false)
      setSelectedStaff(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update staff')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleActive = async (staffMember: Staff) => {
    try {
      const response = await fetch(`/api/admin/staff/${staffMember.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !staffMember.is_active }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update staff status')
      }

      setStaff(staff.map((s) => (s.id === staffMember.id ? data.staff : s)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update staff')
    }
  }

  const handleDeleteStaff = async () => {
    if (!selectedStaff) return

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/staff/${selectedStaff.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete staff member')
      }

      setStaff(staff.filter((s) => s.id !== selectedStaff.id))
      setIsDeleteModalOpen(false)
      setSelectedStaff(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete staff')
    } finally {
      setSubmitting(false)
    }
  }

  const openEditModal = (staffMember: Staff) => {
    setSelectedStaff(staffMember)
    setFormData({
      email: staffMember.email,
      name: staffMember.name,
      role: staffMember.role,
      phone: staffMember.phone || '',
    })
    setIsEditModalOpen(true)
  }

  const openDeleteModal = (staffMember: Staff) => {
    setSelectedStaff(staffMember)
    setIsDeleteModalOpen(true)
  }

  const activeStaff = staff.filter((s) => s.is_active)
  const inactiveStaff = staff.filter((s) => !s.is_active)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Team Management</h1>
          <p className="text-sm text-neutral-600">
            Manage staff members who have access to the admin portal
          </p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Staff
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          <AlertCircle className="h-5 w-5" />
          <p>{error}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Staff</CardDescription>
            <CardTitle className="text-3xl">{staff.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active</CardDescription>
            <CardTitle className="text-3xl text-green-600">
              {activeStaff.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Inactive</CardDescription>
            <CardTitle className="text-3xl text-neutral-400">
              {inactiveStaff.length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Staff List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Staff Members
          </CardTitle>
          <CardDescription>
            All users who can access the admin portal
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
            </div>
          ) : staff.length === 0 ? (
            <div className="py-8 text-center text-neutral-500">
              No staff members yet. Add your first team member.
            </div>
          ) : (
            <div className="divide-y divide-neutral-200">
              {staff.map((member) => (
                <div
                  key={member.id}
                  className={`flex items-center justify-between py-4 ${
                    !member.is_active ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full ${
                        member.is_active
                          ? 'bg-neutral-900 text-white'
                          : 'bg-neutral-300 text-neutral-600'
                      }`}
                    >
                      {member.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-neutral-900">
                          {member.name}
                        </span>
                        <Badge
                          variant="secondary"
                          className={getRoleBadgeColor(member.role)}
                        >
                          {member.role}
                        </Badge>
                        {!member.is_active && (
                          <Badge variant="outline" className="text-neutral-500">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-neutral-500">
                        {member.email}
                        {member.phone && ` • ${member.phone}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(member)}
                      title={member.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {member.is_active ? (
                        <UserX className="h-4 w-4" />
                      ) : (
                        <UserCheck className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(member)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDeleteModal(member)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Staff Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Staff Member</DialogTitle>
            <DialogDescription>
              Add a new team member who will have access to the admin portal.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddStaff}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@aerialshots.media"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) =>
                    setFormData({ ...formData, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        <div>
                          <div className="font-medium">{role.label}</div>
                          <div className="text-xs text-neutral-500">
                            {role.description}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone (optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Staff'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Staff Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Staff Member</DialogTitle>
            <DialogDescription>
              Update {selectedStaff?.name}&apos;s information.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditStaff}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  disabled
                  className="bg-neutral-100"
                />
                <p className="text-xs text-neutral-500">
                  Email cannot be changed
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full Name</Label>
                <Input
                  id="edit-name"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role">Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) =>
                    setFormData({ ...formData, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        <div>
                          <div className="font-medium">{role.label}</div>
                          <div className="text-xs text-neutral-500">
                            {role.description}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone (optional)</Label>
                <Input
                  id="edit-phone"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Staff Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-medium">{selectedStaff?.name}</span>? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteStaff}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
