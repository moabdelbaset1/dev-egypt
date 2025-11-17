'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  User,
  Package,
  Settings,
  Loader2,
  Mail,
  Calendar,
  ShoppingBag
} from 'lucide-react';
import Link from 'next/link';

export default function AccountPage() {
  const router = useRouter();
  const { auth } = useAuth();

  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      router.push('/login?redirect=/account');
    }
  }, [auth.isLoading, auth.isAuthenticated, router]);

  if (auth.isLoading) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gray-50 py-12">
          <div className="max-w-6xl mx-auto px-4 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-[#173a6a] mx-auto mb-4" />
            <p className="text-gray-600">جاري التحميل...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!auth.isAuthenticated || !auth.user) {
    return null;
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          {/* Welcome Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">My Account</h1>
            <p className="text-gray-600 mt-2">
              Welcome, {auth.user.name || auth.user.email?.split('@')[0] || 'Guest'}!
            </p>
          </div>

          {/* Account Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Profile Info Card */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Account Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-600">Email Address</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <p className="font-medium">{auth.user.email}</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Member Since</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <p className="font-medium">
                        {(auth.user as any).$createdAt ? formatDate((auth.user as any).$createdAt) : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <Button variant="outline" className="w-full md:w-auto">
                    <Settings className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5" />
                  Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Orders</span>
                    <span className="font-bold text-lg text-[#173a6a]">-</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Processing</span>
                    <span className="font-bold text-lg text-blue-600">-</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Delivered</span>
                    <span className="font-bold text-lg text-green-600">-</span>
                  </div>
                </div>
                <Button
                  onClick={() => router.push('/account/orders')}
                  className="w-full mt-4 bg-[#173a6a] hover:bg-[#1e4a7a]"
                >
                  View All Orders
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/account/orders">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-[#173a6a]">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="w-12 h-12 bg-[#173a6a] rounded-full flex items-center justify-center">
                    <Package className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">My Orders</h3>
                    <p className="text-sm text-gray-600">Track and manage your orders</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/catalog">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-[#173a6a]">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                    <ShoppingBag className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Shop Now</h3>
                    <p className="text-sm text-gray-600">Browse products</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-gray-300">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center">
                  <Settings className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Settings</h3>
                  <p className="text-sm text-gray-600">Manage your account</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Help Section */}
          <Card className="mt-8 bg-blue-50 border-blue-200">
            <CardContent className="p-6">
              <h3 className="font-semibold text-lg mb-2">Need Help?</h3>
              <p className="text-gray-600 mb-4">
                Our support team is ready to assist you with any questions or issues
              </p>
              <Button variant="outline" className="bg-white">
                Contact Support
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}