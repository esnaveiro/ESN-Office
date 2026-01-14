import {NextRequest, NextResponse} from 'next/server'
import {supabaseServer} from '@/lib/supabase-server'
import {Resend} from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const EMAIL_FROM = process.env.EMAIL_FROM || 'ESN Office <onboarding@resend.dev>'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const {
            reserved_by_id,
            reserved_by_name,
            start_time,
            end_time,
            reason,
            send_email_notification,
            additional_volunteers
        } = body

        // Validate required fields
        if (!reserved_by_name || !start_time || !end_time) {
            return NextResponse.json(
                {error: 'Missing required fields: reserved_by_name, start_time, end_time'},
                {status: 400}
            )
        }

        // Validate time range
        const startDate = new Date(start_time)
        const endDate = new Date(end_time)

        if (endDate <= startDate) {
            return NextResponse.json(
                {error: 'End time must be after start time'},
                {status: 400}
            )
        }

        // Check for conflicting reservations
        const {data: conflicts, error: conflictError} = await supabaseServer
            .from('office_reservations')
            .select('id, start_time, end_time, reserved_by_name')
            .eq('is_active', true)
            .or(`and(start_time.lte.${end_time},end_time.gte.${start_time})`)

        if (conflictError) {
            console.error('Error checking conflicts:', conflictError)
            return NextResponse.json(
                {error: 'Failed to check for conflicts'},
                {status: 500}
            )
        }

        if (conflicts && conflicts.length > 0) {
            return NextResponse.json(
                {
                    error: 'Time slot already reserved',
                    conflicts: conflicts.map(c => ({
                        reserved_by: c.reserved_by_name,
                        start: c.start_time,
                        end: c.end_time
                    }))
                },
                {status: 409}
            )
        }

        // Create reservation with approved status (auto-approved)
        const {data: reservation, error: insertError} = await supabaseServer
            .from('office_reservations')
            .insert([
                {
                    reserved_by_id,
                    reserved_by_name,
                    start_time,
                    end_time,
                    reason: reason || null,
                    send_email_notification: send_email_notification || false,
                    additional_volunteers: additional_volunteers || null,
                    is_active: true,
                    status: 'approved'
                }
            ])
            .select()
            .single()

        if (insertError) {
            console.error('Error creating reservation:', insertError)
            return NextResponse.json(
                {error: 'Failed to create reservation'},
                {status: 500}
            )
        }

        // Send email notification to assigned volunteers if requested
        if (send_email_notification) {
            try {
                // Collect all volunteer IDs to notify (creator + additional volunteers)
                const volunteerIdsToNotify = [reserved_by_id, ...(additional_volunteers || [])].filter(Boolean)

                if (volunteerIdsToNotify.length > 0) {
                    // Fetch volunteer emails
                    const {data: volunteers, error: volunteersError} = await supabaseServer
                        .from('volunteers')
                        .select('id, name, email')
                        .in('id', volunteerIdsToNotify)

                    if (volunteersError) {
                        console.error('Error fetching volunteers for email:', volunteersError)
                    } else if (volunteers && volunteers.length > 0) {
                        // Format times for email
                        const startFormatted = new Date(start_time).toLocaleString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                        })
                        const endFormatted = new Date(end_time).toLocaleString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                        })

                        // Get additional volunteer names for display
                        let additionalVolunteersText = ''
                        if (additional_volunteers && additional_volunteers.length > 0) {
                            const additionalVolunteerNames = volunteers
                                .filter(v => additional_volunteers.includes(v.id) && v.id !== reserved_by_id)
                                .map(v => v.name)
                            if (additionalVolunteerNames.length > 0) {
                                additionalVolunteersText = `<li><strong>Additional volunteers:</strong> ${additionalVolunteerNames.join(', ')}</li>`
                            }
                        }

                        // Email subject and body
                        const subject = `ESN Office Reserved: ${startFormatted}`
                        const htmlBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 0;">
            <h2 style="color: #2563eb;">ESN Office Reservation Created</h2>
            <p>You have been assigned to an office reservation:</p>
            <ul style="list-style: none; padding: 0;">
              <li><strong>Reserved by:</strong> ${reserved_by_name}</li>
              <li><strong>Start:</strong> ${startFormatted}</li>
              <li><strong>End:</strong> ${endFormatted}</li>
              ${reason ? `<li><strong>Reason:</strong> ${reason}</li>` : ''}
              ${additionalVolunteersText}
            </ul>
            <p style="color: #666; font-size: 0.9em; margin-top: 20px;">
              This is an automated notification from the ESN Office Management System.
            </p>
          </div>
        `

                        // Send email to each assigned volunteer
                        for (const volunteer of volunteers) {
                            try {
                                await resend.emails.send({
                                    from: EMAIL_FROM,
                                    to: [volunteer.email],
                                    subject,
                                    html: htmlBody,
                                })
                                console.log(`Email sent to: ${volunteer.email}`)
                            } catch (emailError) {
                                console.error(`Error sending email to ${volunteer.email}:`, emailError)
                            }
                        }
                    }
                }
            } catch (emailError) {
                console.error('Error preparing/sending emails:', emailError)
            }
        }

        // COMMENTED OUT: Send to all volunteers
        /*
        if (send_email_notification) {
            const {data: volunteers, error: volunteersError} = await supabaseServer
                .from('volunteers')
                .select('name, email')
                .order('name')
            // ... send to all volunteers
        }
        */

        return NextResponse.json(
            {
                success: true,
                reservation,
                message: `Reservation created successfully!`
            },
            {status: 201}
        )
    } catch (error) {
        console.error('Error in office reservation API:', error)
        return NextResponse.json(
            {error: 'Internal server error'},
            {status: 500}
        )
    }
}

// Update a reservation
export async function PUT(request: NextRequest) {
    try {
        const {searchParams} = new URL(request.url)
        const reservationId = searchParams.get('id')

        if (!reservationId) {
            return NextResponse.json(
                {error: 'Reservation ID is required'},
                {status: 400}
            )
        }

        const body = await request.json()
        const {
            start_time,
            end_time,
            reason,
            send_email_notification,
            additional_volunteers
        } = body

        // Validate required fields
        if (!start_time || !end_time) {
            return NextResponse.json(
                {error: 'Missing required fields: start_time, end_time'},
                {status: 400}
            )
        }

        // Validate time range
        const startDate = new Date(start_time)
        const endDate = new Date(end_time)

        if (endDate <= startDate) {
            return NextResponse.json(
                {error: 'End time must be after start time'},
                {status: 400}
            )
        }

        // Check for conflicting reservations (excluding the current one being updated)
        const {data: conflicts, error: conflictError} = await supabaseServer
            .from('office_reservations')
            .select('id, start_time, end_time, reserved_by_name')
            .eq('is_active', true)
            .neq('id', reservationId)
            .or(`and(start_time.lte.${end_time},end_time.gte.${start_time})`)

        if (conflictError) {
            console.error('Error checking conflicts:', conflictError)
            return NextResponse.json(
                {error: 'Failed to check for conflicts'},
                {status: 500}
            )
        }

        if (conflicts && conflicts.length > 0) {
            return NextResponse.json(
                {
                    error: 'Time slot already reserved',
                    conflicts: conflicts.map(c => ({
                        reserved_by: c.reserved_by_name,
                        start: c.start_time,
                        end: c.end_time
                    }))
                },
                {status: 409}
            )
        }

        // Update reservation
        const {data: reservation, error: updateError} = await supabaseServer
            .from('office_reservations')
            .update({
                start_time,
                end_time,
                reason: reason || null,
                send_email_notification: send_email_notification || false,
                additional_volunteers: additional_volunteers || null,
                updated_at: new Date().toISOString()
            })
            .eq('id', reservationId)
            .select()
            .single()

        if (updateError) {
            console.error('Error updating reservation:', updateError)
            return NextResponse.json(
                {error: 'Failed to update reservation'},
                {status: 500}
            )
        }

        // If email notification requested, send emails to assigned volunteers
        if (send_email_notification) {
            try {
                // Get reservation details to get reserved_by_id
                const {data: reservationData} = await supabaseServer
                    .from('office_reservations')
                    .select('reserved_by_id, reserved_by_name')
                    .eq('id', reservationId)
                    .single()

                if (reservationData) {
                    // Collect all volunteer IDs to notify (creator + additional volunteers)
                    const volunteerIdsToNotify = [
                        reservationData.reserved_by_id,
                        ...(additional_volunteers || [])
                    ].filter(Boolean)

                    if (volunteerIdsToNotify.length > 0) {
                        // Fetch volunteer emails
                        const {data: volunteers, error: volunteersError} = await supabaseServer
                            .from('volunteers')
                            .select('id, name, email')
                            .in('id', volunteerIdsToNotify)

                        if (volunteersError) {
                            console.error('Error fetching volunteers for email:', volunteersError)
                        } else if (volunteers && volunteers.length > 0) {
                            // Format times for email
                            const startFormatted = new Date(start_time).toLocaleString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false
                            })
                            const endFormatted = new Date(end_time).toLocaleString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false
                            })

                            // Get additional volunteer names for display
                            let additionalVolunteersText = ''
                            if (additional_volunteers && additional_volunteers.length > 0) {
                                const additionalVolunteerNames = volunteers
                                    .filter(v => additional_volunteers.includes(v.id) && v.id !== reservationData.reserved_by_id)
                                    .map(v => v.name)
                                if (additionalVolunteerNames.length > 0) {
                                    additionalVolunteersText = `<li><strong>Additional volunteers:</strong> ${additionalVolunteerNames.join(', ')}</li>`
                                }
                            }

                            // Email subject and body
                            const subject = `ESN Office Reservation Updated: ${startFormatted}`
                            const htmlBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 0;">
              <h2 style="color: #2563eb;">ESN Office Reservation Updated</h2>
              <p>A reservation you are assigned to has been updated:</p>
              <ul style="list-style: none; padding: 0;">
                <li><strong>Reserved by:</strong> ${reservationData.reserved_by_name}</li>
                <li><strong>Start:</strong> ${startFormatted}</li>
                <li><strong>End:</strong> ${endFormatted}</li>
                ${reason ? `<li><strong>Reason:</strong> ${reason}</li>` : ''}
                ${additionalVolunteersText}
              </ul>
              <p style="color: #666; font-size: 0.9em; margin-top: 20px;">
                This is an automated notification from the ESN Office Management System.
              </p>
            </div>
          `

                            // Send email to each assigned volunteer
                            for (const volunteer of volunteers) {
                                try {
                                    await resend.emails.send({
                                        from: EMAIL_FROM,
                                        to: [volunteer.email],
                                        subject,
                                        html: htmlBody,
                                    })
                                    console.log(`Update email sent to: ${volunteer.email}`)
                                } catch (emailError) {
                                    console.error(`Error sending email to ${volunteer.email}:`, emailError)
                                }
                            }
                        }
                    }
                }
            } catch (emailError) {
                console.error('Error preparing/sending emails:', emailError)
                // Don't fail the reservation if email fails
            }
        }

        // COMMENTED OUT: Send to all volunteers
        /*
        if (send_email_notification) {
            const {data: volunteers} = await supabaseServer
                .from('volunteers')
                .select('name, email')
                .order('name')
            // ... send to all volunteers
        }
        */

        return NextResponse.json(
            {
                success: true,
                reservation,
                message: `Reservation updated successfully`
            },
            {status: 200}
        )
    } catch (error) {
        console.error('Error in PUT office reservation API:', error)
        return NextResponse.json(
            {error: 'Internal server error'},
            {status: 500}
        )
    }
}

