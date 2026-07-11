import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { PDFParse } from 'pdf-parse'
import { extractItinerary } from '@/lib/scan/extract'
import { createServiceClient, upsertExtraction } from '@/lib/scan/persist'

const TRAVEL_HINT =
 /flight|hotel|itinerary|reservation|booking|confirmation|check-?in|boarding|trip|travel|invoice|receipt|meeting|calendar|agenda/i

export type FolderScanStats = {
 filesSeen: number
 filesProcessed: number
 eventsCreated: number
 skipped: number
 errors: string[]
}

async function listPdfs(root: string): Promise<string[]> {
 const out: string[] = []
 async function walk(dir: string) {
  let entries
  try {
   entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
   return
  }
  for (const entry of entries) {
   const full = path.join(dir, entry.name)
   if (entry.isDirectory()) {
    if (entry.name.startsWith('.')) continue
    await walk(full)
   } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.pdf')) {
    out.push(full)
   }
  }
 }
 await walk(root)
 return out
}

export async function scanFolders(
 userId: string,
 folders: string[],
): Promise<FolderScanStats> {
 const supabase = createServiceClient()
 const stats: FolderScanStats = {
  filesSeen: 0,
  filesProcessed: 0,
  eventsCreated: 0,
  skipped: 0,
  errors: [],
 }

 for (const folder of folders) {
  const files = await listPdfs(folder)
  for (const filePath of files) {
   stats.filesSeen += 1
   try {
    const buf = await fs.readFile(filePath)
    const contentHash = createHash('sha256').update(buf).digest('hex')

    const { data: existing } = await supabase
     .from('sources')
     .select('id')
     .eq('user_id', userId)
     .eq('content_hash', contentHash)
     .maybeSingle()

    if (existing) {
     stats.skipped += 1
     continue
    }

    const parser = new PDFParse({ data: buf })
    const parsed = await parser.getText()
    await parser.destroy()
    const text = parsed.text?.trim() ?? ''

    if (!text || (!TRAVEL_HINT.test(text) && !TRAVEL_HINT.test(filePath))) {
     stats.skipped += 1
     continue
    }

    const extraction = await extractItinerary(text, { label: filePath })
    if (extraction.events.length === 0 && !extraction.trip) {
     stats.skipped += 1
     continue
    }

    const result = await upsertExtraction(supabase, {
     userId,
     kind: 'file',
     contentHash,
     pathOrSubject: filePath,
     textSnippet: text,
     metadata: { fileName: path.basename(filePath) },
     extraction,
    })

    stats.filesProcessed += 1
    stats.eventsCreated += result.eventCount
   } catch (err) {
    stats.errors.push(
     `${filePath}: ${err instanceof Error ? err.message : String(err)}`,
    )
   }
  }
 }

 return stats
}
