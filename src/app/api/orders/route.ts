import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { databases, DATABASE_ID, ORDERS_COLLECTION_ID, PRODUCTS_COLLECTION_ID, createServerClient } from '@/lib/appwrite';
import { ID } from 'appwrite';
import { Databases } from 'node-appwrite';

export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    return NextResponse.json({ success: true, orders: [] });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
});

export const POST = async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { customer_id, email, brand_id = '', items, shippingAddress, shippingCost = 0, taxAmount = 0, discountAmount = 0, subtotal } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Order items are required' }, { status: 400 });
    }

    const serverClient = createServerClient();
    const serverDatabases = new Databases(serverClient);

    // Validate inventory availability before creating order
    const outOfStockItems = [];
    const lowStockItems = [];

    for (const item of items) {
      try {
        const product = await serverDatabases.getDocument(DATABASE_ID, PRODUCTS_COLLECTION_ID, item.productId);
        const currentStock = product.units || product.stockQuantity || 0;

        if (currentStock === 0) {
          outOfStockItems.push({
            productId: item.productId,
            name: product.name || 'Unknown Product',
            requested: item.quantity,
            available: currentStock
          });
        } else if (currentStock < item.quantity) {
          outOfStockItems.push({
            productId: item.productId,
            name: product.name || 'Unknown Product',
            requested: item.quantity,
            available: currentStock
          });
        } else if (currentStock <= 5) { // Low stock warning
          lowStockItems.push({
            productId: item.productId,
            name: product.name || 'Unknown Product',
            available: currentStock
          });
        }
      } catch (error) {
        console.error('Error checking product stock:', error);
        return NextResponse.json({
          error: `Product ${item.productId} not found or unavailable`
        }, { status: 400 });
      }
    }

    // Return detailed stock information
    if (outOfStockItems.length > 0) {
      return NextResponse.json({
        error: 'Some items are out of stock or insufficient quantity',
        outOfStockItems,
        lowStockItems,
        canProceed: false,
        message: 'Please adjust your order quantities or wait for restock'
      }, { status: 400 });
    }

    // Include low stock warnings in successful response
    const warnings = lowStockItems.length > 0 ? {
      lowStockItems,
      message: 'Some items have low stock levels'
    } : null;

    const calculatedSubtotal = subtotal || items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalAmount = calculatedSubtotal + shippingCost + taxAmount - discountAmount;

    const date = new Date();
    const order_code = 'ORD-' + date.getFullYear() + String(date.getMonth() + 1).padStart(2, '0') + String(date.getDate()).padStart(2, '0') + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();

    const orderData = {
      order_code,
      brand_id: brand_id || '',
      total_amount: totalAmount,
      payable_amount: totalAmount,
      order_status: 'pending',
      payment_status: 'unpaid',
      items: JSON.stringify(items), // Store items as JSON string
      customer_name: `${email.split('@')[0]}`, // Extract name from email
      customer_email: email || customer_id,
      shipping_address: JSON.stringify(shippingAddress || {}),
      fulfillment_status: 'unfulfilled'
    };

    const order = await serverDatabases.createDocument(DATABASE_ID, ORDERS_COLLECTION_ID, ID.unique(), orderData);

    // Note: Inventory is NOT deducted here. It will be deducted when order status changes to 'delivered'
    // This allows orders to be created without immediately reducing available stock
    console.log(`✅ Order created successfully. Inventory will be deducted when order is marked as delivered.`);

    return NextResponse.json({
      success: true,
      order: {
        id: order.$id,
        order_code: order.order_code,
        total_amount: order.total_amount,
        order_status: order.order_status
      },
      warnings,
      message: 'Order created successfully'
    });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create order' }, { status: 500 });
  }
};
