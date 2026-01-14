import {NextRequest, NextResponse} from 'next/server'
import {supabaseServer} from '@/lib/supabase-server'
import {Resend} from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const EMAIL_FROM = process.env.EMAIL_FROM || 'ESN Office <onboarding@resend.dev>'

// GET /api/admin/reservations - Get all pending reservations
export async function GET() {
  try {
    const { data: pendingReservations, error } = await supabaseServer
      .from('office_reservations')
      .select('*')
      .eq('status', 'pending')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching pending reservations:', error)
      return NextResponse.json(
        { error: 'Failed to fetch pending reservations' },
        { status: 500 }
      )
    }

    return NextResponse.json({ reservations: pendingReservations || [] })
  } catch (error) {
    console.error('Error in GET admin reservations API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/reservations?id=xxx&action=cancel
// Cancel a reservation with a reason
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const reservationId = searchParams.get('id')
    const action = searchParams.get('action')
    const body = await request.json()
    const {cancellation_reason, send_notification} = body

    if (!reservationId || !action) {
      return NextResponse.json(
        { error: 'Reservation ID and action are required' },
        { status: 400 }
      )
    }

    if (action !== 'cancel') {
      return NextResponse.json(
          {error: 'Action must be "cancel"'},
        { status: 400 }
      )
    }

    // Get the reservation details before updating
    const { data: reservation, error: fetchError } = await supabaseServer
      .from('office_reservations')
      .select('*')
      .eq('id', reservationId)
      .single()

    if (fetchError || !reservation) {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      )
    }

    // Mark reservation as inactive (cancelled)
    const { error: updateError } = await supabaseServer
      .from('office_reservations')
      .update({
        is_active: false,
        status: 'rejected',
        updated_at: new Date().toISOString()
      })
      .eq('id', reservationId)

    if (updateError) {
      console.error('Error cancelling reservation:', updateError)
      return NextResponse.json(
          {error: 'Failed to cancel reservation'},
        { status: 500 }
      )
    }

    // Send cancellation notification
    if (send_notification) {
      try {
        const startFormatted = new Date(reservation.start_time).toLocaleString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        })
        const endFormatted = new Date(reservation.end_time).toLocaleString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        })

        // Note: Email to the person who made the reservation is now handled
        // in the "assigned volunteers" section below (they're included in the list)

        // Send notification to assigned volunteers only
        const volunteerIdsToNotify = [
          reservation.reserved_by_id,
          ...(reservation.additional_volunteers || [])
        ].filter(Boolean)

        if (volunteerIdsToNotify.length > 0) {
          const {data: volunteers} = await supabaseServer
              .from('volunteers')
              .select('id, name, email')
              .in('id', volunteerIdsToNotify)

          if (volunteers && volunteers.length > 0) {
            // Get additional volunteer names for display
            let additionalVolunteersText = ''
            if (reservation.additional_volunteers && reservation.additional_volunteers.length > 0) {
              const additionalVolIds = reservation.additional_volunteers
              const additionalVolunteerNames = volunteers
                  .filter((v: { id: string; name: string }) => additionalVolIds.includes(v.id) && v.id !== reservation.reserved_by_id)
                  .map((v: { id: string; name: string }) => v.name)
              if (additionalVolunteerNames.length > 0) {
                additionalVolunteersText = `<li><strong>Additional volunteers:</strong> ${additionalVolunteerNames.join(', ')}</li>`
              }
            }

            const subject = `ESN Office Reservation Cancelled: ${startFormatted}`
            const htmlBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 0;">
              <h2 style="color: #ef4444;">ESN Office Reservation Cancelled</h2>
              <p>A reservation you were assigned to has been cancelled by the board:</p>
              <ul style="list-style: none; padding: 0;">
                <li><strong>Reserved by:</strong> ${reservation.reserved_by_name}</li>
                <li><strong>Start:</strong> ${startFormatted}</li>
                <li><strong>End:</strong> ${endFormatted}</li>
                ${reservation.reason ? `<li><strong>Reason:</strong> ${reservation.reason}</li>` : ''}
                ${additionalVolunteersText}
              </ul>
              ${cancellation_reason ? `
                <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px; margin: 20px 0;">
                  <p style="margin: 0; font-weight: bold; color: #991b1b;">Cancellation reason:</p>
                  <p style="margin: 8px 0 0 0; color: #7f1d1d;">${cancellation_reason}</p>
                </div>
              ` : ''}
              <p style="color: #666; font-size: 0.9em; margin-top: 20px;">
                This is an automated notification from the ESN Office Management System.
              </p>
            </div>
          `

            // Send to each assigned volunteer
            for (const volunteer of volunteers) {
              try {
                await resend.emails.send({
                  from: EMAIL_FROM,
                  to: [volunteer.email],
                  subject,
                  html: htmlBody,
                })
                console.log(`Cancellation email sent to: ${volunteer.email}`)
              } catch (error) {
                console.error(`Error sending email to ${volunteer.email}:`, error)
              }
            }
          }
        }

        // COMMENTED OUT: Send to all volunteers
        /*
        const { data: volunteers } = await supabaseServer
          .from('volunteers')
          .select('name, email')
          .order('name')
        // ... send to all volunteers
        */

      } catch (emailError) {
        console.error('Error sending notification emails:', emailError)
        // Don't fail the cancellation if email fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Reservation cancelled successfully'
    })
  } catch (error) {
    console.error('Error in PATCH admin reservations API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
