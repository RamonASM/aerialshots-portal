'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, User, Camera, Palette, Calendar, Check, AlertCircle, Loader2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Listing {
  id: string
  address: string
  city: string
  state: string
  ops_status: string
  scheduled_at: string | null
  photographer_id: string | null
  editor_id: string | null
}

interface Staff {
  id: string
  name: string
  email: string
  phone: string | null
  role: string
  workload: number
  todayJobs: number
}

interface AssignmentResult {
  success: boolean
  listing_id: string
  error?: string
}

export default function AssignPage() {
  const [listings, setListings] = useState<Listing[]>([])
  const [photographers, setPhotographers] = useState<Staff[]>([])
  const [editors, setEditors] = useState<Staff[]>([])
  const [selectedListings, setSelectedListings] = useState<Set<string>>(new Set())
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null)
  const [assignmentRole, setAssignmentRole] = useState<'photographer' | 'editor'>('photographer')
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(false)
  const [results, setResults] = useState<AssignmentResult[] | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('unassigned')

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      // Fetch unassigned listings
      const listingsRes = await fetch('/api/admin/listings?include_all=true')
      if (listingsRes.ok) {
        const data = await listingsRes.json()
        setListings(data.listings || [])
      }

      // Fetch photographers
      const photosRes = await fetch('/api/admin/assignments?role=photographer')
      if (photosRes.ok) {
        const data = await photosRes.json()
        setPhotographers(data.staff || [])
      }

      // Fetch editors
      const editorsRes = await fetch('/api/admin/assignments?role=editor')
      if (editorsRes.ok) {
        const data = await editorsRes.json()
        setEditors(data.staff || [])
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    }
    setLoading(false)
  }

  const filteredListings = listings.filter((l) => {
    if (filterStatus === 'unassigned') {
      return assignmentRole === 'photographer'
        ? !l.photographer_id && ['pending', 'scheduled'].includes(l.ops_status || '')
        : !l.editor_id && ['staged', 'awaiting_editing'].includes(l.ops_status || '')
    }
    if (filterStatus === 'all') return true
    return l.ops_status === filterStatus
  })

  const toggleListing = (id: string) => {
    const newSelected = new Set(selectedListings)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedListings(newSelected)
  }

  const selectAll = () => {
    if (selectedListings.size === filteredListings.length) {
      setSelectedListings(new Set())
    } else {
      setSelectedListings(new Set(filteredListings.map((l) => l.id)))
    }
  }

  async function handleAssign() {
    if (!selectedStaff || selectedListings.size === 0) return

    setAssigning(true)
    setResults(null)

    try {
      const assignments = Array.from(selectedListings).map((listing_id) => ({
        listing_id,
        staff_id: selectedStaff,
        role: assignmentRole,
      }))

      const res = await fetch('/api/admin/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignments }),
      })

      const data = await res.json()
      setResults(data.results || [])

      // Clear selection on success
      if (data.success) {
        setSelectedListings(new Set())
        setSelectedStaff(null)
        // Refresh data
        fetchData()
      }
    } catch (error) {
      console.error('Assignment failed:', error)
    }

    setAssigning(false)
  }

  const currentStaffList = assignmentRole === 'photographer' ? photographers : editors

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/ops" className="text-neutral-400 hover:text-neutral-600">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Assign Jobs</h1>
            <p className="text-neutral-600">Batch assign photographers and editors to jobs</p>
          </div>
        </div>
      </div>

      {/* Role Toggle */}
      <div className="flex gap-2 rounded-lg bg-neutral-100 p-1">
        <button
          onClick={() => {
            setAssignmentRole('photographer')
            setSelectedListings(new Set())
            setSelectedStaff(null)
          }}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            assignmentRole === 'photographer'
              ? 'bg-white text-neutral-900 shadow-sm'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          <Camera className="h-4 w-4" />
          Photographers
        </button>
        <button
          onClick={() => {
            setAssignmentRole('editor')
            setSelectedListings(new Set())
            setSelectedStaff(null)
          }}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            assignmentRole === 'editor'
              ? 'bg-white text-neutral-900 shadow-sm'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          <Palette className="h-4 w-4" />
          Editors
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Jobs List */}
        <div className="rounded-lg border border-neutral-200 bg-white">
          <div className="border-b border-neutral-200 p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-neutral-900">
                Select Jobs ({selectedListings.size} selected)
              </h2>
              <div className="flex items-center gap-2">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="rounded-md border border-neutral-300 px-2 py-1 text-sm"
                >
                  <option value="unassigned">Unassigned</option>
                  <option value="pending">Pending</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="staged">Staged</option>
                  <option value="awaiting_editing">Awaiting Editing</option>
                  <option value="all">All</option>
                </select>
                <Button variant="ghost" size="sm" onClick={selectAll}>
                  {selectedListings.size === filteredListings.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
            </div>
          </div>

          <div className="max-h-[500px] overflow-y-auto p-2">
            {filteredListings.length === 0 ? (
              <p className="p-4 text-center text-neutral-500">
                No jobs matching current filter
              </p>
            ) : (
              <div className="space-y-1">
                {filteredListings.map((listing) => (
                  <button
                    key={listing.id}
                    onClick={() => toggleListing(listing.id)}
                    className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors ${
                      selectedListings.has(listing.id)
                        ? 'bg-blue-50 border border-blue-200'
                        : 'hover:bg-neutral-50 border border-transparent'
                    }`}
                  >
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded border ${
                        selectedListings.has(listing.id)
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-neutral-300'
                      }`}
                    >
                      {selectedListings.has(listing.id) && (
                        <Check className="h-3 w-3 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-neutral-900 truncate">
                        {listing.address}
                      </p>
                      <p className="text-sm text-neutral-500">
                        {listing.city}, {listing.state} · {listing.ops_status?.replace('_', ' ')}
                      </p>
                    </div>
                    {listing.scheduled_at && (
                      <div className="flex items-center gap-1 text-xs text-neutral-400">
                        <Calendar className="h-3 w-3" />
                        {new Date(listing.scheduled_at).toLocaleDateString()}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Staff Selection */}
        <div className="space-y-4">
          <div className="rounded-lg border border-neutral-200 bg-white">
            <div className="border-b border-neutral-200 p-4">
              <h2 className="font-semibold text-neutral-900">
                Select {assignmentRole === 'photographer' ? 'Photographer' : 'Editor'}
              </h2>
              <p className="text-sm text-neutral-500">
                Sorted by current workload (least busy first)
              </p>
            </div>

            <div className="p-2">
              {currentStaffList.length === 0 ? (
                <p className="p-4 text-center text-neutral-500">
                  No {assignmentRole}s available
                </p>
              ) : (
                <div className="space-y-1">
                  {currentStaffList.map((staff) => (
                    <button
                      key={staff.id}
                      onClick={() => setSelectedStaff(staff.id)}
                      className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors ${
                        selectedStaff === staff.id
                          ? 'bg-blue-50 border border-blue-200'
                          : 'hover:bg-neutral-50 border border-transparent'
                      }`}
                    >
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full ${
                          selectedStaff === staff.id
                            ? 'bg-blue-500 text-white'
                            : 'bg-neutral-100 text-neutral-600'
                        }`}
                      >
                        <User className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-neutral-900">{staff.name}</p>
                        <p className="text-sm text-neutral-500">{staff.email}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-sm">
                          <Users className="h-3 w-3 text-neutral-400" />
                          <span className={staff.workload > 5 ? 'text-amber-600' : 'text-neutral-600'}>
                            {staff.workload} active
                          </span>
                        </div>
                        {assignmentRole === 'photographer' && (
                          <p className="text-xs text-neutral-400">
                            {staff.todayJobs} today
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Assign Button */}
          <Button
            onClick={handleAssign}
            disabled={selectedListings.size === 0 || !selectedStaff || assigning}
            className="w-full"
            size="lg"
          >
            {assigning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Assigning...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Assign {selectedListings.size} Job{selectedListings.size !== 1 ? 's' : ''}
              </>
            )}
          </Button>

          {/* Results */}
          {results && (
            <div className="rounded-lg border border-neutral-200 bg-white p-4">
              <h3 className="font-medium text-neutral-900 mb-2">Assignment Results</h3>
              <div className="space-y-1">
                {results.map((result) => (
                  <div
                    key={result.listing_id}
                    className={`flex items-center gap-2 text-sm ${
                      result.success ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {result.success ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    <span>
                      {result.success
                        ? 'Assigned successfully'
                        : result.error || 'Failed to assign'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
