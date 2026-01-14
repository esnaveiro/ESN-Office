import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

// GET /api/admin/board-settings
export async function GET() {
  try {
    const { data, error } = await supabaseServer
      .from('board_settings')
      .select('*')
      .eq('key', 'board_emails')
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching board settings:', error)
      return NextResponse.json(
        { error: 'Failed to fetch board settings' },
        { status: 500 }
      )
    }

    const boardEmails = data?.value as string[] || ['wpa@esnaveiro.org', 'ddias.tc@gmail.com']

    return NextResponse.json({ board_emails: boardEmails })
  } catch (error) {
    console.error('Error in GET board settings API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/board-settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { board_emails } = body

    if (!Array.isArray(board_emails)) {
      return NextResponse.json(
        { error: 'board_emails must be an array' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    for (const email of board_emails) {
      if (typeof email !== 'string' || !emailRegex.test(email)) {
        return NextResponse.json(
          { error: `Invalid email format: ${email}` },
          { status: 400 }
        )
      }
    }

    // Update or insert board emails
    const { error } = await supabaseServer
      .from('board_settings')
      .upsert({
        key: 'board_emails',
        value: board_emails,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'key'
      })

    if (error) {
      console.error('Error updating board settings:', error)
      return NextResponse.json(
        { error: 'Failed to update board settings' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      board_emails,
      message: 'Board emails updated successfully'
    })
  } catch (error) {
    console.error('Error in PUT board settings API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
