import { OrderItem } from '@/types/orders';
import { createAdminClient } from '@/lib/appwrite-admin';
import { ReservationService } from './ReservationService';
import { DATABASE_ID, INVENTORY_MOVEMENTS_COLLECTION_ID } from '@/constants/appwrite';
import { PRODUCTS_COLLECTION_ID } from '@/constants/appwrite';
import { ID } from 'node-appwrite';

export class InventoryService {
  static async validateAndReserveStock(items: OrderItem[], orderId: string) {
    const { databases } = await createAdminClient();
    const validationErrors = [];

    for (const item of items) {
      try {
        const product = await databases.getDocument(
          DATABASE_ID,
          PRODUCTS_COLLECTION_ID,
          item.product_id
        );

        const currentStock = product.units || product.stockQuantity || 0;
        const availableStock = currentStock - (product.reserved || 0);

        if (availableStock < item.quantity) {
          validationErrors.push({
            productId: item.product_id,
            productName: item.product_name,
            available: availableStock,
            requested: item.quantity
          });
          continue;
        }

        // Reserve the stock
        await ReservationService.reserveStock(
          item.product_id,
          item.product_name,
          item.quantity,
          orderId
        );

      } catch (error) {
        console.error(`Failed to validate/reserve stock for ${item.product_name}:`, error);
        validationErrors.push({
          productId: item.product_id,
          productName: item.product_name,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    if (validationErrors.length > 0) {
      // If any validations failed, release any successful reservations
      await this.releaseReservations(items, orderId);
      throw new Error('Stock validation failed: ' + JSON.stringify(validationErrors));
    }
  }

  static async releaseReservations(items: OrderItem[], orderId: string) {
    for (const item of items) {
      try {
        await ReservationService.releaseStock(
          item.product_id,
          item.product_name,
          item.quantity,
          orderId
        );
      } catch (error) {
        console.error(`Failed to release stock for ${item.product_name}:`, error);
      }
    }
  }

  static async finalizeOrderDelivery(items: OrderItem[], orderId: string) {
    console.log(`\n\n🚀🚀🚀 CRITICAL: finalizeOrderDelivery CALLED for order ${orderId}`);
    console.log(`📦 Processing ${items.length} items`);
    
    const { databases } = await createAdminClient();
    console.log(`✅ Admin client created`);

    for (const item of items) {
      try {
        // Skip inventory operations for unknown products (legacy orders)
        if (item.product_id === 'unknown') {
          console.log(`⏭️ Skipping inventory operations for unknown product in order ${orderId}`);
          continue;
        }

        console.log(`\n📦 Processing item: ${item.product_name} (ID: ${item.product_id})`);
        console.log(`   Quantity to deduct: ${item.quantity}`);

        // Release the reservation first
        await ReservationService.releaseStock(
          item.product_id,
          item.product_name,
          item.quantity,
          orderId
        );
        console.log(`✅ Released reservation`);

        // Get current product state
        console.log(`📦 Fetching product from database...`);
        const product = await databases.getDocument(
          DATABASE_ID,
          PRODUCTS_COLLECTION_ID,
          item.product_id
        );
        
        const currentUnits = product.units || 0;
        const newUnits = Math.max(0, currentUnits - item.quantity);

        console.log(`📊 Stock calculation:`, {
          currentUnits,
          deducting: item.quantity,
          newUnits
        });

        // Update units in database
        console.log(`💾 Updating database: units ${currentUnits} → ${newUnits}`);
        
        const updateResult = await databases.updateDocument(
          DATABASE_ID,
          PRODUCTS_COLLECTION_ID,
          item.product_id,
          { units: newUnits }
        );
        
        console.log(`✅ SUCCESS: units updated to ${updateResult.units}`);

        // Log the movement
        try {
          const movementData = {
            product_id: item.product_id,
            product_name: item.product_name,
            movement_type: 'sale',
            quantity: -item.quantity, // Negative for outgoing
            available_units: newUnits, // Required field
            previous_stock: currentUnits,
            new_stock: newUnits,
            order_id: orderId,
            created_at: new Date().toISOString(),
            notes: `Order ${orderId} delivered`
          };
          
          console.log(`📝 Creating movement record:`, movementData);
          
          const movement = await databases.createDocument(
            DATABASE_ID,
            INVENTORY_MOVEMENTS_COLLECTION_ID,
            ID.unique(),
            movementData
          );
          console.log(`✅ Created movement record: ${movement.$id}`);
        } catch (movementError: any) {
          console.error(`⚠️ Failed to create movement record:`, {
            error: movementError.message,
            code: movementError.code,
            type: movementError.type
          });
          // Don't fail the entire operation if movement logging fails
        }

      } catch (error) {
        console.error(`❌ Failed to finalize delivery for ${item.product_name}:`, error);
        throw error;
      }
    }
    
    console.log(`✅ Successfully finalized delivery for order ${orderId}`);
  }

  static async processOrderReturn(items: OrderItem[], orderId: string) {
    const { databases } = await createAdminClient();
    
    console.log(`🔄 Starting processOrderReturn for order ${orderId}`);
    console.log(`📦 Processing ${items.length} items`);

    for (const item of items) {
      try {
        // Skip inventory operations for unknown products (legacy orders)
        if (item.product_id === 'unknown') {
          console.log(`⏭️ Skipping inventory operations for unknown product in order ${orderId}`);
          continue;
        }

        console.log(`\n🔙 Processing return: ${item.product_name} (ID: ${item.product_id})`);
        console.log(`   Quantity to add back: ${item.quantity}`);

        // Get current product state
        const product = await databases.getDocument(
          DATABASE_ID,
          PRODUCTS_COLLECTION_ID,
          item.product_id
        );

        const currentStock = product.units || product.stockQuantity || 0;
        const newStock = currentStock + item.quantity;

        console.log(`📊 Stock update:`, {
          currentStock,
          adding: item.quantity,
          newStock
        });

        // Update stock (add back)
        await databases.updateDocument(
          DATABASE_ID,
          PRODUCTS_COLLECTION_ID,
          item.product_id,
          {
            units: newStock,
            stockQuantity: newStock
          }
        );
        
        console.log(`✅ Updated product stock: ${currentStock} → ${newStock}`);

        // Log the movement
        try {
          const movementData = {
            product_id: item.product_id,
            product_name: item.product_name,
            movement_type: 'return',
            quantity: item.quantity, // Positive for incoming
            available_units: newStock, // Required field
            previous_stock: currentStock,
            new_stock: newStock,
            order_id: orderId,
            created_at: new Date().toISOString(),
            notes: `Order ${orderId} returned`
          };
          
          console.log(`📝 Creating return movement record:`, movementData);
          
          const movement = await databases.createDocument(
            DATABASE_ID,
            INVENTORY_MOVEMENTS_COLLECTION_ID,
            ID.unique(),
            movementData
          );
          console.log(`✅ Created return movement record: ${movement.$id}`);
        } catch (movementError: any) {
          console.error(`⚠️ Failed to create movement record:`, {
            error: movementError.message,
            code: movementError.code,
            type: movementError.type
          });
        }

      } catch (error) {
        console.error(`❌ Failed to process return for ${item.product_name}:`, error);
        throw error;
      }
    }
    
    console.log(`✅ Successfully processed return for order ${orderId}`);
  }
}