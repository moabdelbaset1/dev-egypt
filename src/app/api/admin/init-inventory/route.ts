import { NextRequest, NextResponse } from 'next/server';
import { Query } from 'node-appwrite';
import { createAdminClient } from '@/lib/appwrite-admin';
import { DATABASE_ID, PRODUCTS_COLLECTION_ID } from '@/constants/appwrite';

/**
 * Initialize inventory fields for existing products
 * Sets initial_units = current units for products that don't have it
 */
export async function POST(request: NextRequest) {
  try {
    const { databases } = await createAdminClient();

    // Fetch all products
    const { documents: products } = await databases.listDocuments(
      DATABASE_ID,
      PRODUCTS_COLLECTION_ID,
      [Query.limit(1000)]
    );

    console.log(`📦 Found ${products.length} products to check`);

    let updated = 0;
    let skipped = 0;
    let errors = 0;
    const results: any[] = [];

    for (const product of products) {
      try {
        // Check if initial_units already exists and is valid
        if (product.initial_units && product.initial_units > 0) {
          console.log(`⏭️  ${product.name}: Already has initial_units = ${product.initial_units}`);
          skipped++;
          continue;
        }

        const currentUnits = product.units || product.stockQuantity || 0;
        
        // Set initial_units to current units
        await databases.updateDocument(
          DATABASE_ID,
          PRODUCTS_COLLECTION_ID,
          product.$id,
          {
            initial_units: currentUnits
          }
        );

        console.log(`✅ ${product.name}: Set initial_units = ${currentUnits}`);
        updated++;
        
        results.push({
          id: product.$id,
          name: product.name,
          initial_units: currentUnits,
          status: 'updated'
        });

      } catch (error: any) {
        console.error(`❌ Error updating ${product.name}:`, error.message);
        errors++;
        
        results.push({
          id: product.$id,
          name: product.name,
          error: error.message,
          status: 'error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        total: products.length,
        updated,
        skipped,
        errors
      },
      results
    });

  } catch (error: any) {
    console.error('Migration failed:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to initialize inventory',
      },
      { status: 500 }
    );
  }
}