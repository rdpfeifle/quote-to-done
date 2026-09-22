import 'server-only'

import {
  type Client,
  type Job,
  type NewJobInput,
  type Status,
  isServiceType,
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
  title: 'Title',
  customer: 'Customer',
  serviceType: 'Service Type',
  status: 'Status',
  quoteAmount: 'Quote Amount',
  scheduledDate: 'Scheduled Date',
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

function toJob(record: AirtableRecord, clientNames: Map<string, string>): Job {
  const links = record.fields[FIELDS.customer]
  const customerId = Array.isArray(links) && typeof links[0] === 'string' ? links[0] : null
  const serviceType = record.fields[FIELDS.serviceType]
  const status = record.fields[FIELDS.status]
  const amount = record.fields[FIELDS.quoteAmount]

  return {
    id: record.id,
    title: text(record.fields[FIELDS.title]) ?? 'Untitled job',
    customerId,
    customerName: customerId ? clientNames.get(customerId) ?? null : null,
    serviceType: isServiceType(serviceType) ? serviceType : null,
    // A record with a blank Status sorts into the first column rather than vanishing.
    status: isStatus(status) ? status : 'Requested',
    quoteAmount: typeof amount === 'number' ? amount : null,
    scheduledDate: text(record.fields[FIELDS.scheduledDate]),
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
 * The Service Type options as configured in Airtable, so editing the select in
 * the base updates the form with no code change. Falls back to the values
 * already used on Jobs records if the token lacks `schema.bases:read`.
 */
export async function listServiceTypes(): Promise<string[]> {
  try {
    const { tables } = await metaRequest<{ tables: TableSchema[] }>('tables')
    const choices = tables
      .find((table) => table.name === TABLES.jobs)
      ?.fields.find((field) => field.name === FIELDS.serviceType)?.options?.choices
    if (choices?.length) return choices.map((choice) => choice.name)
  } catch {
    // Missing schema scope is not fatal — fall through to the record scan.
  }

  const records = await listAll(TABLES.jobs)
  const used = new Set<string>()
  for (const record of records) {
    const value = record.fields[FIELDS.serviceType]
    if (typeof value === 'string' && value) used.add(value)
  }
  return [...used].sort()
}

export async function createJob(input: NewJobInput): Promise<Job> {
  const fields: Record<string, unknown> = {
    [FIELDS.title]: input.title,
    [FIELDS.customer]: [input.customerId],
    [FIELDS.serviceType]: input.serviceType,
    [FIELDS.status]: 'Requested' satisfies Status,
  }
  if (input.scheduledDate) fields[FIELDS.scheduledDate] = input.scheduledDate
  if (typeof input.quoteAmount === 'number') fields[FIELDS.quoteAmount] = input.quoteAmount

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
