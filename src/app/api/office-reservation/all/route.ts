import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

// GET /api/office-reservation/all - Get all reservations (pending, approved, rejected)
export async function GET() {
  try {
    const { data: reservations, error } = await supabaseServer
      .from('office_reservations')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching all reservations:', error)
      return NextResponse.json(
        { error: 'Failed to fetch reservations' },
        { status: 500 }
      )
    }

    // Fetch volunteer details for additional_volunteers
    const enrichedReservations = await Promise.all(
      (reservations || []).map(async (reservation) => {
        if (reservation.additional_volunteers && reservation.additional_volunteers.length > 0) {
          const { data: volunteers, error: volunteersError } = await supabaseServer
            .from('volunteers')
            .select('id, name')
            .in('id', reservation.additional_volunteers)

          if (!volunteersError && volunteers) {
            return {
              ...reservation,
              additional_volunteers_details: volunteers.map(v => ({
                id: v.id,
                name: v.name
              }))
            }
          }
        }
        return {
          ...reservation,
          additional_volunteers_details: []
        }
      })
    )

    return NextResponse.json({ reservations: enrichedReservations })
  } catch (error) {
    console.error('Error in GET all reservations API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
