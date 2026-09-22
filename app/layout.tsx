import type { Metadata } from 'next'
import { Archivo, IBM_Plex_Sans } from 'next/font/google'
import Link from 'next/link'
import { Plus } from 'lucide-react'

import './globals.css'

const archivo = Archivo({
  subsets: ['latin'],
  weight: ['700', '800'],
  variable: '--font-archivo',
  display: 'swap',
})

const plex = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Quote to Done',
  description: 'Job tracker for home-services trades',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${plex.variable}`}>
      <body className="min-h-dvh font-sans">
        <header className="bg-steel-900 text-white">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
            <Link href="/" className="font-display text-lg font-extrabold tracking-tight">
              Quote<span className="text-hivis-500">·</span>to<span className="text-hivis-500">·</span>Done
            </Link>
            <Link
              href="/request"
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-hivis-500 px-4 font-display text-sm font-bold text-steel-900 transition-colors hover:bg-hivis-600"
            >
              <Plus size={18} strokeWidth={2.5} aria-hidden />
              New job
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
      </body>
    </html>
  )
}
