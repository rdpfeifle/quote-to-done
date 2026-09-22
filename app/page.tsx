'use client'

import { AlertCircle, X } from 'lucide-react'

import { JobList } from '@/components/JobList'
import { KanbanBoard } from '@/components/KanbanBoard'
import { useJobs } from '@/hooks/useJobs'

export default function BoardPage() {
  const { jobs, loading, loadError, actionError, dismissActionError, reload, setStatus } = useJobs()

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-steel-900">Jobs</h1>
        <p className="mt-1 text-sm text-steel-500">
          {loading ? 'Loading…' : `${jobs.length} ${jobs.length === 1 ? 'job' : 'jobs'} tracked`}
        </p>
      </div>

      {actionError && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2 rounded-lg border border-alert-600 bg-surface p-3 text-sm text-alert-600"
        >
          <AlertCircle size={18} strokeWidth={2.5} aria-hidden className="mt-px shrink-0" />
          <p className="flex-1">{actionError}</p>
          <button type="button" onClick={dismissActionError} aria-label="Dismiss">
            <X size={18} strokeWidth={2.5} aria-hidden />
          </button>
        </div>
      )}

      {loadError ? (
        <div className="rounded-xl border border-steel-300 bg-surface p-8 text-center">
          <p className="text-sm text-alert-600">{loadError}</p>
          <button
            type="button"
            onClick={() => void reload()}
            className="mt-4 h-11 rounded-lg bg-hivis-500 px-5 font-display text-sm font-bold text-steel-900 hover:bg-hivis-600"
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          {/* Kanban on desktop, grouped list on a phone — same state, two shapes. */}
          <div className="hidden md:block">
            <KanbanBoard jobs={jobs} onStatusChange={setStatus} />
          </div>
          <div className="md:hidden">
            <JobList jobs={jobs} onStatusChange={setStatus} />
          </div>
        </>
      )}
    </div>
  )
}
