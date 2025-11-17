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
  initialStock: number;          // العدد الأساسي قبل أي مبيعات
  currentStock: number;          // المتبقي حالياً
  
  // Order quantities
  quantityInProcessing: number;  // في طلبات قيد المعالجة
  quantityDelivered: number;     // تم تسليمها (خرج)
  quantityReturned: number;      // تم إرجاعها (رجع)
  
  // Calculated
  totalOrdered: number;          // Total in all orders
  netSold: number;              // Delivered - Returned
  
  // Status
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  lastUpdated: string;
}

export default function InventoryManagementPage() {
  const [products, setProducts] = useState<ProductInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchInventoryData();
  }, []);

  const fetchInventoryData = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch all products
      const productsRes = await fetch('/api/admin/products?limit=1000');
      const productsData = await productsRes.json();
      const allProducts = productsData.products || [];
      
      console.log(`📦 Fetched ${allProducts.length} products`);
      if (allProducts.length > 0) {
        console.log('Sample product:', allProducts[0]);
      }

      // 2. Try to fetch brands (optional)
      const brandMap: Record<string, string> = {};
      try {
        const brandsRes = await fetch('/api/brands?limit=1000');
        if (brandsRes.ok) {
          const brandsData = await brandsRes.json();
          const allBrands = brandsData.brands || [];
          allBrands.forEach((brand: any) => {
            brandMap[brand.$id] = brand.name || brand.brand_name || 'Unknown Brand';
          });
          console.log(`🏷️ Fetched ${allBrands.length} brands`);
        }
      } catch (error) {
        console.log('Brands API not available, will use brand names from products');
      }

      // 3. Fetch all orders
      const ordersRes = await fetch('/api/admin/orders?limit=1000');
      const ordersData = await ordersRes.json();
      const allOrders = ordersData.orders || [];
      
      console.log(`📋 Fetched ${allOrders.length} orders`);

      // 3. Process each product
      const inventory: ProductInventory[] = allProducts.map((product: any) => {
        const productId = product.$id;
        
        // CRITICAL: product.units is automatically updated by InventoryTracker
        // It's the ACTUAL REMAINING stock after all deliveries and returns
        const remainingStock = product.units || product.stockQuantity || 0;
        
        // Find all orders containing this product
        let quantityInProcessing = 0;
        let quantityDelivered = 0;
        let quantityReturned = 0;

        allOrders.forEach((order: any) => {
          try {
            const items = JSON.parse(order.items || '[]');
            const orderStatus = order.order_status || order.status || 'pending';
            
            items.forEach((item: any) => {
              const itemProductId = item.productId || item.product_id || item.id;
              
              if (itemProductId === productId) {
                const qty = parseInt(item.quantity) || 0;
                
                // Categorize based on order status
                if (['pending', 'processing', 'shipped'].includes(orderStatus)) {
                  quantityInProcessing += qty;
                } else if (orderStatus === 'delivered') {
                  quantityDelivered += qty;
                } else if (orderStatus === 'returned') {
                  quantityReturned += qty;
                }
              }
            });
          } catch (e) {
            // Skip invalid items
          }
        });

        const totalOrdered = quantityInProcessing + quantityDelivered;
        
        // Calculate NET sold (delivered minus returned)
        const netSold = quantityDelivered - quantityReturned;
        
        // Calculate INITIAL stock (what we had originally)
        // Formula: Initial = Remaining + (Delivered - Returned)
        // Example: Remaining: 1, Delivered: 4, Returned: 0 => Initial = 1 + 4 = 5
        // Example: Remaining: 5, Delivered: 4, Returned: 4 => Initial = 5 + 0 = 5
        const initialStock = remainingStock + netSold;

        // Determine status based on remaining stock (from database)
        let status: 'in_stock' | 'low_stock' | 'out_of_stock';
        if (remainingStock <= 0) {
          status = 'out_of_stock';
        } else if (remainingStock <= 5) {
          status = 'low_stock';
        } else {
          status = 'in_stock';
        }

        // Get brand name - check multiple fields and lookup from brand map
        let brandName = 'Unknown Brand';
        
        if (product.brand_name) {
          brandName = product.brand_name;
        } else if (product.brandName) {
          brandName = product.brandName;
        } else if (product.brand) {
          brandName = product.brand;
        } else if (product.brand_id && brandMap[product.brand_id]) {
          brandName = brandMap[product.brand_id];
        } else if (product.brand_id) {
          brandName = `Brand ID: ${product.brand_id.slice(-8)}`;
        }

        return {
          productId,
          customProductId: product.customProductId || product.custom_product_id || productId.slice(-8),
          productName: product.name || product.title || 'Unnamed Product',
          brandName,
          initialStock,        // العدد الأساسي (محسوب)
          currentStock: remainingStock,  // المتبقي (من database - بيتحدث تلقائياً)
          quantityInProcessing,
          quantityDelivered,
          quantityReturned,
          totalOrdered,
          netSold,
          status,
          lastUpdated: product.$updatedAt
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
      console.log(`✅ Processed ${inventory.length} products`);
      
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
    totalDelivered: products.reduce((sum, p) => sum + p.quantityDelivered, 0),
    totalReturned: products.reduce((sum, p) => sum + p.quantityReturned, 0),
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
        <Button onClick={fetchInventoryData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700">Delivered</p>
                <p className="text-2xl font-bold text-green-900">{stats.totalDelivered} pcs</p>
              </div>
              <TrendingDown className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-700">Returned</p>
                <p className="text-2xl font-bold text-orange-900">{stats.totalReturned} pcs</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-400" />
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
                  <th className="px-4 py-3 text-center text-sm font-bold text-green-700">Delivered (Out)</th>
                  <th className="px-4 py-3 text-center text-sm font-bold text-orange-700">Returned (Back)</th>
                  <th className="px-4 py-3 text-center text-sm font-bold text-blue-700">Remaining</th>
                  <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
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

                      {/* Delivered */}
                      <td className="px-4 py-4 text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {product.quantityDelivered || 0}
                        </div>
                      </td>

                      {/* Returned */}
                      <td className="px-4 py-4 text-center">
                        <div className="text-2xl font-bold text-orange-600">
                          {product.quantityReturned || 0}
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
            <div className="p-2 bg-purple-50 rounded">
              <span className="font-bold text-purple-700">Initial Stock:</span> Starting quantity
            </div>
            <div className="p-2 bg-green-50 rounded">
              <span className="font-bold text-green-700">Delivered:</span> Went out
            </div>
            <div className="p-2 bg-orange-50 rounded">
              <span className="font-bold text-orange-700">Returned:</span> Came back
            </div>
            <div className="p-2 bg-blue-50 rounded">
              <span className="font-bold text-blue-700">Remaining:</span> What's left
            </div>
          </div>
          
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm text-blue-900">
              <strong>Formula:</strong> Remaining = Initial - Delivered + Returned
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}