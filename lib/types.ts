export const STATUSES = ['Requested', 'Quoted', 'Scheduled', 'Done'] as const
export type Status = (typeof STATUSES)[number]

export function isStatus(value: unknown): value is Status {
  return typeof value === 'string' && (STATUSES as readonly string[]).includes(value)
}

/*
 * Job Type, Equipment and Priority are single-selects the owner edits in
 * Airtable, so they are open strings here and their options are read from the
 * base at runtime. Airtable rejects values that are not on the select (writes
 * send `typecast: false`), so the base stays the source of truth.
 */
export function isSelectValue(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

/** The three single-selects the request form has to offer. */
export interface JobOptions {
  jobTypes: string[]
  equipment: string[]
  priorities: string[]
}

export interface Client {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
}

export interface Job {
  id: string
  /** Read-only: an Airtable formula, `Equipment & " " & Job Type & " - " & Customer`. */
  title: string
  customerId: string | null
  customerName: string | null
  jobType: string | null
  equipment: string | null
  priority: string | null
  status: Status
  quoteAmount: number | null
  /** ISO 8601, as stored by Airtable. */
  scheduledDate: string | null
  notes: string | null
}

export interface NewJobInput {
  customerId: string
  jobType: string
  equipment: string
  priority?: string | null
  scheduledDate?: string | null
  quoteAmount?: number | null
  notes?: string | null
}

/** A job is overdue when its scheduled date has passed but the work is not Done. */
export function isOverdue(job: Job, now: number = Date.now()): boolean {
  if (!job.scheduledDate || job.status === 'Done') return false
  const scheduled = new Date(job.scheduledDate).getTime()
  return Number.isFinite(scheduled) && scheduled < now
}

/** Urgent is the one priority that gets visual weight on a card. */
export function isUrgent(job: Job): boolean {
  return /urgent|emergency|high/i.test(job.priority ?? '')
}

/**
 * Mirrors the Airtable Title formula so the form can preview the name a job
 * will be saved under, since the field itself cannot be written.
 */
export function previewTitle(equipment: string, jobType: string, customerName: string): string {
  return `${equipment} ${jobType} - ${customerName}`.trim()
}
