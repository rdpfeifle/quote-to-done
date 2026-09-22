'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle } from 'lucide-react'

import { equipmentIcon } from '@/components/chips'
import { localInputToIso } from '@/lib/format'
import { type Client, type JobOptions, previewTitle } from '@/lib/types'

const inputClass =
  'h-11 w-full rounded-lg border border-steel-300 bg-surface px-3 text-base text-steel-900 placeholder:text-steel-500'
const labelClass = 'block font-display text-sm font-bold text-steel-700'

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1.5 text-sm font-medium text-alert-600">{message}</p>
}

/** Segmented control over options that come from the base, so labels vary. */
function OptionGroup({
  options,
  value,
  onSelect,
  withIcon = false,
}: {
  options: string[]
  value: string
  onSelect: (option: string) => void
  withIcon?: boolean
}) {
  return (
    <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {options.map((option) => {
        const Icon = withIcon ? equipmentIcon(option) : null
        const selected = value === option
        return (
          <button
            key={option}
            type="button"
            onClick={() => onSelect(option)}
            aria-pressed={selected}
            className={`flex min-h-11 items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-center font-display text-sm font-bold leading-tight transition-colors ${
              selected
                ? 'border-utility-600 bg-scheduled-bg text-scheduled-fg'
                : 'border-steel-300 bg-surface text-steel-500'
            }`}
          >
            {Icon && <Icon size={15} strokeWidth={2} aria-hidden className="shrink-0" />}
            {option}
          </button>
        )
      })}
    </div>
  )
}

export function JobRequestForm() {
  const router = useRouter()

  const [clients, setClients] = useState<Client[]>([])
  const [options, setOptions] = useState<JobOptions>({
    jobTypes: [],
    equipment: [],
    priorities: [],
  })
  const [loadError, setLoadError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  const [customerId, setCustomerId] = useState('')
  const [jobType, setJobType] = useState('')
  const [equipment, setEquipment] = useState('')
  const [priority, setPriority] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [quoteAmount, setQuoteAmount] = useState('')
  const [notes, setNotes] = useState('')

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

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
        const [clientsResponse, optionsResponse] = await Promise.all([
          fetch('/api/clients'),
          fetch('/api/options'),
        ])
        if (!clientsResponse.ok || !optionsResponse.ok) {
          throw new Error('Could not load customers and job options from Airtable.')
        }
        const { clients } = (await clientsResponse.json()) as { clients: Client[] }
        const options = (await optionsResponse.json()) as JobOptions
        if (cancelled) return

        setClients(clients)
        setOptions(options)
        // Default to the lowest-urgency option so the common case is one tap less.
        setPriority(options.priorities.find((p) => /normal|standard|low/i.test(p)) ?? '')
        setReady(true)
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : 'Could not load the form.')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Title is a formula in Airtable, so show what the job will be filed as.
  const titlePreview = useMemo(() => {
    const customer = clients.find((client) => client.id === customerId)
    if (!equipment || !jobType || !customer) return null
    return previewTitle(equipment, jobType, customer.name)
  }, [clients, customerId, equipment, jobType])

  function validate() {
    const next: Record<string, string> = {}
    if (!customerId) next.customerId = 'Pick the customer this job is for.'
    if (!equipment) next.equipment = 'Choose the equipment.'
    if (!jobType) next.jobType = 'Choose the type of work.'
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
          customerId,
          jobType,
          equipment,
          priority: priority || null,
          scheduledDate: localInputToIso(scheduledDate),
          quoteAmount: quoteAmount ? Number(quoteAmount) : null,
          notes: notes.trim() || null,
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
      {(errors.form || loadError) && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-alert-600 bg-surface p-3 text-sm font-medium text-alert-600"
        >
          <AlertCircle size={18} strokeWidth={2.5} aria-hidden className="mt-px shrink-0" />
          <p>{errors.form ?? loadError}</p>
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

      <fieldset>
        <legend className={labelClass}>Equipment</legend>
        {!ready && !loadError && <p className="mt-1.5 text-sm text-steel-500">Loading options…</p>}
        <OptionGroup
          options={options.equipment}
          value={equipment}
          withIcon
          onSelect={(option) => {
            setEquipment(option)
            clearError('equipment')
          }}
        />
        <FieldError message={errors.equipment} />
      </fieldset>

      <fieldset>
        <legend className={labelClass}>Job type</legend>
        <OptionGroup
          options={options.jobTypes}
          value={jobType}
          onSelect={(option) => {
            setJobType(option)
            clearError('jobType')
          }}
        />
        <FieldError message={errors.jobType} />
      </fieldset>

      {options.priorities.length > 0 && (
        <fieldset>
          <legend className={labelClass}>Priority</legend>
          <OptionGroup options={options.priorities} value={priority} onSelect={setPriority} />
        </fieldset>
      )}

      {titlePreview && (
        <p className="rounded-lg bg-steel-100 px-3 py-2 text-sm text-steel-500">
          Saves as{' '}
          <strong className="font-display font-bold text-steel-700">{titlePreview}</strong>
        </p>
      )}

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

      <div>
        <label htmlFor="notes" className={labelClass}>
          Notes <span className="font-sans font-normal text-steel-500">(optional)</span>
        </label>
        <textarea
          id="notes"
          rows={3}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Access instructions, unit model, what the customer reported…"
          className="mt-1.5 w-full rounded-lg border border-steel-300 bg-surface px-3 py-2 text-base text-steel-900 placeholder:text-steel-500"
        />
      </div>

      <button
        type="submit"
        disabled={submitting || !ready}
        className="h-12 w-full rounded-lg bg-hivis-500 font-display text-base font-extrabold text-steel-900 transition-colors hover:bg-hivis-600 disabled:opacity-60 sm:w-auto sm:self-start sm:px-8"
      >
        {submitting ? 'Saving…' : 'Create job request'}
      </button>
    </form>
  )
}
