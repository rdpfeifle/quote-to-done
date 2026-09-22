import 'server-only'

import {
  type Client,
  type Job,
  type JobOptions,
  type NewJobInput,
  type Status,
  isStatus,
} from './types'

const API_ROOT = 'https://api.airtable.com/v0'

const TABLES = {
  clients: 'Clients',
  jobs: 'Jobs',
} as const

/** Exact Airtable field names, spaces included. */
const FIELDS = {
  // Clients
  name: 'Name',
  phone: 'Phone',
  email: 'Email',
  address: 'Address',
  // Jobs
  title: 'Title', // formula — read-only, never sent on write
  customer: 'Customer',
  jobType: 'Job Type',
  equipment: 'Equipment',
  priority: 'Priority',
  status: 'Status',
  quoteAmount: 'Quote Amount',
  scheduledDate: 'Scheduled Date',
  notes: 'Notes',
} as const

/** Base IDs are not secrets, so a default keeps local setup to a single env var. */
const DEFAULT_BASE_ID = 'appLT4Tusjw667IpU'

export class AirtableError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'AirtableError'
  }
}

function credentials() {
  const token = process.env.AIRTABLE_TOKEN ?? process.env.AIRTABLE_API_KEY
  if (!token) {
    throw new AirtableError('AIRTABLE_TOKEN is not set. Copy .env.example to .env.', 500)
  }
  return { token, baseId: process.env.AIRTABLE_BASE_ID || DEFAULT_BASE_ID }
}

interface AirtableRecord {
  id: string
  fields: Record<string, unknown>
}

async function request<T>(
  path: string,
  init: RequestInit & { searchParams?: URLSearchParams } = {},
): Promise<T> {
  const { token, baseId } = credentials()
  const { searchParams, ...rest } = init
  const url = new URL(`${API_ROOT}/${baseId}/${path}`)
  if (searchParams) url.search = searchParams.toString()

  const response = await fetch(url, {
    ...rest,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...rest.headers,
    },
    // Job data changes constantly; never serve it from the Next.js data cache.
    cache: 'no-store',
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { error?: { message?: string; type?: string } | string }
      | null
    const detail =
      typeof body?.error === 'string' ? body.error : body?.error?.message ?? response.statusText
    throw new AirtableError(`Airtable: ${detail}`, response.status)
  }

  return response.json() as Promise<T>
}

