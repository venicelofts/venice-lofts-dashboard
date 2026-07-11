import { z } from 'zod'

export const eventCategorySchema = z.enum([
 'flight',
 'hotel',
 'meeting',
 'deadline',
 'travel',
 'other',
])

export const extractedEventSchema = z.object({
 title: z.string().min(1),
 starts_at: z.string().nullable().optional(),
 ends_at: z.string().nullable().optional(),
 location: z.string().nullable().optional(),
 category: eventCategorySchema.default('other'),
 confidence: z.number().min(0).max(1).default(0.5),
 excerpt: z.string().nullable().optional(),
 trip_title: z.string().nullable().optional(),
})

export const extractionResultSchema = z.object({
 events: z.array(extractedEventSchema).default([]),
 trip: z
  .object({
   title: z.string().min(1),
   starts_on: z.string().nullable().optional(),
   ends_on: z.string().nullable().optional(),
  })
  .nullable()
  .optional(),
})

export type ExtractionResult = z.infer<typeof extractionResultSchema>
export type ExtractedEvent = z.infer<typeof extractedEventSchema>
