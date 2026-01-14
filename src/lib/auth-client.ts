import {createBrowserClient} from '@supabase/ssr'
import {Database} from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabaseClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)

export async function signUp(email: string, password: string, name: string) {
  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: name
      }
    }
  })

  if (error) throw error

  // Create volunteer record
  if (data.user) {
    const { error: volunteerError } = await supabaseClient
      .from('volunteers')
      .insert({
        id: data.user.id,
        name: name,
        email: email,
        status: 'available',
        is_in_office: false
      })

    if (volunteerError) {
      console.error('Error creating volunteer record:', volunteerError)
    }
  }

  return data
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  })

  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabaseClient.auth.signOut()
  if (error) throw error
}

export async function getCurrentUser() {
  const { data: { user }, error } = await supabaseClient.auth.getUser()
  if (error) throw error
  return user
}

export async function getCurrentVolunteer() {
  const user = await getCurrentUser()
  if (!user) return null

  const { data: volunteer, error } = await supabaseClient
    .from('volunteers')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) {
    console.error('Error fetching volunteer:', error)
    return null
  }

  return volunteer
}