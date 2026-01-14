import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

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
