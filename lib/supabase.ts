import { createPagesServerClient, createPagesBrowserClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/types/supabase"

export const createServerSupabaseClient = () => createPagesServerClient<Database>()
export const createClientSupabaseClient = () => createPagesBrowserClient<Database>()

