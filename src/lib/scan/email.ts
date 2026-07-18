import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'
import { createHash } from 'node:crypto'
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

function getImapConfig() {
 const host = process.env.IMAP_HOST
 const user = process.env.IMAP_USER
 const pass = process.env.IMAP_PASS
 const port = Number(process.env.IMAP_PORT ?? '993')
 if (!host || !user || !pass) return null
 return { host, user, pass, port }
}

function imapLogger() {
 if (process.env.IMAP_DEBUG !== '1') return false
 return {
  debug: (obj: unknown) => console.error('[imap debug]', obj),
  info: (obj: unknown) => console.error('[imap info]', obj),
  warn: (obj: unknown) => console.error('[imap warn]', obj),
  error: (obj: unknown) => console.error('[imap error]', obj),
 }
}

export async function scanEmail(userId: string): Promise<EmailScanStats> {
 const stats: EmailScanStats = {
  messagesSeen: 0,
  messagesProcessed: 0,
  eventsCreated: 0,
  skipped: 0,
  errors: [],
 }

 const config = getImapConfig()
 if (!config) {
  stats.errors.push('IMAP not configured (IMAP_HOST / IMAP_USER / IMAP_PASS)')
  return stats
 }

 const lookbackHours = Number(process.env.IMAP_LOOKBACK_HOURS ?? '48')
 const since = new Date(Date.now() - lookbackHours * 60 * 60 * 1000)
 const supabase = createServiceClient()

 const client = new ImapFlow({
  host: config.host,
  port: config.port,
  secure: true,
  auth: { user: config.user, pass: config.pass },
  logger: imapLogger(),
 })

 try {
  try {
   await client.connect()
  } catch (err) {
   stats.errors.push(
    formatScanError(
     err,
     `IMAP connect (${config.host}:${config.port} as ${config.user})`,
    ),
   )
   return stats
  }

  const lock = await client.getMailboxLock('INBOX')
  try {
   let uids: number[] | false | undefined
   try {
    uids = await client.search({ since }, { uid: true })
   } catch (err) {
    stats.errors.push(
     formatScanError(
      err,
      `IMAP SEARCH INBOX since ${since.toISOString()} (${lookbackHours}h lookback)`,
     ),
    )
    return stats
   }

   if (!uids || uids.length === 0) {
    return stats
   }

   for await (const message of client.fetch(uids, {
    uid: true,
    envelope: true,
    source: true,
   })) {
    stats.messagesSeen += 1
    try {
     const subject = message.envelope?.subject ?? '(no subject)'
     const messageId =
      message.envelope?.messageId ?? `uid-${message.uid}@${config.host}`

     const { data: existing } = await supabase
      .from('sources')
      .select('id')
      .eq('user_id', userId)
      .eq('external_id', messageId)
      .maybeSingle()

     if (existing) {
      stats.skipped += 1
      continue
     }

     if (!message.source) {
      stats.skipped += 1
      continue
     }

     const parsed = await simpleParser(message.source)
     const htmlText =
      typeof parsed.html === 'string'
       ? parsed.html.replace(/<[^>]+>/g, ' ')
       : ''
     const body = [parsed.text, htmlText].filter(Boolean).join('\n').trim()

     if (!body) {
      stats.skipped += 1
      continue
     }

     if (
      !SUBJECT_HINT.test(subject) &&
      !SUBJECT_HINT.test(body.slice(0, 2000))
     ) {
      stats.skipped += 1
      continue
     }

     const contentHash = createHash('sha256')
      .update(messageId + body.slice(0, 5000))
      .digest('hex')

     const extraction = await extractItinerary(
      `Subject: ${subject}\nFrom: ${parsed.from?.text ?? ''}\n\n${body}`,
      { label: `email:${subject}` },
     )

     if (extraction.events.length === 0 && !extraction.trip) {
      stats.skipped += 1
      continue
     }

     const result = await upsertExtraction(supabase, {
      userId,
      kind: 'email',
      externalId: messageId,
      contentHash,
      pathOrSubject: subject,
      textSnippet: body,
      metadata: {
       from: parsed.from?.text ?? null,
       date: parsed.date?.toISOString() ?? null,
      },
      extraction,
     })

     stats.messagesProcessed += 1
     stats.eventsCreated += result.eventCount
    } catch (err) {
     stats.errors.push(formatScanError(err, `message uid ${message.uid}`))
    }
   }
  } finally {
   lock.release()
  }
 } catch (err) {
  stats.errors.push(formatScanError(err, 'IMAP inbox'))
 } finally {
  try {
   await client.logout()
  } catch {
   // ignore
  }
 }

 return stats
}

export function isImapConfigured() {
 return Boolean(getImapConfig())
}
