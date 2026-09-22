export const STATUSES = ['Requested', 'Quoted', 'Scheduled', 'Done'] as const
export type Status = (typeof STATUSES)[number]

/*
 * Service Type is a single-select the owner edits in Airtable, so it is treated
 * as an open string. Renaming an option in the base must never make the chip
 * vanish from a card — unknown values still render, just with a generic icon.
 */
export type ServiceType = string

export const SERVICE_TYPES: readonly ServiceType[] = [
  'Plumbing',
  'HVAC',
  'Cleaning',
  'Electrical',
]

export function isStatus(value: unknown): value is Status {
  return typeof value === 'string' && (STATUSES as readonly string[]).includes(value)
}

/**
 * Any non-empty string is a valid service type here; Airtable rejects values
 * that are not options on the select (the writes send `typecast: false`), so
 * the base stays the source of truth and no stray option can be created.
 */
export function isServiceType(value: unknown): value is ServiceType {
  return typeof value === 'string' && value.trim().length > 0
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
  title: string
  customerId: string | null
  customerName: string | null
  serviceType: ServiceType | null
  status: Status
  quoteAmount: number | null
  /** ISO 8601, as stored by Airtable. */
  scheduledDate: string | null
}

export interface NewJobInput {
  title: string
  customerId: string
  serviceType: ServiceType
  scheduledDate?: string | null
  quoteAmount?: number | null
}

/** A job is overdue when its scheduled date has passed but the work is not Done. */
export function isOverdue(job: Job, now: number = Date.now()): boolean {
  if (!job.scheduledDate || job.status === 'Done') return false
  const scheduled = new Date(job.scheduledDate).getTime()
  return Number.isFinite(scheduled) && scheduled < now
}
