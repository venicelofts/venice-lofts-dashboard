import { createHash } from 'node:crypto'
import { getGraphAzureConfig } from '@/lib/graph/auth'
import { listInboxMessages } from '@/lib/graph/mail'
import { formatScanError } from '@/lib/scan/errors'
import { extractItinerary } from '@/lib/scan/extract'
import { createServiceClient, upsertExtraction } from '@/lib/scan/persist'

const SUBJECT_HINT =
 /flight|hotel|itinerary|reservation|booking|confirmation|check-?in|boarding|trip|travel|invoice|receipt|meeting|calendar|agenda|your trip|e-?ticket/i

export type EmailScanStats = {
 messagesSeen: number
 messagesProcessed: number
 eventsCreated: number
 skipped: number
 errors: string[]
}

function getGraphMailbox(): string | null {
 const mailbox = process.env.GRAPH_MAILBOX?.trim()
 return mailbox || null
}

export function isEmailScanConfigured(): boolean {
 return Boolean(getGraphAzureConfig() && getGraphMailbox())
}

function getScanLookbackHours(): number {
 return Number(process.env.SCAN_LOOKBACK_HOURS ?? '48')
}

export async function scanEmail(userId: string): Promise<EmailScanStats> {
 const stats: EmailScanStats = {
  messagesSeen: 0,
  messagesProcessed: 0,
  eventsCreated: 0,
  skipped: 0,
  errors: [],
 }

 const mailbox = getGraphMailbox()
 if (!getGraphAzureConfig() || !mailbox) {
  stats.errors.push(
   'Graph mail not configured (AZURE_TENANT_ID / AZURE_CLIENT_ID / AZURE_CLIENT_SECRET / GRAPH_MAILBOX)',
  )
  return stats
 }

 const lookbackHours = getScanLookbackHours()
 const since = new Date(Date.now() - lookbackHours * 60 * 60 * 1000)
 const supabase = createServiceClient()

 let messages
 try {
  messages = await listInboxMessages({ mailbox, since })
 } catch (err) {
  stats.errors.push(
   formatScanError(
    err,
    `Graph list inbox (${mailbox}, since ${since.toISOString()}, ${lookbackHours}h lookback)`,
   ),
  )
  return stats
 }

 for (const message of messages) {
  stats.messagesSeen += 1
  try {
   const { data: existing } = await supabase
    .from('sources')
    .select('id')
    .eq('user_id', userId)
    .eq('external_id', message.internetMessageId)
    .maybeSingle()

   if (existing) {
    stats.skipped += 1
    continue
   }

   if (
    !SUBJECT_HINT.test(message.subject) &&
    !SUBJECT_HINT.test(message.bodyText.slice(0, 2000))
   ) {
    stats.skipped += 1
    continue
   }

   const contentHash = createHash('sha256')
    .update(message.internetMessageId + message.bodyText.slice(0, 5000))
    .digest('hex')

   const extraction = await extractItinerary(
    `Subject: ${message.subject}\nFrom: ${message.from ?? ''}\n\n${message.bodyText}`,
    { label: `email:${message.subject}` },
   )

   if (extraction.events.length === 0 && !extraction.trip) {
    stats.skipped += 1
    continue
   }

   const result = await upsertExtraction(supabase, {
    userId,
    kind: 'email',
    externalId: message.internetMessageId,
    contentHash,
    pathOrSubject: message.subject,
    textSnippet: message.bodyText,
    metadata: {
     from: message.from,
     date: message.receivedAt,
     mailbox,
    },
    extraction,
   })

   stats.messagesProcessed += 1
   stats.eventsCreated += result.eventCount
  } catch (err) {
   stats.errors.push(
    formatScanError(err, `message ${message.internetMessageId}`),
   )
  }
 }

 return stats
}
