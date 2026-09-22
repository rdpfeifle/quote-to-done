import { AlertTriangle, Droplet, Flame, Snowflake, SprayCan, Wind, Wrench, Zap } from 'lucide-react'

import type { Status } from '@/lib/types'

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
 * Airtable ("AC", "Heat Pump", "Water Heater") still lands on a sensible icon.
 * Anything unrecognised falls back to a wrench.
 */
const EQUIPMENT_ICON_RULES: [RegExp, typeof Droplet][] = [
  [/water ?heater|boiler/i, Droplet],
  [/heat ?pump/i, Wind],
  [/furnace|heat|burner/i, Flame],
  [/\bac\b|air ?con|cool|refriger|condens/i, Snowflake],
  [/duct|vent|air/i, Wind],
  [/plumb|drain|pipe|water/i, Droplet],
  [/electric|wiring|panel/i, Zap],
  [/clean|filter/i, SprayCan],
]

export function equipmentIcon(equipment: string): typeof Droplet {
  return EQUIPMENT_ICON_RULES.find(([pattern]) => pattern.test(equipment))?.[1] ?? Wrench
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

/** The physical unit — carries the icon, since it is the concrete thing. */
export function EquipmentChip({ equipment }: { equipment: string | null }) {
  if (!equipment) return null
  const Icon = equipmentIcon(equipment)
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-steel-300 px-2.5 py-1 text-xs font-medium text-steel-500">
      <Icon size={13} strokeWidth={2} aria-hidden />
      {equipment}
    </span>
  )
}

/** The work being done — plain, so it does not compete with the equipment. */
export function JobTypeChip({ jobType }: { jobType: string | null }) {
  if (!jobType) return null
  return (
    <span className="inline-flex items-center rounded-full bg-steel-100 px-2.5 py-1 text-xs font-medium text-steel-500">
      {jobType}
    </span>
  )
}

/** Only Urgent earns color; Normal priority stays silent to avoid noise. */
export function PriorityBadge({ priority }: { priority: string | null }) {
  if (!priority || !/urgent|emergency|high/i.test(priority)) return null
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-alert-600 px-2 py-0.5 font-display text-xs font-bold uppercase tracking-wide text-white">
      <AlertTriangle size={11} strokeWidth={3} aria-hidden />
      {priority}
    </span>
  )
}
