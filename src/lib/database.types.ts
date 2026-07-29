export type EventCategory =
 | 'flight'
 | 'hotel'
 | 'meeting'
 | 'deadline'
 | 'travel'
 | 'other'

export type SourceKind = 'email' | 'file' | 'calendar'

export type Profile = {
 id: string
 email: string | null
 created_at: string
}

export type Trip = {
 id: string
 user_id: string
 title: string
 starts_on: string | null
 ends_on: string | null
 created_at: string
 updated_at: string
}

export type Source = {
 id: string
 user_id: string
 kind: SourceKind
 external_id: string | null
 content_hash: string | null
 path_or_subject: string | null
 last_scanned_at: string
 created_at: string
}

export type Document = {
 id: string
 user_id: string
 source_id: string
 text_snippet: string | null
 metadata: Record<string, unknown>
 created_at: string
}

export type ItineraryEvent = {
 id: string
 user_id: string
 source_id: string | null
 trip_id: string | null
 title: string
 starts_at: string | null
 ends_at: string | null
 location: string | null
 category: EventCategory
 confidence: number
 excerpt: string | null
 needs_review: boolean
 cleared_at: string | null
 created_at: string
 updated_at: string
}

export type ScanRun = {
 id: string
 user_id: string
 started_at: string
 finished_at: string | null
 stats: Record<string, unknown>
 error: string | null
}

export type Database = {
 public: {
  Tables: {
   profiles: {
    Row: Profile
    Insert: {
     id: string
     email?: string | null
     created_at?: string
    }
    Update: {
     id?: string
     email?: string | null
     created_at?: string
    }
    Relationships: []
   }
   trips: {
    Row: Trip
    Insert: {
     id?: string
     user_id: string
     title: string
     starts_on?: string | null
     ends_on?: string | null
     created_at?: string
     updated_at?: string
    }
    Update: {
     id?: string
     user_id?: string
     title?: string
     starts_on?: string | null
     ends_on?: string | null
     created_at?: string
     updated_at?: string
    }
    Relationships: []
   }
   sources: {
    Row: Source
    Insert: {
     id?: string
     user_id: string
     kind: SourceKind
     external_id?: string | null
     content_hash?: string | null
     path_or_subject?: string | null
     last_scanned_at?: string
     created_at?: string
    }
    Update: {
     id?: string
     user_id?: string
     kind?: SourceKind
     external_id?: string | null
     content_hash?: string | null
     path_or_subject?: string | null
     last_scanned_at?: string
     created_at?: string
    }
    Relationships: []
   }
   documents: {
    Row: Document
    Insert: {
     id?: string
     user_id: string
     source_id: string
     text_snippet?: string | null
     metadata?: Record<string, unknown>
     created_at?: string
    }
    Update: {
     id?: string
     user_id?: string
     source_id?: string
     text_snippet?: string | null
     metadata?: Record<string, unknown>
     created_at?: string
    }
    Relationships: []
   }
   events: {
    Row: ItineraryEvent
    Insert: {
     id?: string
     user_id: string
     source_id?: string | null
     trip_id?: string | null
     title: string
     starts_at?: string | null
     ends_at?: string | null
     location?: string | null
     category?: EventCategory
     confidence?: number
     excerpt?: string | null
     needs_review?: boolean
     cleared_at?: string | null
     created_at?: string
     updated_at?: string
    }
    Update: {
     id?: string
     user_id?: string
     source_id?: string | null
     trip_id?: string | null
     title?: string
     starts_at?: string | null
     ends_at?: string | null
     location?: string | null
     category?: EventCategory
     confidence?: number
     excerpt?: string | null
     needs_review?: boolean
     cleared_at?: string | null
     created_at?: string
     updated_at?: string
    }
    Relationships: []
   }
   scan_runs: {
    Row: ScanRun
    Insert: {
     id?: string
     user_id: string
     started_at?: string
     finished_at?: string | null
     stats?: Record<string, unknown>
     error?: string | null
    }
    Update: {
     id?: string
     user_id?: string
     started_at?: string
     finished_at?: string | null
     stats?: Record<string, unknown>
     error?: string | null
    }
    Relationships: []
   }
  }
  Views: Record<string, never>
  Functions: Record<string, never>
  Enums: Record<string, never>
  CompositeTypes: Record<string, never>
 }
}
