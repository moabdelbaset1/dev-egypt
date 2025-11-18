import { NextRequest, NextResponse } from "next/server"
import { Query } from "node-appwrite"
import { createAdminClient } from "@/lib/appwrite-admin"

// Get database ID from environment
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || ''
const PRODUCTS_COLLECTION_ID = 'products'
const ORDERS_COLLECTION_ID = 'orders'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period") || "30" // days
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    // Create admin client
    const { databases, users } = await createAdminClient()

    // Calculate date range
    const now = new Date()
    const periodDays = parseInt(period)
    const fromDate = startDate ? new Date(startDate) : new Date(now.getTime() - (periodDays * 24 * 60 * 60 * 1000))
    const toDate = endDate ? new Date(endDate) : now

    // Fetch data in parallel
    const [
      ordersResult,
      productsResult,
      usersResult
    ] = await Promise.all([
      // Orders in date range
      databases.listDocuments(DATABASE_ID, ORDERS_COLLECTION_ID, [
        Query.limit(1000),
        Query.greaterThanEqual('$createdAt', fromDate.toISOString()),
        Query.lessThanEqual('$createdAt', toDate.toISOString()),
        Query.orderDesc('$createdAt')
      ]).catch(() => ({ documents: [], total: 0 })),
      
      // All products for analysis
      databases.listDocuments(DATABASE_ID, PRODUCTS_COLLECTION_ID, [
        Query.limit(1000)
      ]).catch(() => ({ documents: [], total: 0 })),
      
      // All users for customer analysis
      users.list([Query.limit(1000)]).catch(() => ({ users: [], total: 0 }))
    ])

    const orders = ordersResult.documents || []
    const products = productsResult.documents || []
    const customers = usersResult.users || []

    // Calculate revenue over time (daily)
    const revenueByDay: { [key: string]: number } = {}
    const ordersByDay: { [key: string]: number } = {}
    
    orders.forEach(order => {
      if (order.payment_status === 'paid') {
        const date = new Date(order.$createdAt).toISOString().split('T')[0]
        const orderTotal = order.total_amount || order.total || 0
        revenueByDay[date] = (revenueByDay[date] || 0) + orderTotal
        ordersByDay[date] = (ordersByDay[date] || 0) + 1
      }
    })

    // Create daily series data
    const dailyData = []
    for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0]
      dailyData.push({
        date: dateStr,
        revenue: revenueByDay[dateStr] || 0,
        orders: ordersByDay[dateStr] || 0
      })
    }

    // Top products by sales
    const productSales: { [key: string]: { name: string, revenue: number, quantity: number } } = {}
    
    orders.forEach(order => {
      if (order.payment_status === 'paid' && order.items) {
        try {
          const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items
          if (Array.isArray(items)) {
            items.forEach((item: any) => {
              const productId = item.product_id || item.id
              if (productId) {
                if (!productSales[productId]) {
                  const product = products.find(p => p.$id === productId)
                  productSales[productId] = {
                    name: product?.name || `Product ${productId}`,
                    revenue: 0,
                    quantity: 0
                  }
                }
                productSales[productId].revenue += (item.price || 0) * (item.quantity || 1)
                productSales[productId].quantity += item.quantity || 1
              }
            })
          }
        } catch (error) {
          console.error('Error parsing order items:', error)
        }
      }
    })

    const topProducts = Object.entries(productSales)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    // Customer analytics
    const newCustomersInPeriod = customers.filter(customer => {
      const registrationDate = new Date(customer.registration)
      return registrationDate >= fromDate && registrationDate <= toDate
    }).length

    // Order status distribution - handle both status and order_status fields
    const orderStatusDistribution = {
      pending: orders.filter(o => (o.status || o.order_status) === 'pending').length,
      processing: orders.filter(o => (o.status || o.order_status) === 'processing').length,
      shipped: orders.filter(o => (o.status || o.order_status) === 'shipped').length,
      delivered: orders.filter(o => (o.status || o.order_status) === 'delivered').length,
      cancelled: orders.filter(o => (o.status || o.order_status) === 'cancelled').length,
    }

    console.log('📊 Order Status Distribution:', orderStatusDistribution)
    console.log('📊 Sample order statuses:', orders.slice(0, 5).map(o => ({
      id: o.$id.slice(-8),
      status: o.status,
      order_status: o.order_status
    })))

    // Payment method distribution
    const paymentMethods: { [key: string]: number } = {}
    orders.forEach(order => {
      const method = order.payment_method || 'unknown'
      paymentMethods[method] = (paymentMethods[method] || 0) + 1
    })

    // Calculate metrics for the period
    const totalRevenue = orders
      .filter(order => order.payment_status === 'paid')
      .reduce((sum, order) => sum + (order.total_amount || order.total || 0), 0)

    const totalOrders = orders.length
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

    // Customer lifetime value (simplified)
    const customerOrderCounts: { [key: string]: number } = {}
    const customerRevenueMap: { [key: string]: number } = {}
    
    orders.forEach(order => {
      if (order.customer_id && order.payment_status === 'paid') {
        customerOrderCounts[order.customer_id] = (customerOrderCounts[order.customer_id] || 0) + 1
        const orderTotal = order.total_amount || order.total || 0
        customerRevenueMap[order.customer_id] = (customerRevenueMap[order.customer_id] || 0) + orderTotal
      }
    })

    const avgCustomerLifetimeValue = Object.keys(customerRevenueMap).length > 0
      ? Object.values(customerRevenueMap).reduce((sum, val) => sum + val, 0) / Object.keys(customerRevenueMap).length
      : 0

    const analyticsData = {
      period: {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        days: periodDays
      },
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalOrders,
        averageOrderValue: Math.round(averageOrderValue * 100) / 100,
        newCustomers: newCustomersInPeriod,
        avgCustomerLifetimeValue: Math.round(avgCustomerLifetimeValue * 100) / 100
      },
      charts: {
        dailyRevenue: dailyData,
        topProducts,
        orderStatusDistribution,
        paymentMethodDistribution: Object.entries(paymentMethods).map(([method, count]) => ({
          method,
          count
        }))
      },
      insights: {
        totalProducts: products.length,
        activeProducts: products.filter(p => p.is_active).length,
        lowStockProducts: products.filter(p => (p.units || 0) <= (p.min_order_quantity || 5)).length,
        totalCustomers: customers.length,
        repeatCustomers: Object.values(customerOrderCounts).filter(count => count > 1).length
      }
    }

    return NextResponse.json(analyticsData)

  } catch (error: any) {
    console.error("Error fetching analytics data:", error)
    return NextResponse.json(
      { 
        error: error.message || "Failed to fetch analytics data",
        period: { from: null, to: null, days: 0 },
        summary: {
          totalRevenue: 0,
          totalOrders: 0,
          averageOrderValue: 0,
          newCustomers: 0,
          avgCustomerLifetimeValue: 0
        },
        charts: {
          dailyRevenue: [],
          topProducts: [],
          orderStatusDistribution: {},
          paymentMethodDistribution: []
        },
        insights: {
          totalProducts: 0,
          activeProducts: 0,
          lowStockProducts: 0,
          totalCustomers: 0,
          repeatCustomers: 0
        }
      },
      { status: 500 }
    )
  }
}
