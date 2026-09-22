'use client'

import { AlertTriangle, CalendarClock, User } from 'lucide-react'

import { formatAmount, formatScheduled } from '@/lib/format'
import { type Job, isOverdue } from '@/lib/types'

import { STATUS_STYLES, ServiceChip } from './chips'

export function JobCard({ job, dragging = false }: { job: Job; dragging?: boolean }) {
  const amount = formatAmount(job.quoteAmount)
  const scheduled = formatScheduled(job.scheduledDate)
  const overdue = isOverdue(job)

  return (
    <article
      className={`relative overflow-hidden rounded-lg border border-steel-300 bg-surface p-3 pl-4 text-left shadow-sm ${
        dragging ? 'rotate-1 shadow-lg' : ''
      }`}
    >
      {/* Status stays readable even when a card is mid-drag, away from its column. */}
      <span
        className={`absolute inset-y-0 left-0 w-[3px] ${STATUS_STYLES[job.status].bar}`}
        aria-hidden
      />

      <h3 className="font-display text-sm font-bold leading-snug text-steel-900">{job.title}</h3>

      {job.customerName && (
        <p className="mt-1.5 flex items-center gap-1.5 text-sm text-steel-500">
          <User size={13} strokeWidth={2} aria-hidden />
          {job.customerName}
        </p>
      )}

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <ServiceChip serviceType={job.serviceType} />
        {amount && (
          <span className="font-display text-sm font-bold tabular-nums text-steel-700">
            {amount}
          </span>
        )}
      </div>

      {scheduled && (
        <p
          className={`mt-2 flex items-center gap-1.5 text-xs font-medium tabular-nums ${
            overdue ? 'text-alert-600' : 'text-steel-500'
          }`}
        >
          {overdue ? (
            <AlertTriangle size={13} strokeWidth={2.5} aria-hidden />
          ) : (
            <CalendarClock size={13} strokeWidth={2} aria-hidden />
          )}
          {scheduled}
          {overdue && <span className="font-display font-bold uppercase">Overdue</span>}
        </p>
      )}
    </article>
  )
}
