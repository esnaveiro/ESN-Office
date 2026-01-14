"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Package, MapPin, Archive, Table2, Box, Sofa, Monitor } from "lucide-react"
import type { InventoryItem } from "@/app/inventory/page"

interface InventoryMapViewProps {
  inventory: InventoryItem[]
  onItemClick?: (item: InventoryItem) => void
}

// Map location names to their corresponding areas in the office
const LOCATION_MAPPING: Record<string, string> = {
  "Storage (Top Left)": "storage",
  "Top Right Table": "top-table",
  "Left Closet": "left-closet",
  "Right Closet": "right-closet",
  "Left Table": "left-table",
  "Right Table": "right-table",
  "Couch Area": "couch",
  "Display (Bottom Right)": "display",
}

export function InventoryMapView({ inventory, onItemClick }: InventoryMapViewProps) {
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null)
  const [hoveredLocation, setHoveredLocation] = useState<string | null>(null)

  // Group inventory by location
  const inventoryByLocation = inventory.reduce((acc, item) => {
    const locationKey = LOCATION_MAPPING[item.location] || 'other'
    if (!acc[locationKey]) {
      acc[locationKey] = []
    }
    acc[locationKey].push(item)
    return acc
  }, {} as Record<string, InventoryItem[]>)

  const getItemCountForLocation = (locationKey: string) => {
    return inventoryByLocation[locationKey]?.length || 0
  }

  const handleLocationClick = (locationKey: string, locationName: string) => {
    if (selectedLocation === locationKey) {
      setSelectedLocation(null)
    } else {
      setSelectedLocation(locationKey)
    }
  }

  const renderInventoryList = (locationKey: string) => {
    const items = inventoryByLocation[locationKey] || []
    if (items.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
          <Package className="h-12 w-12 mb-3 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground">
            No items in this location
          </p>
        </div>
      )
    }

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 max-h-[500px] overflow-y-auto pr-2">
          {items.map(item => (
            <div
              key={item.id}
              className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50 hover:shadow-sm transition-all"
              onClick={() => onItemClick?.(item)}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-sm flex-1">{item.name}</p>
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    {item.quantity} {item.unit}
                  </Badge>
                </div>
                {item.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                )}
                {item.category && (
                  <Badge variant="outline" className="text-xs">
                    {item.category}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Office Map - Left Side */}
          <div className="lg:w-1/2">
            <h3 className="text-lg font-semibold mb-2">Office Layout</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Click on any area to see inventory items
            </p>

            <div className="relative bg-muted/30 rounded-lg border-2 border-border">
              <div className="relative w-full" style={{ aspectRatio: '4/5', minHeight: '400px' }}>
                {/* Office Outer Walls */}
                <div className="absolute inset-1 border-2 border-muted-foreground/40"></div>

                {/* STORAGE - Top Left */}
                <div
                  className={`absolute bg-muted border-2 cursor-pointer transition-all ${
                    selectedLocation === 'storage' ? 'border-primary bg-primary/10' :
                    hoveredLocation === 'storage' ? 'border-primary/50 bg-primary/5' :
                    'border-muted-foreground/40'
                  }`}
                  style={{ top: '3%', left: '5%', width: '23%', height: '29%' }}
                  onClick={() => handleLocationClick('storage', 'Storage (Top Left)')}
                  onMouseEnter={() => setHoveredLocation('storage')}
                  onMouseLeave={() => setHoveredLocation(null)}
                >
                  <div className="absolute top-1/4 left-0 right-0 h-px bg-muted-foreground/40"></div>
                  <div className="absolute top-2/4 left-0 right-0 h-px bg-muted-foreground/40"></div>
                  <div className="absolute top-3/4 left-0 right-0 h-px bg-muted-foreground/40"></div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-2 z-10">
                    <Archive className="h-5 w-5 mb-1 text-primary" />
                    <span className="text-xs font-medium text-center">Storage</span>
                    {getItemCountForLocation('storage') > 0 && (
                      <Badge className="mt-1 text-xs">{getItemCountForLocation('storage')}</Badge>
                    )}
                  </div>
                </div>

                {/* TABLE - Top Right */}
                <div
                  className={`absolute bg-muted border-2 cursor-pointer transition-all ${
                    selectedLocation === 'top-table' ? 'border-primary bg-primary/10' :
                    hoveredLocation === 'top-table' ? 'border-primary/50 bg-primary/5' :
                    'border-muted-foreground/40'
                  }`}
                  style={{ top: '8%', right: '8%', width: '24%', height: '11%' }}
                  onClick={() => handleLocationClick('top-table', 'Top Right Table')}
                  onMouseEnter={() => setHoveredLocation('top-table')}
                  onMouseLeave={() => setHoveredLocation(null)}
                >
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
                    <Table2 className="h-4 w-4 mb-1 text-primary" />
                    <span className="text-xs font-medium text-center">Top Table</span>
                    {getItemCountForLocation('top-table') > 0 && (
                      <Badge className="mt-1 text-xs">{getItemCountForLocation('top-table')}</Badge>
                    )}
                  </div>
                </div>

                {/* Chairs around top right table (non-interactive) */}
                <div className="absolute bg-muted border border-muted-foreground/40"
                     style={{ top: '4.5%', right: '12%', width: '4%', height: '2.5%' }}>
                </div>
                <div className="absolute bg-muted border border-muted-foreground/40"
                     style={{ top: '4.5%', right: '24%', width: '4%', height: '2.5%' }}>
                </div>
                <div className="absolute bg-muted border border-muted-foreground/40"
                     style={{ top: '20.5%', right: '12%', width: '4%', height: '2.5%' }}>
                </div>
                <div className="absolute bg-muted border border-muted-foreground/40"
                     style={{ top: '20.5%', right: '24%', width: '4%', height: '2.5%' }}>
                </div>

                {/* LEFT CLOSET */}
                <div
                  className={`absolute bg-muted border-2 cursor-pointer transition-all ${
                    selectedLocation === 'left-closet' ? 'border-primary bg-primary/10' :
                    hoveredLocation === 'left-closet' ? 'border-primary/50 bg-primary/5' :
                    'border-muted-foreground/40'
                  }`}
                  style={{ top: '34%', left: '1%', width: '38%', height: '8%' }}
                  onClick={() => handleLocationClick('left-closet', 'Left Closet')}
                  onMouseEnter={() => setHoveredLocation('left-closet')}
                  onMouseLeave={() => setHoveredLocation(null)}
                >
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
                    <Box className="h-4 w-4 mb-1 text-primary" />
                    <span className="text-xs font-medium">Left Closet</span>
                    {getItemCountForLocation('left-closet') > 0 && (
                      <Badge className="mt-1 text-xs">{getItemCountForLocation('left-closet')}</Badge>
                    )}
                  </div>
                </div>

                {/* RIGHT CLOSET */}
                <div
                  className={`absolute bg-muted border-2 cursor-pointer transition-all ${
                    selectedLocation === 'right-closet' ? 'border-primary bg-primary/10' :
                    hoveredLocation === 'right-closet' ? 'border-primary/50 bg-primary/5' :
                    'border-muted-foreground/40'
                  }`}
                  style={{ top: '34%', right: '1%', width: '38%', height: '8%' }}
                  onClick={() => handleLocationClick('right-closet', 'Right Closet')}
                  onMouseEnter={() => setHoveredLocation('right-closet')}
                  onMouseLeave={() => setHoveredLocation(null)}
                >
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
                    <Box className="h-4 w-4 mb-1 text-primary" />
                    <span className="text-xs font-medium">Right Closet</span>
                    {getItemCountForLocation('right-closet') > 0 && (
                      <Badge className="mt-1 text-xs">{getItemCountForLocation('right-closet')}</Badge>
                    )}
                  </div>
                </div>

                {/* TABLE - Left */}
                <div
                  className={`absolute bg-muted border-2 cursor-pointer transition-all ${
                    selectedLocation === 'left-table' ? 'border-primary bg-primary/10' :
                    hoveredLocation === 'left-table' ? 'border-primary/50 bg-primary/5' :
                    'border-muted-foreground/40'
                  }`}
                  style={{ top: '50%', left: '5%', width: '24%', height: '11%' }}
                  onClick={() => handleLocationClick('left-table', 'Left Table')}
                  onMouseEnter={() => setHoveredLocation('left-table')}
                  onMouseLeave={() => setHoveredLocation(null)}
                >
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
                    <Table2 className="h-4 w-4 mb-1 text-primary" />
                    <span className="text-xs font-medium">Left Table</span>
                    {getItemCountForLocation('left-table') > 0 && (
                      <Badge className="mt-1 text-xs">{getItemCountForLocation('left-table')}</Badge>
                    )}
                  </div>
                </div>

                {/* Chairs around left table (non-interactive) */}
                <div className="absolute bg-muted border border-muted-foreground/40"
                     style={{ top: '46.5%', left: '9%', width: '4%', height: '2.5%' }}>
                </div>
                <div className="absolute bg-muted border border-muted-foreground/40"
                     style={{ top: '46.5%', left: '21%', width: '4%', height: '2.5%' }}>
                </div>
                <div className="absolute bg-muted border border-muted-foreground/40"
                     style={{ top: '62.5%', left: '9%', width: '4%', height: '2.5%' }}>
                </div>
                <div className="absolute bg-muted border border-muted-foreground/40"
                     style={{ top: '62.5%', left: '21%', width: '4%', height: '2.5%' }}>
                </div>

                {/* TABLE - Right */}
                <div
                  className={`absolute bg-muted border-2 cursor-pointer transition-all ${
                    selectedLocation === 'right-table' ? 'border-primary bg-primary/10' :
                    hoveredLocation === 'right-table' ? 'border-primary/50 bg-primary/5' :
                    'border-muted-foreground/40'
                  }`}
                  style={{ top: '55%', right: '8%', width: '24%', height: '11%' }}
                  onClick={() => handleLocationClick('right-table', 'Right Table')}
                  onMouseEnter={() => setHoveredLocation('right-table')}
                  onMouseLeave={() => setHoveredLocation(null)}
                >
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
                    <Table2 className="h-4 w-4 mb-1 text-primary" />
                    <span className="text-xs font-medium">Right Table</span>
                    {getItemCountForLocation('right-table') > 0 && (
                      <Badge className="mt-1 text-xs">{getItemCountForLocation('right-table')}</Badge>
                    )}
                  </div>
                </div>

                {/* Chairs around right table (non-interactive) */}
                <div className="absolute bg-muted border border-muted-foreground/40"
                     style={{ top: '51.5%', right: '12%', width: '4%', height: '2.5%' }}>
                </div>
                <div className="absolute bg-muted border border-muted-foreground/40"
                     style={{ top: '51.5%', right: '24%', width: '4%', height: '2.5%' }}>
                </div>
                <div className="absolute bg-muted border border-muted-foreground/40"
                     style={{ top: '67.5%', right: '12%', width: '4%', height: '2.5%' }}>
                </div>
                <div className="absolute bg-muted border border-muted-foreground/40"
                     style={{ top: '67.5%', right: '24%', width: '4%', height: '2.5%' }}>
                </div>

                {/* COUCH */}
                <div
                  className={`absolute bg-muted border-2 cursor-pointer transition-all ${
                    selectedLocation === 'couch' ? 'border-primary bg-primary/10' :
                    hoveredLocation === 'couch' ? 'border-primary/50 bg-primary/5' :
                    'border-muted-foreground/40'
                  }`}
                  style={{ top: '70%', left: '5%', width: '17%', height: '22%' }}
                  onClick={() => handleLocationClick('couch', 'Couch Area')}
                  onMouseEnter={() => setHoveredLocation('couch')}
                  onMouseLeave={() => setHoveredLocation(null)}
                >
                  <div className="absolute top-0 left-0 bottom-0 w-1/5 bg-muted-foreground/20 border-r border-muted-foreground/40"></div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-2 z-10">
                    <Sofa className="h-4 w-4 mb-1 text-primary" />
                    <span className="text-xs font-medium text-center">Couch</span>
                    {getItemCountForLocation('couch') > 0 && (
                      <Badge className="mt-1 text-xs">{getItemCountForLocation('couch')}</Badge>
                    )}
                  </div>
                </div>

                {/* DISPLAY */}
                <div
                  className={`absolute bg-muted border-2 cursor-pointer transition-all ${
                    selectedLocation === 'display' ? 'border-primary bg-primary/10' :
                    hoveredLocation === 'display' ? 'border-primary/50 bg-primary/5' :
                    'border-muted-foreground/40'
                  }`}
                  style={{ bottom: '1%', right: '8%', width: '35%', height: '15%' }}
                  onClick={() => handleLocationClick('display', 'Display (Bottom Right)')}
                  onMouseEnter={() => setHoveredLocation('display')}
                  onMouseLeave={() => setHoveredLocation(null)}
                >
                  <div className="absolute top-0 bottom-0 left-1/3 w-px bg-muted-foreground/40"></div>
                  <div className="absolute top-0 bottom-0 left-2/3 w-px bg-muted-foreground/40"></div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-2 z-10">
                    <Monitor className="h-4 w-4 mb-1 text-primary" />
                    <span className="text-xs font-medium">Display</span>
                    {getItemCountForLocation('display') > 0 && (
                      <Badge className="mt-1 text-xs">{getItemCountForLocation('display')}</Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Inventory Details - Right Side */}
          <div className="lg:w-1/2">
            {selectedLocation ? (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">
                    {Object.entries(LOCATION_MAPPING).find(([, key]) => key === selectedLocation)?.[0] || 'Selected Location'}
                  </h3>
                </div>
                {renderInventoryList(selectedLocation)}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
                <Package className="h-12 w-12 mb-3 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">
                  Select a location on the map to view inventory items
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
