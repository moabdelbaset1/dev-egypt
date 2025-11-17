// Database Migration Script
// Adds missing fields to existing Appwrite collections

import { createAdminClient } from './appwrite-admin';
import { DATABASE_ID, PRODUCTS_COLLECTION_ID, ORDERS_COLLECTION_ID } from './appwrite';

export interface MigrationResult {
  success: boolean;
  message: string;
  details: {
    fieldsAdded: string[];
    errors: string[];
  };
}

export class DatabaseMigration {
  /**
   * Migrates the products collection to include missing fields
   */
  static async migrateProductsCollection(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      message: 'Products collection migration completed',
      details: {
        fieldsAdded: [],
        errors: []
      }
    };

    try {
      console.log('🔄 Starting products collection migration...');
      const { databases } = await createAdminClient();

      // Check if hasVariations field exists and add it if missing
      try {
        await databases.getAttribute(DATABASE_ID, PRODUCTS_COLLECTION_ID, 'hasVariations');
        console.log('✅ hasVariations field already exists');
      } catch (error: any) {
        if (error.code === 404) {
          console.log('➕ Adding missing hasVariations field...');

          try {
            await databases.createBooleanAttribute(
              DATABASE_ID,
              PRODUCTS_COLLECTION_ID,
              'hasVariations',
              true, // required
              false // default value
            );

            result.details.fieldsAdded.push('hasVariations');
            console.log('✅ Added hasVariations field successfully');
          } catch (addError: any) {
            result.details.errors.push(`Failed to add hasVariations field: ${addError.message}`);
            console.error('❌ Failed to add hasVariations field:', addError);
          }
        } else {
          result.details.errors.push(`Error checking hasVariations field: ${error.message}`);
          console.error('❌ Error checking hasVariations field:', error);
        }
      }

      // Check for other potentially missing fields based on schema
      const fieldsToCheck = [
        { name: 'lastViewedAt', type: 'datetime', required: false }
      ];

      for (const field of fieldsToCheck) {
        try {
          await databases.getAttribute(DATABASE_ID, PRODUCTS_COLLECTION_ID, field.name);
          console.log(`✅ ${field.name} field already exists`);
        } catch (error: any) {
          if (error.code === 404) {
            console.log(`➕ Adding missing ${field.name} field...`);

            try {
              if (field.type === 'datetime') {
                await databases.createDatetimeAttribute(
                  DATABASE_ID,
                  PRODUCTS_COLLECTION_ID,
                  field.name,
                  field.required
                );
              }

              result.details.fieldsAdded.push(field.name);
              console.log(`✅ Added ${field.name} field successfully`);
            } catch (addError: any) {
              result.details.errors.push(`Failed to add ${field.name} field: ${addError.message}`);
              console.error(`❌ Failed to add ${field.name} field:`, addError);
            }
          } else {
            result.details.errors.push(`Error checking ${field.name} field: ${error.message}`);
            console.error(`❌ Error checking ${field.name} field:`, error);
          }
        }
      }

      if (result.details.errors.length > 0) {
        result.success = false;
        result.message = 'Products collection migration completed with errors';
      } else {
        result.message = 'Products collection migration completed successfully';
      }

      return result;

    } catch (error: any) {
      console.error('💥 Products collection migration failed:', error);
      result.success = false;
      result.message = 'Products collection migration failed';
      result.details.errors.push(error.message || 'Unknown error');

      return result;
    }
  }

  /**
   * Migrates the orders collection to include missing fields
   */
  static async migrateOrdersCollection(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      message: 'Orders collection migration completed',
      details: {
        fieldsAdded: [],
        errors: []
      }
    };

    try {
      console.log('🔄 Starting orders collection migration...');
      const { databases } = await createAdminClient();

      // Check if items field exists and add it if missing
      try {
        await databases.getAttribute(DATABASE_ID, ORDERS_COLLECTION_ID, 'items');
        console.log('✅ items field already exists');
      } catch (error: any) {
        if (error.code === 404) {
          console.log('➕ Adding missing items field...');

          try {
            await databases.createStringAttribute(
              DATABASE_ID,
              ORDERS_COLLECTION_ID,
              'items',
              10000, // size - large enough for JSON string
              true // required
            );

            result.details.fieldsAdded.push('items');
            console.log('✅ Added items field successfully');
          } catch (addError: any) {
            result.details.errors.push(`Failed to add items field: ${addError.message}`);
            console.error('❌ Failed to add items field:', addError);
          }
        } else {
          result.details.errors.push(`Error checking items field: ${error.message}`);
          console.error('❌ Error checking items field:', error);
        }
      }

      // Check for other potentially missing fields based on current usage
      const fieldsToCheck = [
        { name: 'order_code', type: 'string', required: true, size: 100 },
        { name: 'brand_id', type: 'string', required: false, size: 255 },
        { name: 'total_amount', type: 'float', required: true },
        { name: 'payable_amount', type: 'float', required: true },
        { name: 'order_status', type: 'string', required: true, size: 50 },
        { name: 'payment_status', type: 'string', required: true, size: 50 },
        { name: 'shipping_address', type: 'string', required: false, size: 2000 },
        { name: 'customer_name', type: 'string', required: false, size: 255 },
        { name: 'customer_email', type: 'string', required: false, size: 255 },
        { name: 'fulfillment_status', type: 'string', required: false, size: 50 },
        { name: 'shipped_at', type: 'datetime', required: false },
        { name: 'delivered_at', type: 'datetime', required: false },
        { name: 'tracking_number', type: 'string', required: false, size: 255 },
        { name: 'carrier', type: 'string', required: false, size: 100 }
      ];

      for (const field of fieldsToCheck) {
        try {
          await databases.getAttribute(DATABASE_ID, ORDERS_COLLECTION_ID, field.name);
          console.log(`✅ ${field.name} field already exists`);
        } catch (error: any) {
          if (error.code === 404) {
            console.log(`➕ Adding missing ${field.name} field...`);

            try {
              if (field.type === 'string') {
                await databases.createStringAttribute(
                  DATABASE_ID,
                  ORDERS_COLLECTION_ID,
                  field.name,
                  field.size || 255,
                  field.required
                );
              } else if (field.type === 'float') {
                await databases.createFloatAttribute(
                  DATABASE_ID,
                  ORDERS_COLLECTION_ID,
                  field.name,
                  field.required
                );
              } else if (field.type === 'datetime') {
                await databases.createDatetimeAttribute(
                  DATABASE_ID,
                  ORDERS_COLLECTION_ID,
                  field.name,
                  field.required
                );
              }

              result.details.fieldsAdded.push(field.name);
              console.log(`✅ Added ${field.name} field successfully`);
            } catch (addError: any) {
              result.details.errors.push(`Failed to add ${field.name} field: ${addError.message}`);
              console.error(`❌ Failed to add ${field.name} field:`, addError);
            }
          } else {
            result.details.errors.push(`Error checking ${field.name} field: ${error.message}`);
            console.error(`❌ Error checking ${field.name} field:`, error);
          }
        }
      }

      if (result.details.errors.length > 0) {
        result.success = false;
        result.message = 'Orders collection migration completed with errors';
      } else {
        result.message = 'Orders collection migration completed successfully';
      }

      return result;

    } catch (error: any) {
      console.error('💥 Orders collection migration failed:', error);
      result.success = false;
      result.message = 'Orders collection migration failed';
      result.details.errors.push(error.message || 'Unknown error');

      return result;
    }
  }

  /**
   * Runs all pending migrations
   */
  static async runAllMigrations(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      message: 'All migrations completed',
      details: {
        fieldsAdded: [],
        errors: []
      }
    };

    console.log('🚀 Running all database migrations...');

    // Run products collection migration
    const productsResult = await this.migrateProductsCollection();

    result.details.fieldsAdded.push(...productsResult.details.fieldsAdded);
    result.details.errors.push(...productsResult.details.errors);

    // Run orders collection migration
    const ordersResult = await this.migrateOrdersCollection();

    result.details.fieldsAdded.push(...ordersResult.details.fieldsAdded);
    result.details.errors.push(...ordersResult.details.errors);

    if (!productsResult.success || !ordersResult.success) {
      result.success = false;
      result.message = 'Migrations completed with errors';
    }

    return result;
  }

  /**
   * Checks if migrations are needed
   */
  static async checkMigrationStatus(): Promise<{
    needsMigration: boolean;
    missingFields: string[];
    message: string;
  }> {
    try {
      const { databases } = await createAdminClient();
      const missingFields: string[] = [];

      // Check products collection fields
      try {
        await databases.getAttribute(DATABASE_ID, PRODUCTS_COLLECTION_ID, 'hasVariations');
      } catch (error: any) {
        if (error.code === 404) {
          missingFields.push('products.hasVariations');
        }
      }

      // Check orders collection fields
      try {
        await databases.getAttribute(DATABASE_ID, ORDERS_COLLECTION_ID, 'items');
      } catch (error: any) {
        if (error.code === 404) {
          missingFields.push('orders.items');
        }
      }

      return {
        needsMigration: missingFields.length > 0,
        missingFields,
        message: missingFields.length > 0
          ? `Missing fields: ${missingFields.join(', ')}`
          : 'All required fields exist'
      };
    } catch (error: any) {
      return {
        needsMigration: true,
        missingFields: ['unknown'],
        message: `Error checking migration status: ${error.message}`
      };
    }
  }
}

// CLI helper function for running migrations
export async function runMigrations() {
  console.log('🔄 Database Migration Tool');
  console.log('========================');

  const status = await DatabaseMigration.checkMigrationStatus();

  if (!status.needsMigration) {
    console.log('✅ No migrations needed!');
    return;
  }

  console.log(`🔧 Migration needed: ${status.message}`);
  console.log('Running migrations...');

  const result = await DatabaseMigration.runAllMigrations();

  if (result.success) {
    console.log('✅ Migrations completed successfully!');
    console.log(`Fields added: ${result.details.fieldsAdded.join(', ')}`);
  } else {
    console.log('❌ Migrations completed with errors:');
    result.details.errors.forEach(error => console.log(`  - ${error}`));
  }
}