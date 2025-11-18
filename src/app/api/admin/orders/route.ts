import { NextRequest, NextResponse } from "next/server"
import { Query } from "node-appwrite"
import { createAdminClient } from "@/lib/appwrite-admin"
import { DATABASE_ID, ORDERS_COLLECTION_ID } from "@/constants/appwrite"
import { Databases, ID, Models } from "appwrite"
import { InventoryService } from "@/lib/services/InventoryService"

//@ts-ignore
export const runtime = 'edge'

interface OrderItem {
  order_id: string
  product_id: string
  quantity: number
  product_name: string
  title?: string
  variant_id?: string
  size?: string
  color?: string
}

// Function to get order items from order object
function getOrderItemsFromOrder(order: any): OrderItem[] | null {
  try {
    console.log('� Checking items in order object:', order.items);
    
    if (!order.items || !Array.isArray(order.items) || order.items.length === 0) {
      console.log('❌ No items found in order object or invalid items format');
      return null;
    }

    const items = order.items.map((item: any) => {
      if (!item.product_id && !item.id) {
        console.error('❌ Item missing product_id:', item);
        throw new Error(`Item missing product_id: ${JSON.stringify(item)}`);
      }

      return {
        order_id: order.$id,
        order_code: order.order_code,
        product_id: item.product_id || item.id,
        quantity: Number(item.quantity) || 1,
        product_name: item.product_name || item.title || 'Unknown Product',
        title: item.title,
        variant_id: item.variant_id,
        size: item.size,
        color: item.color
      };
    });

    console.log(`📦 Successfully processed ${items.length} items from order`);
    return items;
  } catch (error) {
    console.error('❌ Error processing order items:', error);
    throw error;
  }
}

