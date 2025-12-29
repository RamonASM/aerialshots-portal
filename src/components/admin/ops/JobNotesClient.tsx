'use client'

import { JobNotes } from './JobNotes'

interface JobNotesClientProps {
  listingId: string
  orderId?: string
}

export function JobNotesClient({ listingId, orderId }: JobNotesClientProps) {
  return <JobNotes listingId={listingId} orderId={orderId} />
}
