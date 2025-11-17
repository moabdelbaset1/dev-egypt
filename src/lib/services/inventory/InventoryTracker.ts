import { ID, Models, Query } from "appwrite";
import { Databases } from 'node-appwrite';
import { createAdminClient } from "@/lib/appwrite-admin";
import { DATABASE_ID } from "@/constants/appwrite";

const PRODUCTS_COLLECTION_ID = "products";
const INVENTORY_MOVEMENTS_COLLECTION_ID = "inventory_movements";

interface InventoryMovement {
  product_id: string;
  product_name: string;
  movement_type: "sale" | "return" | "adjustment" | "restock";
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reference_id?: string;
  notes?: string;
  timestamp: string;
  variant_id?: string;
  size?: string;
  color?: string;
}

interface ProcessResult {
  product_id: string;
  success: boolean;
  message?: string;
}

interface OrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
  variant_id?: string;
  size?: string;
  color?: string;
}

export class InventoryTracker {
  private databases: Databases | null = null;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    try {
      const client = await createAdminClient();
      this.databases = client.databases;
    } catch (error) {
      console.error('Failed to initialize InventoryTracker:', error);
      throw new Error('Failed to initialize inventory tracking system');
    }
  }

  private async ensureInitialized() {
    if (!this.databases) {
      await this.initialize();
      if (!this.databases) {
        throw new Error('Failed to initialize databases client');
      }
    }
  }

  private async getCurrentStock(productId: string, variantId?: string): Promise<number> {
    await this.ensureInitialized();
    
    try {
      console.log(`🔍 Getting stock for product ${productId}${variantId ? ` variant ${variantId}` : ''}`);
      const product = await this.databases!.getDocument(
        DATABASE_ID,
        PRODUCTS_COLLECTION_ID,
        productId
      );

      // If variant is specified, get variant stock
      if (variantId && product.variants) {
        const variant = product.variants.find((v: any) => v.$id === variantId);
        const stock = variant ? Number(variant.stock || variant.units || 0) : 0;
        console.log(`📦 Variant stock: ${stock}`);
        return stock;
      }

      // Return main product stock - use units field
      const stock = Number(product.units || product.stock || product.stockQuantity || 0);
      console.log(`📦 Product stock: ${stock}`);
      return stock;
    } catch (error) {
      console.error(`❌ Error getting stock for product ${productId}:`, error);
      if (error instanceof Error) {
        throw new Error(`Failed to get current stock for product ${productId}: ${error.message}`);
      }
      throw new Error(`Failed to get current stock for product ${productId}`);
    }
  }

  private async updateStock(productId: string, newStock: number, variantId?: string): Promise<void> {
    await this.ensureInitialized();
    
    try {
      console.log(`📝 [STOCK UPDATE] Starting update for product ${productId} to ${newStock}`);
      
      if (variantId) {
        // Update variant stock
        console.log(`🔍 [STOCK UPDATE] Fetching product ${productId} for variant ${variantId}`);
        const product = await this.databases!.getDocument(
          DATABASE_ID,
          PRODUCTS_COLLECTION_ID,
          productId
        );
        console.log(`📦 [STOCK UPDATE] Current product data:`, JSON.stringify(product, null, 2));

        const variants = product.variants || [];
        const variant = variants.find((v: any) => v.$id === variantId);
        console.log(`🏷️ [STOCK UPDATE] Found variant:`, variant ? JSON.stringify(variant, null, 2) : 'Not found');

        const updatedVariants = variants.map((v: any) => 
          v.$id === variantId ? { ...v, stock: newStock } : v
        );

        console.log(`📝 [STOCK UPDATE] Updating variant stock...`);
        const result = await this.databases!.updateDocument(
          DATABASE_ID,
          PRODUCTS_COLLECTION_ID,
          productId,
          { variants: updatedVariants }
        );
        console.log(`✅ [STOCK UPDATE] Updated variant stock. Result:`, JSON.stringify(result, null, 2));
      } else {
        // Update main product stock - update UNITS field
        console.log(`📝 [STOCK UPDATE] Updating main product stock...`);
        const before = await this.databases!.getDocument(
          DATABASE_ID,
          PRODUCTS_COLLECTION_ID,
          productId
        );
        console.log(`📦 [STOCK UPDATE] Current stock:`, before.units || before.stock);

        const result = await this.databases!.updateDocument(
          DATABASE_ID,
          PRODUCTS_COLLECTION_ID,
          productId,
          { units: newStock }
        );
        console.log(`✅ [STOCK UPDATE] Stock update complete. Result:`, JSON.stringify(result, null, 2));
      }
    } catch (error) {
      console.error(`❌ Error updating stock for product ${productId}:`, error);
      if (error instanceof Error) {
        throw new Error(`Failed to update stock for product ${productId}: ${error.message}`);
      }
      throw new Error(`Failed to update stock for product ${productId}`);
    }
  }

  private async trackMovement(movement: Omit<InventoryMovement, "timestamp">): Promise<boolean> {
    await this.ensureInitialized();
    
    try {
      const timestamp = new Date().toISOString();
      
      await this.databases!.createDocument(
        DATABASE_ID,
        INVENTORY_MOVEMENTS_COLLECTION_ID,
        ID.unique(),
        {
          ...movement,
          timestamp,
        }
      );

      console.log(`✅ Tracked movement for ${movement.product_name}`);
      return true;
    } catch (error) {
      console.error(`❌ Error tracking movement:`, error);
      if (error instanceof Error) {
        console.error(`Error details: ${error.message}`);
      }
      return false;
    }
  }

  async processOrderDelivery(
    orderId: string,
    items: OrderItem[]
  ): Promise<{
    success: boolean;
    results: ProcessResult[];
  }> {
    await this.ensureInitialized();
    console.log(`🚚 Processing delivery for order ${orderId}`);
    
    const results: ProcessResult[] = [];

    for (const item of items) {
      try {
        // Get current stock
        const currentStock = await this.getCurrentStock(item.product_id, item.variant_id);
        const quantity = Math.abs(Number(item.quantity));
        const newStock = currentStock - quantity;

        if (newStock < 0) {
          console.warn(`⚠️ Warning: Stock would go negative for ${item.product_name}`);
          results.push({
            product_id: item.product_id,
            success: false,
            message: `Insufficient stock: ${currentStock} available, ${quantity} requested`
          });
          continue;
        }

        // Update stock
        await this.updateStock(item.product_id, newStock, item.variant_id);

        // Track movement
        const tracked = await this.trackMovement({
          product_id: item.product_id,
          product_name: item.product_name,
          movement_type: "sale",
          quantity: -quantity,
          previous_stock: currentStock,
          new_stock: newStock,
          reference_id: orderId,
          notes: `Order delivery ${orderId}`,
          variant_id: item.variant_id,
          size: item.size,
          color: item.color
        });

        if (!tracked) {
          throw new Error('Failed to track movement');
        }

        results.push({
          product_id: item.product_id,
          success: true,
          message: `Stock updated: ${currentStock} -> ${newStock}`
        });
      } catch (error) {
        console.error(`❌ Error processing item ${item.product_id}:`, error);
        results.push({
          product_id: item.product_id,
          success: false,
          message: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }

    const success = results.every(r => r.success);
    console.log(`${success ? '✅' : '❌'} Order delivery processing complete:`, results);
    
    return {
      success,
      results
    };
  }

  async processOrderReturn(
    orderId: string,
    items: OrderItem[]
  ): Promise<{
    success: boolean;
    results: ProcessResult[];
  }> {
    await this.ensureInitialized();
    console.log(`📦 Processing return/cancel for order ${orderId}`);
    
    const results: ProcessResult[] = [];

    for (const item of items) {
      try {
        // Get current stock
        const currentStock = await this.getCurrentStock(item.product_id, item.variant_id);
        const quantity = Math.abs(Number(item.quantity));
        const newStock = currentStock + quantity;

        // Update stock
        await this.updateStock(item.product_id, newStock, item.variant_id);

        // Track movement
        const tracked = await this.trackMovement({
          product_id: item.product_id,
          product_name: item.product_name,
          movement_type: "return",
          quantity: quantity,
          previous_stock: currentStock,
          new_stock: newStock,
          reference_id: orderId,
          notes: `Order return/cancel ${orderId}`,
          variant_id: item.variant_id,
          size: item.size,
          color: item.color
        });

        if (!tracked) {
          throw new Error('Failed to track movement');
        }

        results.push({
          product_id: item.product_id,
          success: true,
          message: `Stock updated: ${currentStock} -> ${newStock}`
        });
      } catch (error) {
        console.error(`❌ Error processing return for item ${item.product_id}:`, error);
        results.push({
          product_id: item.product_id,
          success: false,
          message: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }

    const success = results.every(r => r.success);
    console.log(`${success ? '✅' : '❌'} Order return processing complete:`, results);
    
    return {
      success,
      results
    };
  }

  async getMovementHistory(productId?: string, limit = 100): Promise<Models.Document[]> {
    await this.ensureInitialized();

    const queries: string[] = [
      Query.orderDesc("timestamp"),
      Query.limit(limit)
    ];

    if (productId) {
      queries.push(Query.equal("product_id", productId));
    }

    try {
      const movements = await this.databases!.listDocuments(
        DATABASE_ID,
        INVENTORY_MOVEMENTS_COLLECTION_ID,
        queries
      );

      return movements.documents;
    } catch (error) {
      console.error("Error getting movement history:", error);
      if (error instanceof Error) {
        throw new Error(`Failed to get movement history: ${error.message}`);
      }
      throw new Error("Failed to get movement history");
    }
  }
}