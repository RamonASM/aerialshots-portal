'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import {
  CreditCard,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Download,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Calendar,
  FileText,
  Send,
  Filter,
} from 'lucide-react'
import { SkeletonTable } from '@/components/ui/skeleton'
import { EmptyPaymentsState } from '@/components/ui/empty-state'
import { BulkActionsBar, createPaymentBulkActions } from '@/components/admin/BulkActionsBar'

interface Invoice {
  id: string
  order_id: string
  agent_id: string
  amount: number
  status: 'pending' | 'paid' | 'overdue' | 'void' | 'partial'
  due_date: string
  paid_at: string | null
  payment_method: string | null
  created_at: string
  order?: {
    id: string
    address: string
  }
  agent?: {
    name: string
    email: string
    company: string
  }
}

interface PaymentsData {
  invoices: Invoice[]
  total: number
  page: number
  limit: number
  totalPages: number
  stats: {
    totalPending: number
    totalPaid: number
    totalOverdue: number
    pendingAmount: number
    paidAmount: number
    overdueAmount: number
  }
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: {
    label: 'Pending',
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  paid: {
    label: 'Paid',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    icon: <CheckCircle className="h-3.5 w-3.5" />,
  },
  overdue: {
    label: 'Overdue',
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
  void: {
    label: 'Void',
    color: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
  partial: {
    label: 'Partial',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    icon: <DollarSign className="h-3.5 w-3.5" />,
  },
}

export default function PaymentsPage() {
  const [data, setData] = useState<PaymentsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('limit', '20')
      if (search) params.set('search', search)
      if (status !== 'all') params.set('status', status)

      const response = await fetch(`/api/admin/payments?${params}`)
      if (!response.ok) throw new Error('Failed to fetch')
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }, [page, search, status])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  useEffect(() => {
    setPage(1)
    setSelectedIds(new Set())
  }, [search, status])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === data?.invoices.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(data?.invoices.map((i) => i.id)))
    }
  }

  const handleBulkProcess = async () => {
    if (selectedIds.size === 0) return

    const confirmed = window.confirm(
      `Mark ${selectedIds.size} invoice(s) as paid? This will update their status.`
    )
    if (!confirmed) return

    try {
      const response = await fetch('/api/admin/payments/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark_paid',
          invoiceIds: Array.from(selectedIds),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to process payments')
      }

      const result = await response.json()
      setSelectedIds(new Set())
      fetchPayments()
      toast.success(`Successfully processed ${result.processed} invoice(s)`)
    } catch (error) {
      console.error('Bulk process error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to process payments')
    }
  }

  const handleBulkExport = async () => {
    if (!data?.invoices.length) return

    // Filter to selected invoices or all if none selected
    const invoicesToExport = selectedIds.size > 0
      ? data.invoices.filter((inv) => selectedIds.has(inv.id))
      : data.invoices

    // Generate CSV content
    const headers = ['Invoice ID', 'Agent', 'Email', 'Property', 'Amount', 'Status', 'Due Date', 'Paid At']
    const rows = invoicesToExport.map((inv) => [
      inv.id,
      inv.agent?.name || 'Unknown',
      inv.agent?.email || '',
      inv.order?.address || 'N/A',
      inv.amount.toFixed(2),
      inv.status,
      inv.due_date,
      inv.paid_at || '',
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n')

    // Download as file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `invoices-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(link.href)
  }

  const handleSendReminder = async () => {
    if (selectedIds.size === 0) return

    const confirmed = window.confirm(
      `Send payment reminder emails to ${selectedIds.size} agent(s)?`
    )
    if (!confirmed) return

    try {
      const response = await fetch('/api/admin/payments/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_reminder',
          invoiceIds: Array.from(selectedIds),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to send reminders')
      }

      const result = await response.json()
      toast.success(`Successfully sent ${result.sent} reminder email(s)`)
    } catch (error) {
      console.error('Send reminder error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to send reminders')
    }
  }

  const bulkActions = createPaymentBulkActions({
    onProcess: handleBulkProcess,
    onExport: handleBulkExport,
    onSendReminder: handleSendReminder,
  })

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Payments</h1>
          <p className="text-neutral-500 dark:text-neutral-400">
            Invoice management and bulk payment processing
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleBulkExport}
            disabled={!data?.invoices.length}
            className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      {data && (
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-yellow-100 p-2 dark:bg-yellow-900/30">
                <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {data.stats.totalPending}
                </p>
                <p className="text-sm text-neutral-500">Pending</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-100 p-2 dark:bg-green-900/30">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {data.stats.totalPaid}
                </p>
                <p className="text-sm text-neutral-500">Paid</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-red-100 p-2 dark:bg-red-900/30">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {data.stats.totalOverdue}
                </p>
                <p className="text-sm text-neutral-500">Overdue</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <p className="text-sm text-neutral-500">Pending Amount</p>
            <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
              {formatCurrency(data.stats.pendingAmount)}
            </p>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <p className="text-sm text-neutral-500">Paid Amount</p>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(data.stats.paidAmount)}
            </p>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <p className="text-sm text-neutral-500">Overdue Amount</p>
            <p className="text-xl font-bold text-red-600 dark:text-red-400">
              {formatCurrency(data.stats.overdueAmount)}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
          <input
            type="text"
            placeholder="Search by agent, address, or invoice ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search invoices by agent, address, or invoice ID"
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
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="void">Void</option>
          </select>
          <button
            onClick={fetchPayments}
            className="rounded-lg border border-neutral-200 bg-white p-2 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Invoices Table */}
      {loading ? (
        <SkeletonTable rows={5} cols={7} />
      ) : data?.invoices.length === 0 ? (
        <EmptyPaymentsState />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800">
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === data?.invoices.length && data?.invoices.length > 0}
                    onChange={toggleSelectAll}
                    aria-label="Select all invoices"
                    className="h-5 w-5 rounded border-neutral-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Invoice
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Agent
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Property
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Amount
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Due Date
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
              {data?.invoices.map((invoice) => {
                const statusConfig = STATUS_CONFIG[invoice.status]
                const isSelected = selectedIds.has(invoice.id)
                return (
                  <tr
                    key={invoice.id}
                    className={`hover:bg-neutral-50 dark:hover:bg-neutral-800/50 ${
                      isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(invoice.id)}
                        aria-label={`Select invoice ${invoice.id.slice(0, 8).toUpperCase()} for ${invoice.agent?.name || 'unknown agent'}`}
                        className="h-5 w-5 rounded border-neutral-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-neutral-400" />
                        <span className="font-mono text-sm text-neutral-900 dark:text-white">
                          {invoice.id.slice(0, 8).toUpperCase()}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-neutral-900 dark:text-white">
                        {invoice.agent?.name || 'Unknown'}
                      </p>
                      <p className="text-xs text-neutral-500">{invoice.agent?.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        {invoice.order?.address || 'N/A'}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-medium text-neutral-900 dark:text-white">
                        {formatCurrency(invoice.amount)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusConfig?.color}`}
                      >
                        {statusConfig?.icon}
                        {statusConfig?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                        <Calendar className="h-4 w-4" />
                        {formatDate(invoice.due_date)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {invoice.status === 'pending' && (
                          <button
                            className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                            title="Mark as Paid"
                          >
                            Mark Paid
                          </button>
                        )}
                        {invoice.status === 'overdue' && (
                          <button
                            className="rounded-lg border border-orange-300 px-3 py-1.5 text-xs font-medium text-orange-600 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400"
                            title="Send Reminder"
                          >
                            <Send className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-neutral-500">
            Showing {(page - 1) * data.limit + 1} to{' '}
            {Math.min(page * data.limit, data.total)} of {data.total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-neutral-200 p-2 text-neutral-600 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-400"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page === data.totalPages}
              className="rounded-lg border border-neutral-200 p-2 text-neutral-600 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-400"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selectedIds.size}
        onClearSelection={() => setSelectedIds(new Set())}
        actions={bulkActions}
      />
    </div>
  )
}
