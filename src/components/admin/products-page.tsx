"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { 
  Search, 
  MoreHorizontal, 
  Trash2, 
  Eye, 
  Package, 
  Plus, 
  Edit, 
  DollarSign, 
  ShoppingCart, 
  AlertTriangle, 
  Download,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Warehouse,
  RefreshCw
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Product, ProductStats } from "@/types/product"
import InventoryStatsCards, { InventoryOverviewCards } from "@/components/admin/InventoryStatsCards"
import ProductInventoryDetailsModal from "@/components/admin/ProductInventoryDetailsModal"
import type { 
  EnhancedProductStats, 
  InventoryOverview, 
  ProductInventorySummary,
  InventoryFilters 
} from "@/types/inventory"

interface Brand {
  $id: string
  name: string
  prefix: string
  status: boolean
}

interface Category {
  $id: string
  name: string
  status: boolean
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [availableFilter, setAvailableFilter] = useState("all")
  const [catalogFilter, setCatalogFilter] = useState("all")
  const [brandFilter, setBrandFilter] = useState("all")
  const [stats, setStats] = useState<ProductStats>({
    total: 0,
    available: 0,
    unavailable: 0,
    onSale: 0,
    lowStock: 0,
    outOfStock: 0,
    totalValue: 0
  })
  // Enhanced inventory states
  const [enhancedStats, setEnhancedStats] = useState<EnhancedProductStats | null>(null)
  const [inventoryOverview, setInventoryOverview] = useState<InventoryOverview | null>(null)
  const [inventoryData, setInventoryData] = useState<Product[]>([])
  const [inventoryLoading, setInventoryLoading] = useState(false)
  const [inventoryError, setInventoryError] = useState<string | null>(null)
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<string | null>(null)
  const [uniqueCatalogs, setUniqueCatalogs] = useState<string[]>([])
  const [uniqueBrands, setUniqueBrands] = useState<string[]>([])
  
  // Inventory modal states
  const [inventoryModalOpen, setInventoryModalOpen] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [selectedProductName, setSelectedProductName] = useState<string>("")
  
  // Enhanced filters
  const [inventoryFilters, setInventoryFilters] = useState<InventoryFilters>({
    stockStatus: 'all',
    salesVelocity: 'all',
    alertLevel: 'all'
  })  // Fetch brands
  const fetchBrands = async () => {
    try {
      const response = await fetch('/api/admin/brands?status=true')
      const data = await response.json()
      
      if (data.error) {
        console.error("Error fetching brands:", data.error)
        return
      }

      setBrands(data.brands || [])
    } catch (error) {
      console.error("Failed to fetch brands:", error)
    }
  }

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/admin/categories?status=true')
      const data = await response.json()
      
      if (data.error) {
        console.error("Error fetching categories:", data.error)
        return
      }

