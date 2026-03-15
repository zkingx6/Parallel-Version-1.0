import "server-only"
/**
 * Server Supabase client for Server Components, Server Actions, and Route Handlers.
 * Uses cookies() from next/headers for session management.
 *
 * IMPORTANT: Use this in server code only. For client components, use createClient from @/lib/supabase.
 */
export {
  createServerSupabase,
  createServiceSupabase,
} from "@/lib/supabase-server"
