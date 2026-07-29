import { config as loadEnv } from 'dotenv'
import path from 'node:path'
import { runScan } from '../src/lib/scan/run-scan'

loadEnv({ path: path.resolve(process.cwd(), '.env.local') })
loadEnv({ path: path.resolve(process.cwd(), '.env') })

async function main() {
 const userId = process.env.SCAN_USER_ID
 if (!userId) {
  console.error(
   'SCAN_USER_ID is required. Sign in to the dashboard once, copy your user id from Settings, and set it in .env.local',
  )
  process.exit(1)
 }

 try {
  await runScan({
   userId,
   includeFolders: true,
   log: (message) => console.log(message),
  })
  console.log('Scan complete.')
 } catch (err) {
  const message = err instanceof Error ? err.message : String(err)
  console.error('Scan failed:', message)
  process.exit(1)
 }
}

main()
