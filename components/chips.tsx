import { Droplet, Flame, Snowflake, SprayCan, Wind, Wrench, Zap } from 'lucide-react'

import type { ServiceType, Status } from '@/lib/types'

/*
 * Status owns color in this UI; service type owns the icon. Four status colors
 * plus four service colors would be a rainbow nobody can scan at a glance.
 *
 * Class strings are written out in full because Tailwind scans source text —
 * a composed string like `bg-${status}-bg` would never be generated.
 */
export const STATUS_STYLES: Record<Status, { chip: string; bar: string; dot: string }> = {
  Requested: {
    chip: 'bg-requested-bg text-requested-fg',
    bar: 'bg-requested',
    dot: 'bg-requested',
  },
  Quoted: {
    chip: 'bg-quoted-bg text-quoted-fg',
    bar: 'bg-quoted',
    dot: 'bg-quoted',
  },
  Scheduled: {
    chip: 'bg-scheduled-bg text-scheduled-fg',
    bar: 'bg-scheduled',
    dot: 'bg-scheduled',
  },
  Done: {
    chip: 'bg-done-bg text-done-fg',
    bar: 'bg-done',
    dot: 'bg-done',
  },
}

/*
 * Matched on keywords rather than exact names, so renaming an option in
 * Airtable ("AC Repair", "Heating Install") still lands on a sensible icon.
 * Anything unrecognised falls back to a wrench.
 */
const SERVICE_ICON_RULES: [RegExp, typeof Droplet][] = [
  [/cool|^ac\b|air ?con|refriger/i, Snowflake],
  [/heat|furnace|boiler|burner/i, Flame],
  [/vent|duct|air|hvac/i, Wind],
  [/plumb|drain|water|pipe/i, Droplet],
  [/electric|wiring|panel/i, Zap],
  [/clean|filter/i, SprayCan],
]

export function serviceIcon(serviceType: ServiceType): typeof Droplet {
  return SERVICE_ICON_RULES.find(([pattern]) => pattern.test(serviceType))?.[1] ?? Wrench
}

export function StatusChip({ status }: { status: Status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 font-display text-xs font-bold uppercase tracking-wide ${STATUS_STYLES[status].chip}`}
    >
      {status}
    </span>
  )
}

export function ServiceChip({ serviceType }: { serviceType: ServiceType | null }) {
  if (!serviceType) return null
  const Icon = serviceIcon(serviceType)
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-steel-300 px-2.5 py-1 text-xs font-medium text-steel-500">
      <Icon size={13} strokeWidth={2} aria-hidden />
      {serviceType}
    </span>
  )
}
