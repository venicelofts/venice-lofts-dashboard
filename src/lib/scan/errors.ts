export function formatScanError(err: unknown, stage: string): string {
 if (!(err instanceof Error)) {
  return `${stage}: ${String(err)}`
 }

 const parts = [`${stage}: ${err.message}`]

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
