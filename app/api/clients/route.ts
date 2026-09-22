import { NextResponse } from 'next/server'

import { AirtableError, createClient, listClients } from '@/lib/airtable'
import {
  normalizePhone,
  validateCustomerName,
  validateEmail,
  validatePhone,
} from '@/lib/validation'

function errorResponse(error: unknown) {
  if (error instanceof AirtableError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  console.error(error)
  return NextResponse.json({ error: 'Unexpected server error.' }, { status: 500 })
}

export async function GET() {
  try {
    return NextResponse.json({ clients: await listClients() })
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

  const { name, phone, email, address } = (body ?? {}) as Record<string, unknown>

  for (const [label, value] of [
    ['Name', name],
    ['Phone', phone],
    ['Email', email],
    ['Address', address],
  ] as const) {
    if (value != null && typeof value !== 'string') {
      return NextResponse.json({ error: `${label} must be text.` }, { status: 400 })
    }
  }

  const rawName = typeof name === 'string' ? name : ''
  const rawPhone = typeof phone === 'string' ? phone : ''
  const rawEmail = typeof email === 'string' ? email : ''

  // Same rules the form applies, so a direct API call cannot bypass them.
  const invalid =
    validateCustomerName(rawName) ?? validatePhone(rawPhone) ?? validateEmail(rawEmail)
  if (invalid) {
    return NextResponse.json({ error: invalid }, { status: 400 })
  }

  try {
    const client = await createClient({
      name: rawName.trim(),
      phone: rawPhone.trim() ? normalizePhone(rawPhone) : null,
      email: rawEmail.trim() || null,
      address: typeof address === 'string' ? address.trim() || null : null,
    })
    return NextResponse.json({ client }, { status: 201 })
  } catch (error) {
    return errorResponse(error)
  }
}
