'use client'

import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'

import { STATUSES, type Job, type Status } from '@/lib/types'

import { STATUS_STYLES } from './chips'
import { JobCard } from './JobCard'

function DraggableCard({ job }: { job: Job }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: job.id })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      // The original stays in place but fades, so the column keeps its height.
      className={`cursor-grab touch-none rounded-lg active:cursor-grabbing ${
        isDragging ? 'opacity-30' : ''
      }`}
    >
      <JobCard job={job} />
    </div>
  )
}

function Column({ status, jobs }: { status: Status; jobs: Job[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <section className="flex min-w-0 flex-1 flex-col">
      <header className="mb-3 flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${STATUS_STYLES[status].dot}`} aria-hidden />
        <h2 className="font-display text-sm font-extrabold uppercase tracking-wide text-steel-700">
          {status}
        </h2>
        <span className="font-display text-sm font-bold tabular-nums text-steel-500">
          {jobs.length}
        </span>
      </header>

      <div
        ref={setNodeRef}
        className={`flex min-h-40 flex-1 flex-col gap-2.5 rounded-xl border-2 border-dashed p-2.5 transition-colors ${
          isOver ? 'border-utility-600 bg-scheduled-bg' : 'border-steel-300 bg-steel-100'
        }`}
      >
        {jobs.map((job) => (
          <DraggableCard key={job.id} job={job} />
        ))}
        {jobs.length === 0 && (
          <p className="m-auto px-2 text-center text-sm text-steel-500">Nothing here yet</p>
        )}
      </div>
    </section>
  )
}

export function KanbanBoard({
  jobs,
  onStatusChange,
}: {
  jobs: Job[]
  onStatusChange: (id: string, status: Status) => void
}) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const activeJob = jobs.find((job) => job.id === activeId) ?? null

  const sensors = useSensors(
    // A small distance threshold keeps a plain click from starting a drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    // Keyboard dragging: tab to a card, space to lift, arrows to move, space to drop.
    useSensor(KeyboardSensor),
  )

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over) return

    const next = String(over.id) as Status
    const job = jobs.find((candidate) => candidate.id === String(active.id))
    if (job && job.status !== next) onStatusChange(job.id, next)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex gap-4">
        {STATUSES.map((status) => (
          <Column key={status} status={status} jobs={jobs.filter((job) => job.status === status)} />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeJob && <JobCard job={activeJob} dragging />}
      </DragOverlay>
    </DndContext>
  )
}
