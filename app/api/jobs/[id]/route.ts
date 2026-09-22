import { NextResponse } from 'next/server'

import { AirtableError, updateJobStatus } from '@/lib/airtable'
import { isStatus } from '@/lib/types'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Request body must be JSON.' }, { status: 400 })
  }

  const { status } = (body ?? {}) as Record<string, unknown>
  if (!isStatus(status)) {
    return NextResponse.json({ error: 'A valid status is required.' }, { status: 400 })
  }

  try {
    return NextResponse.json({ job: await updateJobStatus(id, status) })
  } catch (error) {
    if (error instanceof AirtableError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error(error)
    return NextResponse.json({ error: 'Unexpected server error.' }, { status: 500 })
  }
}
