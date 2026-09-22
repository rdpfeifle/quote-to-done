/*
 * Locale and time zone are pinned rather than left to the browser: the Airtable
 * base stores Scheduled Date in America/Denver, and an unpinned formatter would
 * also render differently on the server and the client and trip hydration.
 */
const BASE_TIME_ZONE = 'America/Denver'

/*
 * Whole amounts read better without trailing zeros ($1,840), but anything with
 * cents needs both digits — $620.50, never $620.5.
 */
const wholeCurrency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const centsCurrency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const dateTime = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: BASE_TIME_ZONE,
})

export function formatAmount(value: number | null): string | null {
  if (value == null) return null
  return Number.isInteger(value) ? wholeCurrency.format(value) : centsCurrency.format(value)
}

export function formatScheduled(value: string | null): string | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : dateTime.format(date)
}

/** Airtable wants a full ISO instant; `datetime-local` gives a zoneless string. */
export function localInputToIso(value: string): string | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}