      setCategories(data.categories || [])
    } catch (error) {
      console.error("Failed to fetch categories:", error)
    }
  }

  // Fetch enhanced inventory analytics
  const fetchInventoryAnalytics = async () => {
    try {
      setInventoryLoading(true)
      setInventoryError(null)
      
      const response = await fetch('/api/admin/inventory-analytics-simple')
      const data = await response.json()
      
      if (data.success) {
        setEnhancedStats(data.stats)
        setInventoryOverview(data.overview)
        setInventoryData(data.products || [])
      } else {
        console.error("Error fetching inventory analytics:", data.error)
        setInventoryError(data.error || 'Failed to fetch inventory analytics')
      }
    } catch (error) {
      console.error("Failed to fetch inventory analytics:", error)
      setInventoryError('Network error occurred while fetching inventory data')
    } finally {
      setInventoryLoading(false)
    }
  }

  // Fetch products
  const fetchProducts = async () => {
    try {
      setLoading(true)
      
      // Build query parameters
      const params = new URLSearchParams({
        search: searchTerm,
        limit: "100"
      })
      
      if (availableFilter !== "all") {
        params.append("available", availableFilter)
      }
      if (catalogFilter !== "all") {
        params.append("catalog", catalogFilter)
      }
      if (brandFilter !== "all") {
        params.append("brand", brandFilter)
      }

      const response = await fetch(`/api/admin/products?${params.toString()}`)
      const data = await response.json()
      
      if (data.error) {
        console.error("Error:", data.error)
        return
      }

      setProducts(data.products || [])
      setStats(data.stats || stats)
      
      // Extract unique values for filters
      const catalogs = [...new Set(data.products?.map((p: Product) => p.category_id).filter(Boolean))] as string[]
      const brandIds = [...new Set(data.products?.map((p: Product) => p.brand_id).filter(Boolean))] as string[]
      setUniqueCatalogs(catalogs)
      setUniqueBrands(brandIds)

    } catch (error) {
      console.error("Failed to fetch products:", error)
    } finally {
      setLoading(false)
    }
  }

  // Helper functions to get brand and category names
  const getBrandPrefix = (brandId: string) => {
    const brand = brands.find(b => b.$id === brandId)
    return brand ? brand.prefix : brandId
  }

  const getBrandName = (brandId: string) => {
    const brand = brands.find(b => b.$id === brandId)
    return brand ? brand.name : brandId
  }

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.$id === categoryId)
    return category ? category.name : categoryId
  }

  // Delete product
  const handleDelete = async () => {
    if (!productToDelete) return

    try {
      const response = await fetch(
        `/api/admin/products?productId=${productToDelete}`,
        { method: "DELETE" }
      )
      
      if (response.ok) {
        fetchProducts()
        setDeleteDialogOpen(false)
        setProductToDelete(null)
      }
    } catch (error) {
      console.error("Failed to delete product:", error)
    }
  }

  // Toggle product availability
  const toggleAvailability = async (productId: string, currentAvailability: boolean) => {
    try {
      const response = await fetch(`/api/admin/products?productId=${productId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ is_active: !currentAvailability }),
      })
      
      if (response.ok) {
        fetchProducts()
      }
    } catch (error) {
      console.error("Failed to update product availability:", error)
    }
  }

  // Open inventory details modal
  const openInventoryModal = (productId: string, productName: string) => {
    setSelectedProductId(productId)
    setSelectedProductName(productName)
    setInventoryModalOpen(true)
  }

  // Simplified - no complex analytics needed
  const getProductSalesInfo = (productId: string) => {
    return null // Simplified
  }

  // Simplified - no complex analytics needed  
  const getProductInventoryInfo = (productId: string) => {
    return null // Simplified
  }

  // Simplified stock status (essential info only)
  const getEnhancedStockStatus = (product: Product) => {
    const currentStock = product.units || product.stockQuantity || 0
    const threshold = product.lowStockThreshold || product.min_order_quantity || 5
    
    return {
      currentStock,
      availableStock: currentStock,
      reservedStock: 0,
      reorderPoint: threshold,
      salesVelocity: 'medium',
      totalSold: 0,
      revenue: 0
    }
  }

  useEffect(() => {
    fetchBrands()
    fetchCategories()
    fetchProducts()
    fetchInventoryAnalytics()
  }, [])

  // Refetch data when filters change
  useEffect(() => {
    fetchProducts()
  }, [searchTerm, availableFilter, catalogFilter, brandFilter])

  // Filter products based on search and filters
  const filteredProducts = products.filter((product) => {
    const brandName = getBrandName(product.brand_id).toLowerCase()
    const brandPrefix = getBrandPrefix(product.brand_id).toLowerCase()
    const categoryName = getCategoryName(product.category_id).toLowerCase()
    const searchLower = searchTerm.toLowerCase()
    
    const matchesSearch = product.name.toLowerCase().includes(searchLower) ||
                         brandName.includes(searchLower) ||
                         brandPrefix.includes(searchLower) ||
                         categoryName.includes(searchLower)
    
    // Enhanced filtering based on inventory status
    const stockInfo = getEnhancedStockStatus(product)
    
    // Stock status filter
    if (inventoryFilters.stockStatus && inventoryFilters.stockStatus !== 'all') {
      const stockFilter = inventoryFilters.stockStatus
      if (stockFilter === 'out-of-stock' && stockInfo.currentStock > 0) return false
      if (stockFilter === 'low-stock' && (stockInfo.currentStock === 0 || stockInfo.currentStock > stockInfo.reorderPoint)) return false
      if (stockFilter === 'in-stock' && stockInfo.currentStock <= stockInfo.reorderPoint) return false
    }
    
    // Sales velocity filter
    if (inventoryFilters.salesVelocity && inventoryFilters.salesVelocity !== 'all') {
      if (stockInfo.salesVelocity !== inventoryFilters.salesVelocity) return false
    }
    
    return matchesSearch
  })

  // Export to CSV function
  const exportToCSV = () => {
    const csv = [
      ["Name", "Brand", "Brand Prefix", "Category", "Price", "Discount Price", "Active", "Units", "Min Order", "Created"],
      ...products.map(p => [
        p.name,
        getBrandName(p.brand_id),
        getBrandPrefix(p.brand_id),
        getCategoryName(p.category_id),
        p.price.toString(),
        p.discount_price.toString(),
        p.is_active ? "Yes" : "No",
        p.units.toString(),
        p.min_order_quantity.toString(),
        new Date(p.$createdAt).toLocaleDateString()
      ])
    ].map(row => row.join(",")).join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `products-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products & Inventory</h1>
          <p className="text-muted-foreground">
            Comprehensive product management with advanced inventory tracking, sales analytics, and warehouse insights
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/products/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Link>
        </Button>
      </div>

      {/* Enhanced Inventory Stats */}
      {inventoryError ? (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">Unable to load enhanced inventory data: {inventoryError}</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchInventoryAnalytics}
                className="ml-auto"
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : enhancedStats ? (
        <div className="space-y-6">
          <InventoryStatsCards stats={enhancedStats} overview={inventoryOverview || undefined} loading={inventoryLoading} />
          {/* Optional detailed overview - can be removed if not needed */}
          {inventoryOverview && (
            <InventoryOverviewCards overview={inventoryOverview} loading={inventoryLoading} />
          )}
        </div>
      ) : (
        /* Fallback to basic stats */
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                Total catalog items
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.available}</div>
              <p className="text-xs text-muted-foreground">
                Ready for sale
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">On Sale</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.onSale}</div>
              <p className="text-xs text-muted-foreground">
                Discounted items
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${stats.totalValue.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                Catalog value
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Product Catalog</CardTitle>
          <CardDescription>
            View and manage all products in your catalog
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="flex items-center space-x-4 mb-6 flex-wrap gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={availableFilter} onValueChange={setAvailableFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Availability" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Items</SelectItem>
                <SelectItem value="true">Available</SelectItem>
                <SelectItem value="false">Unavailable</SelectItem>
              </SelectContent>
            </Select>

            <Select value={catalogFilter} onValueChange={setCatalogFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category.$id} value={category.$id}>{category.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Brand" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                {brands.map(brand => (
                  <SelectItem key={brand.$id} value={brand.$id}>
                    <div className="flex items-center gap-2">
                      <span>{brand.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {brand.prefix}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={inventoryFilters.stockStatus || 'all'} onValueChange={(value) => 
              setInventoryFilters(prev => ({ ...prev, stockStatus: value as any }))
            }>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Stock Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stock</SelectItem>
                <SelectItem value="in-stock">In Stock</SelectItem>
                <SelectItem value="low-stock">Low Stock</SelectItem>
                <SelectItem value="out-of-stock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>

            <Select value={inventoryFilters.salesVelocity || 'all'} onValueChange={(value) => 
              setInventoryFilters(prev => ({ ...prev, salesVelocity: value as any }))
            }>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Sales Speed" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Speeds</SelectItem>
                <SelectItem value="fast">Fast Moving</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="slow">Slow Moving</SelectItem>
                <SelectItem value="stagnant">Stagnant</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={() => { fetchProducts(); fetchInventoryAnalytics(); }} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            
            <Button onClick={exportToCSV} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground">Loading products...</p>
            </div>
          ) : (
            /* Table */
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Inventory Status</TableHead>
                    <TableHead>Sales Performance</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10">
                        <p className="text-muted-foreground">No products found</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map((product) => {
                      const stockInfo = getEnhancedStockStatus(product)
                      return (
                      <TableRow key={product.$id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="h-10 w-10 rounded bg-gray-100 flex items-center justify-center">
                              <Package className="h-4 w-4 text-gray-400" />
                            </div>
                            <div>
                              <div className="font-medium">{product.name}</div>
                              <div className="text-sm text-muted-foreground">
                                SKU: {product.sku || `${getBrandPrefix(product.brand_id)}-${product.$id.slice(0, 6)}`}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="font-medium">{getBrandName(product.brand_id)}</div>
                            <Badge variant="outline" className="text-xs font-mono">
                              {getBrandPrefix(product.brand_id)}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{getCategoryName(product.category_id)}</div>
                        </TableCell>
                        
                        {/* Enhanced Stock Status Column */}
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant={
                                stockInfo.currentStock === 0 ? 'destructive' :
                                stockInfo.currentStock <= stockInfo.reorderPoint ? 'secondary' : 'default'
                              } className="text-xs">
                                {stockInfo.currentStock === 0 ? 'Out of Stock' :
                                 stockInfo.currentStock <= stockInfo.reorderPoint ? 'Low Stock' : 'In Stock'}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground space-y-0.5">
                              <div className="flex justify-between">
                                <span>Current:</span>
                                <span className="font-semibold text-gray-900">{stockInfo.currentStock}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Available:</span>
                                <span className="font-semibold text-green-600">{stockInfo.availableStock}</span>
                              </div>
                              {stockInfo.reservedStock > 0 && (
                                <div className="flex justify-between">
                                  <span>Reserved:</span>
                                  <span className="font-semibold text-blue-600">{stockInfo.reservedStock}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* Sales Analytics Column */}
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1">
                              {stockInfo.salesVelocity === 'fast' && <TrendingUp className="h-3 w-3 text-green-600" />}
                              {stockInfo.salesVelocity === 'medium' && <BarChart3 className="h-3 w-3 text-blue-600" />}
                              {(stockInfo.salesVelocity === 'slow' || stockInfo.salesVelocity === 'stagnant') && <TrendingDown className="h-3 w-3 text-red-600" />}
                              <Badge variant="outline" className={`text-xs capitalize ${
                                stockInfo.salesVelocity === 'fast' ? 'text-green-600' :
                                stockInfo.salesVelocity === 'medium' ? 'text-blue-600' :
                                'text-red-600'
                              }`}>
                                {stockInfo.salesVelocity}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              <div>Sold: <span className="font-medium">{stockInfo.totalSold}</span></div>
                              <div>Revenue: <span className="font-medium text-green-600">${stockInfo.revenue.toFixed(0)}</span></div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">${product.price.toFixed(2)}</div>
                            {product.discount_price > 0 && (
                              <div className="text-sm text-green-600">
                                Sale: ${product.discount_price.toFixed(2)}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge
                              className={
                                product.is_active
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }
                            >
                              {product.is_active ? "Active" : "Inactive"}
                            </Badge>
                            {product.is_new && (
                              <Badge variant="outline" className="ml-1 border-blue-200 text-blue-700">
                                New
                              </Badge>
                            )}
                            {product.is_featured && (
                              <Badge variant="outline" className="ml-1 border-purple-200 text-purple-700">
                                Featured
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {new Date(product.$createdAt).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(product.$createdAt).toLocaleTimeString()}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openInventoryModal(product.$id, product.name)}>
                                <Warehouse className="mr-2 h-4 w-4" />
                                Inventory Details
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/products/${product.$id}`}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Product
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/products/${product.$id}/edit`}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit Product
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => toggleAvailability(product.$id, product.is_active)}
                              >
                                {product.is_active ? (
                                  <>
                                    <AlertTriangle className="mr-2 h-4 w-4" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <ShoppingCart className="mr-2 h-4 w-4" />
                                    Activate
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => {
                                  setProductToDelete(product.$id)
                                  setDeleteDialogOpen(true)
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )})
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              product from your catalog.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Inventory Details Modal */}
      <ProductInventoryDetailsModal
        open={inventoryModalOpen}
        onOpenChange={setInventoryModalOpen}
        productId={selectedProductId}
        productName={selectedProductName}
      />
    </div>
  )
}