import { OrderItem } from '@/types/orders';
import { createAdminClient } from '@/lib/appwrite-admin';
import { ReservationService } from './ReservationService';
import { DATABASE_ID, INVENTORY_MOVEMENTS_COLLECTION_ID } from '@/constants/appwrite';

export class InventoryService {
  static async validateAndReserveStock(items: OrderItem[], orderId: string) {
    const { databases } = await createAdminClient();
    const validationErrors = [];

    for (const item of items) {
      try {
        const product = await databases.getDocument(
          DATABASE_ID,
          'products',
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
    const { databases } = await createAdminClient();

    for (const item of items) {
      try {
        // Skip inventory operations for unknown products (legacy orders)
        if (item.product_id === 'unknown') {
          console.log(`Skipping inventory operations for unknown product in order ${orderId}`);
          continue;
        }

        // Release the reservation first
        await ReservationService.releaseStock(
          item.product_id,
          item.product_name,
          item.quantity,
          orderId
        );

        // Get current product state
        const product = await databases.getDocument(
          DATABASE_ID,
          'products',
          item.product_id
        );

        const currentStock = product.units || product.stockQuantity || 0;
        const newStock = Math.max(0, currentStock - item.quantity);

        // Update final stock
        await databases.updateDocument(
          DATABASE_ID,
          'products',
          item.product_id,
          {
            units: newStock,
            stockQuantity: newStock
          }
        );

        // Log the movement
        await databases.createDocument(
          DATABASE_ID,
          INVENTORY_MOVEMENTS_COLLECTION_ID,
          'unique()',
          {
            product_id: item.product_id,
            product_name: item.product_name,
            type: 'sale',
            quantity: item.quantity,
            previous_stock: currentStock,
            new_stock: newStock,
            order_id: orderId,
            created_at: new Date().toISOString()
          }
        );

      } catch (error) {
        console.error(`Failed to finalize delivery for ${item.product_name}:`, error);
        throw error;
      }
    }
  }

  static async processOrderReturn(items: OrderItem[], orderId: string) {
    const { databases } = await createAdminClient();

    for (const item of items) {
      try {
        // Skip inventory operations for unknown products (legacy orders)
        if (item.product_id === 'unknown') {
          console.log(`Skipping inventory operations for unknown product in order ${orderId}`);
          continue;
        }

        // Get current product state
        const product = await databases.getDocument(
          DATABASE_ID,
          'products',
          item.product_id
        );

        const currentStock = product.units || product.stockQuantity || 0;
        const newStock = currentStock + item.quantity;

        // Update stock (add back)
        await databases.updateDocument(
          DATABASE_ID,
          'products',
          item.product_id,
          {
            units: newStock,
            stockQuantity: newStock
          }
        );

        // Log the movement
        await databases.createDocument(
          DATABASE_ID,
          INVENTORY_MOVEMENTS_COLLECTION_ID,
          'unique()',
          {
            product_id: item.product_id,
            product_name: item.product_name,
            type: 'return',
            quantity: item.quantity,
            previous_stock: currentStock,
            new_stock: newStock,
            order_id: orderId,
            created_at: new Date().toISOString()
          }
        );

      } catch (error) {
        console.error(`Failed to process return for ${item.product_name}:`, error);
        throw error;
      }
    }
  }
}