import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

// GET /api/admin/settings - Get all settings
export async function GET() {
  try {
    const { data, error } = await supabaseServer
      .from('board_settings')
      .select('*')

    if (error) {
      console.error('Error fetching settings:', error)
      return NextResponse.json(
        { error: 'Failed to fetch settings' },
        { status: 500 }
      )
    }

    // Convert to key-value object
    const settings: Record<string, unknown> = {}
    data?.forEach(setting => {
      settings[setting.key] = setting.value
    })

    // Provide defaults if keys don't exist
    const defaultSettings = {
      board_emails: ['wpa@esnaveiro.org', 'ddias.tc@gmail.com'],
      office_hours: {
        monday: { open: '09:00', close: '18:00', enabled: true },
        tuesday: { open: '09:00', close: '18:00', enabled: true },
        wednesday: { open: '09:00', close: '18:00', enabled: true },
        thursday: { open: '09:00', close: '18:00', enabled: true },
        friday: { open: '09:00', close: '18:00', enabled: true },
        saturday: { open: '10:00', close: '14:00', enabled: false },
        sunday: { open: '10:00', close: '14:00', enabled: false },
      },
      reservation_rules: {
        max_per_user_per_month: 10,
        advance_booking_days: 30,
        min_duration_minutes: 30,
        max_duration_hours: 8,
      },
      inventory_defaults: {
        low_stock_threshold: 5,
        categories: ['Office Supplies', 'Electronics', 'Furniture', 'Miscellaneous'],
      },
      email_settings: {
        from_name: 'ESN Aveiro',
        reply_to: 'noreply@esnaveiro.org',
      },
      check_in_settings: {
        geolocation_radius_meters: 100,
        auto_checkout_hour: 5, // 5 AM
      },
    }

    // Merge defaults with actual settings
    const finalSettings = { ...defaultSettings, ...settings }

    return NextResponse.json({ settings: finalSettings })
  } catch (error) {
    console.error('Error in GET settings API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/settings - Update settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { key, value } = body

    if (!key) {
      return NextResponse.json(
        { error: 'Setting key is required' },
        { status: 400 }
      )
    }

    // Validate specific settings
    if (key === 'board_emails') {
      if (!Array.isArray(value)) {
        return NextResponse.json(
          { error: 'board_emails must be an array' },
          { status: 400 }
        )
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      for (const email of value) {
        if (typeof email !== 'string' || !emailRegex.test(email)) {
          return NextResponse.json(
            { error: `Invalid email format: ${email}` },
            { status: 400 }
          )
        }
      }
    }

    // Update or insert setting
    const { error } = await supabaseServer
      .from('board_settings')
      .upsert({
        key,
        value,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'key'
      })

    if (error) {
      console.error('Error updating setting:', error)
      return NextResponse.json(
        { error: 'Failed to update setting' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      key,
      value,
      message: 'Setting updated successfully'
    })
  } catch (error) {
    console.error('Error in PUT settings API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
