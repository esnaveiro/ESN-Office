import {NextRequest, NextResponse} from 'next/server'
import {createServerClient} from '@supabase/ssr'

/**
 * API Route: Auto Check-Out All Volunteers
 *
 * This endpoint checks out all volunteers who are currently in the office.
 * It should be called daily at 5 AM by a cron service.
 *
 * Security: Use a CRON_SECRET to protect this endpoint
 *
 * @example
 * curl -X POST https://your-domain.com/api/cron/auto-checkout \
 *   -H "Authorization: Bearer YOUR_CRON_SECRET"
 */
export async function POST(request: NextRequest) {
    try {
        // Verify cron secret for security
        const authHeader = request.headers.get('authorization')
        const cronSecret = process.env.CRON_SECRET

        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json(
                {error: 'Unauthorized'},
                {status: 401}
            )
        }

        // Create Supabase client with service role key for admin operations
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!, // Use service role key for admin operations
            {
                cookies: {
                    getAll() {
                        return []
                    },
                    setAll() {
                    }
                }
            }
        )

        // Get all volunteers currently in office
        const {data: volunteersInOffice, error: fetchError} = await supabase
            .from('volunteers')
            .select('id, name')
            .eq('is_in_office', true)

        if (fetchError) {
            console.error('Error fetching volunteers:', fetchError)
            return NextResponse.json(
                {error: 'Failed to fetch volunteers'},
                {status: 500}
            )
        }

        if (!volunteersInOffice || volunteersInOffice.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No volunteers to check out',
                count: 0,
                checkedOut: []
            })
        }

        // Create check-out logs for all volunteers
        const checkOutLogs = volunteersInOffice.map(volunteer => ({
            volunteer_id: volunteer.id,
            action: 'check_out' as const,
            timestamp: new Date().toISOString()
        }))

        const {error: logError} = await supabase
            .from('presence_logs')
            .insert(checkOutLogs)

        if (logError) {
            console.error('Error creating presence logs:', logError)
            return NextResponse.json(
                {error: 'Failed to create presence logs'},
                {status: 500}
            )
        }

        // Update all volunteers to checked out
        const {error: updateError} = await supabase
            .from('volunteers')
            .update({
                is_in_office: false,
                last_seen: new Date().toISOString()
            })
            .eq('is_in_office', true)

        if (updateError) {
            console.error('Error updating volunteers:', updateError)
            return NextResponse.json(
                {error: 'Failed to update volunteers'},
                {status: 500}
            )
        }

        console.log(`Auto check-out completed: ${volunteersInOffice.length} volunteers checked out`)

        return NextResponse.json({
            success: true,
            message: 'Auto check-out completed successfully',
            count: volunteersInOffice.length,
            checkedOut: volunteersInOffice.map(v => ({id: v.id, name: v.name})),
            timestamp: new Date().toISOString()
        })

    } catch (error) {
        console.error('Auto check-out error:', error)
        return NextResponse.json(
            {error: 'Internal server error'},
            {status: 500}
        )
    }
}

// Prevent caching of this endpoint
export const dynamic = 'force-dynamic'
export const revalidate = 0
