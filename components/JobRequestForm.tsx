'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle } from 'lucide-react'

import { serviceIcon } from '@/components/chips'
import { localInputToIso } from '@/lib/format'
import type { Client, ServiceType } from '@/lib/types'

const inputClass =
  'h-11 w-full rounded-lg border border-steel-300 bg-surface px-3 text-base text-steel-900 placeholder:text-steel-500'
const labelClass = 'block font-display text-sm font-bold text-steel-700'

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1.5 text-sm font-medium text-alert-600">{message}</p>
}

export function JobRequestForm() {
  const router = useRouter()

  const [clients, setClients] = useState<Client[]>([])
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([])
  const [clientsError, setClientsError] = useState<string | null>(null)

  const [customerId, setCustomerId] = useState('')
  const [title, setTitle] = useState('')
  const [serviceType, setServiceType] = useState<ServiceType | ''>('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [quoteAmount, setQuoteAmount] = useState('')

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  /** Clears a field's error as soon as the person starts fixing it. */
  const clearError = (field: string) =>
    setErrors((current) => {
      if (!current[field]) return current
      const { [field]: _removed, ...rest } = current
      return rest
    })

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        // Both lists come from the base, so the form always mirrors Airtable.
        const [clientsResponse, typesResponse] = await Promise.all([
          fetch('/api/clients'),
          fetch('/api/service-types'),
        ])
        if (!clientsResponse.ok || !typesResponse.ok) {
          throw new Error('Could not load clients and service types from Airtable.')
        }
        const { clients } = (await clientsResponse.json()) as { clients: Client[] }
        const { serviceTypes } = (await typesResponse.json()) as { serviceTypes: ServiceType[] }
        if (!cancelled) {
          setClients(clients)
          setServiceTypes(serviceTypes)
        }
      } catch (error) {
        if (!cancelled) {
          setClientsError(error instanceof Error ? error.message : 'Could not load the form.')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  function validate() {
    const next: Record<string, string> = {}
    if (!customerId) next.customerId = 'Pick the customer this job is for.'
    if (!title.trim()) next.title = 'Give the job a short title.'
    if (!serviceType) next.serviceType = 'Choose a service type.'
    if (quoteAmount) {
      const amount = Number(quoteAmount)
      if (!Number.isFinite(amount) || amount < 0) {
        next.quoteAmount = 'Enter an amount of zero or more.'
      }
    }
    return next
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setSubmitting(true)
    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          customerId,
          serviceType,
          scheduledDate: localInputToIso(scheduledDate),
          quoteAmount: quoteAmount ? Number(quoteAmount) : null,
        }),
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? 'Could not save the job.')
      }

      router.push('/')
      router.refresh()
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : 'Could not save the job.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {(errors.form || clientsError) && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-alert-600 bg-surface p-3 text-sm font-medium text-alert-600"
        >
          <AlertCircle size={18} strokeWidth={2.5} aria-hidden className="mt-px shrink-0" />
          <p>{errors.form ?? clientsError}</p>
        </div>
      )}

      <div>
        <label htmlFor="customer" className={labelClass}>
          Customer
        </label>
        <select
          id="customer"
          value={customerId}
          onChange={(event) => {
            setCustomerId(event.target.value)
            clearError('customerId')
          }}
          aria-invalid={Boolean(errors.customerId)}
          className={`${inputClass} mt-1.5`}
        >
          <option value="">Select a customer…</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
        <FieldError message={errors.customerId} />
      </div>

      <div>
        <label htmlFor="title" className={labelClass}>
          Job title
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value)
            clearError('title')
          }}
          placeholder="Water heater replacement"
          aria-invalid={Boolean(errors.title)}
          className={`${inputClass} mt-1.5`}
        />
        <FieldError message={errors.title} />
      </div>

      <fieldset>
        <legend className={labelClass}>Service type</legend>
        <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {serviceTypes.length === 0 && !clientsError && (
            <p className="col-span-full text-sm text-steel-500">Loading options…</p>
          )}
          {serviceTypes.map((option) => {
            const Icon = serviceIcon(option)
            const selected = serviceType === option
            return (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setServiceType(option)
                  clearError('serviceType')
                }}
                aria-pressed={selected}
                // Labels come from Airtable and can be long, so the row grows
                // to fit rather than letting one option wrap out of alignment.
                className={`flex min-h-11 items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-center text-sm font-display font-bold leading-tight transition-colors ${
                  selected
                    ? 'border-utility-600 bg-scheduled-bg text-scheduled-fg'
                    : 'border-steel-300 bg-surface text-steel-500'
                }`}
              >
                <Icon size={15} strokeWidth={2} aria-hidden />
                {option}
              </button>
            )
          })}
        </div>
        <FieldError message={errors.serviceType} />
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="scheduled" className={labelClass}>
            Scheduled date <span className="font-sans font-normal text-steel-500">(optional)</span>
          </label>
          <input
            id="scheduled"
            type="datetime-local"
            value={scheduledDate}
            onChange={(event) => setScheduledDate(event.target.value)}
            className={`${inputClass} mt-1.5`}
          />
        </div>

        <div>
          <label htmlFor="amount" className={labelClass}>
            Quote amount <span className="font-sans font-normal text-steel-500">(optional)</span>
          </label>
          <div className="relative mt-1.5">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-steel-500">
              $
            </span>
            <input
              id="amount"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={quoteAmount}
              onChange={(event) => {
                setQuoteAmount(event.target.value)
                clearError('quoteAmount')
              }}
              placeholder="0.00"
              aria-invalid={Boolean(errors.quoteAmount)}
              className={`${inputClass} pl-7 tabular-nums`}
            />
          </div>
          <FieldError message={errors.quoteAmount} />
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="h-12 w-full rounded-lg bg-hivis-500 font-display text-base font-extrabold text-steel-900 transition-colors hover:bg-hivis-600 disabled:opacity-60 sm:w-auto sm:self-start sm:px-8"
      >
        {submitting ? 'Saving…' : 'Create job request'}
      </button>
    </form>
  )
}
