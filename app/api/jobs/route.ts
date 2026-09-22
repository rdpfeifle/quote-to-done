import { NextResponse } from 'next/server'

import { AirtableError, createJob, listJobs } from '@/lib/airtable'
import { isSelectValue } from '@/lib/types'

function errorResponse(error: unknown) {
  if (error instanceof AirtableError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  console.error(error)
  return NextResponse.json({ error: 'Unexpected server error.' }, { status: 500 })
}

export async function GET() {
  try {
    return NextResponse.json({ jobs: await listJobs() })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Request body must be JSON.' }, { status: 400 })
  }

  const { customerId, jobType, equipment, priority, scheduledDate, quoteAmount, notes } = (body ??
    {}) as Record<string, unknown>

  // Title is not accepted: it is a formula field derived from Equipment,
  // Job Type and Customer, and Airtable rejects writes to it.
  if (typeof customerId !== 'string' || !customerId.startsWith('rec')) {
    return NextResponse.json({ error: 'A valid customer is required.' }, { status: 400 })
  }
  if (!isSelectValue(jobType)) {
    return NextResponse.json({ error: 'A job type is required.' }, { status: 400 })
  }
  if (!isSelectValue(equipment)) {
    return NextResponse.json({ error: 'Equipment is required.' }, { status: 400 })
  }
  if (priority != null && !isSelectValue(priority)) {
    return NextResponse.json({ error: 'Priority must be a valid option.' }, { status: 400 })
  }
  if (notes != null && typeof notes !== 'string') {
    return NextResponse.json({ error: 'Notes must be text.' }, { status: 400 })
  }
  if (quoteAmount != null && (typeof quoteAmount !== 'number' || quoteAmount < 0)) {
    return NextResponse.json({ error: 'Quote amount must be zero or more.' }, { status: 400 })
  }
  if (scheduledDate != null && typeof scheduledDate !== 'string') {
    return NextResponse.json({ error: 'Scheduled date must be a date string.' }, { status: 400 })
  }

  try {
    const job = await createJob({
      customerId,
      jobType,
      equipment,
      priority: (priority as string | null) ?? null,
      scheduledDate: (scheduledDate as string | null) ?? null,
      quoteAmount: (quoteAmount as number | null) ?? null,
      notes: (notes as string | null) ?? null,
    })
    return NextResponse.json({ job }, { status: 201 })
  } catch (error) {
    return errorResponse(error)
  }
}
