import { createClient } from '@supabase/supabase-js'
import { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Server-side client - uses service role key if available (bypasses RLS)
// Falls back to anon key with RLS if service key is not configured
export const supabaseServer = createClient<Database>(
  supabaseUrl,
  supabaseServiceKey || supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Check if using service role
export const isUsingServiceRole = !!supabaseServiceKey

if (!isUsingServiceRole) {
  console.warn('SUPABASE_SERVICE_ROLE_KEY not set - using anon key. Some operations may fail due to RLS policies.')
}
