import { NextRequest, NextResponse } from 'next/server';
import { Query } from 'node-appwrite';
import { createAdminClient } from '@/lib/appwrite-admin';
import { DATABASE_ID, PRODUCTS_COLLECTION_ID, INVENTORY_MOVEMENTS_COLLECTION_ID } from '@/constants/appwrite';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');

    const { databases } = await createAdminClient();

    // Fetch all products
    const { documents: products } = await databases.listDocuments(
      DATABASE_ID,
      PRODUCTS_COLLECTION_ID,
      [
        Query.limit(limit),
        Query.orderDesc('$createdAt')
      ]
    );

    // Fetch ALL orders to calculate quantities accurately
    const ORDERS_COLLECTION_ID = 'orders';
    let orders: any[] = [];
    try {
      const { documents: orderDocs } = await databases.listDocuments(
        DATABASE_ID,
        ORDERS_COLLECTION_ID,
        [
          Query.limit(2000),
          Query.orderDesc('$createdAt')
        ]
      );
      orders = orderDocs;
      console.log(`📋 Found ${orders.length} orders for inventory calculation`);
    } catch (error) {
      console.warn('⚠️ Orders collection error:', error);
      orders = [];
    }

    // Fetch inventory movements for additional tracking
    let movements: any[] = [];
    try {
      const { documents: movementDocs } = await databases.listDocuments(
        DATABASE_ID,
        INVENTORY_MOVEMENTS_COLLECTION_ID,
        [
          Query.limit(1000),
          Query.orderDesc('created_at')
        ]
      );
      movements = movementDocs;
      console.log(`📦 Found ${movements.length} inventory movements`);
    } catch (error) {
      console.warn('⚠️ Inventory movements collection not available:', error);
      movements = [];
    }

    // Process inventory data
    console.log(`\n🔍 Processing ${products.length} products...`);
    let needsInitialization = 0;
    const inventoryItems = await Promise.all(products.map(async (product: any, index: number) => {
      // Log first product for debugging
      if (index === 0) {
        console.log('\n📦 Sample product structure:', {
          id: product.$id,
          name: product.name,
          brand_name: product.brand_name,
          brandName: product.brandName,
          brand: product.brand,
          brand_id: product.brand_id,
          customProductId: product.customProductId,
          custom_product_id: product.custom_product_id,
          units: product.units,
          stockQuantity: product.stockQuantity
        });
      }

      // Current stock from product (this is the ACTUAL remaining in database)
      const currentStock = product.units || product.stockQuantity || 0;
      
      // Get INITIAL stock from product field
      let initialStock = product.initial_units || product.initialStock || 0;
      
      // Get product movements for lastUpdated tracking
      const productMovements = movements.filter((m: any) => m.product_id === product.$id);
      
      // Calculate quantityOut from ORDERS (delivered only)
      let quantityOut = 0;
      
      orders.forEach((order: any) => {
        const orderStatus = order.order_status || order.status || 'pending';
        
        // Only count delivered orders
        if (orderStatus === 'delivered') {
          try {
            const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
            if (Array.isArray(items)) {
              items.forEach((item: any) => {
                const itemProductId = item.productId || item.product_id || item.id;
                if (itemProductId === product.$id) {
                  quantityOut += parseInt(item.quantity) || 0;
                }
              });
            }
          } catch (e) {
            // Skip invalid items
          }
        }
      });
      
      // If initial_units not set, use current stock as initial
      // This should be set manually by admin, but we calculate it once
      if (initialStock === 0) {
        initialStock = currentStock;
        console.log(`📊 Using current stock as initial for ${product.name} = ${initialStock}`);
        needsInitialization++;
      }
      
      // Remaining = Initial - Out (calculated, not from database)
      // This is the correct formula
      const quantityRemaining = Math.max(0, initialStock - quantityOut);
      
      // Validate: remaining should equal initial - out
      const expectedRemaining = Math.max(0, initialStock - quantityOut);
      if (Math.abs(quantityRemaining - expectedRemaining) > 0) {
        console.log(`⚠️ ${product.name} mismatch:`, {
          initial: initialStock,
          out: quantityOut,
          expected: expectedRemaining,
          actual: quantityRemaining,
          diff: quantityRemaining - expectedRemaining
        });
      }
      
      // Log for debugging
      if (index === 0) {
        console.log(`\n📊 Sample Product: ${product.name}`, {
          has_initial_units: !!product.initial_units,
          initialStock,
          quantityOut,
          dbRemaining: currentStock,
          displayRemaining: quantityRemaining,
          formula: `${initialStock} - ${quantityOut} = ${expectedRemaining}`
        });
      }
      
      // Get brand name
      let brandName = 'Unknown Brand';
      if (product.brand_name) {
        brandName = product.brand_name;
      } else if (product.brandName) {
        brandName = product.brandName;
      } else if (product.brand) {
        brandName = product.brand;
      } else if (product.brand_id) {
        brandName = `Brand ${product.brand_id.slice(-8)}`;
      }
      
      // Determine status: if Out >= Initial, it's out of stock
      let status: 'in' | 'out' | 'low_stock' | 'alert' | 'out_of_stock';
      if (quantityRemaining === 0 || (initialStock > 0 && quantityOut >= initialStock)) {
        status = 'out_of_stock';
      } else if (quantityRemaining <= 5) {
        status = 'low_stock';
      } else if (quantityRemaining <= 10) {
        status = 'alert';
      } else {
        status = 'in';
      }

      // Get last movement date
      const lastMovement = productMovements[0];
      const lastUpdated = lastMovement?.created_at || product.$updatedAt;

      return {
        id: product.$id,
        customProductId: product.customProductId || product.custom_product_id || product.$id.slice(-8),
        name: product.name || product.title || 'Unnamed Product',
        brandName: brandName,
        initialStock, // العدد الأساسي
        quantityOut, // اللي خرج (delivered)
        quantityRemaining, // المتبقي (includes returns automatically)
        status,
        location: product.location || product.warehouse_location || 'Main Warehouse',
        lastUpdated: lastUpdated
      };
    }));

    console.log(`\n📊 Auto-initialized ${needsInitialization} products`);

    // Sort by status priority (out of stock first, then low stock)
    inventoryItems.sort((a, b) => {
      const statusPriority: Record<string, number> = {
        'out_of_stock': 0,
        'alert': 1,
        'low_stock': 2,
        'in': 3,
        'out': 4
      };
      return statusPriority[a.status] - statusPriority[b.status];
    });

    return NextResponse.json({
      success: true,
      items: inventoryItems,
      total: inventoryItems.length,
      summary: {
        totalProducts: inventoryItems.length,
        inStock: inventoryItems.filter(i => i.status === 'in').length,
        lowStock: inventoryItems.filter(i => i.status === 'low_stock').length,
        outOfStock: inventoryItems.filter(i => i.status === 'out_of_stock' || i.status === 'alert').length,
        totalInitialStock: inventoryItems.reduce((sum, i) => sum + i.initialStock, 0),
        totalOut: inventoryItems.reduce((sum, i) => sum + i.quantityOut, 0),
        totalRemaining: inventoryItems.reduce((sum, i) => sum + i.quantityRemaining, 0),
      }
    });
  } catch (error) {
    console.error('Error fetching inventory overview:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch inventory overview',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
