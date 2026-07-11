import { NextResponse } from 'next/server'

/**
 * Scans must run on the local machine (email/PDF access + service role).
 * This endpoint documents that — use `pnpm scan` or launchd.
 */
export async function POST() {
 return NextResponse.json(
  {
   ok: false,
   message:
    'Scan runs locally. Use `pnpm scan` or ./scripts/install-launchd.sh on the Mac that has email/PDF access.',
  },
  { status: 501 },
 )
}