/** The schema endpoint sits outside the base path, so it bypasses `request`. */
async function metaRequest<T>(path: string): Promise<T> {
  const { token, baseId } = credentials()
  const response = await fetch(`${API_ROOT}/meta/bases/${baseId}/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { error?: { message?: string } | string }
      | null
    const detail =
      typeof body?.error === 'string' ? body.error : body?.error?.message ?? response.statusText
    throw new AirtableError(`Airtable: ${detail}`, response.status)
  }
  return response.json() as Promise<T>
}

/** Walks Airtable's `offset` pagination so callers always get the full table. */
async function listAll(table: string, sortField?: string): Promise<AirtableRecord[]> {
  const records: AirtableRecord[] = []
  let offset: string | undefined

  do {
    const searchParams = new URLSearchParams({ pageSize: '100' })
    if (sortField) {
      searchParams.set('sort[0][field]', sortField)
      searchParams.set('sort[0][direction]', 'asc')
    }
    if (offset) searchParams.set('offset', offset)

    const page = await request<{ records: AirtableRecord[]; offset?: string }>(table, {
      searchParams,
    })
    records.push(...page.records)
    offset = page.offset
  } while (offset)

  return records
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function toClient(record: AirtableRecord): Client {
  return {
    id: record.id,
    name: text(record.fields[FIELDS.name]) ?? 'Unnamed client',
    phone: text(record.fields[FIELDS.phone]),
    email: text(record.fields[FIELDS.email]),
    address: text(record.fields[FIELDS.address]),
  }
}

/**
 * Title is an Airtable formula over Equipment, Job Type and Customer. A record
 * missing any of those comes back blank, so rebuild the same shape locally
 * rather than rendering an empty card.
 */
function jobTitle(
  formulaValue: string | null,
  equipment: string | null,
  jobType: string | null,
  customerName: string | null,
): string {
  if (formulaValue) return formulaValue
  const subject = [equipment, jobType].filter(Boolean).join(' ')
  const parts = [subject, customerName].filter(Boolean)
  return parts.length > 0 ? parts.join(' - ') : 'Untitled job'
}

function toJob(record: AirtableRecord, clientNames: Map<string, string>): Job {
  const links = record.fields[FIELDS.customer]
  const customerId = Array.isArray(links) && typeof links[0] === 'string' ? links[0] : null
  const status = record.fields[FIELDS.status]
  const amount = record.fields[FIELDS.quoteAmount]
  const customerName = customerId ? clientNames.get(customerId) ?? null : null
  const equipment = text(record.fields[FIELDS.equipment])
  const jobType = text(record.fields[FIELDS.jobType])

  return {
    id: record.id,
    title: jobTitle(text(record.fields[FIELDS.title]), equipment, jobType, customerName),
    customerId,
    customerName,
    jobType,
    equipment,
    priority: text(record.fields[FIELDS.priority]),
    // A record with a blank Status sorts into the first column rather than vanishing.
    status: isStatus(status) ? status : 'Requested',
    quoteAmount: typeof amount === 'number' ? amount : null,
    scheduledDate: text(record.fields[FIELDS.scheduledDate]),
    notes: text(record.fields[FIELDS.notes]),
  }
}

export async function listClients(): Promise<Client[]> {
  const records = await listAll(TABLES.clients, FIELDS.name)
  return records.map(toClient)
}

/**
 * Jobs with their linked customer resolved to a name, so the browser never has
 * to deal with Airtable's linked-record ID arrays.
 */
export async function listJobs(): Promise<Job[]> {
  const [jobRecords, clients] = await Promise.all([listAll(TABLES.jobs), listClients()])
  const clientNames = new Map(clients.map((client) => [client.id, client.name]))
  return jobRecords.map((record) => toJob(record, clientNames))
}

interface TableSchema {
  name: string
  fields: { name: string; type: string; options?: { choices?: { name: string }[] } }[]
}

/**
 * The single-select options as configured in Airtable, so editing the choices
 * in the base updates the form with no code change. Falls back to the values
 * already present on Jobs records if the token lacks `schema.bases:read`.
 */
export async function listJobOptions(): Promise<JobOptions> {
  const wanted = [FIELDS.jobType, FIELDS.equipment, FIELDS.priority]

  try {
    const { tables } = await metaRequest<{ tables: TableSchema[] }>('tables')
    const jobFields = tables.find((table) => table.name === TABLES.jobs)?.fields ?? []
    const choicesFor = (name: string) =>
      jobFields.find((field) => field.name === name)?.options?.choices?.map((c) => c.name) ?? []

    const fromSchema = {
      jobTypes: choicesFor(FIELDS.jobType),
      equipment: choicesFor(FIELDS.equipment),
      priorities: choicesFor(FIELDS.priority),
    }
    if (Object.values(fromSchema).some((list) => list.length > 0)) return fromSchema
  } catch {
    // Missing schema scope is not fatal — fall through to the record scan.
  }

  const records = await listAll(TABLES.jobs)
  const used = new Map<string, Set<string>>(wanted.map((name) => [name, new Set<string>()]))
  for (const record of records) {
    for (const name of wanted) {
      const value = record.fields[name]
      if (typeof value === 'string' && value) used.get(name)!.add(value)
    }
  }
  const sorted = (name: string) => [...used.get(name)!].sort()

  return {
    jobTypes: sorted(FIELDS.jobType),
    equipment: sorted(FIELDS.equipment),
    priorities: sorted(FIELDS.priority),
  }
}

export async function createJob(input: NewJobInput): Promise<Job> {
  // Title is a formula field: Airtable rejects any attempt to write it.
  const fields: Record<string, unknown> = {
    [FIELDS.customer]: [input.customerId],
    [FIELDS.jobType]: input.jobType,
    [FIELDS.equipment]: input.equipment,
    [FIELDS.status]: 'Requested' satisfies Status,
  }
  if (input.priority) fields[FIELDS.priority] = input.priority
  if (input.scheduledDate) fields[FIELDS.scheduledDate] = input.scheduledDate
  if (typeof input.quoteAmount === 'number') fields[FIELDS.quoteAmount] = input.quoteAmount
  if (input.notes) fields[FIELDS.notes] = input.notes

  const record = await request<AirtableRecord>(TABLES.jobs, {
    method: 'POST',
    body: JSON.stringify({ fields, typecast: false }),
  })

  const clients = await listClients()
  return toJob(record, new Map(clients.map((client) => [client.id, client.name])))
}

export async function updateJobStatus(id: string, status: Status): Promise<Job> {
  const record = await request<AirtableRecord>(`${TABLES.jobs}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields: { [FIELDS.status]: status } }),
  })

  const clients = await listClients()
  return toJob(record, new Map(clients.map((client) => [client.id, client.name])))
}
