import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { requireAdmin, isNextResponse } from '@/lib/api-auth'

// GET - Fetch inventory logs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const inventoryId = searchParams.get('inventory_id')
    const limit = parseInt(searchParams.get('limit') || '50')

    let query = supabaseServer
      .from('inventory_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (inventoryId) {
      query = query.eq('inventory_id', inventoryId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching inventory logs:', error)
      return NextResponse.json(
        { error: 'Failed to fetch inventory logs' },
        { status: 500 }
      )
    }

    return NextResponse.json({ logs: data || [] })
  } catch (error) {
    console.error('Error in GET inventory logs API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete one log entry or bulk delete by age / all
export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin()
  if (isNextResponse(auth)) return auth

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const olderThanDays = searchParams.get('older_than_days')
    const all = searchParams.get('all')

    if (id) {
      const { error } = await supabaseServer
        .from('inventory_logs')
        .delete()
        .eq('id', id)

      if (error) throw error
      return NextResponse.json({ success: true })
    }

    if (all === 'true') {
      const { error } = await supabaseServer
        .from('inventory_logs')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')

      if (error) throw error
      return NextResponse.json({ success: true })
    }

    if (olderThanDays !== null) {
      const days = parseInt(olderThanDays)
      if (isNaN(days) || days < 0) {
        return NextResponse.json({ error: 'Invalid number of days' }, { status: 400 })
      }
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - days)

      const { error } = await supabaseServer
        .from('inventory_logs')
        .delete()
        .lt('created_at', cutoff.toISOString())

      if (error) throw error
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Specify id, older_than_days, or all=true' }, { status: 400 })
  } catch (error) {
    console.error('Error in DELETE inventory logs API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
