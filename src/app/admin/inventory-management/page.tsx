'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Package,
  AlertTriangle,
  CheckCircle,
  Search,
  RefreshCw,
  Loader2,
  TrendingDown,
  TrendingUp,
  Clock
} from 'lucide-react';

interface ProductInventory {
  productId: string;
  customProductId: string;
  productName: string;
  brandName: string;
  
  // Stock levels
  initialStock: number;          // العدد الأساسي
  currentStock: number;          // المتبقي حالياً
  
  // Order quantities
  quantityInProcessing: number;  // في طلبات قيد المعالجة
  quantityOut: number;           // اللي خرج (delivered)
  
  // Status
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  lastUpdated: string;
}

export default function InventoryManagementPage() {
  const [products, setProducts] = useState<ProductInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [initializingStock, setInitializingStock] = useState(false);

  useEffect(() => {
    fetchInventoryData();
  }, []);

  const initializeInventory = async () => {
    if (!confirm('This will set initial_units for all products based on their current stock. Continue?')) {
      return;
    }

    try {
      setInitializingStock(true);
      const res = await fetch('/api/admin/init-inventory', {
        method: 'POST'
      });
      
      const data = await res.json();
      
      if (data.success) {
        alert(`Successfully initialized ${data.summary.updated} products!\nSkipped: ${data.summary.skipped}\nErrors: ${data.summary.errors}`);
        // Refresh data after initialization
        fetchInventoryData();
      } else {
        alert('Failed to initialize inventory: ' + data.error);
      }
    } catch (error) {
      console.error('Error initializing inventory:', error);
      alert('Error initializing inventory');
    } finally {
      setInitializingStock(false);
    }
  };

  const fetchInventoryData = async () => {
    try {
      setLoading(true);
      
      // Use the Inventory Overview API that already has correct calculations
      const inventoryRes = await fetch('/api/admin/inventory-overview?limit=1000');
      const inventoryData = await inventoryRes.json();
      
      if (!inventoryData.success) {
        throw new Error('Failed to fetch inventory data');
      }
      
      const apiItems = inventoryData.items || [];
      console.log(`📦 Fetched ${apiItems.length} inventory items from API`);
      
      if (apiItems.length > 0) {
        console.log('Sample item from API:', apiItems[0]);
      }

      // Fetch all orders to get in-processing quantities
      const ordersRes = await fetch('/api/admin/orders?limit=1000');
      const ordersData = await ordersRes.json();
      const allOrders = ordersData.orders || [];
      
      console.log(`📋 Fetched ${allOrders.length} orders for processing status`);

      // Map to our interface
      const inventory: ProductInventory[] = apiItems.map((item: any) => {
        const productId = item.id;
        
        // Find all processing orders for this product
        let quantityInProcessing = 0;
        
        allOrders.forEach((order: any) => {
          const orderStatus = order.order_status || order.status || 'pending';
          if (['pending', 'processing', 'shipped'].includes(orderStatus)) {
            try {
              const items = JSON.parse(order.items || '[]');
              items.forEach((orderItem: any) => {
                const itemProductId = orderItem.productId || orderItem.product_id || orderItem.id;
                if (itemProductId === productId) {
                  quantityInProcessing += parseInt(orderItem.quantity) || 0;
                }
              });
            } catch (e) {
              // Skip invalid items
            }
          }
        });

        // Determine status based on remaining stock
        let status: 'in_stock' | 'low_stock' | 'out_of_stock';
        if (item.quantityRemaining <= 0) {
          status = 'out_of_stock';
        } else if (item.quantityRemaining <= 5) {
          status = 'low_stock';
        } else {
          status = 'in_stock';
        }

        return {
          productId: item.id,
          customProductId: item.customProductId,
          productName: item.name,
          brandName: item.brandName,
          initialStock: item.initialStock,      // من الـ API
          currentStock: item.quantityRemaining, // من الـ API
          quantityInProcessing,
          quantityOut: item.quantityOut,        // من الـ API
          status,
          lastUpdated: item.lastUpdated
        };
      });

      // Sort by status priority (out of stock first)
      inventory.sort((a, b) => {
        const statusPriority: Record<string, number> = {
          'out_of_stock': 0,
          'low_stock': 1,
          'in_stock': 2
        };
        return statusPriority[a.status] - statusPriority[b.status];
      });

      setProducts(inventory);
      console.log(`✅ Processed ${inventory.length} inventory items`);
      
      // Show statistics
      const withSales = inventory.filter(p => p.quantityOut > 0);
      console.log(`📊 Products with sales: ${withSales.length}`);
      
      if (withSales.length > 0) {
        console.log('📦 Sample product calculation:', {
          name: withSales[0].productName,
          initial: withSales[0].initialStock,
          out: withSales[0].quantityOut,
          remaining: withSales[0].currentStock,
          formula: `${withSales[0].initialStock} - ${withSales[0].quantityOut} = ${withSales[0].currentStock} (should match)`
        });
      }
      
    } catch (error) {
      console.error('❌ Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter products
  const filteredProducts = products.filter(p => {
    const matchesSearch = 
      p.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.customProductId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.brandName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      statusFilter === 'all' || p.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: products.length,
    inStock: products.filter(p => p.status === 'in_stock').length,
    lowStock: products.filter(p => p.status === 'low_stock').length,
    outOfStock: products.filter(p => p.status === 'out_of_stock').length,
    totalInProcessing: products.reduce((sum, p) => sum + p.quantityInProcessing, 0),
    totalOut: products.reduce((sum, p) => sum + p.quantityOut, 0),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading inventory data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📦 Inventory Audit</h1>
          <p className="text-gray-600 mt-1">
            Track stock levels, delivered items, and remaining quantities
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={initializeInventory}
            variant="default"
            disabled={initializingStock}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {initializingStock ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Initializing...
              </>
            ) : (
              <>
                <Package className="h-4 w-4 mr-2" />
                Initialize Stock
              </>
            )}
          </Button>
          <Button onClick={fetchInventoryData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Products</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Package className="h-10 w-10 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Stock</p>
                <p className="text-3xl font-bold text-green-600">{stats.inStock}</p>
              </div>
              <CheckCircle className="h-10 w-10 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Low Stock</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.lowStock}</p>
              </div>
              <AlertTriangle className="h-10 w-10 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Out of Stock</p>
                <p className="text-3xl font-bold text-red-600">{stats.outOfStock}</p>
              </div>
              <TrendingDown className="h-10 w-10 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700">In Processing</p>
                <p className="text-2xl font-bold text-blue-900">{stats.totalInProcessing} pcs</p>
              </div>
              <Clock className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700">Total Out (Delivered)</p>
                <p className="text-2xl font-bold text-red-900">{stats.totalOut} pcs</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, code, or brand..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('all')}
                size="sm"
              >
                All ({products.length})
              </Button>
              <Button
                variant={statusFilter === 'in_stock' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('in_stock')}
                size="sm"
                className={statusFilter === 'in_stock' ? 'bg-green-600' : ''}
              >
                In Stock ({stats.inStock})
              </Button>
              <Button
                variant={statusFilter === 'low_stock' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('low_stock')}
                size="sm"
                className={statusFilter === 'low_stock' ? 'bg-yellow-600' : ''}
              >
                Low ({stats.lowStock})
              </Button>
              <Button
                variant={statusFilter === 'out_of_stock' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('out_of_stock')}
                size="sm"
                className={statusFilter === 'out_of_stock' ? 'bg-red-600' : ''}
              >
                Out ({stats.outOfStock})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle>📋 Inventory Audit Table ({filteredProducts.length} products)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Code</th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Product</th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Brand</th>
                  <th className="px-4 py-3 text-center text-sm font-bold text-purple-700">Initial Stock</th>
                  <th className="px-4 py-3 text-center text-sm font-bold text-red-700">Out (Delivered)</th>
                  <th className="px-4 py-3 text-center text-sm font-bold text-blue-700">Remaining</th>
                  <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                      <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p>No products found</p>
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => (
                    <tr key={product.productId} className="hover:bg-gray-50 transition-colors">
                      {/* Code */}
                      <td className="px-4 py-4">
                        <div className="font-mono font-bold text-blue-600 text-lg">
                          {product.customProductId}
                        </div>
                      </td>

                      {/* Product Name */}
                      <td className="px-4 py-4">
                        <div className="font-medium text-gray-900">
                          {product.productName}
                        </div>
                      </td>

                      {/* Brand */}
                      <td className="px-4 py-4">
                        <Badge variant="outline" className="bg-gray-50">
                          {product.brandName}
                        </Badge>
                      </td>

                      {/* Initial Stock */}
                      <td className="px-4 py-4 text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {product.initialStock}
                        </div>
                      </td>

                      {/* Out (Delivered) */}
                      <td className="px-4 py-4 text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {product.quantityOut || 0}
                        </div>
                      </td>

                      {/* Remaining */}
                      <td className="px-4 py-4 text-center">
                        <div className={`text-3xl font-bold ${
                          product.currentStock === 0 ? 'text-red-600' :
                          product.currentStock <= 5 ? 'text-yellow-600' :
                          'text-blue-600'
                        }`}>
                          {product.currentStock}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4 text-center">
                        <Badge className={
                          product.status === 'out_of_stock' ? 'bg-red-100 text-red-800' :
                          product.status === 'low_stock' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }>
                          {product.status === 'out_of_stock' ? '🔴 Out' :
                           product.status === 'low_stock' ? '🟡 Low' :
                           '🟢 In Stock'}
                        </Badge>
                        
                        {/* In Processing Badge */}
                        {product.quantityInProcessing > 0 && (
                          <div className="mt-2">
                            <Badge className="bg-blue-100 text-blue-800 text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              {product.quantityInProcessing} Reserved
                            </Badge>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="bg-gray-50">
        <CardContent className="p-4">
          <h3 className="font-semibold text-gray-900 mb-3">📖 Column Guide:</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="p-2 bg-purple-50 rounded">
              <span className="font-bold text-purple-700">Initial Stock:</span> العدد الأساسي
            </div>
            <div className="p-2 bg-red-50 rounded">
              <span className="font-bold text-red-700">Out:</span> اللي خرج (delivered)
            </div>
            <div className="p-2 bg-blue-50 rounded">
              <span className="font-bold text-blue-700">Remaining:</span> المتبقي
            </div>
          </div>
          
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm text-blue-900">
              <strong>المعادلة:</strong> المتبقي = العدد الأساسي - اللي خرج
            </p>
            <p className="text-xs text-blue-700 mt-1">
              ملحوظة: المرتجعات بتتضاف تلقائياً للمتبقي من النظام
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}