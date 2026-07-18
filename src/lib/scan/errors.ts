type ScanErrorLike = Error & {
 authenticationFailed?: boolean
 serverResponseCode?: string
 response?: string
 responseText?: string
 responseStatus?: string
 executedCommand?: string
 code?: string
}

export function formatScanError(err: unknown, stage: string): string {
 if (!(err instanceof Error)) {
  return `${stage}: ${String(err)}`
 }

 const imapErr = err as ScanErrorLike
 const parts = [`${stage}: ${err.message}`]

 if (imapErr.authenticationFailed) {
  parts.push('type: authentication failure')
 }
 if (imapErr.serverResponseCode) {
  parts.push(`server code: ${imapErr.serverResponseCode}`)
 }
 if (imapErr.responseText) {
  parts.push(`server message: ${imapErr.responseText}`)
 }
 if (imapErr.responseStatus) {
  parts.push(`status: ${imapErr.responseStatus}`)
 }
 if (imapErr.code) {
  parts.push(`code: ${imapErr.code}`)
 }
 if (imapErr.executedCommand) {
  parts.push(
   `command: ${imapErr.executedCommand.replace(/\bAUTHENTICATE\b.*/i, 'AUTHENTICATE [redacted]')}`,
  )
 }

 if (err.cause instanceof Error) {
  parts.push(`cause: ${err.cause.message}`)
 } else if (err.cause) {
  parts.push(`cause: ${String(err.cause)}`)
 }

 return parts.join(' | ')
}

export function logScanErrors(
 label: string,
 errors: string[] | undefined,
): void {
 if (!errors?.length) return
 console.error(`${label} errors:`)
 for (const error of errors) {
  console.error(`  - ${error}`)
 }
}
