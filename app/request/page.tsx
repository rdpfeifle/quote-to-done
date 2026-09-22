import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { JobRequestForm } from '@/components/JobRequestForm'

export default function RequestPage() {
  return (
    <div className="mx-auto max-w-xl">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-steel-500 hover:text-utility-600"
      >
        <ArrowLeft size={16} strokeWidth={2} aria-hidden />
        Back to jobs
      </Link>

      <h1 className="mt-4 font-display text-2xl font-extrabold tracking-tight text-steel-900">
        New job request
      </h1>
      <p className="mt-1 text-sm text-steel-500">
        Logged as <strong className="font-semibold text-steel-700">Requested</strong>. Move it along
        from the board once it is quoted.
      </p>

      <div className="mt-6 rounded-xl border border-steel-300 bg-surface p-5 sm:p-6">
        <JobRequestForm />
      </div>
    </div>
  )
}
