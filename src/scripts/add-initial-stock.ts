/**
 * Script to add initial_units field to existing products
 * This should be run once to migrate existing products
 */

import { Client, Databases, Query } from 'node-appwrite';

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '')
  .setKey(process.env.APPWRITE_API_KEY || '');

const databases = new Databases(client);
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || '';
const PRODUCTS_COLLECTION_ID = 'products';

async function addInitialStockToProducts() {
  try {
    console.log('🚀 Starting migration: Adding initial_units to products...\n');

    // Fetch all products
    const { documents: products } = await databases.listDocuments(
      DATABASE_ID,
      PRODUCTS_COLLECTION_ID,
      [Query.limit(1000)]
    );

    console.log(`📦 Found ${products.length} products to process\n`);

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const product of products) {
      try {
        // Check if initial_units already exists
        if (product.initial_units && product.initial_units > 0) {
          console.log(`⏭️  Skipping ${product.name} - already has initial_units: ${product.initial_units}`);
          skipped++;
          continue;
        }

        const currentUnits = product.units || product.stockQuantity || 0;
        
        // Set initial_units to current units (we assume this is the starting point)
        await databases.updateDocument(
          DATABASE_ID,
          PRODUCTS_COLLECTION_ID,
          product.$id,
          {
            initial_units: currentUnits
          }
        );

        console.log(`✅ Updated ${product.name}: initial_units = ${currentUnits}`);
        updated++;

      } catch (error: any) {
        console.error(`❌ Error updating ${product.name}:`, error.message);
        errors++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📦 Total: ${products.length}`);

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run the migration
addInitialStockToProducts()
  .then(() => {
    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });