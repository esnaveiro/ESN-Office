import {supabase} from './supabase'
import {Database} from './database.types'

type Volunteer = Database['public']['Tables']['volunteers']['Row']
// type VolunteerInsert = Database['public']['Tables']['volunteers']['Insert']
// type VolunteerUpdate = Database['public']['Tables']['volunteers']['Update']
type Schedule = Database['public']['Tables']['schedules']['Row']
type ScheduleInsert = Database['public']['Tables']['schedules']['Insert']
// type PresenceLog = Database['public']['Tables']['presence_logs']['Row']
// type PresenceLogInsert = Database['public']['Tables']['presence_logs']['Insert']

// Volunteer management functions
export async function getVolunteers(): Promise<Volunteer[]> {
    const {data, error} = await supabase
        .from('volunteers')
        .select('*')
        .order('name')

    if (error) throw error
    return data || []
}

export async function getVolunteer(id: string): Promise<Volunteer | null> {
    const {data, error} = await supabase
        .from('volunteers')
        .select('*')
        .eq('id', id)
        .single()

    if (error) throw error
    return data
}

export async function updateVolunteerStatus(
    id: string,
    status: 'available' | 'dnd' | 'break' | 'remote'
): Promise<Volunteer> {
    const {data, error} = await supabase
        .from('volunteers')
        .update({
            status,
            last_seen: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

    if (error) throw error
    return data
}

export async function checkInVolunteer(id: string): Promise<void> {
    // Update volunteer status
    await supabase
        .from('volunteers')
        .update({
            is_in_office: true,
            last_seen: new Date().toISOString(),
            status: 'available'
        })
        .eq('id', id)

    // Log the check-in
    await supabase
        .from('presence_logs')
        .insert({
            volunteer_id: id,
            action: 'check_in'
        })
}

export async function checkOutVolunteer(id: string): Promise<void> {
    // Update volunteer status
    await supabase
        .from('volunteers')
        .update({
            is_in_office: false,
            last_seen: new Date().toISOString()
        })
        .eq('id', id)

    // Log the check-out
    await supabase
        .from('presence_logs')
        .insert({
            volunteer_id: id,
            action: 'check_out'
        })
}

// Schedule management functions
export async function getSchedules(date?: string): Promise<(Schedule & { volunteer: Volunteer })[]> {
    let query = supabase
        .from('schedules')
        .select(`
      *,
      volunteer:volunteers(*)
    `)
        .order('start_time')

    if (date) {
        query = query.eq('date', date)
    }

    const {data, error} = await query

    if (error) throw error
    return data || []
}

export async function createSchedule(schedule: ScheduleInsert): Promise<Schedule> {
    const {data, error} = await supabase
        .from('schedules')
        .insert(schedule)
        .select()
        .single()

    if (error) throw error
    return data
}

export async function updateSchedule(
    id: string,
    updates: Partial<ScheduleInsert>
): Promise<Schedule> {
    const {data, error} = await supabase
        .from('schedules')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

    if (error) throw error
    return data
}

export async function deleteSchedule(id: string): Promise<void> {
    const {error} = await supabase
        .from('schedules')
        .delete()
        .eq('id', id)

    if (error) throw error
}

// Presence and timeline functions
export async function getVolunteersInOffice(): Promise<Volunteer[]> {
    const {data, error} = await supabase
        .from('volunteers')
        .select('*')
        .eq('is_in_office', true)
        .order('name')

    if (error) throw error
    return data || []
}

export async function getSchedulesForTimeRange(
    date: string,
    startTime: string,
    endTime: string
): Promise<(Schedule & { volunteer: Volunteer })[]> {
    const {data, error} = await supabase
        .from('schedules')
        .select(`
      *,
      volunteer:volunteers(*)
    `)
        .eq('date', date)
        .lte('start_time', endTime)
        .gte('end_time', startTime)

    if (error) throw error
    return data || []
}