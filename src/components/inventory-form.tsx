"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Save, X } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle } from "lucide-react"
import type { InventoryItem } from "@/app/inventory/page"

interface InventoryFormProps {
  item?: InventoryItem | null
  volunteer: { id: string; name: string }
  onSuccess: () => void
  onCancel: () => void
}

const OFFICE_LOCATIONS = [
  "Storage",
  "Top Table",
  "Left Closet",
  "Right Closet",
  "Left Table",
  "Right Table",
  "Display",
  "Couch",
  "Other"
]

const CATEGORIES = [
  "Office Supplies",
  "Electronics",
  "Furniture",
  "Cleaning",
  "Kitchen",
  "Event Materials",
  "Promotional Items",
  "Documents",
  "Other"
]

const UNITS = [
  "units",
  "pieces",
  "boxes",
  "packs",
  "bottles",
  "sets",
  "kg",
  "liters"
]

export function InventoryForm({ item, volunteer, onSuccess, onCancel }: InventoryFormProps) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Form state
  const [name, setName] = useState(item?.name || "")
  const [description, setDescription] = useState(item?.description || "")
  const [quantity, setQuantity] = useState(item?.quantity?.toString() || "0")
  const [unit, setUnit] = useState(item?.unit || "units")
  const [location, setLocation] = useState(item?.location || "")
  const [category, setCategory] = useState(item?.category || "")
  const [notes, setNotes] = useState(item?.notes || "")
  const [lowStockThreshold, setLowStockThreshold] = useState(item?.low_stock_threshold?.toString() || "")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      // Validate
      if (!name || !location) {
        setMessage({ type: 'error', text: 'Name and location are required' })
        setLoading(false)
        return
      }

      const quantityNum = parseInt(quantity)
      if (isNaN(quantityNum) || quantityNum < 0) {
        setMessage({ type: 'error', text: 'Quantity must be a non-negative number' })
        setLoading(false)
        return
      }

      const url = item ? '/api/inventory' : '/api/inventory'
      const method = item ? 'PUT' : 'POST'

      const lowStockThresholdNum = lowStockThreshold ? parseInt(lowStockThreshold) : null

      const body: Record<string, unknown> = {
        name,
        description: description || null,
        quantity: quantityNum,
        unit,
        location,
        category: category || null,
        notes: notes || null,
        low_stock_threshold: lowStockThresholdNum
      }

      if (item) {
        body.id = item.id
      } else {
        body.created_by_id = volunteer?.id
        body.created_by_name = volunteer?.name || 'Unknown'
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (!response.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to save item' })
        setLoading(false)
        return
      }

      setMessage({ type: 'success', text: data.message || 'Item saved successfully' })
      setTimeout(() => {
        onSuccess()
      }, 1000)
    } catch (error) {
      console.error('Error saving item:', error)
      setMessage({ type: 'error', text: 'An unexpected error occurred' })
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Item Name *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Printer Paper"
          required
        />
      </div>

      {/* Quantity */}
      <div className="space-y-2">
        <Label htmlFor="quantity">Quantity *</Label>
        <div className="flex gap-2">
          <Input
            id="quantity"
            type="number"
            min="0"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="0"
            required
            className="flex-1"
          />
          <Select value={unit} onValueChange={setUnit}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UNITS.map((u) => (
                <SelectItem key={u} value={u}>
                  {u}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Low Stock Threshold */}
      <div className="space-y-2">
        <Label htmlFor="lowStockThreshold">Low Stock Alert Threshold</Label>
        <Input
          id="lowStockThreshold"
          type="number"
          min="0"
          value={lowStockThreshold}
          onChange={(e) => setLowStockThreshold(e.target.value)}
          placeholder="Optional - leave empty for no alert"
        />
        <p className="text-xs text-muted-foreground">
          You&apos;ll be notified when quantity drops to or below this number
        </p>
      </div>

      {/* Location */}
      <div className="space-y-2">
        <Label htmlFor="location">Location *</Label>
        <Select value={location} onValueChange={setLocation} required>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select location" />
          </SelectTrigger>
          <SelectContent>
            {OFFICE_LOCATIONS.map((loc) => (
              <SelectItem key={loc} value={loc}>
                {loc}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select category (optional)" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description of the item..."
          rows={2}
        />
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional notes or important information..."
          rows={2}
        />
      </div>

      {/* Message Alert */}
      {message && (
        <Alert className={message.type === 'success' ? 'border-primary bg-primary/10' : 'border-destructive bg-destructive/10'}>
          {message.type === 'success' ? (
            <CheckCircle className="h-4 w-4 text-primary" />
          ) : (
            <AlertCircle className="h-4 w-4 text-destructive" />
          )}
          <AlertDescription className={message.type === 'success' ? 'text-primary' : 'text-destructive'}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {item ? 'Update Item' : 'Add Item'}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
