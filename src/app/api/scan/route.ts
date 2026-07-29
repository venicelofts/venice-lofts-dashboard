import { NextResponse } from 'next/server'

/**
 * Local PDF/folder scans still run on the Mac via `pnpm scan`.
 * Graph mail + calendar sync: POST /api/sync with Authorization: Bearer SYNC_CRON_SECRET.
 */
export async function POST() {
 return NextResponse.json(
  {
   ok: false,
   message:
    'Use POST /api/sync with Authorization: Bearer <SYNC_CRON_SECRET> for Graph mail + calendar, or `pnpm scan` / launchd for local folder scans.',
  },
  { status: 501 },
 )
}
