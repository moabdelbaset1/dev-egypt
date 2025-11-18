"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  Eye,
  Star,
  Package as InventoryIcon,
  ClipboardList
} from "lucide-react"
import OrdersTracker from "@/components/admin/orders-tracker"

interface InventoryItem {
  id: string
  customProductId: string
  name: string
  brandName: string
  initialStock: number // العدد الأساسي
  quantityOut: number // اللي خرج
  quantityRemaining: number // المتبقي
  status: 'in' | 'out' | 'low_stock' | 'alert' | 'out_of_stock'
  location?: string
  lastUpdated?: string
}

interface AnalyticsData {
  period: {
    from: string
    to: string
    days: number
  }
  summary: {
    totalRevenue: number
    totalOrders: number
    averageOrderValue: number
    newCustomers: number
    avgCustomerLifetimeValue: number
  }
  charts: {
    dailyRevenue: Array<{
      date: string
      revenue: number
      orders: number
    }>
    topProducts: Array<{
      id: string
      name: string
      revenue: number
      quantity: number
    }>
    orderStatusDistribution: {
      pending: number
      processing: number
      shipped: number
      delivered: number
      cancelled: number
    }
    paymentMethodDistribution: Array<{
      method: string
      count: number
    }>
  }
  insights: {
    totalProducts: number
    activeProducts: number
    lowStockProducts: number
    totalCustomers: number
    repeatCustomers: number
  }
  brandAnalytics?: {
    topViewedBrands: Array<{
      brand_id: string
      brand_name: string
      views: number
      growth: number
    }>
    topSellingBrands: Array<{
      brand_id: string
      brand_name: string
      orders: number
      revenue: number
    }>
  }
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState("30")
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [inventoryLoading, setInventoryLoading] = useState(false)
  const [brandAnalytics, setBrandAnalytics] = useState<{
    topViewedBrands: Array<{ brand_id: string; brand_name: string; views: number; growth: number }>
    topSellingBrands: Array<{ brand_id: string; brand_name: string; orders: number; revenue: number }>
  } | null>(null)
  const [brandLoading, setBrandLoading] = useState(false)

