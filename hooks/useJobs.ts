'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import type { Job, Status } from '@/lib/types'

async function readError(response: Response, fallback: string): Promise<string> {
  const body = (await response.json().catch(() => null)) as { error?: string } | null
  return body?.error ?? fallback
}

export function useJobs() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  /*
   * The ref mirrors `jobs` so an event handler can read the current list
   * synchronously. Reading it inside a setJobs updater instead would be a side
   * effect in a function React is free to defer, replay or double-invoke.
   */
  const jobsRef = useRef<Job[]>([])

  const commit = useCallback((next: Job[]) => {
    jobsRef.current = next
    setJobs(next)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const response = await fetch('/api/jobs')
      if (!response.ok) throw new Error(await readError(response, 'Could not load jobs.'))
      const { jobs } = (await response.json()) as { jobs: Job[] }
      commit(jobs)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Could not load jobs.')
    } finally {
      setLoading(false)
    }
  }, [commit])

  useEffect(() => {
    void load()
  }, [load])

  /**
   * Moves the card locally first — a card that hangs for 400ms after a drag
   * feels broken — then restores the previous status if the write fails.
   */
  const setStatus = useCallback(
    async (id: string, status: Status) => {
      const job = jobsRef.current.find((candidate) => candidate.id === id)
      if (!job || job.status === status) return

      const previous = job.status
      const replace = (next: Job) =>
        commit(jobsRef.current.map((existing) => (existing.id === id ? next : existing)))

      replace({ ...job, status })
      setActionError(null)

      try {
        const response = await fetch(`/api/jobs/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        })
        if (!response.ok) throw new Error(await readError(response, 'Could not update the job.'))

        const { job: saved } = (await response.json()) as { job: Job }
        replace(saved)
      } catch (error) {
        const current = jobsRef.current.find((candidate) => candidate.id === id)
        if (current) replace({ ...current, status: previous })
        setActionError(error instanceof Error ? error.message : 'Could not update the job.')
      }
    },
    [commit],
  )

  return {
    jobs,
    loading,
    loadError,
    actionError,
    dismissActionError: useCallback(() => setActionError(null), []),
    reload: load,
    setStatus,
  }
}