// Get current and upcoming reservations
export async function GET() {
    try {
        const now = new Date().toISOString()

        // Get current reservation
        const {data: current, error: currentError} = await supabaseServer
            .rpc('get_current_reservation')

        if (currentError) {
            console.error('Error getting current reservation:', currentError)
        }

        // Get upcoming reservations (next 7 days) - only approved ones
        const weekFromNow = new Date()
        weekFromNow.setDate(weekFromNow.getDate() + 7)

        const {data: upcoming, error: upcomingError} = await supabaseServer
            .from('office_reservations')
            .select('*')
            .eq('is_active', true)
            .eq('status', 'approved')
            .gte('start_time', now)
            .lte('start_time', weekFromNow.toISOString())
            .order('start_time', {ascending: true})

        if (upcomingError) {
            console.error('Error getting upcoming reservations:', upcomingError)
        }

        // Get all active and approved reservations (for calendar view)
        const {data: all, error: allError} = await supabaseServer
            .from('office_reservations')
            .select('*')
            .eq('is_active', true)
            .eq('status', 'approved')
            .gte('end_time', now)
            .order('start_time', {ascending: true})

        if (allError) {
            console.error('Error getting all reservations:', allError)
        }

        return NextResponse.json({
            current: current && current.length > 0 ? current[0] : null,
            upcoming: upcoming || [],
            reservations: all || [],
            is_office_reserved: current && current.length > 0
        })
    } catch (error) {
        console.error('Error in GET office reservation API:', error)
        return NextResponse.json(
            {error: 'Internal server error'},
            {status: 500}
        )
    }
}

