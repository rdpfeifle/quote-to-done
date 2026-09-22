/*
 * Shared by the request form and the /api/clients route handler, so the
 * browser and the server never disagree about what a valid customer is.
 * Each function returns an error message, or null when the value is fine.
 */

/** Names are people and businesses: letters, spaces, and - ' . & / are fine. */
export function validateCustomerName(value: string): string | null {
  const name = value.trim()
  if (!name) return "Enter the customer's name."
  if (/\d/.test(name)) return "Customer name can't contain numbers."
  if (!/^[\p{L}][\p{L}\s'.\-&/]*$/u.test(name)) {
    return 'Customer name can only contain letters.'
  }
  return null
}

export function validateEmail(value: string): string | null {
  const email = value.trim()
  if (!email) return null // optional
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? null : 'Enter a valid email address.'
}

/** Digits only, ignoring the separators people naturally type. */
export function phoneDigits(value: string): string {
  return value.replace(/\D/g, '')
}

export function validatePhone(value: string): string | null {
  const phone = value.trim()
  if (!phone) return null // optional

  if (/[a-z]/i.test(phone)) return 'Phone number can only contain numbers.'
  if (/[^\d\s().+-]/.test(phone)) return 'Phone number can only contain numbers.'

  const digits = phoneDigits(phone)
  // A leading 1 is the country code: rejected rather than stripped, so a
  // mistyped digit is not silently swallowed into a valid-looking number.
  if (digits.length === 11 && digits.startsWith('1')) {
    return 'Enter the 10-digit number without the +1 country code.'
  }
  if (digits.length !== 10) {
    return `Enter a 10-digit phone number (you entered ${digits.length}).`
  }
  return null
}

/**
 * Formats digits as the US pattern while the field is being typed:
 * 5 -> "(5", 5712 -> "(571) 2", 5712224245 -> "(571) 222-4245".
 * Input beyond 10 digits is dropped, so the separators never count toward
 * the limit. A pasted leading 1 is treated as the country code and removed
 * rather than truncating the last digit and producing a wrong number.
 */
export function formatPhoneInput(value: string): string {
  let digits = phoneDigits(value)
  if (digits.length > 10 && digits.startsWith('1')) digits = digits.slice(1)
  digits = digits.slice(0, 10)

  if (digits.length === 0) return ''
  if (digits.length <= 3) return `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

/** Stores phones as 555-123-4567, matching the records already in the base. */
export function normalizePhone(value: string): string {
  const digits = phoneDigits(value)
  if (digits.length !== 10) return value.trim()
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
}