// Note: Inventory tracking functionality has been temporarily removed
type OrderAction = 'mark_processing' | 'mark_shipped' | 'mark_delivered' | 'mark_cancelled' | 'mark_returned';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("search") || ""
    const status = searchParams.get("status")
    const payment = searchParams.get("payment")
    const limit = parseInt(searchParams.get("limit") || "100")
    const offset = parseInt(searchParams.get("offset") || "0")

    const { databases } = await createAdminClient()

    const queries: string[] = [
      Query.limit(limit),
      Query.offset(offset),
      Query.orderDesc("$createdAt"),
    ]

    if (status) queries.push(Query.equal("order_status", status))
    if (payment) queries.push(Query.equal("payment_status", payment))
    if (query) queries.push(Query.search("customer_name", query))

    const { documents, total } = await databases.listDocuments(
      DATABASE_ID,
      ORDERS_COLLECTION_ID,
      queries
    )

    return NextResponse.json({ orders: documents, total, limit, offset })
  } catch (error) {
    console.error("Error fetching orders:", error)
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");
    const action = searchParams.get("action");

    if (!orderId || !action) {
      console.error('❌ Missing required parameters:', { orderId, action });
      return NextResponse.json(
        { error: "Order ID and action are required" },
        { status: 400 }
      );
    }

    // Log received parameters
    console.log('📝 Received request parameters:', {
      orderId,
      action,
      searchParams: Object.fromEntries(searchParams.entries())
    });

    console.log(`🔄 Processing ${action} for order: ${orderId}`);
    const { databases } = await createAdminClient();

    // 1. Get and validate order
    console.log(`🔍 Fetching order: ${orderId}`);
    let order;
    try {
      order = await databases.getDocument(DATABASE_ID, ORDERS_COLLECTION_ID, orderId);
      console.log('📝 Order data:', JSON.stringify(order, null, 2));
      
      // Print the exact structure of items
      console.log('🔍 Items structure:', {
        hasItems: 'items' in order,
        itemsType: typeof order.items,
        isArray: Array.isArray(order.items),
        value: order.items
      });
    } catch (error) {
      console.error('❌ Error fetching order:', error);
      return NextResponse.json(
        { error: `Order ${orderId} not found` },
        { status: 404 }
      );
    }

    // 2. Parse and validate order items
    let orderItems = [];
    try {
      // Handle both string and array formats
      if (typeof order.items === 'string') {
        orderItems = JSON.parse(order.items || '[]');
        console.log('📦 Parsed items from JSON string');
      } else if (Array.isArray(order.items)) {
        orderItems = order.items;
        console.log('📦 Using items array directly');
      } else {
        console.log('❌ Invalid items format:', typeof order.items);
        // For orders without items, create a dummy item for inventory tracking
        // This handles legacy orders that don't have items stored
        console.log('⚠️ Order has no items - creating dummy item for inventory tracking');
        orderItems = [{
          product_id: 'unknown',
          quantity: 1,
          product_name: 'Unknown Product',
          title: 'Unknown Product'
        }];
      }

      console.log(`📦 Found ${orderItems.length} items in order`);
    } catch (error) {
      console.error('❌ Error parsing order items:', error);
      // For orders with parsing errors, create a dummy item
      console.log('⚠️ Error parsing items - creating dummy item for inventory tracking');
      orderItems = [{
        product_id: 'unknown',
        quantity: 1,
        product_name: 'Unknown Product',
        title: 'Unknown Product'
      }];
    }

    // 3. Process order items
    let processedOrderItems;
    try {
      console.log('📦 Processing order items...');
      processedOrderItems = orderItems.map((item: any, index: number) => {
        console.log(`Processing item ${index + 1}:`, item);

        // Handle both productId (camelCase) and product_id (snake_case)
        const productId = item.productId || item.product_id || item.id;
        if (!productId) {
          throw new Error(`Item at index ${index} is missing product_id/productId`);
        }

        const processedItem = {
          order_id: orderId,
          product_id: productId,
          productId: productId, // Add both formats for compatibility
          quantity: Number(item.quantity) || 1,
          product_name: item.name || item.product_name || item.title || 'Unknown Product',
          title: item.name || item.title,
          variant_id: item.variant_id,
          size: item.size,
          color: item.color
        };

        console.log('✅ Processed item:', processedItem);
        return processedItem;
      });

      console.log(`📦 Successfully processed ${processedOrderItems.length} items`);
      console.log('Items:', JSON.stringify(processedOrderItems, null, 2));
    } catch (error) {
      console.error('❌ Error processing items:', error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to process order items' },
        { status: 400 }
      );
    }

    // Log action information
    console.log(`⚠️ Processing action: ${action}`);
    console.log('📦 Items that will be affected:', JSON.stringify(processedOrderItems, null, 2));

    // 4. Update order status
    console.log('🔄 Processing order status update...');
    
    // Define valid status mappings with explicit type
    const statusMappings: Record<OrderAction, string> = {
      'mark_processing': 'processing',
      'mark_shipped': 'shipped',
      'mark_delivered': 'delivered',
      'mark_cancelled': 'cancelled',
      'mark_returned': 'returned'
    };
    
    // Validate action
    if (!(action in statusMappings)) {
      const error = `Invalid action: ${action}. Must be one of: ${Object.keys(statusMappings).join(', ')}`;
      console.error('❌', error);
      return NextResponse.json({ error }, { status: 400 });
    }
    
    const newStatus = statusMappings[action as OrderAction];
    console.log(`✅ Action "${action}" maps to status "${newStatus}"`);
    
    // Define update data type
    interface OrderUpdate {
      order_status: string;
      delivered_at?: string;
    }

    // Prepare update data
    const updateData: OrderUpdate = {
      order_status: newStatus
    };

    // Add delivered_at for delivery action
    if (action === 'mark_delivered') {
      updateData.delivered_at = new Date().toISOString();
    }
    
    console.log('📝 Update data:', updateData);

    // 5. Validate current order status before update
    const currentStatus = order.order_status;
    console.log(`📋 Current order status: ${currentStatus}`);
    
    // Define valid status transitions
    const validTransitions: Record<string, string[]> = {
      'pending': ['mark_processing', 'mark_shipped', 'mark_delivered', 'mark_cancelled'],
      'processing': ['mark_shipped', 'mark_delivered', 'mark_cancelled'],
      'shipped': ['mark_delivered', 'mark_returned', 'mark_cancelled'],
      'delivered': ['mark_returned', 'mark_cancelled'], // Can cancel delivered orders (e.g., customer complaint)
      'cancelled': [], // Cannot change from cancelled
      'returned': ['mark_processing', 'mark_cancelled'] // Can reprocess or permanently cancel returned orders
    };
    
    // Check if status transition is valid
    if (!validTransitions[currentStatus]?.includes(action)) {
      const error = `Invalid status transition: Cannot change from '${currentStatus}' to '${newStatus}' using action '${action}'`;
      console.error('❌', error);
      return NextResponse.json({ error }, { status: 400 });
    }
    
    // 6. Save the updated order status
    try {
      console.log(`💾 Updating order ${orderId} from '${currentStatus}' to '${updateData.order_status}'`);
      const updatedOrder = await databases.updateDocument(
        DATABASE_ID,
        ORDERS_COLLECTION_ID,
        orderId,
        updateData
      );

      console.log('✅ Order updated successfully');

      // 7. Handle inventory updates based on status change
      console.log(`\n🔍 Checking inventory action for: ${action}`);
      console.log(`📦 Processed items:`, JSON.stringify(processedOrderItems, null, 2));
      
      if (action === 'mark_delivered') {
        console.log('🚀 ACTION: mark_delivered - Starting inventory deduction...');
        try {
          await InventoryService.finalizeOrderDelivery(processedOrderItems, orderId);
          console.log('✅ SUCCESS: Inventory deducted for delivery');
        } catch (inventoryError) {
          console.error('❌ CRITICAL ERROR: Failed to update inventory for delivery:', inventoryError);
          console.error('Error details:', inventoryError instanceof Error ? inventoryError.stack : inventoryError);
          // Return error to client so they know inventory wasn't updated
          return NextResponse.json({
            success: false,
            error: 'Order status updated but inventory deduction failed: ' + (inventoryError instanceof Error ? inventoryError.message : 'Unknown error'),
            order: updatedOrder,
            inventoryError: true
          }, { status: 500 });
        }
      } else if (action === 'mark_returned') {
        console.log('🔄 ACTION: mark_returned - Starting inventory addition...');
        try {
          await InventoryService.processOrderReturn(processedOrderItems, orderId);
          console.log('✅ SUCCESS: Inventory added for return');
        } catch (inventoryError) {
          console.error('❌ CRITICAL ERROR: Failed to update inventory for return:', inventoryError);
          console.error('Error details:', inventoryError instanceof Error ? inventoryError.stack : inventoryError);
          return NextResponse.json({
            success: false,
            error: 'Order status updated but inventory addition failed: ' + (inventoryError instanceof Error ? inventoryError.message : 'Unknown error'),
            order: updatedOrder,
            inventoryError: true
          }, { status: 500 });
        }
      } else {
        console.log(`ℹ️ No inventory action needed for: ${action}`);
      }

      return NextResponse.json({
        success: true,
        message: `Order ${orderId} status updated from '${currentStatus}' to '${updateData.order_status}'`,
        order: updatedOrder,
        items: processedOrderItems
      });
    } catch (error) {
      console.error('❌ Failed to update order status:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update order status';
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('❌ Error processing request:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
