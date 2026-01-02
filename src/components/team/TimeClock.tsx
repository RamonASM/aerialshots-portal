'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Clock, Loader2, LogIn, LogOut, Pause, Play } from 'lucide-react'

interface TimeEntry {
  id: string
  clock_in: string
  clock_out: string | null
  duration_minutes: number | null
  break_minutes: number
  hourly_rate: number
  total_pay_cents: number | null
  status: string
  notes: string | null
}

interface TodaySummary {
  activeEntry: TimeEntry | null
  todayMinutes: number
  todayPayCents: number
  weekMinutes: number
  weekPayCents: number
  hourlyRate: number
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) {
    return `${mins}m`
  }
  return `${hours}h ${mins}m`
}

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function TimeClock() {
  const [summary, setSummary] = useState<TodaySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [breakMinutes, setBreakMinutes] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)

  const fetchSummary = useCallback(async () => {
    try {
      const response = await fetch('/api/team/time/entries?view=today')
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch time data')
      }
      const data = await response.json()
      setSummary(data)
      setError(null)

      // Calculate initial elapsed time if clocked in
      if (data.activeEntry) {
        const clockIn = new Date(data.activeEntry.clock_in)
        const now = new Date()
        setElapsedTime(Math.floor((now.getTime() - clockIn.getTime()) / 1000))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load time data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  // Update elapsed time every second when clocked in
  useEffect(() => {
    if (!summary?.activeEntry) return

    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [summary?.activeEntry])

  const handleClockIn = async () => {
    try {
      setProcessing(true)
      setError(null)

      const response = await fetch('/api/team/time/clock-in', { method: 'POST' })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to clock in')
      }

      // Refresh summary
      await fetchSummary()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clock in')
    } finally {
      setProcessing(false)
    }
  }

  const handleClockOut = async () => {
    try {
      setProcessing(true)
      setError(null)

      const response = await fetch('/api/team/time/clock-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryId: summary?.activeEntry?.id,
          breakMinutes,
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to clock out')
      }

      // Reset state and refresh
      setBreakMinutes(0)
      setElapsedTime(0)
      await fetchSummary()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clock out')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <Card className="border-white/[0.08] bg-[#1c1c1e]">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </CardContent>
      </Card>
    )
  }

  const isClockedIn = !!summary?.activeEntry
  const elapsedMinutes = Math.floor(elapsedTime / 60)
  const elapsedHours = Math.floor(elapsedMinutes / 60)
  const elapsedMins = elapsedMinutes % 60
  const elapsedSecs = elapsedTime % 60

  return (
    <Card className="border-white/[0.08] bg-[#1c1c1e]">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <Clock className="h-5 w-5" />
          Time Clock
          {isClockedIn && (
            <Badge className="bg-green-500 text-white">
              <Play className="mr-1 h-3 w-3" />
              Clocked In
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Track your work hours for QC tasks
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-3">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Timer Display */}
        <div className="flex flex-col items-center justify-center py-6">
          <div className="font-mono text-5xl font-bold text-white">
            {String(elapsedHours).padStart(2, '0')}:
            {String(elapsedMins).padStart(2, '0')}:
            {String(elapsedSecs).padStart(2, '0')}
          </div>
          {isClockedIn && summary?.activeEntry && (
            <p className="mt-2 text-sm text-zinc-400">
              Started at {formatTime(summary.activeEntry.clock_in)}
            </p>
          )}
        </div>

        {/* Clock In/Out Button */}
        {isClockedIn ? (
          <div className="space-y-4">
            {/* Break input */}
            <div className="rounded-lg border border-white/[0.08] bg-black/20 p-4">
              <Label htmlFor="break" className="text-sm text-zinc-400">
                Break time (minutes)
              </Label>
              <div className="mt-2 flex items-center gap-2">
                <Pause className="h-4 w-4 text-zinc-500" />
                <Input
                  id="break"
                  type="number"
                  min="0"
                  max="120"
                  value={breakMinutes}
                  onChange={(e) => setBreakMinutes(parseInt(e.target.value) || 0)}
                  className="w-24 bg-black/40 border-white/[0.08]"
                />
                <span className="text-sm text-zinc-500">minutes</span>
              </div>
            </div>

            <Button
              onClick={handleClockOut}
              disabled={processing}
              className="w-full bg-red-600 hover:bg-red-700"
              size="lg"
            >
              {processing ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <LogOut className="mr-2 h-5 w-5" />
              )}
              Clock Out
            </Button>
          </div>
        ) : (
          <Button
            onClick={handleClockIn}
            disabled={processing}
            className="w-full bg-green-600 hover:bg-green-700"
            size="lg"
          >
            {processing ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <LogIn className="mr-2 h-5 w-5" />
            )}
            Clock In
          </Button>
        )}

        {/* Summary Stats */}
        {summary && (
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/[0.08]">
            <div className="rounded-lg border border-white/[0.08] bg-black/20 p-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Today</p>
              <p className="mt-1 text-xl font-semibold text-white">
                {formatDuration(summary.todayMinutes + elapsedMinutes)}
              </p>
              <p className="text-sm text-green-400">
                {formatMoney(summary.todayPayCents + Math.round((elapsedMinutes / 60) * (summary.hourlyRate || 0) * 100))}
              </p>
            </div>
            <div className="rounded-lg border border-white/[0.08] bg-black/20 p-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">This Week</p>
              <p className="mt-1 text-xl font-semibold text-white">
                {formatDuration(summary.weekMinutes + elapsedMinutes)}
              </p>
              <p className="text-sm text-green-400">
                {formatMoney(summary.weekPayCents + Math.round((elapsedMinutes / 60) * (summary.hourlyRate || 0) * 100))}
              </p>
            </div>
          </div>
        )}

        {/* Hourly Rate */}
        {summary?.hourlyRate && (
          <p className="text-center text-sm text-zinc-500">
            Rate: ${summary.hourlyRate.toFixed(2)}/hour
          </p>
        )}
      </CardContent>
    </Card>
  )
}