// Cancel a reservation
export async function DELETE(request: NextRequest) {
    try {
        const {searchParams} = new URL(request.url)
        const reservationId = searchParams.get('id')
        const sendEmailNotification = searchParams.get('send_email_notification') === 'true'

        if (!reservationId) {
            return NextResponse.json(
                {error: 'Reservation ID is required'},
                {status: 400}
            )
        }

        // Get reservation details before deleting (for email notification)
        const {data: reservation, error: fetchError} = await supabaseServer
            .from('office_reservations')
            .select('*')
            .eq('id', reservationId)
            .single()

        if (fetchError) {
            console.error('Error fetching reservation:', fetchError)
            return NextResponse.json(
                {error: 'Failed to fetch reservation'},
                {status: 500}
            )
        }

        // Mark reservation as inactive
        const {error} = await supabaseServer
            .from('office_reservations')
            .update({is_active: false, updated_at: new Date().toISOString()})
            .eq('id', reservationId)

        if (error) {
            console.error('Error cancelling reservation:', error)
            return NextResponse.json(
                {error: 'Failed to cancel reservation'},
                {status: 500}
            )
        }

        // Send email notification to assigned volunteers if requested
        if (sendEmailNotification && reservation) {
            try {
                // Collect all volunteer IDs to notify (creator + additional volunteers)
                const volunteerIdsToNotify = [
                    reservation.reserved_by_id,
                    ...(reservation.additional_volunteers || [])
                ].filter(Boolean)

                if (volunteerIdsToNotify.length > 0) {
                    // Fetch volunteer emails
                    const {data: volunteers, error: volunteersError} = await supabaseServer
                        .from('volunteers')
                        .select('id, name, email')
                        .in('id', volunteerIdsToNotify)

                    if (volunteersError) {
                        console.error('Error fetching volunteers for email:', volunteersError)
                    } else if (volunteers && volunteers.length > 0) {
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

                        // Get additional volunteer names for display
                        let additionalVolunteersText = ''
                        if (reservation.additional_volunteers && reservation.additional_volunteers.length > 0) {
                            const additionalVolIds = reservation.additional_volunteers
                            const additionalVolunteerNames = volunteers
                                .filter(v => additionalVolIds.includes(v.id) && v.id !== reservation.reserved_by_id)
                                .map(v => v.name)
                            if (additionalVolunteerNames.length > 0) {
                                additionalVolunteersText = `<li><strong>Additional volunteers:</strong> ${additionalVolunteerNames.join(', ')}</li>`
                            }
                        }

                        // Email subject and body
                        const subject = `ESN Office Reservation Cancelled: ${startFormatted}`
                        const htmlBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 0;">
              <h2 style="color: #ef4444;">ESN Office Reservation Cancelled</h2>
              <p>A reservation you were assigned to has been cancelled:</p>
              <ul style="list-style: none; padding: 0;">
                <li><strong>Reserved by:</strong> ${reservation.reserved_by_name}</li>
                <li><strong>Start:</strong> ${startFormatted}</li>
                <li><strong>End:</strong> ${endFormatted}</li>
                ${reservation.reason ? `<li><strong>Reason:</strong> ${reservation.reason}</li>` : ''}
                ${additionalVolunteersText}
              </ul>
              <p style="color: #666; font-size: 0.9em; margin-top: 20px;">
                This is an automated notification from the ESN Office Management System.
              </p>
            </div>
          `

                        // Send email to each assigned volunteer
                        for (const volunteer of volunteers) {
                            try {
                                await resend.emails.send({
                                    from: EMAIL_FROM,
                                    to: [volunteer.email],
                                    subject,
                                    html: htmlBody,
                                })
                                console.log(`Cancellation email sent to: ${volunteer.email}`)
                            } catch (emailError) {
                                console.error(`Error sending email to ${volunteer.email}:`, emailError)
                            }
                        }
                    }
                }
            } catch (emailError) {
                console.error('Error preparing/sending emails:', emailError)
                // Don't fail the cancellation if email fails
            }
        }

        // COMMENTED OUT: Send to all volunteers
        /*
        if (sendEmailNotification && reservation) {
            const {data: volunteers} = await supabaseServer
                .from('volunteers')
                .select('name, email')
                .order('name')
            // ... send to all volunteers
        }
        */

        return NextResponse.json({
            success: true,
            message: 'Reservation cancelled successfully'
        })
    } catch (error) {
        console.error('Error in DELETE office reservation API:', error)
        return NextResponse.json(
            {error: 'Internal server error'},
            {status: 500}
        )
    }
}
