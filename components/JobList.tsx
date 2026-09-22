'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

import { STATUSES, type Job, type Status } from '@/lib/types'

import { STATUS_STYLES } from './chips'
import { JobCard } from './JobCard'

export function JobList({
  jobs,
  onStatusChange,
}: {
  jobs: Job[]
  onStatusChange: (id: string, status: Status) => void
}) {
  const [collapsed, setCollapsed] = useState<Partial<Record<Status, boolean>>>({})

  return (
    <div className="flex flex-col gap-4">
      {STATUSES.map((status) => {
        const group = jobs.filter((job) => job.status === status)
        const isCollapsed = collapsed[status] ?? false

        return (
          <section key={status}>
            <button
              type="button"
              onClick={() => setCollapsed((current) => ({ ...current, [status]: !isCollapsed }))}
              aria-expanded={!isCollapsed}
              className="flex h-11 w-full items-center gap-2 rounded-lg px-1"
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${STATUS_STYLES[status].dot}`}
                aria-hidden
              />
              <span className="font-display text-sm font-extrabold uppercase tracking-wide text-steel-700">
                {status}
              </span>
              <span className="font-display text-sm font-bold tabular-nums text-steel-500">
                {group.length}
              </span>
              <ChevronDown
                size={18}
                aria-hidden
                className={`ml-auto text-steel-500 transition-transform ${
                  isCollapsed ? '-rotate-90' : ''
                }`}
              />
            </button>

            {!isCollapsed && (
              <div className="mt-1 flex flex-col gap-2.5">
                {group.map((job) => (
                  <div key={job.id}>
                    <JobCard job={job} />
                    {/*
                     * A native select on purpose: it is the one control that
                     * stays usable with gloves on and with a screen reader.
                     */}
                    <label className="mt-1.5 flex items-center gap-2 px-1">
                      <span className="text-xs font-medium text-steel-500">Move to</span>
                      <select
                        value={job.status}
                        onChange={(event) =>
                          onStatusChange(job.id, event.target.value as Status)
                        }
                        aria-label={`Status for ${job.title}`}
                        className="h-11 flex-1 rounded-lg border border-steel-300 bg-surface px-3 font-display text-sm font-bold text-steel-900"
                      >
                        {STATUSES.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                ))}
                {group.length === 0 && (
                  <p className="px-1 py-2 text-sm text-steel-500">Nothing here yet</p>
                )}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
