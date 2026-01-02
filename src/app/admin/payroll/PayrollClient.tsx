'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import {
  Calendar,
  Clock,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronRight,
  User,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface PayPeriod {
  id: string
  start_date: string
  end_date: string
  status: string | null
  total_hours: number | null
  total_pay_cents: number | null
  paid_at: string | null
}

interface Staff {
  id: string
  name: string
  email: string
  role: string
  hourly_rate: number | null
  payout_type: string | null
}

interface TimeEntry {
  id: string
  clock_in: string
  clock_out: string | null
  duration_minutes: number | null
  total_pay_cents: number | null
  status: string
  staff_id: string
}

interface Props {
  payPeriods: PayPeriod[]
  staffWithTimesheets: Staff[]
}

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function formatHours(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}h ${mins}m`
}

export function PayrollClient({ payPeriods, staffWithTimesheets }: Props) {
  const [selectedPeriod, setSelectedPeriod] = useState<PayPeriod | null>(
    payPeriods.find(p => p.status === 'open') || payPeriods[0] || null
  )
  const [timesheets, setTimesheets] = useState<Record<string, TimeEntry[]>>({})
  const [loadingTimesheets, setLoadingTimesheets] = useState(false)
  const [closingPeriod, setClosingPeriod] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const loadTimesheets = async (periodId: string) => {
    setLoadingTimesheets(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/time/periods/${periodId}/timesheets`)
      if (!response.ok) {
        throw new Error('Failed to load timesheets')
      }
      const data = await response.json()
      setTimesheets(data.timesheets || {})
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load timesheets')
    } finally {
      setLoadingTimesheets(false)
    }
  }

  const handleSelectPeriod = (period: PayPeriod) => {
    setSelectedPeriod(period)
    loadTimesheets(period.id)
  }

  const handleClosePeriod = async () => {
    if (!selectedPeriod || selectedPeriod.status !== 'open') return

    setClosingPeriod(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/admin/time/periods/${selectedPeriod.id}/close`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to close period')
      }

      const data = await response.json()
      setSuccess(`Period closed. Total: ${formatHours(data.totalHours * 60)} / ${formatMoney(data.totalPayCents)}`)

      // Update local state
      const updatedPeriod = { ...selectedPeriod, status: 'closed', total_hours: data.totalHours, total_pay_cents: data.totalPayCents }
      setSelectedPeriod(updatedPeriod)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to close period')
    } finally {
      setClosingPeriod(false)
    }
  }

  const openPeriods = payPeriods.filter(p => p.status === 'open')
  const closedPeriods = payPeriods.filter(p => p.status === 'closed')

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Payroll Management</h1>
        <p className="mt-1 text-zinc-400">Manage pay periods and hourly worker timesheets</p>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-4">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/5 p-4">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <p className="text-green-400">{success}</p>
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-white/[0.08] bg-[#1c1c1e]">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{openPeriods.length}</p>
                <p className="text-xs text-zinc-500">Open Periods</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/[0.08] bg-[#1c1c1e]">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <User className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{staffWithTimesheets.length}</p>
                <p className="text-xs text-zinc-500">Hourly Workers</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/[0.08] bg-[#1c1c1e]">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Clock className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {selectedPeriod?.total_hours?.toFixed(1) || '-'}
                </p>
                <p className="text-xs text-zinc-500">Period Hours</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/[0.08] bg-[#1c1c1e]">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {selectedPeriod?.total_pay_cents ? formatMoney(selectedPeriod.total_pay_cents) : '-'}
                </p>
                <p className="text-xs text-zinc-500">Period Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Pay Periods List */}
        <Card className="border-white/[0.08] bg-[#1c1c1e]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Calendar className="h-5 w-5" />
              Pay Periods
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Bi-weekly pay periods
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {payPeriods.length === 0 ? (
              <p className="text-zinc-500 text-center py-4">No pay periods yet</p>
            ) : (
              payPeriods.map((period) => (
                <button
                  key={period.id}
                  onClick={() => handleSelectPeriod(period)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedPeriod?.id === period.id
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-white/[0.08] bg-black/20 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">
                        {format(parseISO(period.start_date), 'MMM d')} - {format(parseISO(period.end_date), 'MMM d, yyyy')}
                      </p>
                      {period.total_hours && (
                        <p className="text-sm text-zinc-400">
                          {period.total_hours.toFixed(1)}h / {formatMoney(period.total_pay_cents || 0)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        className={
                          period.status === 'open'
                            ? 'bg-green-500/10 text-green-400 border-green-500/20'
                            : period.status === 'closed'
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                              : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                        }
                      >
                        {period.status || 'open'}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-zinc-500" />
                    </div>
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {/* Selected Period Details */}
        <div className="lg:col-span-2 space-y-4">
          {selectedPeriod ? (
            <>
              {/* Period Header */}
              <Card className="border-white/[0.08] bg-[#1c1c1e]">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-white">
                        {format(parseISO(selectedPeriod.start_date), 'MMMM d')} - {format(parseISO(selectedPeriod.end_date), 'MMMM d, yyyy')}
                      </CardTitle>
                      <CardDescription className="text-zinc-400">
                        {selectedPeriod.status === 'open' ? 'Current pay period' : 'Closed pay period'}
                      </CardDescription>
                    </div>
                    {selectedPeriod.status === 'open' && (
                      <Button
                        onClick={handleClosePeriod}
                        disabled={closingPeriod}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {closingPeriod ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle className="mr-2 h-4 w-4" />
                        )}
                        Close Period
                      </Button>
                    )}
                  </div>
                </CardHeader>
              </Card>

              {/* Timesheets */}
              <Card className="border-white/[0.08] bg-[#1c1c1e]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Clock className="h-5 w-5" />
                    Timesheets
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingTimesheets ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    </div>
                  ) : staffWithTimesheets.length === 0 ? (
                    <p className="text-zinc-500 text-center py-4">No hourly workers configured</p>
                  ) : (
                    <div className="space-y-3">
                      {staffWithTimesheets.map((staff) => {
                        const entries = timesheets[staff.id] || []
                        const totalMinutes = entries.reduce((sum, e) => sum + (e.duration_minutes || 0), 0)
                        const totalPay = entries.reduce((sum, e) => sum + (e.total_pay_cents || 0), 0)

                        return (
                          <div
                            key={staff.id}
                            className="rounded-lg border border-white/[0.08] bg-black/20 p-4"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10">
                                  <User className="h-5 w-5 text-purple-500" />
                                </div>
                                <div>
                                  <p className="font-medium text-white">{staff.name}</p>
                                  <p className="text-sm text-zinc-400">
                                    ${staff.hourly_rate?.toFixed(2) || '0.00'}/hr
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-white">{formatHours(totalMinutes)}</p>
                                <p className="text-sm text-green-400">{formatMoney(totalPay)}</p>
                              </div>
                            </div>

                            {entries.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-white/[0.08]">
                                <p className="text-xs text-zinc-500 mb-2">{entries.length} time entries</p>
                                <div className="space-y-1">
                                  {entries.slice(0, 3).map((entry) => (
                                    <div
                                      key={entry.id}
                                      className="flex items-center justify-between text-sm"
                                    >
                                      <span className="text-zinc-400">
                                        {format(parseISO(entry.clock_in), 'MMM d, h:mm a')}
                                      </span>
                                      <span className="text-white">
                                        {formatHours(entry.duration_minutes || 0)}
                                      </span>
                                    </div>
                                  ))}
                                  {entries.length > 3 && (
                                    <p className="text-xs text-zinc-500">
                                      +{entries.length - 3} more entries
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="border-white/[0.08] bg-[#1c1c1e]">
              <CardContent className="flex items-center justify-center py-12">
                <p className="text-zinc-500">Select a pay period to view details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
