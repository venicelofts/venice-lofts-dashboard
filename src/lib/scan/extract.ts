import Anthropic from '@anthropic-ai/sdk'
import {
 extractionResultSchema,
 type ExtractionResult,
} from '@/lib/scan/schema'

const SYSTEM = `You extract structured itinerary and schedule items from emails and PDF text.
Return ONLY valid JSON matching this shape:
{
  "events": [{
    "title": string,
    "starts_at": string | null (ISO 8601),
    "ends_at": string | null (ISO 8601),
    "location": string | null,
    "category": "flight"|"hotel"|"meeting"|"deadline"|"travel"|"other",
    "confidence": number 0-1,
    "excerpt": string | null,
    "trip_title": string | null
  }],
  "trip": { "title": string, "starts_on": string | null (YYYY-MM-DD), "ends_on": string | null } | null
}
Rules:
- Prefer calendar-relevant facts: flights, hotels, meetings, deadlines, travel legs.
- If nothing schedule-related exists, return {"events":[],"trip":null}.
- confidence < 0.6 when dates/times are ambiguous.
- Keep excerpts short (<= 240 chars).`

export async function extractItinerary(
 text: string,
 meta: { label: string },
): Promise<ExtractionResult> {
 const apiKey = process.env.ANTHROPIC_API_KEY
 if (!apiKey) {
  throw new Error('ANTHROPIC_API_KEY is not set')
 }

 const client = new Anthropic({ apiKey })
 const clipped = text.slice(0, 80_000)

 const response = await client.messages.create({
  model: 'claude-sonnet-4-5',
  max_tokens: 4096,
  system: SYSTEM,
  messages: [
   {
    role: 'user',
    content: `Source: ${meta.label}\n\n---\n${clipped}`,
   },
  ],
 })

 const block = response.content.find((c) => c.type === 'text')
 if (!block || block.type !== 'text') {
  return { events: [], trip: null }
 }

 const raw = block.text.trim()
 const jsonMatch = raw.match(/\{[\s\S]*\}/)
 if (!jsonMatch) {
  return { events: [], trip: null }
 }

 const parsed = JSON.parse(jsonMatch[0]) as unknown
 return extractionResultSchema.parse(parsed)
}
