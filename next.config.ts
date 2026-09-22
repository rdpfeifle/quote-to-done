import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Pin the root so Next.js does not pick up a stray lockfile in the home directory.
  turbopack: { root: __dirname },
}

export default nextConfig
