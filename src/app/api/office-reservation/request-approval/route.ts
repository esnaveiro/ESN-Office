import {NextRequest, NextResponse} from 'next/server'
import {supabaseServer} from '@/lib/supabase-server'
import {Resend} from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const EMAIL_FROM = process.env.EMAIL_FROM || 'ESN Office <onboarding@resend.dev>'

// Send approval request for an existing reservation
export async function POST(request: NextRequest) {
    try {
        const {searchParams} = new URL(request.url)
        const reservationId = searchParams.get('id')

        if (!reservationId) {
            return NextResponse.json(
                {error: 'Reservation ID is required'},
                {status: 400}
            )
        }

        // Get the reservation details
        const {data: reservation, error: fetchError} = await supabaseServer
            .from('office_reservations')
            .select('*')
            .eq('id', reservationId)
            .eq('is_active', true)
            .single()

        if (fetchError || !reservation) {
            return NextResponse.json(
                {error: 'Reservation not found'},
                {status: 404}
            )
        }

        // Get board emails from settings
        const {data: boardSettings} = await supabaseServer
            .from('board_settings')
            .select('value')
            .eq('key', 'board_emails')
            .single()

        const boardEmails = boardSettings?.value as string[] || []

        try {
            // Format times for email
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

            // Get additional volunteer names if any
            let additionalVolunteersText = ''
            if (reservation.additional_volunteers && reservation.additional_volunteers.length > 0) {
                const {data: additionalVolunteerData} = await supabaseServer
                    .from('volunteers')
                    .select('name')
                    .in('id', reservation.additional_volunteers)

                if (additionalVolunteerData && additionalVolunteerData.length > 0) {
                    const names = additionalVolunteerData.map(v => v.name).join(', ')
                    additionalVolunteersText = `<li><strong>Additional volunteers:</strong> ${names}</li>`
                }
            }

            // Email subject and body for approval request
            const subject = `[APPROVAL NEEDED] Office Reservation Request`
            const htmlBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #f59e0b;">Office Reservation Pending Approval</h2>
            <p>A new office reservation request requires your approval:</p>
            <ul style="list-style: none; padding: 0;">
              <li><strong>Reserved by:</strong> ${reservation.reserved_by_name}</li>
              <li><strong>Start:</strong> ${startFormatted}</li>
              <li><strong>End:</strong> ${endFormatted}</li>
              ${reservation.reason ? `<li><strong>Reason:</strong> ${reservation.reason}</li>` : ''}
              ${additionalVolunteersText}
            </ul>
            <p style="margin-top: 20px;">
              <strong>Please log in to the admin panel to approve or reject this reservation.</strong>
            </p>
            <p style="color: #666; font-size: 0.9em; margin-top: 20px;">
              This is an automated notification from the ESN Office Management System.
            </p>
          </div>
        `

            // Send approval request to board members
            for (const email of boardEmails) {
                try {
                    await resend.emails.send({
                        from: EMAIL_FROM,
                        to: [email],
                        subject,
                        html: htmlBody,
                    })
                    console.log(`Approval request sent to: ${email}`)
                } catch (error) {
                    console.error(`Error sending approval email to ${email}:`, error)
                }
            }

        } catch (emailError) {
            console.error('Error sending approval emails:', emailError)
            return NextResponse.json(
                {error: 'Failed to send approval request emails'},
                {status: 500}
            )
        }

        return NextResponse.json(
            {
                success: true,
                message: `Approval request sent successfully to board members.`
            },
            {status: 200}
        )
    } catch (error) {
        console.error('Error in request-approval API:', error)
        return NextResponse.json(
            {error: 'Internal server error'},
            {status: 500}
        )
    }
}
