type TokenResponse = {
 access_token?: string
 expires_in?: number
 error?: string
 error_description?: string
}

type CachedToken = {
 accessToken: string
 expiresAt: number
}

let cached: CachedToken | null = null

export type GraphAzureConfig = {
 tenantId: string
 clientId: string
 clientSecret: string
}

export function getGraphAzureConfig(): GraphAzureConfig | null {
 const tenantId = process.env.AZURE_TENANT_ID?.trim()
 const clientId = process.env.AZURE_CLIENT_ID?.trim()
 const clientSecret = process.env.AZURE_CLIENT_SECRET?.trim()
 if (!tenantId || !clientId || !clientSecret) return null
 return { tenantId, clientId, clientSecret }
}

export async function getGraphAccessToken(
 config?: GraphAzureConfig,
): Promise<string> {
 const resolved = config ?? getGraphAzureConfig()
 if (!resolved) {
  throw new Error(
   'Missing AZURE_TENANT_ID, AZURE_CLIENT_ID, or AZURE_CLIENT_SECRET',
  )
 }

 const now = Date.now()
 if (cached && cached.expiresAt > now + 60_000) {
  return cached.accessToken
 }

 const url = `https://login.microsoftonline.com/${encodeURIComponent(resolved.tenantId)}/oauth2/v2.0/token`
 const body = new URLSearchParams({
  client_id: resolved.clientId,
  client_secret: resolved.clientSecret,
  scope: 'https://graph.microsoft.com/.default',
  grant_type: 'client_credentials',
 })

 const res = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body,
 })

 const json = (await res.json()) as TokenResponse

 if (!res.ok || !json.access_token) {
  const detail = json.error_description ?? json.error ?? `HTTP ${res.status}`
  throw new Error(`Graph token request failed: ${detail}`)
 }

 const expiresIn = json.expires_in ?? 3600
 cached = {
  accessToken: json.access_token,
  expiresAt: now + expiresIn * 1000,
 }

 return json.access_token
}
