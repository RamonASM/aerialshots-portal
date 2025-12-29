'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users,
  Search,
  Plus,
  MoreVertical,
  Mail,
  Phone,
  Building2,
  Package,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  UserCheck,
  UserX,
  Edit,
  Eye,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface Agent {
  id: string
  name: string
  email: string
  phone: string | null
  company: string | null
  is_active: boolean
  brand_color: string | null
  headshot_url: string | null
  logo_url: string | null
  created_at: string
  orderCount: number
  listingCount: number
}

interface ClientsData {
  agents: Agent[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export default function ClientsPage() {
  const router = useRouter()
  const [data, setData] = useState<ClientsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [actionMenuId, setActionMenuId] = useState<string | null>(null)

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('limit', '20')
      if (search) params.set('search', search)
      if (status !== 'all') params.set('status', status)

      const response = await fetch(`/api/admin/clients?${params}`)
      if (!response.ok) throw new Error('Failed to fetch clients')
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Error fetching clients:', error)
    } finally {
      setLoading(false)
    }
  }, [page, search, status])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  useEffect(() => {
    setPage(1)
  }, [search, status])

  async function handleToggleStatus(agent: Agent) {
    try {
      const response = await fetch(`/api/admin/clients/${agent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !agent.is_active }),
      })

      if (!response.ok) throw new Error('Failed to update status')
      fetchClients()
    } catch (error) {
      console.error('Error updating status:', error)
    }
    setActionMenuId(null)
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Clients</h1>
          <p className="text-neutral-500 dark:text-neutral-400">
            Manage real estate agent accounts
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add Client
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by name, email, or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <button
            onClick={fetchClients}
            className="rounded-lg border border-neutral-200 bg-white p-2 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stats */}
      {data && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900/30">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">{data.total}</p>
                <p className="text-sm text-neutral-500">Total Clients</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-100 p-2 dark:bg-green-900/30">
                <UserCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {data.agents.filter(a => a.is_active).length}
                </p>
                <p className="text-sm text-neutral-500">Active</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-purple-100 p-2 dark:bg-purple-900/30">
                <Package className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {data.agents.reduce((sum, a) => sum + a.orderCount, 0)}
                </p>
                <p className="text-sm text-neutral-500">Total Orders</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800">
                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Client
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Contact
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Company
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Orders
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Listings
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center">
                    <RefreshCw className="mx-auto h-6 w-6 animate-spin text-neutral-400" />
                  </td>
                </tr>
              ) : data?.agents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-neutral-500">
                    No clients found
                  </td>
                </tr>
              ) : (
                data?.agents.map((agent) => (
                  <tr
                    key={agent.id}
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {agent.headshot_url ? (
                          <img
                            src={agent.headshot_url}
                            alt={agent.name}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div
                            className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium text-white"
                            style={{ backgroundColor: agent.brand_color || '#3b82f6' }}
                          >
                            {agent.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-neutral-900 dark:text-white">
                            {agent.name}
                          </p>
                          <p className="text-sm text-neutral-500">{agent.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                          <Mail className="h-3 w-3" />
                          {agent.email}
                        </div>
                        {agent.phone && (
                          <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                            <Phone className="h-3 w-3" />
                            {agent.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {agent.company ? (
                        <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                          <Building2 className="h-4 w-4" />
                          {agent.company}
                        </div>
                      ) : (
                        <span className="text-neutral-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-medium text-neutral-900 dark:text-white">
                        {agent.orderCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-medium text-neutral-900 dark:text-white">
                        {agent.listingCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          agent.is_active
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400'
                        }`}
                      >
                        {agent.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="relative inline-block">
                        <button
                          onClick={() => setActionMenuId(actionMenuId === agent.id ? null : agent.id)}
                          className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-700"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        {actionMenuId === agent.id && (
                          <div className="absolute right-0 top-full z-10 mt-1 w-40 rounded-lg border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
                            <button
                              onClick={() => {
                                setSelectedAgent(agent)
                                setShowEditModal(true)
                                setActionMenuId(null)
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700"
                            >
                              <Edit className="h-4 w-4" />
                              Edit
                            </button>
                            <button
                              onClick={() => router.push(`/admin/clients/${agent.id}`)}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700"
                            >
                              <Eye className="h-4 w-4" />
                              View Details
                            </button>
                            <button
                              onClick={() => handleToggleStatus(agent)}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700"
                            >
                              {agent.is_active ? (
                                <>
                                  <UserX className="h-4 w-4" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <UserCheck className="h-4 w-4" />
                                  Activate
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-3 dark:border-neutral-700">
            <p className="text-sm text-neutral-500">
              Showing {(page - 1) * data.limit + 1} to{' '}
              {Math.min(page * data.limit, data.total)} of {data.total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-neutral-200 p-2 text-neutral-600 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                disabled={page === data.totalPages}
                className="rounded-lg border border-neutral-200 p-2 text-neutral-600 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <ClientModal
        agent={showEditModal ? selectedAgent : null}
        open={showAddModal || showEditModal}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setShowAddModal(false)
            setShowEditModal(false)
            setSelectedAgent(null)
          }
        }}
        onSave={() => {
          setShowAddModal(false)
          setShowEditModal(false)
          setSelectedAgent(null)
          fetchClients()
        }}
      />
    </div>
  )
}

function ClientModal({
  agent,
  open,
  onOpenChange,
  onSave,
}: {
  agent: Agent | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: agent?.name || '',
    email: agent?.email || '',
    phone: agent?.phone || '',
    company: agent?.company || '',
    brand_color: agent?.brand_color || '#3b82f6',
    is_active: agent?.is_active ?? true,
  })

  // Reset form when agent changes or modal opens/closes
  useEffect(() => {
    if (open) {
      setForm({
        name: agent?.name || '',
        email: agent?.email || '',
        phone: agent?.phone || '',
        company: agent?.company || '',
        brand_color: agent?.brand_color || '#3b82f6',
        is_active: agent?.is_active ?? true,
      })
      setError(null)
    }
  }, [agent, open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const url = agent ? `/api/admin/clients/${agent.id}` : '/api/admin/clients'
      const method = agent ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save client')
      }

      onSave()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {agent ? 'Edit Client' : 'Add New Client'}
          </DialogTitle>
          <DialogDescription>
            {agent
              ? 'Update the client information below.'
              : 'Fill in the details to add a new client.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="client-name"
              className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
            >
              Name *
            </label>
            <input
              id="client-name"
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="client-email"
              className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
            >
              Email *
            </label>
            <input
              id="client-email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="client-phone"
              className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
            >
              Phone
            </label>
            <input
              id="client-phone"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="client-company"
              className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
            >
              Company
            </label>
            <input
              id="client-company"
              type="text"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="client-brand-color"
              className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
            >
              Brand Color
            </label>
            <div className="flex items-center gap-2">
              <input
                id="client-brand-color"
                type="color"
                value={form.brand_color}
                onChange={(e) => setForm({ ...form, brand_color: e.target.value })}
                className="h-10 w-10 cursor-pointer rounded border-0"
                aria-label="Select brand color"
              />
              <input
                type="text"
                value={form.brand_color}
                onChange={(e) => setForm({ ...form, brand_color: e.target.value })}
                className="flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                aria-label="Brand color hex value"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="client-is-active"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="h-4 w-4 rounded border-neutral-300"
            />
            <label
              htmlFor="client-is-active"
              className="text-sm text-neutral-700 dark:text-neutral-300"
            >
              Active
            </label>
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : agent ? 'Save Changes' : 'Add Client'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