  useEffect(() => {
    fetchAnalytics()
    fetchInventoryData()
    fetchBrandAnalytics()
  }, [period])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/analytics?period=${period}`)
      const data = await response.json()
      setAnalytics(data)
    } catch (error) {
      console.error("Failed to fetch analytics:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchInventoryData = async () => {
    try {
      setInventoryLoading(true)
      const res = await fetch('/api/admin/inventory-overview?limit=1000')
      if (res.ok) {
        const data = await res.json()
        setInventoryItems(data.items || [])
      } else {
        console.warn('Inventory overview API returned non-ok status')
        setInventoryItems([])
      }
    } catch (error) {
      console.error('Error fetching inventory data:', error)
    } finally {
      setInventoryLoading(false)
    }
  }

  const fetchBrandAnalytics = async () => {
    try {
      setBrandLoading(true)
      const res = await fetch(`/api/admin/brand-analytics?period=${period}`)
      if (res.ok) {
        const data = await res.json()
        setBrandAnalytics({
          topViewedBrands: data.topViewedBrands || [],
          topSellingBrands: data.topSellingBrands || []
        })
      } else {
        console.warn('Brand analytics API returned non-ok status')
        setBrandAnalytics({ topViewedBrands: [], topSellingBrands: [] })
      }
    } catch (error) {
      console.error('Error fetching brand analytics:', error)
      setBrandAnalytics({ topViewedBrands: [], topSellingBrands: [] })
    } finally {
      setBrandLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Analytics...</p>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-600">Failed to load analytics data</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Comprehensive insights for your store performance
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setPeriod("7")}
            className={`px-4 py-2 rounded-lg ${period === "7" ? "bg-blue-600 text-white" : "bg-gray-100"}`}
          >
            7 Days
          </button>
          <button
            onClick={() => setPeriod("30")}
            className={`px-4 py-2 rounded-lg ${period === "30" ? "bg-blue-600 text-white" : "bg-gray-100"}`}
          >
            30 Days
          </button>
          <button
            onClick={() => setPeriod("90")}
            className={`px-4 py-2 rounded-lg ${period === "90" ? "bg-blue-600 text-white" : "bg-gray-100"}`}
          >
            90 Days
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${analytics.summary.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-gray-600 mt-1">
              Last {analytics.period.days} days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.summary.totalOrders}</div>
            <p className="text-xs text-gray-600 mt-1">
              ${analytics.summary.averageOrderValue.toFixed(2)} avg order value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Customers</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.summary.newCustomers}</div>
            <p className="text-xs text-gray-600 mt-1">
              {analytics.insights.repeatCustomers} repeat customers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Products</CardTitle>
            <Package className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.insights.activeProducts}</div>
            <p className="text-xs text-gray-600 mt-1">
              {analytics.insights.lowStockProducts} low stock alerts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Different Analytics Views */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="products">Top Products</TabsTrigger>
          <TabsTrigger value="brands">Brand Analytics</TabsTrigger>
          <TabsTrigger value="orders">Order Status</TabsTrigger>
          <TabsTrigger value="inventory">
            <InventoryIcon className="h-4 w-4 mr-2" />
            Inventory
          </TabsTrigger>
          <TabsTrigger value="order-management">
            <ClipboardList className="h-4 w-4 mr-2" />
            Order Management
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Revenue Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
                <CardDescription>Daily revenue for the selected period</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analytics.charts.dailyRevenue.slice(-14).map((day, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <span className="text-sm text-gray-600 w-24">
                        {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                      <div className="flex-1">
                        <div 
                          className="bg-blue-500 h-6 rounded"
                          style={{ width: `${(day.revenue / Math.max(...analytics.charts.dailyRevenue.map(d => d.revenue))) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium w-20 text-right">
                        ${day.revenue.toFixed(0)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Payment Methods */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
                <CardDescription>Distribution of payment methods</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.charts.paymentMethodDistribution.map((pm, index) => (
                    <div key={index}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium capitalize">{pm.method.replace('_', ' ')}</span>
                        <span className="text-sm text-gray-600">{pm.count} orders</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${(pm.count / analytics.summary.totalOrders) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Top Products Tab */}
        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle>Top Selling Products</CardTitle>
              <CardDescription>Best performing products by revenue</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.charts.topProducts.map((product, index) => (
                  <div key={product.id} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">{product.name}</h3>
                      <p className="text-sm text-gray-600">
                        {product.quantity} units sold
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">${product.revenue.toFixed(2)}</p>
                      <p className="text-xs text-gray-600">revenue</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Brand Analytics Tab */}
        <TabsContent value="brands">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-blue-600" />
                  Most Viewed Brands
                </CardTitle>
                <CardDescription>Top brands by page views this month</CardDescription>
              </CardHeader>
              <CardContent>
                {brandLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  </div>
                ) : brandAnalytics?.topViewedBrands && brandAnalytics.topViewedBrands.length > 0 ? (
                  <div className="space-y-3">
                    {brandAnalytics.topViewedBrands.map((brand, index) => (
                      <div key={brand.brand_id} className="flex items-center gap-4 p-3 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold text-sm">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{brand.brand_name}</h3>
                          <p className="text-sm text-gray-600">{brand.views} views</p>
                        </div>
                        {brand.growth > 0 && (
                          <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                            <TrendingUp className="h-4 w-4" />
                            +{brand.growth}%
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No brand view data available</p>
                    <p className="text-sm">Views will appear as customers browse products</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-600" />
                  Top Selling Brands
                </CardTitle>
                <CardDescription>Brands with highest order count</CardDescription>
              </CardHeader>
              <CardContent>
                {brandLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  </div>
                ) : brandAnalytics?.topSellingBrands && brandAnalytics.topSellingBrands.length > 0 ? (
                  <div className="space-y-3">
                    {brandAnalytics.topSellingBrands.map((brand, index) => (
                      <div key={brand.brand_id} className="flex items-center gap-4 p-3 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 text-yellow-600 font-bold text-sm">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{brand.brand_name}</h3>
                          <p className="text-sm text-gray-600">{brand.orders} orders</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">${brand.revenue.toFixed(2)}</p>
                          <p className="text-xs text-gray-600">revenue</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Star className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No brand sales data available</p>
                    <p className="text-sm">Data will appear when orders are placed</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Order Status Tab */}
        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>Order Status Distribution</CardTitle>
              <CardDescription>Breakdown of orders by status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Object.entries(analytics.charts.orderStatusDistribution).map(([status, count]) => (
                  <div key={status} className="text-center p-4 border rounded-lg">
                    <p className="text-3xl font-bold text-blue-600">{count}</p>
                    <p className="text-sm text-gray-600 capitalize mt-1">{status}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {((count / analytics.summary.totalOrders) * 100).toFixed(1)}%
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory Tab */}
        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Management</CardTitle>
              <CardDescription>Track products, movements, alerts and audit in one place</CardDescription>
            </CardHeader>
            <CardContent>
              {inventoryLoading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm text-gray-600">Total Products</p>
                        <p className="text-3xl font-bold text-gray-900">{inventoryItems.length}</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm text-gray-600">In Stock</p>
                        <p className="text-3xl font-bold text-green-600">{inventoryItems.filter(i => i.status === 'in').length}</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm text-gray-600">Low Stock</p>
                        <p className="text-3xl font-bold text-yellow-600">{inventoryItems.filter(i => i.status === 'low_stock').length}</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm text-gray-600">Out of Stock</p>
                        <p className="text-3xl font-bold text-red-600">{inventoryItems.filter(i => i.status === 'alert').length}</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Inventory Table */}
                  <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Initial Stock</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Out</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {inventoryItems.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                                No inventory items found
                              </td>
                            </tr>
                          ) : (
                            inventoryItems.map((item) => (
                              <tr key={item.id} className="hover:bg-gray-50">
                                <td className="px-4 py-4 whitespace-nowrap font-mono font-bold text-blue-600">
                                  {item.customProductId}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                  <div className="font-medium text-gray-900">{item.name}</div>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                  <span className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                                    {item.brandName}
                                  </span>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-center">
                                  <span className="text-gray-700 font-bold">{item.initialStock}</span>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-center">
                                  <span className="text-red-600 font-bold">{item.quantityOut}</span>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-center">
                                  <span className="text-green-600 font-bold">{item.quantityRemaining}</span>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-gray-600">
                                  {item.location || 'N/A'}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                    item.status === 'alert' || item.status === 'out_of_stock'
                                      ? 'bg-red-100 text-red-800'
                                      : item.status === 'low_stock'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-green-100 text-green-800'
                                  }`}>
                                    {item.status === 'alert' || item.status === 'out_of_stock'
                                      ? 'Out of Stock'
                                      : item.status === 'low_stock'
                                      ? 'Low Stock'
                                      : 'In Stock'}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Order Management Tab */}
        <TabsContent value="order-management">
          <OrdersTracker />
        </TabsContent>
      </Tabs>

      {/* Customer Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Insights</CardTitle>
          <CardDescription>Understanding your customer base</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
              <Users className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold">{analytics.insights.totalCustomers}</p>
              <p className="text-sm text-gray-600">Total Customers</p>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
              <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold">{analytics.insights.repeatCustomers}</p>
              <p className="text-sm text-gray-600">Repeat Customers</p>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
              <DollarSign className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold">${analytics.summary.avgCustomerLifetimeValue.toFixed(2)}</p>
              <p className="text-sm text-gray-600">Avg Customer LTV</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
