'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Code2,
  Key,
  Search,
  Plus,
  MoreVertical,
  Copy,
  Check,
  AlertTriangle,
  RefreshCw,
  Zap,
  Clock,
  BarChart3,
  X,
  Eye,
  EyeOff,
  Pause,
  Play,
  Trash2,
} from 'lucide-react'

interface ApiKey {
  id: string
  name: string
  key_prefix: string
  tier: string
  rate_limit: number
  is_active: boolean
  created_at: string
  last_used_at: string | null
  agents: {
    name: string
    email: string
    company: string
  } | null
  usage: {
    total: number
    byEndpoint: Record<string, number>
  }
  full_key?: string // Only on creation
}

interface DevelopersData {
  apiKeys: ApiKey[]
  stats: {
    totalKeys: number
    activeKeys: number
    totalRequests: number
  }
}

const TIERS = [
  { value: 'free', label: 'Free', limit: 100 },
  { value: 'starter', label: 'Starter', limit: 1000 },
  { value: 'pro', label: 'Pro', limit: 10000 },
  { value: 'enterprise', label: 'Enterprise', limit: 100000 },
]

export default function DevelopersPage() {
  const [data, setData] = useState<DevelopersData | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [newKeyData, setNewKeyData] = useState<ApiKey | null>(null)
  const [actionMenuId, setActionMenuId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const fetchDevelopers = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (status !== 'all') params.set('status', status)

      const response = await fetch(`/api/admin/developers?${params}`)
      if (!response.ok) throw new Error('Failed to fetch')
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }, [search, status])

  useEffect(() => {
    fetchDevelopers()
  }, [fetchDevelopers])

  async function handleToggleStatus(key: ApiKey) {
    try {
      await fetch(`/api/admin/developers/${key.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !key.is_active }),
      })
      fetchDevelopers()
    } catch (error) {
      console.error('Error:', error)
    }
    setActionMenuId(null)
  }

  async function handleDelete(key: ApiKey) {
    if (!confirm(`Are you sure you want to revoke the API key "${key.name}"?`)) return

    try {
      await fetch(`/api/admin/developers/${key.id}`, { method: 'DELETE' })
      fetchDevelopers()
    } catch (error) {
      console.error('Error:', error)
    }
    setActionMenuId(null)
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Developers</h1>
          <p className="text-neutral-500 dark:text-neutral-400">
            Manage API keys and developer access
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Create API Key
        </button>
      </div>

      {/* Stats */}
      {data && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900/30">
                <Key className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {data.stats.totalKeys}
                </p>
                <p className="text-sm text-neutral-500">Total API Keys</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-100 p-2 dark:bg-green-900/30">
                <Zap className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {data.stats.activeKeys}
                </p>
                <p className="text-sm text-neutral-500">Active Keys</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-purple-100 p-2 dark:bg-purple-900/30">
                <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {data.stats.totalRequests.toLocaleString()}
                </p>
                <p className="text-sm text-neutral-500">Requests (30 days)</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by name or key prefix..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
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
            <option value="suspended">Suspended</option>
          </select>
          <button
            onClick={fetchDevelopers}
            className="rounded-lg border border-neutral-200 bg-white p-2 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* API Keys Table */}
      <div className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800">
                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Key Prefix
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Tier
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Requests (30d)
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Rate Limit
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
              ) : data?.apiKeys.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-neutral-500">
                    No API keys found. Create your first key to get started.
                  </td>
                </tr>
              ) : (
                data?.apiKeys.map((key) => (
                  <tr
                    key={key.id}
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-neutral-900 dark:text-white">
                          {key.name}
                        </p>
                        {key.agents && (
                          <p className="text-sm text-neutral-500">
                            {key.agents.name} ({key.agents.company})
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <code className="rounded bg-neutral-100 px-2 py-1 text-sm text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                        {key.key_prefix}...
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          key.tier === 'enterprise'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                            : key.tier === 'pro'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                              : key.tier === 'starter'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400'
                        }`}
                      >
                        {key.tier.charAt(0).toUpperCase() + key.tier.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-medium text-neutral-900 dark:text-white">
                        {key.usage.total.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-neutral-600 dark:text-neutral-400">
                        {key.rate_limit.toLocaleString()}/day
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          key.is_active
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}
                      >
                        {key.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="relative inline-block">
                        <button
                          onClick={() => setActionMenuId(actionMenuId === key.id ? null : key.id)}
                          className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-700"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        {actionMenuId === key.id && (
                          <div className="absolute right-0 top-full z-10 mt-1 w-40 rounded-lg border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
                            <button
                              onClick={() => handleToggleStatus(key)}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700"
                            >
                              {key.is_active ? (
                                <>
                                  <Pause className="h-4 w-4" />
                                  Suspend
                                </>
                              ) : (
                                <>
                                  <Play className="h-4 w-4" />
                                  Activate
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => handleDelete(key)}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                            >
                              <Trash2 className="h-4 w-4" />
                              Revoke
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
      </div>

      {/* Documentation Link */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-900/20">
        <div className="flex items-start gap-3">
          <Code2 className="mt-0.5 h-5 w-5 text-blue-600 dark:text-blue-400" />
          <div>
            <p className="font-medium text-blue-900 dark:text-blue-100">
              Life Here API Documentation
            </p>
            <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
              Explore the API endpoints and integration guides at{' '}
              <a
                href="/developers"
                className="underline hover:no-underline"
              >
                portal.aerialshots.media/developers
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Create API Key Modal */}
      {showAddModal && (
        <CreateKeyModal
          onClose={() => {
            setShowAddModal(false)
            setNewKeyData(null)
          }}
          onCreated={(key) => {
            setNewKeyData(key)
            fetchDevelopers()
          }}
          newKey={newKeyData}
          onCopy={copyToClipboard}
          copied={copied}
        />
      )}
    </div>
  )
}

function CreateKeyModal({
  onClose,
  onCreated,
  newKey,
  onCopy,
  copied,
}: {
  onClose: () => void
  onCreated: (key: ApiKey) => void
  newKey: ApiKey | null
  onCopy: (text: string) => void
  copied: boolean
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showKey, setShowKey] = useState(false)
  const [form, setForm] = useState({
    name: '',
    tier: 'free',
    rate_limit: 100,
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/developers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create key')
      }

      const { apiKey } = await response.json()
      onCreated(apiKey)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  // Show the created key
  if (newKey?.full_key) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-md rounded-lg bg-white p-6 dark:bg-neutral-900">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-full bg-green-100 p-2 dark:bg-green-900/30">
              <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
              API Key Created
            </h2>
          </div>

          <div className="mb-4 rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600 dark:text-amber-400" />
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Copy this key now. You won&apos;t be able to see it again!
              </p>
            </div>
          </div>

          <div className="mb-6 space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Name
              </label>
              <p className="text-neutral-900 dark:text-white">{newKey.name}</p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                API Key
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 overflow-hidden rounded-lg bg-neutral-100 p-3 text-sm dark:bg-neutral-800">
                  {showKey ? newKey.full_key : '•'.repeat(40)}
                </code>
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="rounded p-2 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => onCopy(newKey.full_key!)}
                  className="rounded p-2 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Done
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 dark:bg-neutral-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
            Create API Key
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g., Production API Key"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Tier
            </label>
            <select
              value={form.tier}
              onChange={(e) => {
                const tier = TIERS.find(t => t.value === e.target.value)
                setForm({
                  ...form,
                  tier: e.target.value,
                  rate_limit: tier?.limit || 100,
                })
              }}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            >
              {TIERS.map((tier) => (
                <option key={tier.value} value={tier.value}>
                  {tier.label} ({tier.limit.toLocaleString()} requests/day)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Custom Rate Limit
            </label>
            <input
              type="number"
              value={form.rate_limit}
              onChange={(e) => setForm({ ...form, rate_limit: parseInt(e.target.value) })}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            />
            <p className="mt-1 text-xs text-neutral-500">Requests per day</p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Key'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
