import { NextResponse } from 'next/server'
import { getGraphAzureConfig } from '@/lib/graph/auth'
import { runScan } from '@/lib/scan/run-scan'

export const runtime = 'nodejs'
export const maxDuration = 300

function authorized(request: Request): boolean {
 const secrets = [
  process.env.SYNC_CRON_SECRET?.trim(),
  process.env.CRON_SECRET?.trim(),
 ].filter((value): value is string => Boolean(value))

 if (secrets.length === 0) return false

 const header = request.headers.get('authorization')
 const bearer = header?.startsWith('Bearer ')
  ? header.slice('Bearer '.length)
  : null
 const alt = request.headers.get('x-sync-secret')

 return secrets.some((secret) => bearer === secret || alt === secret)
}

async function handleSync(request: Request) {
 if (!authorized(request)) {
  return NextResponse.json(
   { ok: false, error: 'Unauthorized' },
   { status: 401 },
  )
 }

 const userId = process.env.SCAN_USER_ID?.trim()
 if (!userId) {
  return NextResponse.json(
   { ok: false, error: 'SCAN_USER_ID is not configured' },
   { status: 503 },
  )
 }

 if (!getGraphAzureConfig() || !process.env.GRAPH_MAILBOX?.trim()) {
  return NextResponse.json(
   {
    ok: false,
    error:
     'Graph not configured (AZURE_TENANT_ID / AZURE_CLIENT_ID / AZURE_CLIENT_SECRET / GRAPH_MAILBOX)',
   },
   { status: 503 },
  )
 }

 try {
  const result = await runScan({
   userId,
   includeFolders: false,
  })

  return NextResponse.json({
   ok: true,
   runId: result.runId,
   stats: result.stats,
  })
 } catch (err) {
  const message = err instanceof Error ? err.message : String(err)
  return NextResponse.json({ ok: false, error: message }, { status: 500 })
 }
}

export async function GET(request: Request) {
 return handleSync(request)
}

export async function POST(request: Request) {
 return handleSync(request)
}
