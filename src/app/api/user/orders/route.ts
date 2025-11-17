import { NextRequest, NextResponse } from 'next/server';
import { Query } from 'node-appwrite';
import { createAdminClient } from '@/lib/appwrite-admin';
import { DATABASE_ID, ORDERS_COLLECTION_ID } from '@/constants/appwrite';

export async function GET(request: NextRequest) {
  try {
    // Get user email from session/headers
    const userEmail = request.headers.get('x-user-email');
    
    if (!userEmail) {
      console.log('No user email in headers, attempting to get from cookies');
      // Try to get from cookies or return empty array
      return NextResponse.json({ success: true, orders: [] });
    }

    const { databases } = await createAdminClient();

    // Fetch user's orders
    const { documents: orders } = await databases.listDocuments(
      DATABASE_ID,
      ORDERS_COLLECTION_ID,
      [
        Query.equal('customer_email', userEmail),
        Query.orderDesc('$createdAt'),
        Query.limit(50)
      ]
    );

    console.log(`✅ Found ${orders.length} orders for ${userEmail}`);
    return NextResponse.json({ success: true, orders });
  } catch (error) {
    console.error('Error fetching user orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

// Cancel order
export async function PATCH(request: NextRequest) {
  try {
    const userEmail = request.headers.get('x-user-email');
    
    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { databases } = await createAdminClient();
    const { orderId, action } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    // Get the order
    const order = await databases.getDocument(
      DATABASE_ID,
      ORDERS_COLLECTION_ID,
      orderId
    );

    // Verify order belongs to user
    if (order.customer_email !== userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Handle different actions
    if (action === 'request_return') {
      // Check if order is delivered
      if (order.order_status !== 'delivered') {
        return NextResponse.json(
          { error: 'Only delivered orders can be returned' },
          { status: 400 }
        );
      }

      // Check if within 2 days
      if (!order.delivered_at) {
        return NextResponse.json(
          { error: 'Delivery date not available' },
          { status: 400 }
        );
      }

      const deliveryDate = new Date(order.delivered_at);
      const now = new Date();
      const daysSinceDelivery = Math.floor((now.getTime() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceDelivery > 2) {
        return NextResponse.json(
          { error: 'Return period expired. Returns are only accepted within 2 days of delivery.' },
          { status: 400 }
        );
      }

      // Update order status to returned
      const updatedOrder = await databases.updateDocument(
        DATABASE_ID,
        ORDERS_COLLECTION_ID,
        orderId,
        {
          order_status: 'returned'
        }
      );

      return NextResponse.json({
        success: true,
        message: 'Return request submitted successfully',
        order: updatedOrder
      });
    } else {
      // Default action: cancel order
      // Check if order can be cancelled (only pending/processing orders)
      if (!['pending', 'processing'].includes(order.order_status)) {
        return NextResponse.json(
          { error: 'Order cannot be cancelled at this stage' },
          { status: 400 }
        );
      }

      // Update order status to cancelled
      const updatedOrder = await databases.updateDocument(
        DATABASE_ID,
        ORDERS_COLLECTION_ID,
        orderId,
        {
          order_status: 'cancelled'
        }
      );

      return NextResponse.json({
        success: true,
        message: 'Order cancelled successfully',
        order: updatedOrder
      });
    }
  } catch (error) {
    console.error('Error cancelling order:', error);
    return NextResponse.json(
      { error: 'Failed to cancel order' },
      { status: 500 }
    );
  }
}