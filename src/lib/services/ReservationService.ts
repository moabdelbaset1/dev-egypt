import { createAdminClient } from '@/lib/appwrite-admin';
import { DATABASE_ID, PRODUCTS_COLLECTION_ID, INVENTORY_MOVEMENTS_COLLECTION_ID } from '@/constants/appwrite';
import { ID } from 'appwrite';

export class ReservationService {
  static async reserveStock(
    productId: string,
    productName: string,
    quantity: number,
    orderId: string
  ) {
    try {
      const { databases } = await createAdminClient();

      // Get current product
      const product = await databases.getDocument(
        DATABASE_ID,
        PRODUCTS_COLLECTION_ID,
        productId
      );

      const currentStock = product.units || product.stockQuantity || 0;
      const availableStock = currentStock - (product.reserved || 0);

      if (availableStock < quantity) {
        throw new Error(`Insufficient stock for ${productName}. Available: ${availableStock}, Requested: ${quantity}`);
      }

      // Update product with reserved quantity
      await databases.updateDocument(
        DATABASE_ID,
        PRODUCTS_COLLECTION_ID,
        productId,
        {
          reserved: (product.reserved || 0) + quantity
        }
      );

      // Log reservation movement
      await databases.createDocument(
        DATABASE_ID,
        INVENTORY_MOVEMENTS_COLLECTION_ID,
        ID.unique(),
        {
          product_id: productId,
          product_name: productName,
          type: 'reserved',
          quantity: quantity,
          previous_stock: currentStock,
          available_stock: availableStock - quantity,
          reserved_stock: (product.reserved || 0) + quantity,
          order_id: orderId,
          created_at: new Date().toISOString()
        }
      );
    } catch (error) {
      console.error(`Failed to reserve stock for ${productName}:`, error);
      throw error;
    }
  }

  static async releaseStock(
    productId: string,
    productName: string,
    quantity: number,
    orderId: string
  ) {
    try {
      const { databases } = await createAdminClient();

      // Get current product
      const product = await databases.getDocument(
        DATABASE_ID,
        PRODUCTS_COLLECTION_ID,
        productId
      );

      // Update product with released quantity
      await databases.updateDocument(
        DATABASE_ID,
        PRODUCTS_COLLECTION_ID,
        productId,
        {
          reserved: Math.max(0, (product.reserved || 0) - quantity)
        }
      );

      // Log release movement
      await databases.createDocument(
        DATABASE_ID,
        INVENTORY_MOVEMENTS_COLLECTION_ID,
        ID.unique(),
        {
          product_id: productId,
          product_name: productName,
          type: 'unreserved',
          quantity: quantity,
          previous_stock: product.units || product.stockQuantity || 0,
          available_stock: (product.units || product.stockQuantity || 0) - ((product.reserved || 0) - quantity),
          reserved_stock: Math.max(0, (product.reserved || 0) - quantity),
          order_id: orderId,
          created_at: new Date().toISOString()
        }
      );
    } catch (error) {
      console.error(`Failed to release stock for ${productName}:`, error);
      throw error;
    }
  }
}