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

    // Fetch inventory movements for these products
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
      if (movements.length > 0) {
        console.log('Sample movement:', movements[0]);
      }
    } catch (error) {
      console.warn('⚠️ Inventory movements collection not available:', error);
      movements = [];
    }

    // Process inventory data
    console.log(`\n🔍 Processing ${products.length} products...`);
    const inventoryItems = products.map((product: any, index: number) => {
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

      // Calculate quantities from movements
      const productMovements = movements.filter((m: any) => m.product_id === product.$id);
      
      if (index === 0 && productMovements.length > 0) {
        console.log(`\n📊 Product has ${productMovements.length} movements`);
        console.log('Sample movement:', productMovements[0]);
      }
      
      // Count delivered items (movement_type: 'sale' means delivered)
      const quantityDelivered = productMovements
        .filter((m: any) => m.movement_type === 'sale')
        .reduce((sum: number, m: any) => sum + Math.abs(m.quantity || 0), 0);
      
      // Count returned items
      const quantityReturned = productMovements
        .filter((m: any) => m.movement_type === 'return')
        .reduce((sum: number, m: any) => sum + Math.abs(m.quantity || 0), 0);

      // Current stock from product
      const currentStock = product.units || product.stockQuantity || 0;
      
      // Calculate net sold (delivered minus returned)
      const netSold = quantityDelivered - quantityReturned;
      
      // Calculate initial stock: Current + NetSold
      // Example: If current = 2, delivered = 4, returned = 0 => initial = 2 + 4 = 6
      const initialStock = currentStock + netSold;
      
      // Remaining is just current stock
      const quantityRemaining = currentStock;
      
      // Get brand name - try multiple possible fields
      let brandName = 'Unknown Brand';
      if (product.brand_name) {
        brandName = product.brand_name;
      } else if (product.brandName) {
        brandName = product.brandName;
      } else if (product.brand) {
        brandName = product.brand;
      } else if (product.brand_id) {
        // If we have brand_id but not name, we'll show the ID
        brandName = `Brand ${product.brand_id.slice(-8)}`;
      }
      
      // Determine status based on current stock
      let status: 'in' | 'out' | 'low_stock' | 'alert' | 'out_of_stock';
      if (currentStock === 0) {
        status = 'out_of_stock';
      } else if (currentStock <= 5) {
        status = 'low_stock';
      } else if (currentStock <= 10) {
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
        quantityDelivered,
        quantityReturned,
        quantityRemaining,
        initialStock, // Original stock before any sales
        netSold, // Net amount that went out (delivered - returned)
        status,
        location: product.location || product.warehouse_location || 'Main Warehouse',
        lastUpdated: lastUpdated
      };
    });

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
        totalDelivered: inventoryItems.reduce((sum, i) => sum + i.quantityDelivered, 0),
        totalReturned: inventoryItems.reduce((sum, i) => sum + i.quantityReturned, 0),
        totalNetSold: inventoryItems.reduce((sum, i) => sum + i.netSold, 0),
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
