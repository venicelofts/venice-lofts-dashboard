import { getGraphAccessToken } from '@/lib/graph/auth'

export type GraphMailMessage = {
 internetMessageId: string
 subject: string
 from: string | null
 receivedAt: string | null
 bodyText: string
}

type GraphRecipient = {
 emailAddress?: { name?: string; address?: string }
}

type GraphMessage = {
 id?: string
 subject?: string
 internetMessageId?: string
 receivedDateTime?: string
 from?: GraphRecipient
 body?: { contentType?: string; content?: string }
}

type GraphListResponse = {
 value?: GraphMessage[]
 '@odata.nextLink'?: string
 error?: { code?: string; message?: string }
}

function stripHtml(html: string): string {
 return html
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&#39;/gi, "'")
  .replace(/&quot;/gi, '"')
  .replace(/\s+/g, ' ')
  .trim()
}

function formatFrom(from: GraphRecipient | undefined): string | null {
 if (!from?.emailAddress) return null
 const { name, address } = from.emailAddress
 if (name && address) return `${name} <${address}>`
 return name ?? address ?? null
}

function bodyToText(body: GraphMessage['body']): string {
 if (!body?.content) return ''
 if ((body.contentType ?? '').toLowerCase() === 'html') {
  return stripHtml(body.content)
 }
 return body.content.trim()
}

function normalizeMessage(
 msg: GraphMessage,
 mailbox: string,
): GraphMailMessage | null {
 const bodyText = bodyToText(msg.body)
 if (!bodyText) return null

 const internetMessageId =
  msg.internetMessageId?.trim() ||
  (msg.id ? `graph-${msg.id}@${mailbox}` : null)
 if (!internetMessageId) return null

 return {
  internetMessageId,
  subject: msg.subject?.trim() || '(no subject)',
  from: formatFrom(msg.from),
  receivedAt: msg.receivedDateTime ?? null,
  bodyText,
 }
}

async function graphGet(
 url: string,
 accessToken: string,
): Promise<GraphListResponse> {
 const res = await fetch(url, {
  headers: {
   Authorization: `Bearer ${accessToken}`,
   Accept: 'application/json',
   Prefer: 'outlook.body-content-type="text"',
  },
 })

 const json = (await res.json()) as GraphListResponse

 if (!res.ok) {
  const detail = json.error?.message ?? json.error?.code ?? `HTTP ${res.status}`
  throw new Error(`Graph mail request failed: ${detail}`)
 }

 return json
}

export async function listInboxMessages(options: {
 mailbox: string
 since: Date
}): Promise<GraphMailMessage[]> {
 const { mailbox, since } = options
 const accessToken = await getGraphAccessToken()

 // Graph date filters expect ISO-8601 without milliseconds quirks; use full ISO.
 const sinceIso = since.toISOString()
 const select = 'id,subject,from,receivedDateTime,internetMessageId,body'
 const filter = `receivedDateTime ge ${sinceIso}`

 let nextUrl: string | null =
  `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(mailbox)}/mailFolders/inbox/messages` +
  `?$filter=${encodeURIComponent(filter)}` +
  `&$select=${encodeURIComponent(select)}` +
  `&$orderby=${encodeURIComponent('receivedDateTime desc')}` +
  `&$top=50`

 const out: GraphMailMessage[] = []

 while (nextUrl) {
  const page = await graphGet(nextUrl, accessToken)
  for (const msg of page.value ?? []) {
   const normalized = normalizeMessage(msg, mailbox)
   if (normalized) out.push(normalized)
  }
  nextUrl = page['@odata.nextLink'] ?? null
 }

 return out
}
