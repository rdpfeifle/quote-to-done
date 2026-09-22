import { NextResponse } from 'next/server'

import { AirtableError, listServiceTypes } from '@/lib/airtable'

export async function GET() {
  try {
    return NextResponse.json({ serviceTypes: await listServiceTypes() })
  } catch (error) {
    if (error instanceof AirtableError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error(error)
    return NextResponse.json({ error: 'Unexpected server error.' }, { status: 500 })
  }
}
