import { NextRequest, NextResponse } from 'next/server'
import { Client, Databases, Query } from 'node-appwrite'

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

  return new Databases(client)
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')

    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      )
    }

    const databases = createAdminClient()
    const databaseId = process.env.APPWRITE_DATABASE_ID || '68dbeceb003bf10d9498'

    // Fetch product details
    const product = await databases.getDocument(
      databaseId,
      'products',
      productId
    )

    // Fetch all orders
    const ordersResult = await databases.listDocuments(
      databaseId,
      'orders',
      [Query.limit(1000)]
    )

    const orders = ordersResult.documents || []

    // Calculate sales data for this product
    let totalSold = 0
    let totalRevenue = 0
    let soldToday = 0
    let soldThisWeek = 0
    let soldThisMonth = 0
    let soldThisYear = 0
    let revenueToday = 0
    let revenueThisWeek = 0
    let revenueThisMonth = 0
    let revenueThisYear = 0
    let lastSaleDate: string | null = null

    const now = new Date()
    const todayStart = new Date(now.setHours(0, 0, 0, 0))
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()))
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const yearStart = new Date(now.getFullYear(), 0, 1)

    orders.forEach((order: any) => {
      try {
        const items = JSON.parse(order.items || '[]')
        const orderStatus = order.order_status || order.status || 'pending'
        const orderDate = new Date(order.$createdAt)

        // Only count delivered orders
        if (orderStatus === 'delivered') {
          items.forEach((item: any) => {
            const itemProductId = item.productId || item.product_id || item.id
            
            if (itemProductId === productId) {
              const quantity = parseInt(item.quantity) || 0
              const price = parseFloat(item.price) || 0
              const revenue = quantity * price

              totalSold += quantity
              totalRevenue += revenue

              // Track last sale
              if (!lastSaleDate || orderDate > new Date(lastSaleDate)) {
                lastSaleDate = order.$createdAt
              }

              // Period-based tracking
              if (orderDate >= todayStart) {
                soldToday += quantity
                revenueToday += revenue
              }
              if (orderDate >= weekStart) {
                soldThisWeek += quantity
                revenueThisWeek += revenue
              }
              if (orderDate >= monthStart) {
                soldThisMonth += quantity
                revenueThisMonth += revenue
              }
              if (orderDate >= yearStart) {
                soldThisYear += quantity
                revenueThisYear += revenue
              }
            }
          })
        }
      } catch (e) {
        // Skip invalid orders
      }
    })

    // Calculate sales velocity
    const daysSinceFirstSale = lastSaleDate 
      ? Math.max(1, Math.floor((now.getTime() - new Date(lastSaleDate).getTime()) / (1000 * 60 * 60 * 24)))
      : 1
    const averageSalesPerDay = totalSold / daysSinceFirstSale

    let salesVelocity = 'stagnant'
    if (averageSalesPerDay >= 5) salesVelocity = 'fast'
    else if (averageSalesPerDay >= 2) salesVelocity = 'medium'
    else if (averageSalesPerDay >= 0.5) salesVelocity = 'slow'

    // Current stock info
    const currentStock = (product as any).units || (product as any).stockQuantity || 0
    const reorderPoint = (product as any).lowStockThreshold || (product as any).min_order_quantity || 5
    const costPrice = (product as any).price || 0

    // Build response
    const data = {
      product: {
        id: product.$id,
        name: (product as any).name,
        sku: (product as any).sku || `${product.$id.slice(0, 8)}`,
        costPrice,
        sellingPrice: (product as any).price || 0
      },
      inventory: {
        currentStock,
        availableStock: currentStock,
        reservedStock: 0,
        reorderPoint,
        minStock: Math.floor(reorderPoint / 2),
        maxStock: reorderPoint * 10,
        stockValue: currentStock * costPrice,
        lastRestockDate: (product as any).$updatedAt
      },
      sales: {
        totalSold,
        soldToday,
        soldThisWeek,
        soldThisMonth,
        soldThisYear,
        revenue: {
          total: totalRevenue,
          today: revenueToday,
          thisWeek: revenueThisWeek,
          thisMonth: revenueThisMonth,
          thisYear: revenueThisYear
        },
        averageSalesPerDay,
        salesVelocity,
        lastSaleDate
      },
      warehouse: {
        location: 'Main Warehouse',
        section: 'A',
        shelf: null,
        bin: null,
        barcode: (product as any).sku || null
      },
      recentMovements: [],
      alerts: currentStock <= reorderPoint ? [{
        id: '1',
        type: 'low_stock',
        severity: currentStock === 0 ? 'critical' : 'warning',
        message: currentStock === 0 
          ? 'Product is out of stock' 
          : `Stock level is below reorder point (${reorderPoint})`,
        currentStock,
        threshold: reorderPoint,
        createdAt: new Date().toISOString()
      }] : []
    }

    return NextResponse.json({
      success: true,
      data
    })

  } catch (error) {
    console.error('Inventory analytics API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch product inventory details' 
      },
      { status: 500 }
    )
  }
}