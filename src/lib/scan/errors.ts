function describeUnknown(err: unknown): string {
 if (err instanceof Error) {
  const parts = [err.message]
  if (err.cause instanceof Error) {
   parts.push(`cause: ${err.cause.message}`)
  } else if (err.cause) {
   parts.push(`cause: ${describeUnknown(err.cause)}`)
  }
  return parts.join(' | ')
 }

 if (err && typeof err === 'object') {
  const record = err as Record<string, unknown>
  // PostgREST / Supabase errors are plain objects: { message, code, details, hint }
  const message = typeof record.message === 'string' ? record.message : null
  if (message) {
   const extras = [record.code, record.details, record.hint]
    .filter((v): v is string => typeof v === 'string' && v.length > 0)
    .join(' | ')
   return extras ? `${message} | ${extras}` : message
  }
  try {
   return JSON.stringify(err)
  } catch {
   return Object.prototype.toString.call(err)
  }
 }

 return String(err)
}

export function formatScanError(err: unknown, stage: string): string {
 return `${stage}: ${describeUnknown(err)}`
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
