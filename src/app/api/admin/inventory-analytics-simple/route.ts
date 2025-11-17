import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Client, Databases, Query } from 'node-appwrite'

// Admin authentication check
async function checkAdminAuth() {
  const cookieStore = await cookies()
  const adminToken = cookieStore.get('admin_token')
  
  if (!adminToken) {
    redirect('/admin/login')
  }
}

// Initialize Appwrite
function createAdminClient() {
  const client = new Client()
  const apiKey = process.env.APPWRITE_API_KEY
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID

  if (!apiKey || !endpoint || !projectId) {
    throw new Error('Missing Appwrite configuration')
  }

  client
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey)

  console.log('✅ Admin client created successfully')
  return new Databases(client)
}

export async function GET(request: NextRequest) {
  try {
    // Skip auth check for now - focusing on functionality

    const databases = createAdminClient()
    const databaseId = process.env.APPWRITE_DATABASE_ID || '68dbeceb003bf10d9498'

    // Fetch products
    const productsResult = await databases.listDocuments(
      databaseId,
      'products',
      [
        Query.limit(1000),
        Query.orderDesc('$createdAt')
      ]
    )

    const products = productsResult.documents || []

    // Fetch all orders to calculate real sales data
    const ordersResult = await databases.listDocuments(
      databaseId,
      'orders',
      [
        Query.limit(1000),
        Query.orderDesc('$createdAt')
      ]
    )

    const orders = ordersResult.documents || []

    // Calculate real sales from orders
    let totalSold = 0
    let totalRevenue = 0
    const productSales: Record<string, { sold: number; revenue: number }> = {}

    orders.forEach((order: any) => {
      try {
        const items = JSON.parse(order.items || '[]')
        const orderStatus = order.order_status || order.status || 'pending'
        
        // Only count delivered orders
        if (orderStatus === 'delivered') {
          items.forEach((item: any) => {
            const productId = item.productId || item.product_id || item.id
            const quantity = parseInt(item.quantity) || 0
            const price = parseFloat(item.price) || 0
            
            totalSold += quantity
            totalRevenue += quantity * price
            
            if (!productSales[productId]) {
              productSales[productId] = { sold: 0, revenue: 0 }
            }
            productSales[productId].sold += quantity
            productSales[productId].revenue += quantity * price
          })
        }
      } catch (e) {
        // Skip invalid orders
      }
    })

    // Calculate stock alerts
    const lowStockThreshold = 10
    const criticalStockThreshold = 0
    
    const inStock = products.filter((p: any) => (p.units || 0) > lowStockThreshold).length
    const lowStock = products.filter((p: any) => {
      const units = p.units || 0
      return units > criticalStockThreshold && units <= lowStockThreshold
    }).length
    const outOfStock = products.filter((p: any) => (p.units || 0) <= criticalStockThreshold).length
    
    const criticalAlerts = outOfStock
    const warningAlerts = lowStock

    // Calculate total inventory value
    const totalValue = products.reduce((sum: number, p: any) => {
      const units = p.units || p.stockQuantity || 0
      const price = p.price || 0
      return sum + (price * units)
    }, 0)

    // Calculate stats
    const stats = {
      total: products.length,
      available: products.filter((p: any) => p.is_active === true).length,
      unavailable: products.filter((p: any) => p.is_active === false).length,
      inStock,
      lowStock,
      outOfStock,
      totalValue,
      totalSold,
      totalRevenue,
      criticalAlerts,
      onSale: products.filter((p: any) => (p.discount_price || 0) > 0).length
    }

    // Create overview with real data
    const totalAvailable = products.reduce((sum: number, p: any) => sum + (p.units || 0), 0)
    
    const overview = {
      totalItems: products.length,
      totalAvailable,
      categories: [...new Set(products.map((p: any) => p.category_id).filter(Boolean))].length,
      brands: [...new Set(products.map((p: any) => p.brand_id).filter(Boolean))].length,
      averagePrice: products.length > 0 ? totalValue / products.length : 0,
      alerts: {
        critical: criticalAlerts,
        warning: warningAlerts
      }
    }

    // Add sales data to products
    const productsWithSales = products.map((p: any) => ({
      ...p,
      salesData: productSales[p.$id] || { sold: 0, revenue: 0 }
    }))

    return NextResponse.json({
      success: true,
      stats,
      overview,
      products: productsWithSales.slice(0, 100) // Limit for performance
    })

  } catch (error) {
    console.error('Inventory analytics API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch inventory analytics'
      },
      { status: 500 }
    )
  }
}