import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { requireSession, isNextResponse } from '@/lib/api-auth'
import { sendReservationEmails } from '@/lib/email-templates'

async function fetchVolunteerRecipients(ids: string[]) {
  if (ids.length === 0) return []
  const { data } = await supabaseServer
    .from('volunteers')
    .select('id, name, email')
    .in('id', ids)
  return data || []
}

function checkTimeRange(start_time: string, end_time: string) {
  const startDate = new Date(start_time)
  const endDate = new Date(end_time)
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return 'Invalid date format'
  }
  if (endDate <= startDate) {
    return 'End time must be after start time'
  }
  return null
}

async function checkConflicts(start_time: string, end_time: string, excludeId?: string) {
  let query = supabaseServer
    .from('office_reservations')
    .select('id, start_time, end_time, reserved_by_name')
    .eq('is_active', true)
    .lte('start_time', end_time)
    .gte('end_time', start_time)

  if (excludeId) {
    query = query.neq('id', excludeId)
  }

  return query
}

export async function POST(request: NextRequest) {
  const auth = await requireSession()
  if (isNextResponse(auth)) return auth

  try {
    const body = await request.json()
    const { reserved_by_id, reserved_by_name, start_time, end_time, reason, send_email_notification, additional_volunteers } = body

    if (!reserved_by_name || !start_time || !end_time) {
      return NextResponse.json(
        { error: 'Missing required fields: reserved_by_name, start_time, end_time' },
        { status: 400 }
      )
    }

    const timeError = checkTimeRange(start_time, end_time)
    if (timeError) {
      return NextResponse.json({ error: timeError }, { status: 400 })
    }

    const { data: conflicts, error: conflictError } = await checkConflicts(start_time, end_time)
    if (conflictError) {
      return NextResponse.json({ error: 'Failed to check for conflicts' }, { status: 500 })
    }
    if (conflicts && conflicts.length > 0) {
      return NextResponse.json(
        { error: 'Time slot already reserved', conflicts: conflicts.map(c => ({ reserved_by: c.reserved_by_name, start: c.start_time, end: c.end_time })) },
        { status: 409 }
      )
    }

    const { data: reservation, error: insertError } = await supabaseServer
      .from('office_reservations')
      .insert([{
        reserved_by_id: reserved_by_id || auth.sub,
        reserved_by_name,
        start_time,
        end_time,
        reason: reason || null,
        send_email_notification: send_email_notification || false,
        additional_volunteers: additional_volunteers || null,
        is_active: true,
        status: 'approved',
      }])
      .select()
      .single()

    if (insertError) {
      console.error('Error creating reservation:', insertError)
      return NextResponse.json({ error: 'Failed to create reservation' }, { status: 500 })
    }

    if (send_email_notification) {
      const ids = [reserved_by_id || auth.sub, ...(additional_volunteers || [])].filter(Boolean)
      const volunteers = await fetchVolunteerRecipients(ids)
      const additionalNames = volunteers
        .filter(v => (additional_volunteers || []).includes(v.id) && v.id !== (reserved_by_id || auth.sub))
        .map(v => v.name)

      await sendReservationEmails('created', volunteers, {
        reservedByName: reserved_by_name,
        startTime: start_time,
        endTime: end_time,
        reason,
        additionalVolunteerNames: additionalNames,
      })
    }

    return NextResponse.json({ success: true, reservation }, { status: 201 })
  } catch (error) {
    console.error('Error in POST office reservation API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireSession()
  if (isNextResponse(auth)) return auth

  try {
    const { searchParams } = new URL(request.url)
    const reservationId = searchParams.get('id')

    if (!reservationId) {
      return NextResponse.json({ error: 'Reservation ID is required' }, { status: 400 })
    }

    const body = await request.json()
    const { start_time, end_time, reason, send_email_notification, additional_volunteers } = body

    if (!start_time || !end_time) {
      return NextResponse.json({ error: 'Missing required fields: start_time, end_time' }, { status: 400 })
    }

    const timeError = checkTimeRange(start_time, end_time)
    if (timeError) {
      return NextResponse.json({ error: timeError }, { status: 400 })
    }

    const { data: conflicts, error: conflictError } = await checkConflicts(start_time, end_time, reservationId)
    if (conflictError) {
      return NextResponse.json({ error: 'Failed to check for conflicts' }, { status: 500 })
    }
    if (conflicts && conflicts.length > 0) {
      return NextResponse.json(
        { error: 'Time slot already reserved', conflicts: conflicts.map(c => ({ reserved_by: c.reserved_by_name, start: c.start_time, end: c.end_time })) },
        { status: 409 }
      )
    }

    const { data: reservation, error: updateError } = await supabaseServer
      .from('office_reservations')
      .update({
        start_time,
        end_time,
        reason: reason || null,
        send_email_notification: send_email_notification || false,
        additional_volunteers: additional_volunteers || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reservationId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating reservation:', updateError)
      return NextResponse.json({ error: 'Failed to update reservation' }, { status: 500 })
    }

    if (send_email_notification) {
      const { data: resData } = await supabaseServer
        .from('office_reservations')
        .select('reserved_by_id, reserved_by_name')
        .eq('id', reservationId)
        .single()

      if (resData) {
        const ids = [resData.reserved_by_id, ...(additional_volunteers || [])].filter(Boolean)
        const volunteers = await fetchVolunteerRecipients(ids)
        const additionalNames = volunteers
          .filter(v => (additional_volunteers || []).includes(v.id) && v.id !== resData.reserved_by_id)
          .map(v => v.name)

        await sendReservationEmails('updated', volunteers, {
          reservedByName: resData.reserved_by_name,
          startTime: start_time,
          endTime: end_time,
          reason,
          additionalVolunteerNames: additionalNames,
        })
      }
    }

    return NextResponse.json({ success: true, reservation })
  } catch (error) {
    console.error('Error in PUT office reservation API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(_request: NextRequest) {
  const auth = await requireSession()
  if (isNextResponse(auth)) return auth

  try {
    const now = new Date().toISOString()

    const { data: current, error: currentError } = await supabaseServer
      .rpc('get_current_reservation')
    if (currentError) {
      console.error('Error getting current reservation:', currentError)
    }

    const weekFromNow = new Date()
    weekFromNow.setDate(weekFromNow.getDate() + 7)

    const { data: upcoming, error: upcomingError } = await supabaseServer
      .from('office_reservations')
      .select('*')
      .eq('is_active', true)
      .eq('status', 'approved')
      .gte('start_time', now)
      .lte('start_time', weekFromNow.toISOString())
      .order('start_time', { ascending: true })
    if (upcomingError) {
      console.error('Error getting upcoming reservations:', upcomingError)
    }

    const { data: all, error: allError } = await supabaseServer
      .from('office_reservations')
      .select('*')
      .eq('is_active', true)
      .eq('status', 'approved')
      .gte('end_time', now)
      .order('start_time', { ascending: true })
    if (allError) {
      console.error('Error getting all reservations:', allError)
    }

    return NextResponse.json({
      current: current && current.length > 0 ? current[0] : null,
      upcoming: upcoming || [],
      reservations: all || [],
      is_office_reserved: current && current.length > 0,
    })
  } catch (error) {
    console.error('Error in GET office reservation API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireSession()
  if (isNextResponse(auth)) return auth

  try {
    const { searchParams } = new URL(request.url)
    const reservationId = searchParams.get('id')
    const sendEmailNotification = searchParams.get('send_email_notification') === 'true'

    if (!reservationId) {
      return NextResponse.json({ error: 'Reservation ID is required' }, { status: 400 })
    }

    const { data: reservation, error: fetchError } = await supabaseServer
      .from('office_reservations')
      .select('*')
      .eq('id', reservationId)
      .single()

    if (fetchError) {
      return NextResponse.json({ error: 'Failed to fetch reservation' }, { status: 500 })
    }

    const { error } = await supabaseServer
      .from('office_reservations')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', reservationId)

    if (error) {
      console.error('Error cancelling reservation:', error)
      return NextResponse.json({ error: 'Failed to cancel reservation' }, { status: 500 })
    }

    if (sendEmailNotification && reservation) {
      const ids = [reservation.reserved_by_id, ...(reservation.additional_volunteers || [])].filter(Boolean)
      const volunteers = await fetchVolunteerRecipients(ids)
      const additionalNames = volunteers
        .filter(v => (reservation.additional_volunteers || []).includes(v.id) && v.id !== reservation.reserved_by_id)
        .map(v => v.name)

      await sendReservationEmails('cancelled', volunteers, {
        reservedByName: reservation.reserved_by_name,
        startTime: reservation.start_time,
        endTime: reservation.end_time,
        reason: reservation.reason,
        additionalVolunteerNames: additionalNames,
      })
    }

    return NextResponse.json({ success: true, message: 'Reservation cancelled successfully' })
  } catch (error) {
    console.error('Error in DELETE office reservation API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
