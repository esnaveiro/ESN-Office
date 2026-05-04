import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { requireAdmin, isNextResponse } from '@/lib/api-auth'
import { GEOLOCATION_RADIUS_METERS, AUTO_CHECKOUT_HOUR } from '@/lib/constants'

const defaultSettings = {
  board_emails: [] as string[],
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
    from_name: process.env.NEXT_PUBLIC_SECTION_NAME ?? 'ESN',
    reply_to: '',
  },
  check_in_settings: {
    geolocation_radius_meters: GEOLOCATION_RADIUS_METERS,
    auto_checkout_hour: AUTO_CHECKOUT_HOUR,
  },
  volunteer_positions: ['WPA', 'VP', 'Treasurer', 'Secretary', 'Member'],
}

export async function GET() {
  const auth = await requireAdmin()
  if (isNextResponse(auth)) return auth

  try {
    const { data, error } = await supabaseServer.from('board_settings').select('*')

    if (error) {
      console.error('Error fetching settings:', error)
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
    }

    const settings: Record<string, unknown> = {}
    data?.forEach(s => { settings[s.key] = s.value })

    return NextResponse.json({ settings: { ...defaultSettings, ...settings } })
  } catch (error) {
    console.error('Error in GET settings API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin()
  if (isNextResponse(auth)) return auth

  try {
    const body = await request.json()
    const { key, value } = body

    if (!key || typeof key !== 'string') {
      return NextResponse.json({ error: 'Setting key is required' }, { status: 400 })
    }

    if (key === 'board_emails') {
      if (!Array.isArray(value)) {
        return NextResponse.json({ error: 'board_emails must be an array' }, { status: 400 })
      }
      const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/
      for (const email of value) {
        if (typeof email !== 'string' || !emailRegex.test(email)) {
          return NextResponse.json({ error: `Invalid email: ${email}` }, { status: 400 })
        }
      }
    }

    const { error } = await supabaseServer
      .from('board_settings')
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })

    if (error) {
      console.error('Error updating setting:', error)
      return NextResponse.json({ error: 'Failed to update setting' }, { status: 500 })
    }

    return NextResponse.json({ success: true, key, value })
  } catch (error) {
    console.error('Error in PUT settings API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
