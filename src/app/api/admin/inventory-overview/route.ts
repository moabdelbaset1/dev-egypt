import { NextRequest, NextResponse } from 'next/server'
import { Query } from 'node-appwrite'
import { createAdminClient } from '@/lib/appwrite-admin'

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || ''
const MOVEMENTS_COLLECTION = 'inventory_movements'
const ALERTS_COLLECTION = 'inventory_alerts'
const AUDIT_COLLECTION = 'inventory_audit_items'

export async function GET(request: NextRequest) {
  try {
    if (!DATABASE_ID) {
      console.error('❌ DATABASE_ID not configured in environment')
      return NextResponse.json(
        { items: [], error: 'Database ID not configured' },
        { status: 500 }
      )
    }

    console.log('📊 Fetching inventory data from Appwrite...')
    console.log(`  Database: ${DATABASE_ID}`)
    console.log(`  Collections: ${MOVEMENTS_COLLECTION}, ${ALERTS_COLLECTION}, ${AUDIT_COLLECTION}`)

    const { databases } = await createAdminClient()

    // Fetch movements and alerts in parallel (audit is optional)
    const [movementsResult, alertsResult, auditResult] = await Promise.all([
      databases.listDocuments(DATABASE_ID, MOVEMENTS_COLLECTION, [Query.limit(1000)])
        .then(res => ({ documents: res.documents || [], error: null }))
        .catch(err => {
          console.warn(`⚠️ Error fetching movements: ${err.message}`)
          return { documents: [], error: err.message }
        }),
      databases.listDocuments(DATABASE_ID, ALERTS_COLLECTION, [Query.limit(1000)])
        .then(res => ({ documents: res.documents || [], error: null }))
        .catch(err => {
          console.warn(`⚠️ Error fetching alerts: ${err.message}`)
          return { documents: [], error: err.message }
        }),
      databases.listDocuments(DATABASE_ID, AUDIT_COLLECTION, [Query.limit(1000)])
        .then(res => ({ documents: res.documents || [], error: null }))
        .catch(err => {
          console.warn(`⚠️ Error fetching audit: ${err.message}`)
          return { documents: [], error: err.message }
        }),
    ])

    const movements = movementsResult.documents || []
    const alerts = alertsResult.documents || []
    const audit = auditResult.documents || []

    console.log(`✅ Fetched: ${movements.length} movements, ${alerts.length} alerts, ${audit.length} audit items`)

    // Always build from products collection as the primary source
    console.log('📦 Building inventory from products collection...')
    try {
      const productsResult = await databases.listDocuments(DATABASE_ID, 'products', [Query.limit(1000)])
        .catch(() => ({ documents: [] }))

      const products = productsResult.documents || []
      console.log(`✅ Found ${products.length} products in database`)

      // Fetch brands to map brand_id to brand names
      const brandsResult = await databases.listDocuments(DATABASE_ID, 'brands', [Query.limit(1000)])
        .catch(() => ({ documents: [] }))

      const brands = brandsResult.documents || []
      const brandMap = new Map(brands.map((b: any) => [b.$id, b.name || 'Unknown']))
      console.log(`✅ Fetched ${brands.length} brands for name mapping`)

      // Calculate inventory movements for each product
      const productInventoryMap = new Map<string, any>()

      // Initialize all products with their current stock
      products.forEach((p: any) => {
        const productId = p.$id
        const currentStock = p.units || p.stock || 0

        productInventoryMap.set(productId, {
          id: productId,
          customProductId: p.custom_product_id || productId,
          name: p.name || 'Unknown',
          brandName: brandMap.get(p.brand_id) || p.brand_id || 'Unknown',
          quantityOut: 0, // Will be calculated from movements
          quantityRemaining: currentStock,
          status: currentStock === 0 ? 'alert' : currentStock < 5 ? 'low_stock' : 'in',
          location: 'Warehouse',
          lastUpdated: p.$updatedAt || null,
        })
      })

      // Calculate quantityOut from movements
      movements.forEach((m: any) => {
        const productId = m.product_id || m.$id
        const product = productInventoryMap.get(productId)

        if (product && (m.movement_type === 'out' || m.movement_type === 'sales' || m.movement_type === 'order')) {
          const quantityChange = Math.abs(m.quantity_change || m.quantity || 0)
          product.quantityOut += quantityChange
          // Update remaining based on movements if available
          if (m.quantity_after !== undefined) {
            product.quantityRemaining = m.quantity_after
          }
        }
      })

      // Update status based on alerts
      alerts.forEach((a: any) => {
        const productId = a.product_id || a.$id
        const product = productInventoryMap.get(productId)

        if (product) {
          if (a.status === 'out_of_stock' || a.status === 'alert') {
            product.status = 'alert'
          } else if (a.status === 'low_stock') {
            product.status = 'low_stock'
          }
          // Update stock level from alerts if available
          if (a.stock_level !== undefined) {
            product.quantityRemaining = a.stock_level
          }
        }
      })

      // Convert to array
      const unifiedItems: any[] = Array.from(productInventoryMap.values())

      console.log(`✅ Built inventory overview with ${unifiedItems.length} products`)
      console.log(`📊 Sample product:`, unifiedItems[0] || 'No products')

      return NextResponse.json({ items: unifiedItems })
    } catch (err: any) {
      console.warn(`⚠️ Failed to build inventory from products: ${err.message}`)
      return NextResponse.json(
        { items: [], error: 'Failed to load products inventory' },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('❌ Error building inventory overview:', error)
    console.error('  Stack:', error.stack)
    return NextResponse.json(
      { 
        items: [], 
        error: error.message || 'Unknown error',
        debug: {
          DATABASE_ID: DATABASE_ID || 'NOT_SET',
          env: process.env.NODE_ENV
        }
      },
      { status: 500 }
    )
  }
}
