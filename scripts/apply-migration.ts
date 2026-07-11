/**
 * Applies supabase/migrations/*.sql using the database connection string.
 *
 * Set DATABASE_URL in .env.local (Settings → Database → Connection string URI),
 * then run: pnpm db:migrate
 *
 * Or paste supabase/migrations/20260711143000_itinerary_schema.sql into the
 * Supabase SQL Editor and run it once.
 */
import { config as loadEnv } from 'dotenv'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { Client } from 'pg'

loadEnv({ path: path.resolve(process.cwd(), '.env.local') })
loadEnv({ path: path.resolve(process.cwd(), '.env') })

async function main() {
 const databaseUrl = process.env.DATABASE_URL
 if (!databaseUrl) {
  console.error(
   'DATABASE_URL is not set.\n' +
    '1) Open Supabase → Project Settings → Database → Connection string (URI)\n' +
    '2) Add DATABASE_URL=postgresql://... to .env.local\n' +
    '3) Re-run: pnpm db:migrate\n\n' +
    'Or run the SQL file manually in the SQL Editor:\n' +
    'https://supabase.com/dashboard/project/qdsltkyziufnwvtsvahc/sql/new',
  )
  process.exit(1)
 }

 const migrationsDir = path.resolve(process.cwd(), 'supabase/migrations')
 const files = (await fs.readdir(migrationsDir))
  .filter((f) => f.endsWith('.sql'))
  .sort()

 const client = new Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
 })
 await client.connect()

 try {
  for (const file of files) {
   const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8')
   console.log(`Applying ${file}…`)
   await client.query(sql)
   console.log(`OK ${file}`)
  }
 } finally {
  await client.end()
 }
}

main().catch((err) => {
 console.error(err)
 process.exit(1)
})
