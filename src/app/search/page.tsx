'use client';
export const dynamic = "force-dynamic";

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import MainLayout from '../../components/MainLayout';
import { Product } from '../../types/product';
import { ChevronDown, Search, Filter, X, Star, Heart } from 'lucide-react';
import Image from 'next/image';

interface Category {
  $id: string;
  name: string;
  status: boolean;
}

interface Brand {
  $id: string;
  name: string;
  prefix: string;
  status: boolean;
}

interface SearchFilters {
  categories: string[];
  brands: string[];
  priceRange: [number, number];
  showFeatured: boolean;
  showNew: boolean;
  showOnSale: boolean;
  inStock: boolean;
}

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'price-low' | 'price-high' | 'newest' | 'relevance'>('relevance');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter states
  const [filters, setFilters] = useState<SearchFilters>({
    categories: [],
    brands: [],
    priceRange: [0, 1000],
    showFeatured: false,
    showNew: false,
    showOnSale: false,
    inStock: false
  });

  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [maxPrice, setMaxPrice] = useState(1000);

  // Get search query from URL
  useEffect(() => {
    const query = searchParams.get('q') || '';
    setSearchQuery(query);
  }, [searchParams]);

  // Fetch products from API
  const fetchProducts = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch('/api/admin/products?available=true&limit=200', {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        console.error('Error fetching products:', data.error);
        return;
      }

      const fetchedProducts = data.products || [];
      setProducts(fetchedProducts);

      // Calculate max price for price range filter
      if (fetchedProducts.length > 0) {
        const prices = fetchedProducts.map((p: Product) => p.price);
        const maxProductPrice = Math.max(...prices);
        const roundedMax = Math.ceil(maxProductPrice / 50) * 50;
        setMaxPrice(roundedMax);
        setPriceRange([0, roundedMax]);
        setFilters(prev => ({ ...prev, priceRange: [0, roundedMax] }));
      }
    } catch (error: any) {
      console.error('Failed to fetch products:', error.message || error);
      // Use fallback products when API fails
      const fallbackProducts: Product[] = [
        {
          $id: 'fallback-p1',
          name: 'Dav Egypt Professional Scrub Top',
          slug: 'dev-egypt-professional-scrub-top',
          price: 299,
          discount_price: 249,
          category_id: 'fallback-c1',
          brand_id: 'fallback-b1',
          units: 1,
          min_order_quantity: 1,
          is_featured: true,
          is_new: true,
          is_active: true,
          hasVariations: false,
          media_id: 'https://via.placeholder.com/300x400?text=Scrub+Top',
          description: 'High-quality professional scrub top',
          meta_title: 'Dav Egypt Professional Scrub Top',
          meta_description: 'High-quality professional scrub top for healthcare workers',
          meta_keywords: 'scrub top, medical scrubs, professional',
          $createdAt: new Date().toISOString(),
          $updatedAt: new Date().toISOString()
        }
      ];
      setProducts(fallbackProducts);
      setMaxPrice(500);
      setPriceRange([0, 500]);
      setFilters(prev => ({ ...prev, priceRange: [0, 500] }));
    }
  };

  // Fetch categories and brands
  const fetchCategories = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const [categoriesResponse, brandsResponse] = await Promise.all([
        fetch('/api/admin/categories?status=true', {
          signal: controller.signal,
          headers: { 'Cache-Control': 'no-cache' }
        }),
        fetch('/api/admin/brands?status=true', {
          signal: controller.signal,
          headers: { 'Cache-Control': 'no-cache' }
        })
      ]);

      clearTimeout(timeoutId);

      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json();
        setCategories(categoriesData.categories || []);
      }

      if (brandsResponse.ok) {
        const brandsData = await brandsResponse.json();
        setBrands(brandsData.brands || []);
      }
    } catch (error: any) {
      console.error('Failed to fetch categories/brands:', error.message || error);
      setCategories([
        { $id: 'fallback-c1', name: 'Scrub Tops', status: true },
        { $id: 'fallback-c2', name: 'Scrub Pants', status: true }
      ]);
      setBrands([
        { $id: 'fallback-b1', name: 'Dav Egypt', prefix: 'DE', status: true }
      ]);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchProducts(), fetchCategories()]);
      setLoading(false);
    };

    loadData();
  }, []);

  // Get brand name by ID
  const getBrandName = (brandId: string) => {
    const brand = brands.find(b => b.$id === brandId);
    return brand ? brand.name : 'Unknown Brand';
  };

  // Get category name by ID
  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.$id === categoryId);
    return category ? category.name : 'Unknown Category';
  };

  // Helper function to get the correct image source from product data
  const getImageSrc = (product: Product) => {
    if ((product as any).mainImageUrl) {
      if ((product as any).mainImageUrl.startsWith('http://') || (product as any).mainImageUrl.startsWith('https://')) {
        return (product as any).mainImageUrl;
      }
      return (product as any).mainImageUrl;
    }

    if ((product as any).mainImageId) {
      return `/api/storage/files/${(product as any).mainImageId}`;
    }

    if ((product as any).featuredImageId) {
      return `/api/storage/files/${(product as any).featuredImageId}`;
    }

    if ((product as any).media_id) {
      if ((product as any).media_id.startsWith('http://') || (product as any).media_id.startsWith('https://')) {
        return (product as any).media_id;
      }
      return `/api/storage/files/${(product as any).media_id}`;
    }

    return 'https://via.placeholder.com/300x400?text=No+Image';
  };

  // Filter and sort products based on search query
  const filteredAndSortedProducts = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    if (!query) {
      return [];
    }

    const filtered = products.filter(product => {
      // Search in product name, description, brand, category, and SKU
      const searchText = `${product.name} ${product.description || ''} ${getBrandName(product.brand_id)} ${getCategoryName(product.category_id)} ${(product as any).sku || ''}`.toLowerCase();

      if (!searchText.includes(query)) {
        return false;
      }

      // Category filter
      if (filters.categories.length > 0 && !filters.categories.includes(product.category_id)) {
        return false;
      }

      // Brand filter
      if (filters.brands.length > 0 && !filters.brands.includes(product.brand_id)) {
        return false;
      }

      // Price range filter
      const price = product.discount_price > 0 ? product.discount_price : product.price;
      if (price < filters.priceRange[0] || price > filters.priceRange[1]) {
        return false;
      }

      // Featured filter
      if (filters.showFeatured && !product.is_featured) {
        return false;
      }

      // New products filter
      if (filters.showNew && !product.is_new) {
        return false;
      }

      // On sale filter
      if (filters.showOnSale && !(product.discount_price > 0 && product.discount_price < product.price)) {
        return false;
      }

      // In stock filter
      if (filters.inStock && (!product.stockQuantity || product.stockQuantity <= 0)) {
        return false;
      }

      return true;
    });

    // Sort products
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          const priceA = a.discount_price > 0 ? a.discount_price : a.price;
          const priceB = b.discount_price > 0 ? b.discount_price : b.price;
          return priceA - priceB;
        case 'price-high':
          const priceA2 = a.discount_price > 0 ? a.discount_price : a.price;
          const priceB2 = b.discount_price > 0 ? b.discount_price : b.price;
          return priceB2 - priceA2;
        case 'newest':
          return new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime();
        case 'name':
          return a.name.localeCompare(b.name);
        case 'relevance':
        default:
          // Sort by relevance (prioritize exact name matches, then partial matches)
          const query = searchQuery.toLowerCase();
          const aName = a.name.toLowerCase();
          const bName = b.name.toLowerCase();

          // Exact matches first
          if (aName === query && bName !== query) return -1;
          if (bName === query && aName !== query) return 1;

          // Starts with matches second
          if (aName.startsWith(query) && !bName.startsWith(query)) return -1;
          if (bName.startsWith(query) && !aName.startsWith(query)) return 1;

          // Alphabetical for the rest
          return aName.localeCompare(bName);
      }
    });

    return filtered;
  }, [products, searchQuery, filters, sortBy, getBrandName, getCategoryName]);

  // Filter handlers
  const toggleCategoryFilter = (categoryId: string) => {
    setFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(categoryId)
        ? prev.categories.filter(id => id !== categoryId)
        : [...prev.categories, categoryId]
    }));
  };

  const toggleBrandFilter = (brandId: string) => {
    setFilters(prev => ({
      ...prev,
      brands: prev.brands.includes(brandId)
        ? prev.brands.filter(id => id !== brandId)
        : [...prev.brands, brandId]
    }));
  };

  const updatePriceRange = (min: number, max: number) => {
    setPriceRange([min, max]);
    setFilters(prev => ({ ...prev, priceRange: [min, max] }));
  };

  const toggleSpecialFilter = (filterType: 'showFeatured' | 'showNew' | 'showOnSale' | 'inStock') => {
    setFilters(prev => ({ ...prev, [filterType]: !prev[filterType] }));
  };

  const clearAllFilters = () => {
    setFilters({
      categories: [],
      brands: [],
      priceRange: [0, maxPrice],
      showFeatured: false,
      showNew: false,
      showOnSale: false,
      inStock: false
    });
    setPriceRange([0, maxPrice]);
  };

  const activeFiltersCount = filters.categories.length + filters.brands.length +
    (filters.showFeatured ? 1 : 0) + (filters.showNew ? 1 : 0) + (filters.showOnSale ? 1 : 0) + (filters.inStock ? 1 : 0) +
    ((filters.priceRange[0] !== 0 || filters.priceRange[1] !== maxPrice) ? 1 : 0);

  const handleSearch = (newQuery: string) => {
    setSearchQuery(newQuery);
    const params = new URLSearchParams(searchParams.toString());
    if (newQuery.trim()) {
      params.set('q', newQuery.trim());
    } else {
      params.delete('q');
    }
    router.push(`/search?${params.toString()}`);
  };

  const LoadingSkeleton = () => (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1920px] mx-auto px-[50px] py-8">
        <div className="flex gap-8">
          {/* Sidebar Skeleton */}
          <div className="w-80 flex-shrink-0">
            <div className="bg-white rounded-lg p-6 shadow-sm animate-pulse">
              <div className="h-6 bg-gray-200 rounded mb-4"></div>
              <div className="space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-4 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>

          {/* Products Grid Skeleton */}
          <div className="flex-1">
            <div className="mb-6 flex justify-between items-center">
              <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
              <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="bg-white rounded-lg overflow-hidden shadow-sm border animate-pulse">
                  <div className="h-64 bg-gray-200"></div>
                  <div className="p-4">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <MainLayout>
      {loading ? (
        <LoadingSkeleton />
      ) : (
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-[1920px] mx-auto px-[50px] py-8">
            <div className="flex gap-8">
              {/* Mobile Filter Toggle */}
              <div className="lg:hidden fixed top-20 right-4 z-50">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="bg-[#173a6a] text-white p-3 rounded-full shadow-lg hover:bg-[#1e4a7a] transition-colors"
                >
                  <Filter className="h-5 w-5" />
                  {activeFiltersCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Sidebar */}
              <div className={`w-80 flex-shrink-0 ${sidebarOpen ? 'fixed inset-y-0 left-0 z-40 lg:relative lg:inset-auto' : 'hidden lg:block'}`}>
                <div className="bg-white rounded-lg shadow-sm h-fit sticky top-8">
                  {/* Mobile close button */}
                  <div className="lg:hidden flex justify-between items-center p-4 border-b">
                    <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
                    <button
                      onClick={() => setSidebarOpen(false)}
                      className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="p-6">
                    {/* Filter Header */}
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-lg font-semibold text-gray-900 hidden lg:block">Filters</h2>
                      {activeFiltersCount > 0 && (
                        <button
                          onClick={clearAllFilters}
                          className="text-sm text-red-600 hover:text-red-700 font-medium"
                        >
                          Clear All ({activeFiltersCount})
                        </button>
                      )}
                    </div>

                    {/* Search Summary */}
                    {searchQuery && (
                      <div className="mb-6 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-800">
                          Searching for: <span className="font-medium">"{searchQuery}"</span>
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          {filteredAndSortedProducts.length} results found
                        </p>
                      </div>
                    )}

                    {/* Special Filters */}
                    <div className="mb-8">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Special</h3>
                      <div className="space-y-3">
                        <label className="flex items-center space-x-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={filters.showFeatured}
                            onChange={() => toggleSpecialFilter('showFeatured')}
                            className="rounded border-gray-300 text-[#173a6a] focus:ring-[#173a6a] focus:ring-offset-0"
                          />
                          <span className="text-sm text-gray-700">Featured Products</span>
                          <Star className="h-4 w-4 text-yellow-400" />
                        </label>
                        <label className="flex items-center space-x-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={filters.showNew}
                            onChange={() => toggleSpecialFilter('showNew')}
                            className="rounded border-gray-300 text-[#173a6a] focus:ring-[#173a6a] focus:ring-offset-0"
                          />
                          <span className="text-sm text-gray-700">New Products</span>
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">New</span>
                        </label>
                        <label className="flex items-center space-x-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={filters.showOnSale}
                            onChange={() => toggleSpecialFilter('showOnSale')}
                            className="rounded border-gray-300 text-[#173a6a] focus:ring-[#173a6a] focus:ring-offset-0"
                          />
                          <span className="text-sm text-gray-700">On Sale</span>
                          <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">Sale</span>
                        </label>
                        <label className="flex items-center space-x-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={filters.inStock}
                            onChange={() => toggleSpecialFilter('inStock')}
                            className="rounded border-gray-300 text-[#173a6a] focus:ring-[#173a6a] focus:ring-offset-0"
                          />
                          <span className="text-sm text-gray-700">In Stock Only</span>
                        </label>
                      </div>
                    </div>

                    {/* Categories Filter */}
                    {categories.length > 0 && (
                      <div className="mb-8">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">Categories</h3>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {categories.map((category) => (
                            <label key={category.$id} className="flex items-center space-x-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={filters.categories.includes(category.$id)}
                                onChange={() => toggleCategoryFilter(category.$id)}
                                className="rounded border-gray-300 text-[#173a6a] focus:ring-[#173a6a] focus:ring-offset-0"
                              />
                              <span className="text-sm text-gray-700">{category.name}</span>
                              <span className="text-xs text-gray-500">(
                                {products.filter(p => p.category_id === category.$id &&
                                  `${p.name} ${p.description || ''} ${getBrandName(p.brand_id)} ${getCategoryName(p.category_id)} ${(p as any).sku || ''}`.toLowerCase().includes(searchQuery.toLowerCase())
                                ).length}
                              )</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Brands Filter */}
                    {brands.length > 0 && (
                      <div className="mb-8">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">Brands</h3>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {brands.map((brand) => (
                            <label key={brand.$id} className="flex items-center space-x-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={filters.brands.includes(brand.$id)}
                                onChange={() => toggleBrandFilter(brand.$id)}
                                className="rounded border-gray-300 text-[#173a6a] focus:ring-[#173a6a] focus:ring-offset-0"
                              />
                              <span className="text-sm text-gray-700">{brand.name}</span>
                              <span className="text-xs text-gray-500 font-mono">({brand.prefix})</span>
                              <span className="text-xs text-gray-500">(
                                {products.filter(p => p.brand_id === brand.$id &&
                                  `${p.name} ${p.description || ''} ${getBrandName(p.brand_id)} ${getCategoryName(p.category_id)} ${(p as any).sku || ''}`.toLowerCase().includes(searchQuery.toLowerCase())
                                ).length}
                              )</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Price Range Filter */}
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Price Range</h3>
                      <div className="space-y-4">
                        <div className="flex items-center space-x-4">
                          <div className="flex-1">
                            <label className="block text-xs text-gray-500 mb-1">Min</label>
                            <input
                              type="number"
                              value={priceRange[0]}
                              onChange={(e) => updatePriceRange(Number(e.target.value), priceRange[1])}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#173a6a] focus:border-[#173a6a]"
                              min="0"
                              max={maxPrice}
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs text-gray-500 mb-1">Max</label>
                            <input
                              type="number"
                              value={priceRange[1]}
                              onChange={(e) => updatePriceRange(priceRange[0], Number(e.target.value))}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#173a6a] focus:border-[#173a6a]"
                              min="0"
                              max={maxPrice}
                            />
                          </div>
                        </div>
                        <div className="text-center text-sm text-gray-600">
                          ${priceRange[0]} - ${priceRange[1]}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Overlay for mobile */}
              {sidebarOpen && (
                <div
                  className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
                  onClick={() => setSidebarOpen(false)}
                />
              )}

              {/* Main Content */}
              <div className="flex-1 min-w-0">
                {/* Search Header */}
                <div className="mb-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        placeholder="Search for products..."
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#173a6a] focus:border-[#173a6a]"
                      />
                    </div>
                    <div className="relative">
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="appearance-none bg-white border border-gray-300 rounded-md px-4 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-[#173a6a] focus:border-[#173a6a]"
                      >
                        <option value="relevance">Relevance</option>
                        <option value="name">Name</option>
                        <option value="price-low">Price: Low to High</option>
                        <option value="price-high">Price: High to Low</option>
                        <option value="newest">Newest First</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Search Results Summary */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        {searchQuery ? `Search Results for "${searchQuery}"` : 'Search Products'}
                      </h1>
                      <p className="text-gray-600">
                        {filteredAndSortedProducts.length} {filteredAndSortedProducts.length === 1 ? 'product' : 'products'} found
                        {searchQuery && (
                          <span className="ml-2 text-sm">
                            • Searching in {products.length} total products
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Active Filters */}
                  {activeFiltersCount > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {filters.categories.map(catId => {
                        const category = categories.find(c => c.$id === catId);
                        return category ? (
                          <span key={catId} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-[#173a6a] text-white">
                            {category.name}
                            <button onClick={() => toggleCategoryFilter(catId)} className="hover:bg-white hover:bg-opacity-20 rounded-full p-0.5">
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ) : null;
                      })}
                      {filters.brands.map(brandId => {
                        const brand = brands.find(b => b.$id === brandId);
                        return brand ? (
                          <span key={brandId} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-[#173a6a] text-white">
                            {brand.name}
                            <button onClick={() => toggleBrandFilter(brandId)} className="hover:bg-white hover:bg-opacity-20 rounded-full p-0.5">
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ) : null;
                      })}
                      {filters.showFeatured && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800">
                          Featured
                          <button onClick={() => toggleSpecialFilter('showFeatured')} className="hover:bg-yellow-200 rounded-full p-0.5">
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      )}
                      {filters.showNew && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                          New Products
                          <button onClick={() => toggleSpecialFilter('showNew')} className="hover:bg-blue-200 rounded-full p-0.5">
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      )}
                      {filters.showOnSale && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-red-100 text-red-800">
                          On Sale
                          <button onClick={() => toggleSpecialFilter('showOnSale')} className="hover:bg-red-200 rounded-full p-0.5">
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      )}
                      {filters.inStock && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                          In Stock
                          <button onClick={() => toggleSpecialFilter('inStock')} className="hover:bg-green-200 rounded-full p-0.5">
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Search Results */}
                {!searchQuery ? (
                  <div className="text-center py-16">
                    <Search className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                    <h3 className="text-xl font-medium text-gray-900 mb-2">Start your search</h3>
                    <p className="text-gray-600 mb-6">Enter a product name, brand, or description to find what you're looking for.</p>
                    <div className="max-w-md mx-auto">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        placeholder="Try searching for 'scrub top' or 'Dav Egypt'..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#173a6a] focus:border-[#173a6a]"
                      />
                    </div>
                  </div>
                ) : filteredAndSortedProducts.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="text-gray-400 text-4xl mb-4">🔍</div>
                    <h3 className="text-xl font-medium text-gray-900 mb-2">No products found</h3>
                    <p className="text-gray-600 mb-4">
                      No products match your search for "{searchQuery}".
                      {activeFiltersCount > 0 ? ' Try adjusting your filters or ' : ' '}
                      <button
                        onClick={() => {
                          if (activeFiltersCount > 0) {
                            clearAllFilters();
                          } else {
                            handleSearch('');
                          }
                        }}
                        className="text-[#173a6a] hover:text-[#1e4a7a] font-medium"
                      >
                        {activeFiltersCount > 0 ? 'clear filters' : 'clear search'}
                      </button>
                      {' '}to see more results.
                    </p>
                    <div className="text-sm text-gray-500">
                      Search tips: Try different keywords or check your spelling
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredAndSortedProducts.map((product) => (
                      <Link key={product.$id} href={`/product/${product.slug}`} className="bg-white rounded-lg overflow-hidden shadow-sm border hover:shadow-lg transition-all duration-300 group block">
                        {/* Product Image */}
                        <div className="relative h-64 bg-gray-100 flex items-center justify-center overflow-hidden">
                          <Image
                            src={getImageSrc(product)}
                            alt={product.name}
                            className="w-full h-full object-cover"
                            width={300}
                            height={300}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const fallbackIcon = e.currentTarget.parentElement?.querySelector('.fallback-icon');
                              if (fallbackIcon) {
                                fallbackIcon.classList.remove('hidden');
                              }
                            }}
                          />
                          <div className="text-gray-400 text-4xl fallback-icon w-full h-full flex items-center justify-center">
                            📦
                          </div>

                          {/* Badges */}
                          <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
                            {product.is_featured && (
                              <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
                                <Star className="h-3 w-3" />
                                Featured
                              </span>
                            )}
                            {product.is_new && (
                              <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                                New
                              </span>
                            )}
                            {product.discount_price > 0 && product.discount_price < product.price && (
                              <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">
                                Sale
                              </span>
                            )}
                          </div>

                          {/* Wishlist Button */}
                          <button className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-gray-50 z-10">
                            <Heart className="h-4 w-4 text-gray-600" />
                          </button>
                        </div>

                        {/* Product Details */}
                        <div className="p-4">
                          <div className="mb-2">
                            <p className="text-sm text-gray-600 mb-1">
                              {getBrandName(product.brand_id)}
                            </p>
                            <h3 className="font-semibold text-gray-900 line-clamp-2 hover:text-[#173a6a] transition-colors">
                              {product.name}
                            </h3>
                          </div>

                          {/* Price */}
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-2">
                              {product.discount_price > 0 && product.discount_price < product.price ? (
                                <>
                                  <span className="text-lg font-bold text-red-600">
                                    ${product.discount_price.toFixed(2)}
                                  </span>
                                  <span className="text-sm text-gray-500 line-through">
                                    ${product.price.toFixed(2)}
                                  </span>
                                </>
                              ) : (
                                <span className="text-lg font-bold text-gray-900">
                                  ${product.price.toFixed(2)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Add to Cart Button */}
                          <button className="w-full bg-[#173a6a] text-white py-3 px-4 rounded-md hover:bg-[#1e4a7a] transition-colors font-medium text-sm">
                            Add to Cart
                          </button>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}

export default function SearchPage() {
 return (
   <Suspense fallback={<div>Loading...</div>}>
     <SearchPageContent />
   </Suspense>
 );
}