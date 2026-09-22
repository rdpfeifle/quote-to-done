import { NextResponse } from 'next/server'

import { AirtableError, createJob, listJobs } from '@/lib/airtable'
import { isServiceType } from '@/lib/types'

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

  const { title, customerId, serviceType, scheduledDate, quoteAmount } = (body ?? {}) as Record<
    string,
    unknown
  >

  // Validate before Airtable sees it — an unknown select value would otherwise
  // be rejected opaquely, or worse, create a stray option on the base.
  const trimmedTitle = typeof title === 'string' ? title.trim() : ''
  if (!trimmedTitle) {
    return NextResponse.json({ error: 'Job title is required.' }, { status: 400 })
  }
  if (typeof customerId !== 'string' || !customerId.startsWith('rec')) {
    return NextResponse.json({ error: 'A valid customer is required.' }, { status: 400 })
  }
  if (!isServiceType(serviceType)) {
    return NextResponse.json({ error: 'A valid service type is required.' }, { status: 400 })
  }
  if (quoteAmount != null && (typeof quoteAmount !== 'number' || quoteAmount < 0)) {
    return NextResponse.json({ error: 'Quote amount must be zero or more.' }, { status: 400 })
  }
  if (scheduledDate != null && typeof scheduledDate !== 'string') {
    return NextResponse.json({ error: 'Scheduled date must be a date string.' }, { status: 400 })
  }

  try {
    const job = await createJob({
      title: trimmedTitle,
      customerId,
      serviceType,
      scheduledDate: scheduledDate ?? null,
      quoteAmount: quoteAmount ?? null,
    })
    return NextResponse.json({ job }, { status: 201 })
  } catch (error) {
    return errorResponse(error)
  }
}
