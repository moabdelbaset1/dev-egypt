'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import MainLayout from '@/components/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  Truck,
  CheckCircle,
  XCircle,
  RotateCcw,
  Clock,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface Order {
  $id: string;
  order_code: string;
  order_status: string;
  payment_status: string;
  total_amount: number;
  items: string;
  $createdAt: string;
  delivered_at?: string;
  tracking_number?: string;
  carrier?: string;
}

export default function MyOrdersPage() {
  const router = useRouter();
  const { auth } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [cancellingOrder, setCancellingOrder] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      router.push('/login?redirect=/account/orders');
      return;
    }

    if (auth.isAuthenticated) {
      fetchOrders();
    }
  }, [auth.isLoading, auth.isAuthenticated, router]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/user/orders', {
        headers: {
          'x-user-email': auth.user?.email || ''
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const data = await response.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const cancelOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to cancel this order?')) {
      return;
    }

    try {
      setCancellingOrder(orderId);
      const response = await fetch('/api/user/orders', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': auth.user?.email || ''
        },
        body: JSON.stringify({ orderId })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cancel order');
      }

      toast.success('Order cancelled successfully');
      fetchOrders(); // Refresh orders
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to cancel order');
    } finally {
      setCancellingOrder(null);
    }
  };

  const canRequestReturn = (order: Order) => {
    // Can only return delivered orders
    if (order.order_status !== 'delivered' || !order.delivered_at) {
      return false;
    }

    // Check if within 2 days of delivery
    const deliveryDate = new Date(order.delivered_at);
    const now = new Date();
    const daysSinceDelivery = Math.floor((now.getTime() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24));
    
    return daysSinceDelivery <= 2;
  };

  const requestReturn = async (orderId: string) => {
    if (!confirm('Request return for this order? You have 2 days from delivery to return.')) {
      return;
    }

    try {
      const response = await fetch('/api/user/orders', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': auth.user?.email || ''
        },
        body: JSON.stringify({ orderId, action: 'request_return' })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to request return');
      }

      toast.success('Return request submitted successfully');
      fetchOrders();
    } catch (error) {
      console.error('Error requesting return:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to request return');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'shipped':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'returned':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'processing':
        return <Package className="h-4 w-4" />;
      case 'shipped':
        return <Truck className="h-4 w-4" />;
      case 'delivered':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      case 'returned':
        return <RotateCcw className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'pending': 'Pending',
      'processing': 'Processing',
      'shipped': 'Shipped',
      'delivered': 'Delivered',
      'cancelled': 'Cancelled',
      'returned': 'Returned'
    };
    return statusMap[status] || status;
  };

  const canCancelOrder = (status: string) => {
    return ['pending', 'processing'].includes(status);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (auth.isLoading || loading) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gray-50 py-12">
          <div className="max-w-6xl mx-auto px-4 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-[#173a6a] mx-auto mb-4" />
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!auth.isAuthenticated) {
    return null;
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
            <p className="text-gray-600 mt-2">
              Track your orders and view details
            </p>
          </div>

          {/* Orders List */}
          {orders.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No Orders Yet
                </h3>
                <p className="text-gray-600 mb-6">
                  Start shopping and order your favorite products
                </p>
                <Button
                  onClick={() => router.push('/catalog')}
                  className="bg-[#173a6a] hover:bg-[#1e4a7a]"
                >
                  Browse Products
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                const isExpanded = expandedOrder === order.$id;
                let items = [];
                try {
                  items = JSON.parse(order.items || '[]');
                } catch (e) {
                  console.error('Error parsing items:', e);
                }
                const totalItems = items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);

                return (
                  <Card key={order.$id} className="overflow-hidden">
                    <CardHeader className="bg-gray-50 border-b">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Order Number</p>
                            <p className="text-lg font-bold text-[#173a6a]">
                              {order.order_code || order.$id.slice(-8)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Status</p>
                            <Badge className={getStatusColor(order.order_status)}>
                              <span className="mr-1">{getStatusIcon(order.order_status)}</span>
                              {getStatusText(order.order_status)}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {canCancelOrder(order.order_status) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => cancelOrder(order.$id)}
                              disabled={cancellingOrder === order.$id}
                              className="text-red-600 border-red-300 hover:bg-red-50"
                            >
                              {cancellingOrder === order.$id ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Cancelling...
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Cancel Order
                                </>
                              )}
                            </Button>
                          )}
                          {canRequestReturn(order) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => requestReturn(order.$id)}
                              className="text-orange-600 border-orange-300 hover:bg-orange-50"
                            >
                              <RotateCcw className="h-4 w-4 mr-2" />
                              Request Return
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedOrder(isExpanded ? null : order.$id)}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-5 w-5" />
                            ) : (
                              <ChevronDown className="h-5 w-5" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-6">
                      {/* Quick Summary */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-600">Order Date</p>
                          <p className="font-medium">{formatDate(order.$createdAt)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Total Items</p>
                          <p className="font-medium">{totalItems} pcs</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Total</p>
                          <p className="font-bold text-lg text-[#173a6a]">
                            ${order.total_amount?.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Payment Status</p>
                          <Badge className={order.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                            {order.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                          </Badge>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="border-t pt-4 mt-4">
                          <h4 className="font-semibold mb-3">Order Items:</h4>
                          <div className="space-y-3">
                            {items.map((item: any, index: number) => (
                              <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                                <div className="flex-1">
                                  <p className="font-medium">
                                    {item.name || item.product_name || 'Product'}
                                  </p>
                                  {item.sku && (
                                    <p className="text-sm text-gray-600">SKU: {item.sku}</p>
                                  )}
                                  {(item.size || item.color) && (
                                    <p className="text-sm text-gray-600">
                                      {item.size && `Size: ${item.size}`}
                                      {item.size && item.color && ' | '}
                                      {item.color && `Color: ${item.color}`}
                                    </p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <p className="font-medium">Qty: {item.quantity}</p>
                                  <p className="text-sm text-gray-600">
                                    ${(item.price * item.quantity).toFixed(2)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Tracking Info */}
                          {order.tracking_number && (
                            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                              <h4 className="font-semibold mb-2 flex items-center gap-2">
                                <Truck className="h-5 w-5 text-blue-600" />
                                Shipping Information
                              </h4>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                {order.carrier && (
                                  <div>
                                    <span className="text-gray-600">Carrier: </span>
                                    <span className="font-medium">{order.carrier}</span>
                                  </div>
                                )}
                                <div>
                                  <span className="text-gray-600">Tracking: </span>
                                  <span className="font-medium font-mono">{order.tracking_number}</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Delivery Status */}
                          {order.order_status === 'delivered' && order.delivered_at && (
                           <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                             <h4 className="font-semibold mb-2 flex items-center gap-2 text-green-700">
                               <CheckCircle className="h-5 w-5" />
                               Successfully Delivered
                             </h4>
                             <p className="text-sm text-gray-600">
                               Delivered on: {formatDate(order.delivered_at)}
                             </p>
                             {canRequestReturn(order) && (
                               <div className="mt-3 p-2 bg-white border border-green-300 rounded">
                                 <p className="text-xs text-green-800 font-medium">
                                   ✓ Return available within 2 days of delivery
                                 </p>
                               </div>
                             )}
                             {!canRequestReturn(order) && order.delivered_at && (
                               <div className="mt-3 p-2 bg-gray-100 border border-gray-300 rounded">
                                 <p className="text-xs text-gray-600">
                                   Return period expired (2 days limit)
                                 </p>
                               </div>
                             )}
                           </div>
                         )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}