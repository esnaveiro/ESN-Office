"use client"

import {useEffect, useMemo, useState} from "react"
import {useRouter} from "next/navigation"
import {SiteHeader} from "@/components/site-header"
import {useAuth} from "@/hooks/useAuth"
import {Card, CardContent} from "@/components/ui/card"
import {Button} from "@/components/ui/button"
import {Input} from "@/components/ui/input"
import {Badge} from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertCircle,
  ArrowUpDown,
  CheckSquare,
  Download,
  Filter,
  History,
  LayoutGrid,
  List,
  Loader2,
  MapPin,
  Minus,
  Package,
  Plus,
  Search,
  Trash2,
  XSquare
} from "lucide-react"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select"
import {InventoryList} from "@/components/inventory-list"
import {InventoryForm} from "@/components/inventory-form"
import {InventoryMapView} from "@/components/inventory-map-view"

export interface InventoryItem {
  id: string
  name: string
  description: string | null
  quantity: number
  unit: string
  location: string
  category: string | null
  notes: string | null
  low_stock_threshold: number | null
  created_by_id: string | null
  created_by_name: string
  created_at: string
  updated_at: string
}

export default function InventoryPage() {
  const router = useRouter()
  const { user, volunteer, loading: authLoading } = useAuth()
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedLocation, setSelectedLocation] = useState<string>("all")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [showLowStockOnly, setShowLowStockOnly] = useState(false)
  const [sortBy, setSortBy] = useState<string>("name")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [bulkMode, setBulkMode] = useState(false)
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false)
  const [showStockDialog, setShowStockDialog] = useState(false)
  const [stockItem, setStockItem] = useState<InventoryItem | null>(null)
  const [newQuantity, setNewQuantity] = useState<number>(0)
  const [adjusting, setAdjusting] = useState(false)
  const [viewMode, setViewMode] = useState<'card' | 'list'>('list')

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth/login')
    }
  }, [authLoading, user, router])

  // Fetch inventory
  const fetchInventory = async (location?: string) => {
    try {
      setLoading(true)
      const url = location && location !== 'all'
        ? `/api/inventory?location=${encodeURIComponent(location)}`
        : '/api/inventory'

      const response = await fetch(url)
      const data = await response.json()

      if (response.ok) {
        setInventory(data.inventory || [])
      } else {
        console.error('Failed to fetch inventory:', data.error)
      }
    } catch (error) {
      console.error('Error fetching inventory:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchInventory(selectedLocation)
    }
  }, [user, selectedLocation])

  // Filter, sort and paginate inventory
  const filteredAndSortedInventory = useMemo(() => {
    const query = searchQuery.toLowerCase()

    return inventory
      .filter(item => {
        const matchesSearch = searchQuery === '' ||
          item.name.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query) ||
          item.category?.toLowerCase().includes(query) ||
          item.location.toLowerCase().includes(query)

        const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory
        const matchesLowStock = !showLowStockOnly || item.quantity <= 5

        return matchesSearch && matchesCategory && matchesLowStock
      })
      .sort((a, b) => {
        let comparison = 0

        switch (sortBy) {
          case 'name':
            comparison = a.name.localeCompare(b.name)
            break
          case 'quantity':
            comparison = a.quantity - b.quantity
            break
          case 'location':
            comparison = a.location.localeCompare(b.location)
            break
          case 'date':
            comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            break
          default:
            comparison = 0
        }

        return sortOrder === 'asc' ? comparison : -comparison
      })
  }, [inventory, searchQuery, selectedCategory, showLowStockOnly, sortBy, sortOrder])

  // Get unique locations and categories for filters
  const uniqueLocations = useMemo(() =>
    Array.from(new Set(inventory.map(item => item.location))).sort(),
    [inventory]
  )
  const uniqueCategories = useMemo(() =>
    Array.from(new Set(inventory.map(item => item.category).filter(Boolean))).sort(),
    [inventory]
  )

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedInventory.length / itemsPerPage)
  const paginatedInventory = useMemo(() =>
    filteredAndSortedInventory.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    ),
    [filteredAndSortedInventory, currentPage, itemsPerPage]
  )

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedLocation, selectedCategory, showLowStockOnly, sortBy, sortOrder])

  // Calculate total unique items
  const totalItems = inventory.length

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item)
    setShowForm(true)
  }

  const handleFormSuccess = () => {
    setShowForm(false)
    setEditingItem(null)
    fetchInventory(selectedLocation)
  }

  const handleFormCancel = () => {
    setShowForm(false)
    setEditingItem(null)
  }

  const handleDeleteClick = (item: InventoryItem) => {
    setItemToDelete(item)
    setShowDeleteDialog(true)
  }

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/inventory?id=${itemToDelete.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchInventory(selectedLocation)
        setShowDeleteDialog(false)
        setItemToDelete(null)
      } else {
        const data = await response.json()
        alert(`Failed to delete item: ${data.error}`)
      }
    } catch (error) {
      console.error('Error deleting item:', error)
      alert('An error occurred while deleting the item')
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false)
    setItemToDelete(null)
  }

  // Stock adjustment
  const handleStockAdjustmentClick = (item: InventoryItem) => {
    setStockItem(item)
    setNewQuantity(item.quantity)
    setShowStockDialog(true)
  }

  // Quick stock adjustment
  const handleQuickAdjust = async (item: InventoryItem, change: number) => {
    const newQuantity = Math.max(0, item.quantity + change)

    try {
      const response = await fetch('/api/inventory', {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          id: item.id,
          quantity: newQuantity
        })
      })

      if (response.ok) {
        await fetchInventory(selectedLocation)
      }
    } catch (error) {
      console.error('Error adjusting stock:', error)
    }
  }

  const handleStockAdjustmentSave = async () => {
    if (!stockItem) return

    setAdjusting(true)
    try {
      const response = await fetch('/api/inventory', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: stockItem.id,
          quantity: newQuantity
        })
      })

      if (response.ok) {
        await fetchInventory(selectedLocation)
        setShowStockDialog(false)
        setStockItem(null)
      }
    } catch (error) {
      console.error('Error adjusting stock:', error)
    } finally {
      setAdjusting(false)
    }
  }

  const handleStockCancel = () => {
    setShowStockDialog(false)
    setStockItem(null)
  }

  // Bulk selection
  const handleSelectItem = (id: string) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const handleSelectAll = (selected: boolean) => {
    setSelectedItems(selected ? paginatedInventory.map(item => item.id) : [])
  }

  const handleBulkDelete = async () => {
    setDeleting(true)
    try {
      await Promise.all(
        selectedItems.map(id =>
          fetch(`/api/inventory?id=${id}`, { method: 'DELETE' })
        )
      )
      await fetchInventory(selectedLocation)
      setSelectedItems([])
      setShowBulkDeleteDialog(false)
      setBulkMode(false)
    } catch (error) {
      console.error('Error bulk deleting items:', error)
    } finally {
      setDeleting(false)
    }
  }

  // Export to CSV
  const handleExport = () => {
    const headers = ['Name', 'Description', 'Quantity', 'Unit', 'Location', 'Category', 'Notes', 'Added By', 'Created At']
    const rows = filteredAndSortedInventory.map(item => [
      item.name,
      item.description || '',
      item.quantity,
      item.unit,
      item.location,
      item.category || '',
      item.notes || '',
      item.created_by_name,
      new Date(item.created_at).toLocaleDateString()
    ])

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `inventory-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <div className="container mx-auto px-6 sm:px-8 lg:px-10 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <Package className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
              Office Inventory
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage and track all items in the office
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 sm:flex-none"
              onClick={handleExport}
              disabled={filteredAndSortedInventory.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button className="flex-1 sm:flex-none" onClick={() => {
              setEditingItem(null)
              setShowForm(true)
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Items</p>
                  <p className="text-2xl font-bold">{totalItems}</p>
                </div>
                <Package className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Categories</p>
                  <p className="text-2xl font-bold">
                    {new Set(inventory.map(i => i.category).filter(Boolean)).size}
                  </p>
                </div>
                <History className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Locations</p>
                  <p className="text-2xl font-bold">{uniqueLocations.length}</p>
                </div>
                <MapPin className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Map View Section */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold">Map View</h2>
                </div>
                <InventoryMapView
                  inventory={inventory}
                  onItemClick={handleEdit}
                />
              </div>

              {/* Inventory List Section */}
              <div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-semibold">Inventory List</h2>
                    <Badge>{filteredAndSortedInventory.length} items</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {bulkMode && selectedItems.length > 0 && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setShowBulkDeleteDialog(true)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete {selectedItems.length}
                      </Button>
                    )}
                    <div className="flex gap-1 border rounded-lg p-1">
                      <Button
                          variant={viewMode === 'card' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setViewMode('card')}
                          className="h-8 px-2"
                      >
                        <LayoutGrid className="h-4 w-4"/>
                      </Button>
                      <Button
                          variant={viewMode === 'list' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setViewMode('list')}
                          className="h-8 px-2"
                      >
                        <List className="h-4 w-4"/>
                      </Button>
                    </div>
                    <Button
                      variant={bulkMode ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setBulkMode(!bulkMode)
                        setSelectedItems([])
                      }}
                    >
                      {bulkMode ? <XSquare className="h-4 w-4 mr-2" /> : <CheckSquare className="h-4 w-4 mr-2" />}
                      {bulkMode ? 'Cancel' : 'Bulk Select'}
                    </Button>
                  </div>
                </div>

                {/* Search and Filters */}
                <Card className="mb-4">
                  <CardContent className="pt-6 space-y-4">
                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search inventory..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    {/* Filters Row */}
                    <div className="flex flex-col md:flex-row gap-4">
                      {/* Category Filter */}
                      <div className="flex items-center gap-2 flex-1">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {uniqueCategories.map(category => (
                              <SelectItem key={category} value={category!}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Sort By */}
                      <div className="flex items-center gap-2 flex-1">
                        <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                        <Select value={sortBy} onValueChange={setSortBy}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Sort by" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="name">Name</SelectItem>
                            <SelectItem value="quantity">Quantity</SelectItem>
                            <SelectItem value="location">Location</SelectItem>
                            <SelectItem value="date">Date Added</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Sort Order Toggle */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={toggleSortOrder}
                        title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                      >
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </Button>

                      {/* Low Stock Toggle */}
                      <Button
                        variant={showLowStockOnly ? 'destructive' : 'outline'}
                        size="sm"
                        onClick={() => setShowLowStockOnly(!showLowStockOnly)}
                      >
                        {showLowStockOnly ? 'Show All' : 'Low Stock Only'}
                      </Button>
                    </div>

                    {/* Location Filters */}
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        variant={selectedLocation === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedLocation('all')}
                      >
                        All Locations
                      </Button>
                      {uniqueLocations.map(location => (
                        <Button
                          key={location}
                          variant={selectedLocation === location ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSelectedLocation(location)}
                        >
                          {location}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Inventory List */}
                {loading ? (
                  <Card>
                    <CardContent className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <InventoryList
                      inventory={paginatedInventory}
                      onEdit={handleEdit}
                      onDelete={handleDeleteClick}
                      onAdjustStock={handleStockAdjustmentClick}
                      onQuickAdjust={handleQuickAdjust}
                      selectedItems={selectedItems}
                      onSelectItem={handleSelectItem}
                      onSelectAll={handleSelectAll}
                      bulkMode={bulkMode}
                      viewMode={viewMode}
                    />

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <Card className="mt-4">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-muted-foreground">
                              Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredAndSortedInventory.length)} of {filteredAndSortedInventory.length}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                              >
                                Previous
                              </Button>
                              <div className="flex items-center gap-1">
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                  <Button
                                    key={page}
                                    variant={currentPage === page ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setCurrentPage(page)}
                                    className="w-10"
                                  >
                                    {page}
                                  </Button>
                                ))}
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                              >
                                Next
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </div>
        </div>
      </div>

      {/* Edit Item Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => {
        if (!open) handleFormCancel()
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Edit Item' : 'Add New Item'}
            </DialogTitle>
            <DialogDescription>
              {editingItem ? 'Update the inventory item details below.' : 'Add a new item to the inventory.'}
            </DialogDescription>
          </DialogHeader>
          <InventoryForm
            item={editingItem}
            volunteer={volunteer ?? { id: '', name: '' }}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={(open) => {
        if (!open) handleDeleteCancel()
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Delete Item
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this item? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {itemToDelete && (
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{itemToDelete.name}</span>
                <Badge>
                  {itemToDelete.quantity} {itemToDelete.unit}
                </Badge>
              </div>
              {itemToDelete.description && (
                <p className="text-sm text-muted-foreground">{itemToDelete.description}</p>
              )}
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">{itemToDelete.location}</span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleDeleteCancel}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Item'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock Adjustment Dialog */}
      <Dialog open={showStockDialog} onOpenChange={(open) => {
        if (!open) handleStockCancel()
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
            <DialogDescription>
              Update the quantity for this item.
            </DialogDescription>
          </DialogHeader>

          {stockItem && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">{stockItem.name}</span>
                  <Badge>
                    Current: {stockItem.quantity} {stockItem.unit}
                  </Badge>
                </div>
                {stockItem.location && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span>{stockItem.location}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">New Quantity</label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setNewQuantity(Math.max(0, newQuantity - 1))}
                    disabled={newQuantity === 0}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    min="0"
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                    className="text-center"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setNewQuantity(newQuantity + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {stockItem.unit}
                  </span>
                </div>
                {newQuantity !== stockItem.quantity && (
                  <p className="text-sm text-muted-foreground">
                    Change: {newQuantity > stockItem.quantity ? '+' : ''}{newQuantity - stockItem.quantity} {stockItem.unit}
                  </p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleStockCancel}
              disabled={adjusting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleStockAdjustmentSave}
              disabled={adjusting || !!(stockItem && newQuantity === stockItem.quantity)}
            >
              {adjusting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={showBulkDeleteDialog} onOpenChange={(open) => {
        if (!open) {
          setShowBulkDeleteDialog(false)
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Delete {selectedItems.length} Items
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedItems.length} selected items? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-2">Items to be deleted:</p>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {selectedItems.map(id => {
                const item = inventory.find(i => i.id === id)
                return item ? (
                  <div key={id} className="text-sm text-muted-foreground">
                    • {item.name} ({item.quantity} {item.unit})
                  </div>
                ) : null
              })}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBulkDeleteDialog(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                `Delete ${selectedItems.length} Items`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
