import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { requireSession, isNextResponse } from '@/lib/api-auth'

interface InventoryUpdateData {
  updated_at: string
  name?: string
  description?: string | null
  quantity?: number
  unit?: string
  location?: string
  category?: string | null
  notes?: string | null
}

interface InventoryRow {
  id: string
  name: string
  quantity: number
  location: string
  description?: string | null
  category?: string | null
}

async function insertLog(
  inventoryId: string,
  action: 'created' | 'updated' | 'deleted',
  userId: string,
  userName: string,
  oldValues: Record<string, unknown> | null,
  newValues: Record<string, unknown> | null,
  description: string,
) {
  await supabaseServer.from('inventory_logs').insert({
    inventory_id: inventoryId,
    action,
    changed_by_id: userId,
    changed_by_name: userName,
    old_values: oldValues,
    new_values: newValues,
    changes_description: description,
  })
}

function buildUpdateDescription(old: InventoryRow, next: InventoryRow): string {
  const parts: string[] = []
  if (old.name !== next.name) parts.push(`name "${old.name}"→"${next.name}"`)
  if (old.quantity !== next.quantity) parts.push(`qty ${old.quantity}→${next.quantity}`)
  if (old.location !== next.location) parts.push(`location "${old.location}"→"${next.location}"`)
  if ((old.description ?? '') !== (next.description ?? '')) parts.push('description changed')
  if ((old.category ?? '') !== (next.category ?? '')) parts.push(`category "${old.category ?? 'none'}"→"${next.category ?? 'none'}"`)
  return parts.length ? `Updated: ${parts.join('; ')}` : 'Updated'
}

// GET - Fetch all inventory items or filter by location
export async function GET(request: NextRequest) {
  const auth = await requireSession()
  if (isNextResponse(auth)) return auth

  try {
    const { searchParams } = new URL(request.url)
    const location = searchParams.get('location')

    let query = supabaseServer
      .from('inventory')
      .select('*')
      .order('name', { ascending: true })

    if (location && location !== 'all') {
      query = query.eq('location', location)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching inventory:', error)
      return NextResponse.json(
        { error: 'Failed to fetch inventory' },
        { status: 500 }
      )
    }

    return NextResponse.json({ inventory: data || [] })
  } catch (error) {
    console.error('Error in GET inventory API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create new inventory item
export async function POST(request: NextRequest) {
  const auth = await requireSession()
  if (isNextResponse(auth)) return auth

  try {
    const body = await request.json()
    const {
      name,
      description,
      quantity,
      unit,
      location,
      category,
      notes,
      created_by_id,
      created_by_name
    } = body

    if (!name || quantity === undefined || !location || !created_by_name) {
      return NextResponse.json(
        { error: 'Missing required fields: name, quantity, location, created_by_name' },
        { status: 400 }
      )
    }

    if (quantity < 0) {
      return NextResponse.json(
        { error: 'Quantity must be non-negative' },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseServer
      .from('inventory')
      .insert([{ name, description: description || null, quantity, unit: unit || 'units', location, category: category || null, notes: notes || null, created_by_id, created_by_name }])
      .select()
      .single()

    if (error) {
      console.error('Error creating inventory item:', error)
      return NextResponse.json(
        { error: 'Failed to create inventory item' },
        { status: 500 }
      )
    }

    await insertLog(data.id, 'created', auth.sub, auth.name, null, data as unknown as Record<string, unknown>, `Created item: ${name}`)

    return NextResponse.json(
      { success: true, item: data, message: `${name} added to inventory` },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error in POST inventory API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update existing inventory item
export async function PUT(request: NextRequest) {
  const auth = await requireSession()
  if (isNextResponse(auth)) return auth

  try {
    const body = await request.json()
    const { id, name, description, quantity, unit, location, category, notes } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      )
    }

    if (quantity !== undefined && quantity < 0) {
      return NextResponse.json(
        { error: 'Quantity must be non-negative' },
        { status: 400 }
      )
    }

    // Fetch current values for the log diff
    const { data: oldData } = await supabaseServer
      .from('inventory')
      .select('*')
      .eq('id', id)
      .single()

    const updateData: InventoryUpdateData = { updated_at: new Date().toISOString() }
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (quantity !== undefined) updateData.quantity = quantity
    if (unit !== undefined) updateData.unit = unit
    if (location !== undefined) updateData.location = location
    if (category !== undefined) updateData.category = category
    if (notes !== undefined) updateData.notes = notes

    const { data, error } = await supabaseServer
      .from('inventory')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating inventory item:', error)
      return NextResponse.json(
        { error: 'Failed to update inventory item' },
        { status: 500 }
      )
    }

    const desc = oldData ? buildUpdateDescription(oldData as InventoryRow, data as InventoryRow) : 'Updated'
    await insertLog(id, 'updated', auth.sub, auth.name, oldData as unknown as Record<string, unknown>, data as unknown as Record<string, unknown>, desc)

    return NextResponse.json({
      success: true,
      item: data,
      message: 'Inventory item updated successfully'
    })
  } catch (error) {
    console.error('Error in PUT inventory API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete inventory item
export async function DELETE(request: NextRequest) {
  const auth = await requireSession()
  if (isNextResponse(auth)) return auth

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      )
    }

    // Fetch item before deleting for the log
    const { data: oldData } = await supabaseServer
      .from('inventory')
      .select('*')
      .eq('id', id)
      .single()

    const { error } = await supabaseServer
      .from('inventory')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting inventory item:', error)
      return NextResponse.json(
        { error: 'Failed to delete inventory item' },
        { status: 500 }
      )
    }

    await insertLog(
      id, 'deleted', auth.sub, auth.name,
      oldData as unknown as Record<string, unknown>, null,
      `Deleted item: ${oldData?.name ?? id}`
    )

    return NextResponse.json({
      success: true,
      message: 'Inventory item deleted successfully'
    })
  } catch (error) {
    console.error('Error in DELETE inventory API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
