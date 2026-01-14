"use client"

import {Card, CardContent} from "@/components/ui/card"
import {Button} from "@/components/ui/button"
import {Badge} from "@/components/ui/badge"
import {Checkbox} from "@/components/ui/checkbox"
import {AlertTriangle, Edit, Hash, MapPin, Minus, Package, Plus, Trash2} from "lucide-react"
import type {InventoryItem} from "@/app/inventory/page"

interface InventoryListProps {
  inventory: InventoryItem[]
  onEdit: (item: InventoryItem) => void
  onDelete: (item: InventoryItem) => void
  onAdjustStock?: (item: InventoryItem) => void
  onQuickAdjust?: (item: InventoryItem, change: number) => Promise<void>
  selectedItems?: string[]
  onSelectItem?: (id: string) => void
  onSelectAll?: (selected: boolean) => void
  bulkMode?: boolean
  viewMode?: 'card' | 'list'
}

export function InventoryList({
  inventory,
  onEdit,
  onDelete,
  onAdjustStock,
                                onQuickAdjust,
  selectedItems = [],
  onSelectItem,
  onSelectAll,
                                bulkMode = false,
                                viewMode = 'card'
}: InventoryListProps) {
  const isLowStock = (item: InventoryItem) => {
    if (item.low_stock_threshold === null || item.low_stock_threshold === undefined) {
      return false
    }
    return item.quantity <= item.low_stock_threshold
  }

  if (inventory.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Package className="h-16 w-16 text-muted-foreground opacity-50 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No inventory items found</h3>
          <p className="text-sm text-muted-foreground">
            Add your first item to get started
          </p>
        </CardContent>
      </Card>
    )
  }

  const allSelected = inventory.length > 0 && inventory.every(item => selectedItems.includes(item.id))

  // List View Render
  const renderListView = () => (
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
              <tr className="border-b bg-muted/50">
                {bulkMode && onSelectAll && (
                    <th className="p-3 text-left">
                      <Checkbox
                          checked={allSelected}
                          onCheckedChange={onSelectAll}
                      />
                    </th>
                )}
                <th className="p-3 text-left text-sm font-semibold">Name</th>
                <th className="p-3 text-left text-sm font-semibold">Location</th>
                <th className="p-3 text-left text-sm font-semibold">Category</th>
                <th className="p-3 text-center text-sm font-semibold">Quantity</th>
                <th className="p-3 text-left text-sm font-semibold">Description</th>
                <th className="p-3 text-right text-sm font-semibold">Actions</th>
              </tr>
              </thead>
              <tbody>
              {inventory.map((item) => {
                const lowStock = isLowStock(item)
                const isSelected = selectedItems.includes(item.id)

                return (
                    <tr
                        key={item.id}
                        className={`border-b hover:bg-muted/30 transition-colors ${isSelected ? 'bg-primary/5' : ''} ${lowStock ? 'bg-destructive/5' : ''}`}
                    >
                      {bulkMode && onSelectItem && (
                          <td className="p-3">
                            <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => onSelectItem(item.id)}
                            />
                          </td>
                      )}
                      <td className="p-3">
                        <div className="flex flex-col">
                          <span className="font-semibold">{item.name}</span>
                          {lowStock && (
                              <div className="flex items-center gap-1 text-xs text-destructive mt-1">
                                <AlertTriangle className="h-3 w-3"/>
                                Low Stock
                              </div>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge className="bg-primary/10 border-primary/20 text-primary text-xs">
                          <MapPin className="h-3 w-3 mr-1"/>
                          {item.location}
                        </Badge>
                      </td>
                      <td className="p-3">
                        {item.category ? (
                            <Badge variant="outline" className="text-xs">{item.category}</Badge>
                        ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-3">
                        {onQuickAdjust ? (
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onQuickAdjust(item, -1)
                                  }}
                                  disabled={item.quantity === 0}
                                  className="h-7 w-7 p-0"
                              >
                                <Minus className="h-3 w-3"/>
                              </Button>
                              <span className="font-semibold text-sm min-w-12 text-center">
                            {item.quantity} {item.unit}
                          </span>
                              <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onQuickAdjust(item, 1)
                                  }}
                                  className="h-7 w-7 p-0"
                              >
                                <Plus className="h-3 w-3"/>
                              </Button>
                            </div>
                        ) : (
                            <div className="text-center">
                              <span className="font-semibold">{item.quantity}</span>
                              <span className="text-muted-foreground text-xs ml-1">{item.unit}</span>
                            </div>
                        )}
                      </td>
                      <td className="p-3 max-w-xs">
                        {item.description ? (
                            <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                        ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1 justify-end">
                          {onAdjustStock && (
                              <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onAdjustStock(item)}
                                  title="Adjust stock"
                                  className="h-8 w-8 p-0"
                              >
                                <Hash className="h-4 w-4"/>
                              </Button>
                          )}
                          <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEdit(item)}
                              className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4"/>
                          </Button>
                          <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDelete(item)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4"/>
                          </Button>
                        </div>
                      </td>
                    </tr>
                )
              })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
  )

  // Card View Render
  const renderCardView = () => (
      <>
      {bulkMode && onSelectAll && (
        <Card className="border-primary">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={allSelected}
                onCheckedChange={onSelectAll}
              />
              <span className="text-sm font-medium">
                {allSelected ? 'Deselect All' : 'Select All'} ({selectedItems.length} selected)
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {inventory.map((item) => {
          const lowStock = isLowStock(item)
          const isSelected = selectedItems.includes(item.id)

          return (
            <Card
              key={item.id}
              className={`hover:shadow-md transition-all h-full ${isSelected ? 'border-primary' : ''} ${lowStock ? 'border-t-4 border-t-destructive' : ''}`}
            >
              <CardContent className="p-4 h-full">
                <div className="flex flex-col h-full gap-3">
                  {/* Header with badges and checkbox */}
                  <div className="space-y-2">
                    {bulkMode && onSelectItem && (
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => onSelectItem(item.id)}
                      />
                    )}

                    {/* Location and Category Badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="bg-primary/10 border-primary/20 text-primary hover:bg-primary/20 text-xs">
                        <MapPin className="h-3 w-3 mr-1" />
                        {item.location}
                      </Badge>
                      {item.category && (
                        <Badge className="bg-primary/10 border-primary/20 text-primary hover:bg-primary/20 text-xs">
                          {item.category}
                        </Badge>
                      )}
                    </div>

                    {/* Item Name */}
                    <h3 className="font-semibold text-base">{item.name}</h3>
                  </div>

                  {/* Description */}
                  {item.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {item.description}
                    </p>
                  )}

                  {/* Quantity with Quick Adjust */}
                  {/*<div className="space-y-2 mt-auto">*/}
                  {/*  <div className="flex items-center gap-2">*/}
                  {/*    <Hash className="h-4 w-4 text-muted-foreground" />*/}
                  {/*    <span className="text-muted-foreground text-sm">Quantity</span>*/}
                  {/*  </div>*/}
                  {/*  {onQuickAdjust ? (*/}
                  {/*      <div className="flex items-center justify-between gap-2">*/}
                  {/*        <Button*/}
                  {/*            variant="outline"*/}
                  {/*            size="sm"*/}
                  {/*            onClick={(e) => {*/}
                  {/*              e.stopPropagation()*/}
                  {/*              onQuickAdjust(item, -1)*/}
                  {/*            }}*/}
                  {/*            disabled={item.quantity === 0}*/}
                  {/*            className="h-8 w-8 p-0"*/}
                  {/*        >*/}
                  {/*          <Minus className="h-4 w-4"/>*/}
                  {/*        </Button>*/}
                  {/*        <div className="flex items-center gap-1 flex-1 justify-center">*/}
                  {/*          <span className="font-semibold text-lg">{item.quantity}</span>*/}
                  {/*          <span className="text-muted-foreground text-sm">{item.unit}</span>*/}
                  {/*        </div>*/}
                  {/*        <Button*/}
                  {/*            variant="outline"*/}
                  {/*            size="sm"*/}
                  {/*            onClick={(e) => {*/}
                  {/*              e.stopPropagation()*/}
                  {/*              onQuickAdjust(item, 1)*/}
                  {/*            }}*/}
                  {/*            className="h-8 w-8 p-0"*/}
                  {/*        >*/}
                  {/*          <Plus className="h-4 w-4"/>*/}
                  {/*        </Button>*/}
                  {/*      </div>*/}
                  {/*  ) : (*/}
                  {/*      <div className="flex items-center justify-between p-2 bg-muted/50 rounded">*/}
                  {/*        <div className="flex items-center gap-1">*/}
                  {/*          <span className="font-semibold">{item.quantity}</span>*/}
                  {/*          <span className="text-muted-foreground text-xs">{item.unit}</span>*/}
                  {/*        </div>*/}
                  {/*      </div>*/}
                  {/*  )}*/}
                  {/*</div>*/}

                  {/* Low Stock Warning */}
                  {lowStock && (
                    <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded text-xs text-destructive">
                      <AlertTriangle className="h-3 w-3" />
                      <span>Low Stock</span>
                    </div>
                  )}

                  {/* Notes */}
                  {item.notes && (
                    <div className="p-2 bg-muted/50 rounded">
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {item.notes}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t mt-auto">
                    {onAdjustStock && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onAdjustStock(item)}
                        title="Adjust stock"
                        className="flex-1"
                      >
                        <Hash className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(item)}
                      className="flex-1"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDelete(item)}
                      className="flex-1 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
      </>
  )

  return (
      <div className="space-y-4">
        {viewMode === 'list' ? renderListView() : renderCardView()}
    </div>
  )
}
