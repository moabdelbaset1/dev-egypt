'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import MainLayout from '@/components/MainLayout';
import { ShoppingBag, Heart, Star } from 'lucide-react';

interface Product {
  $id: string;
  name: string;
  price: number;
  discount_price?: number;
  image_url?: string;
  brand_id: string;
  rating?: number;
}

interface Brand {
  $id: string;
  name: string;
  prefix: string;
  status: boolean;
}

export default function BrandPage() {
  const params = useParams();
  const slug = params?.slug as string;
  
  const [brand, setBrand] = useState<Brand | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [heroImageError, setHeroImageError] = useState(false);

  useEffect(() => {
    if (!slug) return;

    const fetchBrandAndProducts = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('🔍 Fetching brand data for slug:', slug);

        // Fetch all brands to find the matching one
        const brandsResponse = await fetch('/api/brands?limit=100');
        console.log('📊 Brands response status:', brandsResponse.status);
        
        if (!brandsResponse.ok) {
          throw new Error(`Failed to fetch brands: ${brandsResponse.status}`);
        }
        
        const brandsData = await brandsResponse.json();
        console.log('✅ Brands fetched:', brandsData.brands?.length || 0);
        
        const matchedBrand = brandsData.brands?.find((b: Brand) =>
          b.prefix.toLowerCase() === slug.toLowerCase() ||
          b.name.toLowerCase().replace(/\s+/g, '-') === slug.toLowerCase()
        );

        if (!matchedBrand) {
          console.warn('⚠️ Brand not found for slug:', slug);
          setError('Brand not found');
          setLoading(false);
          return;
        }

        console.log('✅ Brand matched:', matchedBrand.name);
        setBrand(matchedBrand);

        // Fetch products for this brand
        const productsResponse = await fetch('/api/products?available=true&limit=100');
        console.log('📊 Products response status:', productsResponse.status);
        
        if (!productsResponse.ok) {
          throw new Error(`Failed to fetch products: ${productsResponse.status}`);
        }
        
        const productsData = await productsResponse.json();
        console.log('✅ Products fetched:', productsData.products?.length || 0);
        
        const brandProducts = productsData.products?.filter((p: Product) => p.brand_id === matchedBrand.$id) || [];
        console.log('✅ Brand products filtered:', brandProducts.length);
        
        setProducts(brandProducts);
      } catch (err) {
        console.error('❌ Error fetching brand data:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchBrandAndProducts();
  }, [slug]);

  const toggleWishlist = (productId: string) => {
    setWishlist(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg">Loading brand page...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error || !brand) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Brand Not Found</h1>
            <p className="text-gray-600 mb-8 text-lg">The brand you're looking for doesn't exist.</p>
            <Link href="/" className="inline-block px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors">
              Back to Home
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  const heroImage = `/images/brands/${slug}/${slug}-brand.jpg`;
  const brandDisplayName = brand.name.toUpperCase();
  const discountedProducts = products.filter(p => p.discount_price);
  const discountPercentage = discountedProducts.length > 0
    ? Math.round(((products[0].price - (products[0].discount_price || products[0].price)) / products[0].price) * 100)
    : 0;

  return (
    <MainLayout>
      <div className="min-h-screen bg-white">
        {/* Hero Banner */}
        <div className="relative w-full h-[300px] md:h-[400px] lg:h-[500px] overflow-hidden bg-gradient-to-r from-blue-600 to-purple-600">
          {!heroImageError && (
            <Image
              src={heroImage}
              alt={`${brandDisplayName} Brand`}
              fill
              className="object-cover"
              priority
              onError={() => {
                console.warn('Hero image not found:', heroImage);
                setHeroImageError(true);
              }}
            />
          )}
          <div className="absolute inset-0 bg-black/30"></div>
          
          {/* Hero Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white px-4">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-4 drop-shadow-lg">
              {brandDisplayName}
            </h1>
            <p className="text-lg md:text-xl opacity-95 drop-shadow-md max-w-2xl">
              Discover our exclusive collection of premium products
            </p>
          </div>
        </div>

        {/* Breadcrumb & Info Bar */}
        <div className="bg-gray-50 border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                <Link href="/" className="hover:text-gray-900">Home</Link>
                <span className="mx-2">/</span>
                <span className="text-gray-900 font-medium">{brandDisplayName}</span>
              </div>
              <div className="text-sm text-gray-600">
                {products.length} Products
              </div>
            </div>
          </div>
        </div>

        {/* Brand Description Section */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShoppingBag className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Premium Quality</h3>
                <p className="text-gray-600">Carefully selected products meeting highest standards</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Trusted Brand</h3>
                <p className="text-gray-600">Loved by thousands of satisfied customers</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Best Value</h3>
                <p className="text-gray-600">Competitive prices with exceptional quality</p>
              </div>
            </div>
          </div>
        </div>

        {/* Products Section */}
        <div className="bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            {/* Section Header */}
            <div className="mb-12">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-4xl font-bold text-gray-900 mb-2">
                    {brandDisplayName} Collection
                  </h2>
                  <p className="text-gray-600 text-lg">
                    {products.length > 0 
                      ? `Explore ${products.length} premium products from ${brandDisplayName}`
                      : `No products available for ${brandDisplayName} yet`
                    }
                  </p>
                </div>
                {discountedProducts.length > 0 && (
                  <div className="hidden md:block bg-red-600 text-white px-6 py-3 rounded-lg">
                    <p className="text-sm font-semibold">SALE</p>
                    <p className="text-2xl font-bold">Up to {discountPercentage}% OFF</p>
                  </div>
                )}
              </div>

              {/* Filter/Sort Bar */}
              <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">
                  Showing <span className="font-semibold text-gray-900">{products.length}</span> products
                </div>
                <div className="flex gap-2">
                  <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                    Sort by: Newest
                  </button>
                </div>
              </div>
            </div>

            {/* Products Grid */}
            {products.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {products.map((product) => (
                  <div 
                    key={product.$id} 
                    className="group bg-white rounded-lg overflow-hidden border border-gray-200 hover:border-gray-300 transition-all duration-300 hover:shadow-lg"
                  >
                    {/* Product Image */}
                    <div className="relative aspect-square bg-gray-100 overflow-hidden">
                      {product.image_url ? (
                        <Image
                          src={product.image_url}
                          alt={product.name}
                          fill
                          className="object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200">
                          <span className="text-gray-400 text-sm">No Image</span>
                        </div>
                      )}
                      
                      {/* Wishlist Button */}
                      <button
                        onClick={() => toggleWishlist(product.$id)}
                        className="absolute top-3 right-3 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Heart
                          className={`w-5 h-5 transition-colors ${
                            wishlist.has(product.$id)
                              ? 'fill-red-600 text-red-600'
                              : 'text-gray-400 hover:text-red-600'
                          }`}
                        />
                      </button>

                      {/* Discount Badge */}
                      {product.discount_price && (
                        <div className="absolute top-3 left-3 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                          -{Math.round(((product.price - product.discount_price) / product.price) * 100)}%
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 text-sm group-hover:text-blue-600 transition-colors">
                        {product.name}
                      </h3>

                      {/* Rating */}
                      {product.rating && (
                        <div className="flex items-center gap-1 mb-3">
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3 h-3 ${
                                  i < Math.floor(product.rating || 0)
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-gray-600">({product.rating})</span>
                        </div>
                      )}

                      {/* Price */}
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-lg font-bold text-gray-900">
                          ${product.discount_price ? product.discount_price.toFixed(2) : product.price.toFixed(2)}
                        </span>
                        {product.discount_price && (
                          <span className="text-sm text-gray-500 line-through">
                            ${product.price.toFixed(2)}
                          </span>
                        )}
                      </div>

                      {/* Add to Cart Button */}
                      <Link
                        href={`/product/${product.name.toLowerCase().replace(/\s+/g, '-')}`}
                        className="w-full block text-center py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 text-lg mb-6">
                  No products available for this brand yet.
                </p>
                <Link
                  href="/catalog"
                  className="inline-block px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors"
                >
                  Browse All Products
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* CTA Section */}
        {products.length > 0 && (
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Complete Your {brandDisplayName} Look
              </h2>
              <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
                Mix and match from our complete collection to create your perfect style
              </p>
              <Link
                href="/catalog"
                className="inline-block px-8 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
              >
                Shop All Products
              </Link>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
