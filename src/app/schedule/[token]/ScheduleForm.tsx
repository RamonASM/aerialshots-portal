'use client'

import { useState } from 'react'
import { DayPicker } from 'react-day-picker'
import { format, addDays, isBefore, startOfToday } from 'date-fns'
import 'react-day-picker/dist/style.css'

interface ScheduleFormProps {
  shareLinkId: string
  listingId: string
  defaultName: string
  defaultEmail: string
  brandColor: string
  existingSchedule: {
    id: string
    seller_name: string | null
    seller_email: string | null
    seller_phone: string | null
    available_slots: AvailableSlot[]
  } | null
}

interface AvailableSlot {
  date: string
  start_time: string
  end_time: string
  preferred?: boolean
}

const TIME_SLOTS = [
  { start: '08:00', end: '10:00', label: '8:00 AM - 10:00 AM' },
  { start: '10:00', end: '12:00', label: '10:00 AM - 12:00 PM' },
  { start: '12:00', end: '14:00', label: '12:00 PM - 2:00 PM' },
  { start: '14:00', end: '16:00', label: '2:00 PM - 4:00 PM' },
  { start: '16:00', end: '18:00', label: '4:00 PM - 6:00 PM' },
]

export function ScheduleForm({
  shareLinkId,
  listingId,
  defaultName,
  defaultEmail,
  brandColor,
  existingSchedule,
}: ScheduleFormProps) {
  const [step, setStep] = useState<'calendar' | 'times' | 'contact' | 'submitting' | 'success'>('calendar')
  const [selectedDates, setSelectedDates] = useState<Date[]>([])
  const [selectedSlots, setSelectedSlots] = useState<AvailableSlot[]>(
    existingSchedule?.available_slots || []
  )
  const [name, setName] = useState(existingSchedule?.seller_name || defaultName)
  const [email, setEmail] = useState(existingSchedule?.seller_email || defaultEmail)
  const [phone, setPhone] = useState(existingSchedule?.seller_phone || '')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const today = startOfToday()
  const minDate = addDays(today, 1) // At least 1 day in advance
  const maxDate = addDays(today, 30) // Up to 30 days out

  const handleDateSelect = (dates: Date[] | undefined) => {
    if (dates) {
      setSelectedDates(dates)
    }
  }

  const handleTimeToggle = (date: Date, slot: { start: string; end: string }) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const existing = selectedSlots.find(
      s => s.date === dateStr && s.start_time === slot.start
    )

    if (existing) {
      setSelectedSlots(selectedSlots.filter(s => s !== existing))
    } else {
      setSelectedSlots([
        ...selectedSlots,
        {
          date: dateStr,
          start_time: slot.start,
          end_time: slot.end,
          preferred: selectedSlots.length === 0, // First one is preferred
        },
      ])
    }
  }

  const togglePreferred = (slot: AvailableSlot) => {
    setSelectedSlots(
      selectedSlots.map(s => ({
        ...s,
        preferred: s === slot ? !s.preferred : s.preferred,
      }))
    )
  }

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim()) {
      setError('Please enter your name and email')
      return
    }

    if (selectedSlots.length === 0) {
      setError('Please select at least one time slot')
      return
    }

    setStep('submitting')
    setError(null)

    try {
      const response = await fetch('/api/seller-schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          share_link_id: shareLinkId,
          listing_id: listingId,
          seller_name: name,
          seller_email: email,
          seller_phone: phone || null,
          available_slots: selectedSlots,
          notes: notes || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to submit availability')
      }

      setStep('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setStep('contact')
    }
  }

  if (step === 'success') {
    return (
      <div className="bg-white rounded-xl border border-neutral-200 p-6 text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: `${brandColor}20` }}
        >
          <svg
            className="w-8 h-8"
            style={{ color: brandColor }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-neutral-900 mb-2">
          Thank You!
        </h2>
        <p className="text-neutral-600 mb-4">
          Your availability has been submitted. You selected{' '}
          <strong>{selectedSlots.length} time slot{selectedSlots.length !== 1 ? 's' : ''}</strong>.
        </p>
        <p className="text-sm text-neutral-500">
          We'll send you a confirmation email once your photo shoot is scheduled.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
      {/* Progress Steps */}
      <div className="flex border-b border-neutral-200">
        {['Dates', 'Times', 'Contact'].map((label, i) => {
          const stepIndex = i
          const currentIndex = step === 'calendar' ? 0 : step === 'times' ? 1 : 2
          const isActive = stepIndex === currentIndex
          const isComplete = stepIndex < currentIndex

          return (
            <div
              key={label}
              className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
                isActive
                  ? 'text-neutral-900 border-b-2'
                  : isComplete
                  ? 'text-neutral-600'
                  : 'text-neutral-400'
              }`}
              style={isActive ? { borderColor: brandColor } : {}}
            >
              {label}
            </div>
          )
        })}
      </div>

      <div className="p-4">
        {/* Step 1: Calendar */}
        {step === 'calendar' && (
          <div>
            <p className="text-sm text-neutral-600 mb-4">
              Select the dates when you're available for the photo shoot.
              You can select multiple dates.
            </p>
            <div className="flex justify-center">
              <DayPicker
                mode="multiple"
                selected={selectedDates}
                onSelect={handleDateSelect}
                disabled={{ before: minDate, after: maxDate }}
                modifiersStyles={{
                  selected: { backgroundColor: brandColor, color: 'white' },
                }}
                className="!font-sans"
              />
            </div>
            <button
              onClick={() => setStep('times')}
              disabled={selectedDates.length === 0}
              className="w-full mt-4 py-3 rounded-lg font-medium text-white transition-opacity disabled:opacity-50"
              style={{ backgroundColor: brandColor }}
            >
              Continue ({selectedDates.length} date{selectedDates.length !== 1 ? 's' : ''} selected)
            </button>
          </div>
        )}

        {/* Step 2: Time Slots */}
        {step === 'times' && (
          <div>
            <p className="text-sm text-neutral-600 mb-4">
              Select the time slots that work for you on each selected date.
              Mark your preferred times with a star.
            </p>
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {selectedDates.sort((a, b) => a.getTime() - b.getTime()).map(date => (
                <div key={date.toISOString()} className="border-b border-neutral-100 pb-4 last:border-0">
                  <h3 className="font-medium text-neutral-900 mb-2">
                    {format(date, 'EEEE, MMMM d')}
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {TIME_SLOTS.map(slot => {
                      const isSelected = selectedSlots.some(
                        s => s.date === format(date, 'yyyy-MM-dd') && s.start_time === slot.start
                      )
                      const selectedSlot = selectedSlots.find(
                        s => s.date === format(date, 'yyyy-MM-dd') && s.start_time === slot.start
                      )

                      return (
                        <button
                          key={slot.start}
                          onClick={() => handleTimeToggle(date, slot)}
                          className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                            isSelected
                              ? 'text-white'
                              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                          }`}
                          style={isSelected ? { backgroundColor: brandColor } : {}}
                        >
                          <span className="flex items-center justify-center gap-1">
                            {slot.label}
                            {selectedSlot?.preferred && (
                              <svg
                                className="w-4 h-4 text-yellow-300"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            )}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Selected slots summary */}
            {selectedSlots.length > 0 && (
              <div className="mt-4 p-3 bg-neutral-50 rounded-lg">
                <p className="text-sm font-medium text-neutral-700 mb-2">
                  Selected Times ({selectedSlots.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedSlots.map((slot, i) => (
                    <button
                      key={i}
                      onClick={() => togglePreferred(slot)}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-neutral-200 rounded text-xs"
                    >
                      {format(new Date(slot.date), 'M/d')} {slot.start_time}
                      <svg
                        className={`w-3 h-3 ${slot.preferred ? 'text-yellow-500' : 'text-neutral-300'}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-neutral-500 mt-2">
                  Tap a time to mark/unmark as preferred
                </p>
              </div>
            )}

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setStep('calendar')}
                className="flex-1 py-3 rounded-lg font-medium bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
              >
                Back
              </button>
              <button
                onClick={() => setStep('contact')}
                disabled={selectedSlots.length === 0}
                className="flex-1 py-3 rounded-lg font-medium text-white transition-opacity disabled:opacity-50"
                style={{ backgroundColor: brandColor }}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Contact Info */}
        {(step === 'contact' || step === 'submitting') && (
          <div>
            <p className="text-sm text-neutral-600 mb-4">
              Almost done! Please confirm your contact information.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Your Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="John Smith"
                  className="w-full px-4 py-3 rounded-lg border border-neutral-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  disabled={step === 'submitting'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="w-full px-4 py-3 rounded-lg border border-neutral-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  disabled={step === 'submitting'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Phone Number (optional)
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  className="w-full px-4 py-3 rounded-lg border border-neutral-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  disabled={step === 'submitting'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Special Instructions (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Gate code, pet information, parking instructions..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border border-neutral-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                  disabled={step === 'submitting'}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setStep('times')}
                className="flex-1 py-3 rounded-lg font-medium bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                disabled={step === 'submitting'}
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={step === 'submitting'}
                className="flex-1 py-3 rounded-lg font-medium text-white transition-opacity disabled:opacity-70"
                style={{ backgroundColor: brandColor }}
              >
                {step === 'submitting' ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Submitting...
                  </span>
                ) : (
                  'Submit Availability'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
