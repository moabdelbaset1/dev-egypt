import { NextRequest, NextResponse } from "next/server"
import { Query } from "node-appwrite"
import { createAdminClient } from "@/lib/appwrite-admin"

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || ''
const PRODUCTS_COLLECTION_ID = 'products'
const ORDERS_COLLECTION_ID = 'orders'
const BRANDS_COLLECTION_ID = 'brands'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period") || "30"

    const { databases } = await createAdminClient()

    // Calculate date range
    const now = new Date()
    const periodDays = parseInt(period)
    const fromDate = new Date(now.getTime() - (periodDays * 24 * 60 * 60 * 1000))

    // Fetch data in parallel
    const [brandsResult, productsResult, ordersResult] = await Promise.all([
      databases.listDocuments(DATABASE_ID, BRANDS_COLLECTION_ID, [
        Query.limit(100)
      ]).catch(() => ({ documents: [], total: 0 })),
      
      databases.listDocuments(DATABASE_ID, PRODUCTS_COLLECTION_ID, [
        Query.limit(1000)
      ]).catch(() => ({ documents: [], total: 0 })),
      
      databases.listDocuments(DATABASE_ID, ORDERS_COLLECTION_ID, [
        Query.limit(1000),
        Query.greaterThanEqual('$createdAt', fromDate.toISOString()),
        Query.orderDesc('$createdAt')
      ]).catch(() => ({ documents: [], total: 0 }))
    ])

    const brands = brandsResult.documents || []
    const products = productsResult.documents || []
    const orders = ordersResult.documents || []

    // Process brand analytics
    const brandStats: { [key: string]: {
      brand_id: string
      brand_name: string
      product_count: number
      orders: number
      revenue: number
      views: number
      growth: number
    }} = {}

    // Initialize brand stats
    brands.forEach((brand: any) => {
      brandStats[brand.$id] = {
        brand_id: brand.$id,
        brand_name: brand.name || 'Unknown Brand',
        product_count: 0,
        orders: 0,
        revenue: 0,
        views: 0,
        growth: 0
      }
    })

    // Count products per brand
    products.forEach((product: any) => {
      const brandId = product.brand_id
      if (brandId && brandStats[brandId]) {
        brandStats[brandId].product_count++
        // Use view_count from product if available
        brandStats[brandId].views += product.view_count || 0
      }
    })

    // Calculate orders and revenue per brand
    console.log('📦 Processing', orders.length, 'orders for brand analytics')
    
    orders.forEach((order: any) => {
      if (order.payment_status === 'paid' && order.items) {
        try {
          const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items
          if (Array.isArray(items)) {
            // Track which brands are in this order to count orders correctly
            const brandsInOrder = new Set<string>()
            
            items.forEach((item: any) => {
              const productId = item.product_id || item.productId || item.id
              const product = products.find(p => p.$id === productId)
              
              if (product && product.brand_id && brandStats[product.brand_id]) {
                brandsInOrder.add(product.brand_id)
                const itemRevenue = (item.price || 0) * (item.quantity || 1)
                brandStats[product.brand_id].revenue += itemRevenue
                console.log(`💰 Brand ${brandStats[product.brand_id].brand_name}: +$${itemRevenue.toFixed(2)}`)
              }
            })
            
            // Count this order once per brand
            brandsInOrder.forEach(brandId => {
              brandStats[brandId].orders++
            })
          }
        } catch (error) {
          console.error('Error parsing order items:', error)
        }
      }
    })
    
    console.log('📊 Brand stats after processing:', Object.values(brandStats).map(b => ({
      name: b.brand_name,
      orders: b.orders,
      revenue: b.revenue
    })))

    // Calculate growth (simplified - based on order count)
    Object.values(brandStats).forEach(brand => {
      // Simple growth calculation: (orders / period) * 30 to normalize to monthly
      brand.growth = brand.orders > 0 ? Math.round((brand.orders / periodDays) * 30) : 0
    })

    // Sort by views for top viewed
    const topViewedBrands = Object.values(brandStats)
      .filter(b => b.product_count > 0)
      .sort((a, b) => b.views - a.views)
      .slice(0, 10)

    console.log('👀 Top Viewed Brands:', topViewedBrands.map(b => `${b.brand_name}: ${b.views} views`))

    // Sort by revenue for top selling
    const topSellingBrands = Object.values(brandStats)
      .filter(b => b.orders > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    console.log('💰 Top Selling Brands:', topSellingBrands.map(b => `${b.brand_name}: ${b.orders} orders, $${b.revenue.toFixed(2)}`))

    const response = {
      success: true,
      topViewedBrands,
      topSellingBrands,
      totalBrands: brands.length,
      activeBrands: Object.values(brandStats).filter(b => b.product_count > 0).length
    }
    
    console.log('✅ Returning brand analytics:', {
      totalBrands: response.totalBrands,
      activeBrands: response.activeBrands,
      topViewedCount: topViewedBrands.length,
      topSellingCount: topSellingBrands.length
    })

    return NextResponse.json(response)

  } catch (error: any) {
    console.error("Error fetching brand analytics:", error)
    return NextResponse.json(
      { 
        error: error.message || "Failed to fetch brand analytics",
        topViewedBrands: [],
        topSellingBrands: [],
        totalBrands: 0,
        activeBrands: 0
      },
      { status: 500 }
    )
  }
}