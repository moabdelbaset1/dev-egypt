














"use client"

import React, { useState, useEffect } from "react"
import {
  Search,
ChevronDown,
  ChevronUp,
  Truck,
  Package,
  CheckCircle,
  RotateCcw,
  AlertCircle,
  Loader2,
  Eye,
  CreditCard,
  MapPin,
  Calendar,
  RefreshCw,
  Plus
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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

interface Order {
  $id: string
  order_code?: string
  order_number?: string
  customer_name?: string
  customer_email?: string
  customer_id?: string
  total_amount: number
  payable_amount?: number
  order_status?: string
  status?: string
  payment_status: string
  fulfillment_status?: string
  tracking_number?: string
  carrier?: string
  $createdAt: string
  shipped_at?: string
  delivered_at?: string
  items?: string
  shipping_address?: string
  brand_id?: string
}

interface OrderStats {
  total: number
  pending: number
  processing: number
  shipped: number
  delivered: number
  cancelled: number
  returned: number
  totalRevenue: number
}

export default function OrdersTracker() {
  console.log("🚀 OrdersTracker component rendering...")
  
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [creatingOrders, setCreatingOrders] = useState(false)
  const [stats, setStats] = useState<OrderStats>({
    total: 0,
    pending: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    returned: 0,
    totalRevenue: 0
  })
  const [stockData, setStockData] = useState<{[key: string]: {current: number, variant?: string}}>({})
  
  console.log(`📊 Current state - orders.length: ${orders.length}, loading: ${loading}`)

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        search: searchTerm,
        limit: "100"
      })
      
      if (statusFilter !== "all") {
        params.append("status", statusFilter)
      }

      console.log(`🔄 Fetching orders with filters: search="${searchTerm}", status="${statusFilter}"`)
      
      const response = await fetch(`/api/admin/orders?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      console.log(`📊 API Response:`, data)
      console.log(`📊 API Response type:`, typeof data)
      console.log(`📊 API Response keys:`, Object.keys(data || {}))
      
      if (data.error) {
        throw new Error(data.error)
      }

      const ordersData = data.orders || []
      console.log(`📦 Orders data:`, ordersData)
      console.log(`📊 Found ${ordersData.length} orders`)
      console.log(`📊 Stats from API:`, data.stats)
      
      setOrders(ordersData)
      
      // Calculate stats
      const statsCalc = {
        total: ordersData.length,
        pending: ordersData.filter((o: Order) => (o.status || o.order_status) === "pending").length,
        processing: ordersData.filter((o: Order) => (o.status || o.order_status) === "processing").length,
        shipped: ordersData.filter((o: Order) => (o.status || o.order_status) === "shipped").length,
        delivered: ordersData.filter((o: Order) => (o.status || o.order_status) === "delivered").length,
        cancelled: ordersData.filter((o: Order) => (o.status || o.order_status) === "cancelled").length,
        returned: ordersData.filter((o: Order) => (o.status || o.order_status) === "returned").length,
        totalRevenue: ordersData.reduce((sum: number, o: Order) => sum + (o.total_amount || 0), 0)
      }
      setStats(statsCalc)
      
      console.log(`✅ Loaded ${ordersData.length} orders successfully`)

    } catch (error) {
      console.error("❌ Failed to fetch orders:", error)
      // Don't show alert on first load, just log the error
      if (!loading) {
        alert('Failed to load orders: ' + (error instanceof Error ? error.message : 'Unknown error'))
      }
    } finally {
      setLoading(false)
    }
  }

  console.log("🔧 About to define useEffect...")

  useEffect(() => {
    console.log("🔄 useEffect: Initial mount - calling fetchOrders")
    fetchOrders()
  }, [])

  useEffect(() => {
    console.log(`🔄 useEffect: Filters changed - search: "${searchTerm}", status: "${statusFilter}"`)
    const timeoutId = setTimeout(() => {
      fetchOrders()
    }, 500) // Debounce search

    return () => clearTimeout(timeoutId)
  }, [searchTerm, statusFilter])

  const toggleRow = (orderId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId)
    } else {
      newExpanded.add(orderId)
      // Fetch stock data when expanding
      fetchStockData(orderId)
    }
    setExpandedRows(newExpanded)
  }

  const fetchStockData = async (orderId: string) => {
    try {
      const order = orders.find(o => o.$id === orderId)
      if (!order) return

      const items = JSON.parse(order.items || '[]')
      const stockPromises = items.map(async (item: any) => {
        try {
          // Handle both product_id and productId formats
          const productId = item.product_id || item.productId
          if (!productId) {
            console.error('No product ID found in item:', item)
            return null
          }
          const response = await fetch(`/api/admin/products/${productId}`)
          if (response.ok) {
            const product = await response.json()
            const currentStock = item.variant_id
              ? product.variants?.find((v: any) => v.$id === item.variant_id)?.stock || 0
              : product.stock || product.units || 0
            return {
              key: `${item.product_id}-${item.variant_id || 'main'}`,
              current: currentStock
            }
          }
        } catch (error) {
          console.error(`Failed to fetch stock for ${item.product_id}:`, error)
        }
        return null
      })

      const stockResults = await Promise.all(stockPromises)
      const newStockData: {[key: string]: {current: number}} = {}

      stockResults.forEach(result => {
        if (result) {
          newStockData[result.key] = { current: result.current }
        }
      })

      setStockData(prev => ({ ...prev, ...newStockData }))
    } catch (error) {
      console.error('Failed to fetch stock data:', error)
    }
  }

  // Function to create sample orders
  const createSampleOrders = async () => {
    setCreatingOrders(true)
    try {
      const response = await fetch('/api/admin/create-sample-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      const result = await response.json()
      
      if (result.success) {
        console.log(`✅ Successfully created ${result.created} sample orders`)
        alert(`Successfully created ${result.created} sample orders`)
        // Refresh orders after creation
        fetchOrders()
      } else {
        throw new Error(result.error || 'Failed to create orders')
      }
    } catch (error) {
      console.error('❌ Error creating sample orders:', error)
      alert(`Error creating orders: ${error instanceof Error ? error.message : "An unexpected error occurred"}`)
    } finally {
      setCreatingOrders(false)
    }
  }

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      // Show loading state
      const currentOrder = orders.find(o => o.$id === orderId)
      if (!currentOrder) {
        console.error('❌ Order not found:', orderId)
        return
      }

      const currentStatus = currentOrder.status || currentOrder.order_status || 'pending'

      if (currentStatus === newStatus) {
        console.log('⚠️ Status already set to:', newStatus)
        return // No change needed
      }

      // Map status to action
      const actionMap: { [key: string]: string } = {
        'pending': 'mark_pending', // Note: This action doesn't exist in API, but we handle it
        'processing': 'mark_processing',
        'shipped': 'mark_shipped',
        'delivered': 'mark_delivered',
        'cancelled': 'mark_cancelled',
        'returned': 'mark_returned'
      }

      const action = actionMap[newStatus]
      if (!action) {
        console.error('❌ Invalid status:', newStatus)
        return
      }

      // Validate status transitions on frontend before API call
      const validTransitions: Record<string, string[]> = {
        'pending': ['processing', 'shipped', 'delivered', 'cancelled'],
        'processing': ['shipped', 'delivered', 'cancelled'],
        'shipped': ['delivered', 'returned', 'cancelled'],
        'delivered': ['returned', 'cancelled'], // Can cancel delivered orders (e.g., customer complaint)
        'cancelled': [], // Cannot change from cancelled
        'returned': ['processing', 'cancelled'] // Can reprocess or permanently cancel returned orders
      }

      if (!validTransitions[currentStatus]?.includes(newStatus)) {
        console.error(`❌ Invalid status transition: Cannot change from '${currentStatus}' to '${newStatus}'`)
        alert(`Cannot change order status from '${currentStatus}' to '${newStatus}'. This transition is not allowed.`)
        return
      }

      // Special handling for pending status - this is not a real API action
      if (newStatus === 'pending') {
        console.log('⚠️ Cannot set status back to pending - this is not supported')
        alert('Cannot set order status back to pending. Please choose a different status.')
        return
      }

      console.log(`🔄 Updating order ${orderId.slice(-8)} to status: ${newStatus} using action: ${action}`)

      const response = await fetch(`/api/admin/orders?orderId=${orderId}&action=${action}`, {
        method: "PATCH"
      })

      if (response.ok) {
        const result = await response.json()
        console.log('✅ Order updated successfully:', result)

        // Update local state immediately for better UX
        const updatedOrders = orders.map(o =>
          o.$id === orderId ? {
            ...o,
            status: newStatus,
            order_status: newStatus
          } : o
        )
        setOrders(updatedOrders)

        // Recalculate stats immediately
        const ordersData = updatedOrders
        const statsCalc = {
          total: ordersData.length,
          pending: ordersData.filter((o: Order) => (o.status || o.order_status) === "pending").length,
          processing: ordersData.filter((o: Order) => (o.status || o.order_status) === "processing").length,
          shipped: ordersData.filter((o: Order) => (o.status || o.order_status) === "shipped").length,
          delivered: ordersData.filter((o: Order) => (o.status || o.order_status) === "delivered").length,
          cancelled: ordersData.filter((o: Order) => (o.status || o.order_status) === "cancelled").length,
          returned: ordersData.filter((o: Order) => (o.status || o.order_status) === "returned").length,
          totalRevenue: ordersData.reduce((sum: number, o: Order) => sum + (o.total_amount || 0), 0)
        }
        setStats(statsCalc)

        console.log(`✅ Order ${orderId.slice(-8)} status updated to: ${newStatus}`)
        console.log('📊 Updated stats:', statsCalc)

        // Note: We don't refresh from server immediately to avoid flickering
        // The local state update provides instant feedback
        // If user refreshes the page, they'll see the persisted data

      } else {
        const errorData = await response.json()
        console.error('❌ Update failed:', errorData.error)
        alert('Error: ' + (errorData.error || 'Failed to update order'))
      }
    } catch (error) {
      console.error("❌ Failed to update status:", error)
      alert('Network error occurred')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "processing":
        return "bg-blue-100 text-blue-800"
      case "shipped":
        return "bg-purple-100 text-purple-800"
      case "delivered":
        return "bg-green-100 text-green-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      case "returned":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Package className="h-4 w-4" />
      case "processing":
        return <RefreshCw className="h-4 w-4" />
      case "shipped":
        return <Truck className="h-4 w-4" />
      case "delivered":
        return <CheckCircle className="h-4 w-4" />
      case "returned":
        return <RotateCcw className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const filteredOrders = orders.filter(order => {
    const matchesSearch =
      (order.order_number || order.order_code || order.$id)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_email?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus =
      statusFilter === "all" || (order.status || order.order_status) === statusFilter

    return matchesSearch && matchesStatus
  })

  console.log(`🔍 Filter Debug:`)
  console.log(`   - Total orders: ${orders.length}`)
  console.log(`   - Search term: "${searchTerm}"`)
  console.log(`   - Status filter: "${statusFilter}"`)
  console.log(`   - Filtered orders: ${filteredOrders.length}`)
  if (orders.length > 0) {
    console.log(`   - Sample order status: ${orders[0]?.status}`)
    console.log(`   - Sample order fields:`, Object.keys(orders[0] || {}))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Orders & Shipment Tracker</h1>
            <p className="text-gray-600">Track customer orders from processing to delivery with real-time status updates</p>
          </div>
          <Button
            onClick={async () => {
              if (confirm('Are you sure you want to delete ALL orders? This action cannot be undone.')) {
                try {
                  const response = await fetch('/api/admin/orders/delete-all', {
                    method: 'DELETE'
                  })
                  if (response.ok) {
                    alert('All orders deleted successfully')
                    fetchOrders()
                  } else {
                    alert('Failed to delete orders')
                  }
                } catch (error) {
                  alert('Error deleting orders')
                }
              }
            }}
            variant="destructive"
            className="bg-red-600 hover:bg-red-700"
          >
            Delete All Orders
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {stats.pending}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Shipped</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {stats.shipped}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.delivered}
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-700">Returned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.returned}
            </div>
            <p className="text-xs text-red-600 mt-1">
              Needs attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search by Order ID, Customer Name, or Email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-48 h-10">
            <SelectValue placeholder="Filter by Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="shipped">Shipped</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="returned">Returned</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={fetchOrders} variant="outline" className="h-10" disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh Orders
        </Button>
        {orders.length === 0 && !loading && (
          <Button 
            onClick={createSampleOrders} 
            disabled={creatingOrders}
            className="h-10 bg-blue-600 hover:bg-blue-700"
          >
            {creatingOrders ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            {creatingOrders ? "Creating..." : "Create Sample Orders"}
          </Button>
        )}
      </div>

      {/* Main Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-center">Total Qty</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <React.Fragment key={order.$id}>
                    {/* Main Row */}
                    <TableRow className="hover:bg-gray-50" data-order-id={order.$id}>
                      <TableCell>
                        <button
                          onClick={() => toggleRow(order.$id)}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          {expandedRows.has(order.$id) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="font-mono font-bold text-blue-600">
                        #{order.order_number || order.order_code || order.$id.slice(-8)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{order.customer_name}</div>
                          <div className="text-sm text-gray-600">{order.customer_email}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {(() => {
                          try {
                            const items = JSON.parse(order.items || '[]');
                            const totalItems = items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
                            const itemsCount = items.length;
                            return (
                              <div className="flex flex-col items-center">
                                <span className="font-bold text-lg text-blue-600">{totalItems}</span>
                                <span className="text-xs text-gray-500">{itemsCount} product{itemsCount !== 1 ? 's' : ''}</span>
                              </div>
                            );
                          } catch {
                            return <span className="text-gray-400">N/A</span>;
                          }
                        })()}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        ${order.total_amount?.toFixed(2) || '0.00'}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getStatusColor(order.status || order.order_status || 'pending')}`}>
                          <span className="mr-1">
                            {getStatusIcon(order.status || order.order_status || 'pending')}
                          </span>
                          {order.status || order.order_status || 'pending'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getStatusColor(order.payment_status)}`}>
                          {order.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(order.$createdAt)}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={order.status || order.order_status || 'pending'}
                          onValueChange={(value) => updateOrderStatus(order.$id, value)}
                        >
                          <SelectTrigger className="w-32 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="processing">Processing</SelectItem>
                            <SelectItem value="shipped">Shipped</SelectItem>
                            <SelectItem value="delivered">Delivered</SelectItem>
                            <SelectItem value="returned">Returned</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>

                    {/* Expanded Details Row */}
                    {expandedRows.has(order.$id) && (
                      <TableRow className="bg-blue-50">
                        <TableCell colSpan={9} className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Order Details */}
                            <div className="space-y-3">
                              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                <Package className="h-4 w-4" />
                                Order Details
                              </h3>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Order ID:</span>
                                  <span className="font-mono font-bold">#{order.order_number || order.order_code || order.$id.slice(-8)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Customer:</span>
                                  <span>{order.customer_name}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Email:</span>
                                  <span>{order.customer_email}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Total:</span>
                                  <span className="font-semibold">${order.total_amount?.toFixed(2) || '0.00'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Order Date:</span>
                                  <span>{formatDate(order.$createdAt)}</span>
                                </div>
                                {/* Items Count */}
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Items:</span>
                                  <span className="font-semibold">
                                    {(() => {
                                      try {
                                        const items = JSON.parse(order.items || '[]');
                                        const totalItems = items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
                                        return `${totalItems} piece${totalItems !== 1 ? 's' : ''}`;
                                      } catch {
                                        return 'N/A';
                                      }
                                    })()}
                                  </span>
                                </div>
                              </div>

                              {/* Detailed Items List */}
                              <div className="mt-4">
                                <h4 className="font-medium text-gray-900 mb-2 flex items-center justify-between">
                                  <span>Order Items & Stock Status:</span>
                                  <span className="text-sm font-normal text-gray-500">
                                    {(() => {
                                      try {
                                        const items = JSON.parse(order.items || '[]');
                                        const totalQty = items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
                                        return `Total: ${totalQty} pieces`;
                                      } catch {
                                        return '';
                                      }
                                    })()}
                                  </span>
                                </h4>
                                <div className="space-y-2">
                                  {(() => {
                                    try {
                                      const items = JSON.parse(order.items || '[]');
                                      return items.map((item: any, index: number) => {
                                        const stockKey = `${item.productId || item.product_id}-${item.variant_id || 'main'}`;
                                        const currentStock = stockData[stockKey]?.current || 0;
                                        const requestedQty = item.quantity || 1;
                                        const remainingAfterDelivery = currentStock - requestedQty;
                                        const isLowStock = currentStock <= 5 && currentStock > 0;
                                        const isOutOfStock = currentStock < requestedQty;
                                        const orderStatus = order.status || order.order_status;
                                        const isDelivered = orderStatus === 'delivered';

                                        return (
                                          <div key={index} className={`p-3 rounded text-sm border ${isOutOfStock ? 'bg-red-50 border-red-300' : isLowStock ? 'bg-yellow-50 border-yellow-300' : 'bg-gray-50 border-gray-200'}`}>
                                            <div className="flex items-start justify-between">
                                              <div className="flex-1">
                                                <div className="font-medium text-gray-900">{item.name || item.product_name || item.title || 'Unknown Product'}</div>
                                                {item.sku && (
                                                  <div className="text-xs text-gray-500 mt-0.5">SKU: {item.sku}</div>
                                                )}
                                                {(item.size || item.color) && (
                                                  <div className="text-xs text-gray-600 mt-1">
                                                    {item.size && `Size: ${item.size}`}
                                                    {item.size && item.color && ' | '}
                                                    {item.color && `Color: ${item.color}`}
                                                  </div>
                                                )}
                                              </div>
                                              <div className="text-right ml-4 min-w-[140px]">
                                                <div className="font-bold text-blue-600 text-base">Qty: {requestedQty}</div>
                                                <div className="text-xs text-gray-600 mt-1">
                                                  <span className={currentStock === 0 ? 'text-red-600 font-medium' : ''}>
                                                    Stock: {currentStock}
                                                  </span>
                                                </div>
                                                {isDelivered && (
                                                  <div className={`text-xs font-medium mt-1 px-2 py-0.5 rounded ${remainingAfterDelivery < 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                                    Remaining: {Math.max(0, remainingAfterDelivery)}
                                                  </div>
                                                )}
                                                {!isDelivered && isOutOfStock && (
                                                  <div className="text-xs font-medium mt-1 px-2 py-0.5 rounded bg-red-100 text-red-700">
                                                    Short: {requestedQty - currentStock}
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                            {isOutOfStock && !isDelivered && (
                                              <div className="mt-2 p-2 rounded bg-red-100 border border-red-300">
                                                <div className="text-xs text-red-700 font-medium flex items-center gap-1">
                                                  <AlertCircle className="h-3 w-3" />
                                                  Cannot fulfill! Need {requestedQty - currentStock} more units
                                                </div>
                                              </div>
                                            )}
                                            {isLowStock && !isOutOfStock && !isDelivered && (
                                              <div className="mt-2 text-xs text-yellow-700 font-medium flex items-center gap-1">
                                                <AlertCircle className="h-3 w-3" />
                                                Low stock - consider restocking
                                              </div>
                                            )}
                                            {isDelivered && (
                                              <div className="mt-2 text-xs text-gray-600 italic">
                                                ✓ {requestedQty} units deducted from inventory
                                              </div>
                                            )}
                                          </div>
                                        );
                                      });
                                    } catch {
                                      return <div className="text-sm text-gray-600">Unable to load item details</div>;
                                    }
                                  })()}
                                </div>
                              </div>
                            </div>

                            {/* Shipping Tracking */}
                            <div className="space-y-3">
                              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                <Truck className="h-4 w-4" />
                                Shipping & Tracking
                              </h3>
                              <div className="space-y-2 text-sm">
                                <div>
                                  <label className="text-gray-600 text-xs">Current Status:</label>
                                  <div className="mt-1">
                                    <Badge className={`${getStatusColor(order.status || order.order_status || 'pending')}`}>
                                      {order.status || order.order_status || 'pending'}
                                    </Badge>
                                  </div>
                                </div>

                                {(order.status || order.order_status) === "shipped" && (
                                  <div className="space-y-2">
                                    <div>
                                      <label className="text-gray-600 text-xs">Carrier:</label>
                                      <Input
                                        placeholder="e.g., DHL, FedEx"
                                        className="h-8 text-xs mt-1"
                                        defaultValue={order.carrier || ""}
                                      />
                                    </div>
                                    <div>
                                      <label className="text-gray-600 text-xs">Tracking Number:</label>
                                      <Input
                                        placeholder="Enter tracking number"
                                        className="h-8 text-xs mt-1"
                                        defaultValue={order.tracking_number || ""}
                                      />
                                    </div>
                                    {order.shipped_at && (
                                      <div>
                                        <label className="text-gray-600 text-xs">Shipped At:</label>
                                        <div className="text-xs mt-1">{formatDate(order.shipped_at)}</div>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {(order.status || order.order_status) === "delivered" && order.delivered_at && (
                                  <div>
                                    <label className="text-gray-600 text-xs">Delivered At:</label>
                                    <div className="text-xs mt-1">{formatDate(order.delivered_at)}</div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Customer Communication */}
                            <div className="space-y-3">
                              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                <CreditCard className="h-4 w-4" />
                                Payment & Actions
                              </h3>
                              <div className="space-y-2 text-sm">
                                <div>
                                  <label className="text-gray-600 text-xs">Payment Status:</label>
                                  <div className="mt-1">
                                    <Badge className={`${getStatusColor(order.payment_status)}`}>
                                      {order.payment_status}
                                    </Badge>
                                  </div>
                                </div>

                                <div className="space-y-2 mt-4">
                                  <Button size="sm" variant="outline" className="w-full text-xs">
                                    <Eye className="h-3 w-3 mr-1" />
                                    View Full Order
                                  </Button>
                                  <Button size="sm" variant="outline" className="w-full text-xs">
                                    Send Update Email
                                  </Button>
                                  {(order.status || order.order_status) === "returned" && (
                                    <Button size="sm" variant="outline" className="w-full text-xs text-red-600">
                                      <RotateCcw className="h-3 w-3 mr-1" />
                                      Process Return
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Empty State */}
      {filteredOrders.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-600">No orders found</p>
          </CardContent>
        </Card>
      )}

      {/* Returned Orders Summary */}
      {orders.filter(o => (o.status || o.order_status) === "returned").length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Returned Orders Summary ({orders.filter(o => (o.status || o.order_status) === "returned").length})
            </CardTitle>
            <CardDescription>
              Orders that have been returned by customers - requires immediate attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {orders
                .filter(o => (o.status || o.order_status) === "returned")
                .map((order) => (
                  <div key={`returned-${order.$id}`} className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-200">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <Badge className="bg-red-100 text-red-800 font-mono">
                          #{order.order_number || order.order_code || order.$id.slice(-8)}
                        </Badge>
                        <span className="font-medium">{order.customer_name}</span>
                        <span className="text-sm text-gray-600">${order.total_amount?.toFixed(2)}</span>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        Customer: {order.customer_email} | Date: {formatDate(order.$createdAt)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setExpandedRows(new Set([order.$id]))
                          const element = document.querySelector(`[data-order-id="${order.$id}"]`)
                          element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                        }}
                        className="text-xs"
                      >
                        View Details
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateOrderStatus(order.$id, "processing")}
                        className="text-xs"
                      >
                        Reprocess
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}