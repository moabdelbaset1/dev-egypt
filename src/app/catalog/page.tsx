'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import MainLayout from '../../components/MainLayout';
import { Product } from '../../types/product';
import { useCart } from '../../context/CartContext';
import { ChevronDown, Filter, X, Star, Heart } from 'lucide-react';
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

interface Filters {
  categories: string[];
  brands: string[];
  priceRange: [number, number];
  season?: string;
  showFeatured: boolean;
  showNew: boolean;
  showOnSale: boolean;
}

function CatalogPageContent() {
  const searchParams = useSearchParams();
  const { addToCart, isInCart } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'price-low' | 'price-high' | 'newest'>('name');

  // Filter states
  const [filters, setFilters] = useState<Filters>({
    categories: [],
    brands: [],
    priceRange: [0, 1000],
    season: '', // Default to "All Seasons" to show all products
    showFeatured: false,
    showNew: false,
    showOnSale: false
  });

  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [maxPrice, setMaxPrice] = useState(1000);

  // Fetch products from API
  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/admin/products?available=true&limit=100', {
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        console.error('Error fetching products:', data.error);
        throw new Error(data.error);
      }

      const fetchedProducts = data.products || [];
      
      if (fetchedProducts.length === 0) {
        console.warn('No products returned, using fallback');
        throw new Error('No products available');
      }
      
      setProducts(fetchedProducts);
      
      // Calculate max price for price range filter
      if (fetchedProducts.length > 0) {
        const prices = fetchedProducts.map((p: Product) => p.price);
        const maxProductPrice = Math.max(...prices);
        const roundedMax = Math.ceil(maxProductPrice / 50) * 50; // Round up to nearest 50
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
        },
        {
          $id: 'fallback-p2',
          name: 'Dav Egypt Comfortable Scrub Pants',
          slug: 'dev-egypt-comfortable-scrub-pants',
          price: 199,
          discount_price: 0,
          category_id: 'fallback-c2',
          brand_id: 'fallback-b1',
          units: 1,
          min_order_quantity: 1,
          is_featured: false,
          is_new: false,
          is_active: true,
          hasVariations: false,
          media_id: 'https://via.placeholder.com/300x400?text=Scrub+Pants',
          description: 'Comfortable and durable scrub pants',
          meta_title: 'Dav Egypt Comfortable Scrub Pants',
          meta_description: 'Comfortable and durable scrub pants for all-day wear',
          meta_keywords: 'scrub pants, medical scrubs, comfortable',
          $createdAt: new Date().toISOString(),
          $updatedAt: new Date().toISOString()
        },
        {
          $id: 'fallback-p3',
          name: 'Cherokee Classic Scrub Set',
          slug: 'cherokee-classic-scrub-set',
          price: 449,
          discount_price: 399,
          category_id: 'fallback-c3',
          brand_id: 'fallback-b2',
          units: 1,
          min_order_quantity: 1,
          is_featured: true,
          is_new: false,
          is_active: true,
          hasVariations: false,
          media_id: 'https://via.placeholder.com/300x400?text=Scrub+Set',
          description: 'Complete professional scrub set',
          meta_title: 'Cherokee Classic Scrub Set',
          meta_description: 'Complete professional scrub set with top and pants',
          meta_keywords: 'scrub set, cherokee, professional scrubs',
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

  // Fetch categories from API
  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/admin/categories?status=true', {
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        console.error('Error fetching categories:', data.error);
        return;
      }

      setCategories(data.categories || []);
    } catch (error: any) {
      console.error('Failed to fetch categories:', error.message || error);
      // Use fallback categories when API fails
      setCategories([
        { $id: 'fallback-c1', name: 'Scrub Tops', status: true },
        { $id: 'fallback-c2', name: 'Scrub Pants', status: true },
        { $id: 'fallback-c3', name: 'Scrub Sets', status: true },
        { $id: 'fallback-c4', name: 'Lab Coats', status: true },
        { $id: 'fallback-c5', name: 'Accessories', status: true }
      ]);
    }
  };

  // Fetch brands from API
  const fetchBrands = async () => {
    try {
      const response = await fetch('/api/admin/brands?status=true', {
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        console.error('Error fetching brands:', data.error);
        return;
      }

      setBrands(data.brands || []);
    } catch (error: any) {
      console.error('Failed to fetch brands:', error.message || error);
      // Use fallback brands when API fails
      setBrands([
        { $id: 'fallback-b1', name: 'Dav Egypt', prefix: 'DE', status: true },
        { $id: 'fallback-b2', name: 'Cherokee', prefix: 'CHE', status: true },
        { $id: 'fallback-b3', name: 'WonderWink', prefix: 'WW', status: true },
        { $id: 'fallback-b4', name: 'FIGS', prefix: 'FIGS', status: true },
        { $id: 'fallback-b5', name: 'Jaanuu', prefix: 'JAN', status: true }
      ]);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    const loadData = async () => {
      if (!isMounted) return;
      
      setLoading(true);
      
      try {
        // Pass abort signal to all fetch functions
        await Promise.all([
          fetchProducts(),
          fetchCategories(),
          fetchBrands()
        ]);
      } catch (error: any) {
        // Ignore abort errors
        if (error.name === 'AbortError') {
          console.log('Data loading was cancelled');
          return;
        }
        console.error('Error loading data:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    loadData();

    // Cleanup function
    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, []);
  
  // Handle URL parameters
  useEffect(() => {
    if (!loading && categories.length > 0 && brands.length > 0) {
      const categoryParam = searchParams.get('category');
      const brandParam = searchParams.get('brand');
      const featuredParam = searchParams.get('featured');
      const newParam = searchParams.get('new');
      const saleParam = searchParams.get('sale');
      
      // Find brand ID by name or prefix
      let brandIds: string[] = [];
      if (brandParam) {
        // Check if it's a brand name like 'hleo', 'seen', 'omaima'
        const brandLower = brandParam.toLowerCase();
        const matchingBrand = brands.find(b => 
          b.name.toLowerCase().includes(brandLower) || 
          b.prefix.toLowerCase() === brandLower ||
          b.$id === brandParam
        );
        if (matchingBrand) {
          brandIds = [matchingBrand.$id];
        }
      }
      
      // Find category ID by name
      let categoryIds: string[] = [];
      if (categoryParam) {
        const categoryLower = categoryParam.toLowerCase();
        const matchingCategory = categories.find(c => 
          c.name.toLowerCase().includes(categoryLower) ||
          c.$id === categoryParam
        );
        if (matchingCategory) {
          categoryIds = [matchingCategory.$id];
        }
      }
      
      setFilters(prev => ({
        ...prev,
        categories: categoryIds,
        brands: brandIds,
        showFeatured: featuredParam === 'true',
        showNew: newParam === 'true',
        showOnSale: saleParam === 'true'
      }));
    }
  }, [searchParams, loading, categories, brands]);

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
    console.log(`[DEBUG] Getting image source for product: ${product.name} (${product.$id})`);
    console.log(`[DEBUG] Product data:`, {
      mainImageUrl: (product as any).mainImageUrl,
      mainImageId: (product as any).mainImageId,
      featuredImageId: (product as any).featuredImageId,
      media_id: (product as any).media_id
    });

    // First, check if product has mainImageUrl (this is the primary field used)
    if ((product as any).mainImageUrl) {
      // If it's already a full URL (starts with http), return as-is
      if ((product as any).mainImageUrl.startsWith('http://') || (product as any).mainImageUrl.startsWith('https://')) {
        console.log(`[DEBUG] Using HTTP URL for main image: ${(product as any).mainImageUrl}`);
        return (product as any).mainImageUrl;
      }
      // Skip blob URLs - they're temporary and will fail
      if ((product as any).mainImageUrl.startsWith('blob:')) {
        console.warn(`[DEBUG] Skipping blob URL (temporary): ${(product as any).mainImageUrl}`);
        // Fall through to try other options
      } else {
        // Otherwise, it's likely already a full API path, return as-is
        console.log(`[DEBUG] Using mainImageUrl as-is: ${(product as any).mainImageUrl}`);
        return (product as any).mainImageUrl;
      }
    }

    // Check if product has mainImageId (fallback) - use API route path
    if ((product as any).mainImageId) {
      // Use the API route to serve the image from public/uploads/images directory
      const imagePath = `/api/storage/files/${(product as any).mainImageId}`;
      console.log(`[DEBUG] Using API route for mainImageId: ${imagePath}`);
      return imagePath;
    }

    // Check if product has featuredImageId
    if ((product as any).featuredImageId) {
      const imagePath = `/api/storage/files/${(product as any).featuredImageId}`;
      console.log(`[DEBUG] Using API route for featuredImageId: ${imagePath}`);
      return imagePath;
    }

    // Check if product has media_id (legacy field)
    if ((product as any).media_id) {
      // Check if it's a URL (starts with http:// or https://)
      if ((product as any).media_id.startsWith('http://') || (product as any).media_id.startsWith('https://')) {
        console.log(`[DEBUG] Using HTTP media_id URL: ${(product as any).media_id}`);
        return (product as any).media_id;
      }
      // Otherwise, treat it as a file ID and use API route path
      const imagePath = `/api/storage/files/${(product as any).media_id}`;
      console.log(`[DEBUG] Using API route for media_id: ${imagePath}`);
      return imagePath;
    }

    // Default fallback for products without images
    console.log(`[DEBUG] No image found for product ${product.name}, using placeholder`);
    return 'https://via.placeholder.com/300x400?text=No+Image';
  };

  // Filter and sort products
  const filteredAndSortedProducts = useMemo(() => {
    const filtered = products.filter(product => {
      // Category filter
      if (filters.categories.length > 0 && !filters.categories.includes(product.category_id)) {
        return false;
      }
      
      // Brand filter
      if (filters.brands.length > 0 && !filters.brands.includes(product.brand_id)) {
        return false;
      }

      // Season filter - check meta_keywords for season data
      if (filters.season && filters.season !== '') {
        // Check if product has season data in meta_keywords (format: "season:summer" or "season:winter")
        const metaKeywords = product.meta_keywords || '';
        const productSeason = metaKeywords.match(/season:(\w+)/)?.[1];
        
        // If product has season data, check if it matches the filter
        if (productSeason) {
          if (productSeason !== filters.season && productSeason !== 'all-season') {
            return false; // Hide if doesn't match and is not all-season
          }
        }
        // If no season data found, assume it's all-season and show it
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
        default:
          return a.name.localeCompare(b.name);
      }
    });
    
    return filtered;
  }, [products, filters, sortBy]);
  
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
  
  const toggleSpecialFilter = (filterType: 'showFeatured' | 'showNew' | 'showOnSale') => {
    setFilters(prev => ({ ...prev, [filterType]: !prev[filterType] }));
  };
  
  const clearAllFilters = () => {
    setFilters({
      categories: [],
      brands: [],
      priceRange: [0, maxPrice],
      showFeatured: false,
      showNew: false,
      showOnSale: false
    });
    setPriceRange([0, maxPrice]);
  };
  
  const activeFiltersCount = filters.categories.length + filters.brands.length + 
    (filters.showFeatured ? 1 : 0) + (filters.showNew ? 1 : 0) + (filters.showOnSale ? 1 : 0) +
    ((filters.priceRange[0] !== 0 || filters.priceRange[1] !== maxPrice) ? 1 : 0);
    
  // Get page title based on current filters
  const getPageTitle = () => {
    if (filters.showFeatured) return 'Featured Products';
    if (filters.showNew) return 'New & Trending';
    if (filters.showOnSale) return 'Sale Products';
    if (filters.categories.length === 1) {
      const category = categories.find(c => c.$id === filters.categories[0]);
      return category ? category.name : 'Product Catalog';
    }
    if (filters.brands.length === 1) {
      const brand = brands.find(b => b.$id === filters.brands[0]);
      return brand ? `${brand.name} Products` : 'Product Catalog';
    }
    return 'Product Catalog';
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
                      </div>
                    </div>

                    {/* Categories Filter */}
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
                              {products.filter(p => p.category_id === category.$id).length}
                            )</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Brands Filter */}
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
                              {products.filter(p => p.brand_id === brand.$id).length}
                            )</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Season Filter */}
                    <div className="mb-8">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Season</h3>
                      <div className="space-y-2">
                        {[{ value: '', label: 'All Seasons' }, { value: 'summer', label: 'Summer' }, { value: 'winter', label: 'Winter' }].map((option) => {
                          const currentMonth = new Date().getMonth() + 1;
                          const isCurrentSeason = (option.value === 'summer' && currentMonth >= 4 && currentMonth <= 9) || 
                                                 (option.value === 'winter' && (currentMonth <= 3 || currentMonth >= 10));
                          return (
                            <label key={option.value} className="flex items-center space-x-3 cursor-pointer">
                              <input
                                type="radio"
                                name="season"
                                value={option.value}
                                checked={filters.season === option.value}
                                onChange={() => setFilters(prev => ({ ...prev, season: option.value }))}
                                className="border-gray-300 text-[#173a6a] focus:ring-[#173a6a] focus:ring-offset-0"
                              />
                              <span className="text-sm text-gray-700">
                                {option.label} 
                                {isCurrentSeason && option.value && <span className="text-xs text-blue-600 ml-1">(Current)</span>}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

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
                {/* Header */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h1 className="text-3xl font-bold text-gray-900 mb-2">{getPageTitle()}</h1>
                      <p className="text-gray-600">
                        {filteredAndSortedProducts.length} {filteredAndSortedProducts.length === 1 ? 'product' : 'products'} found
                      </p>
                    </div>
                    
                    {/* Sort Dropdown */}
                    <div className="relative">
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="appearance-none bg-white border border-gray-300 rounded-md px-4 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-[#173a6a] focus:border-[#173a6a]"
                      >
                        <option value="name">Sort by Name</option>
                        <option value="price-low">Price: Low to High</option>
                        <option value="price-high">Price: High to Low</option>
                        <option value="newest">Newest First</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
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
                    </div>
                  )}
                </div>

                {/* Products Grid - 3 Columns */}
                {filteredAndSortedProducts.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="text-gray-400 text-4xl mb-4">📦</div>
                    <h3 className="text-xl font-medium text-gray-900 mb-2">No products found</h3>
                    <p className="text-gray-600 mb-4">Try adjusting your filters to see more products.</p>
                    {activeFiltersCount > 0 && (
                      <button
                        onClick={clearAllFilters}
                        className="text-[#173a6a] hover:text-[#1e4a7a] font-medium"
                      >
                        Clear all filters
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredAndSortedProducts.map((product) => (
                      <Link key={product.$id} href={`/product/${product.slug}`} className="bg-white rounded-lg overflow-hidden shadow-sm border hover:shadow-lg transition-all duration-300 group block">
                        {/* Product Image with Flip Animation */}
                        <div className="flip-container relative h-64 bg-gray-100 flex items-center justify-center overflow-hidden">
                          <div className="flip-inner relative w-full h-full">
                            {/* Front Image */}
                            <div className="flip-front absolute inset-0 w-full h-full">
                              <Image
                                src={getImageSrc(product)}
                                alt={`${product.name} - front view`}
                                className="w-full h-full object-cover"
                                width={300}
                                height={300}
                                priority={true}
                                onError={(e) => {
                                  console.error(`[DEBUG] Front image failed to load: ${getImageSrc(product)}`, {
                                    productId: product.$id,
                                    productName: product.name,
                                    attemptedUrl: getImageSrc(product)
                                  });

                                  e.currentTarget.style.display = 'none';

                                  // Show fallback UI
                                  const fallbackIcon = e.currentTarget.parentElement?.parentElement?.querySelector('.fallback-icon');
                                  if (fallbackIcon) {
                                    fallbackIcon.classList.remove('hidden');
                                  } else {
                                    // Create fallback UI if it doesn't exist
                                    const fallbackDiv = document.createElement('div');
                                    fallbackDiv.className = 'text-gray-400 text-4xl fallback-icon hidden w-full h-full flex items-center justify-center';
                                    fallbackDiv.innerHTML = '📦';
                                    e.currentTarget.parentElement?.parentElement?.appendChild(fallbackDiv);
                                    fallbackDiv.classList.remove('hidden');
                                  }
                                }}
                              />
                              {/* Fallback icon for front */}
                              <div className="text-gray-400 text-4xl fallback-icon hidden w-full h-full flex items-center justify-center">
                                📦
                              </div>
                            </div>

                            {/* Back Image */}
                            <div className="flip-back absolute inset-0 w-full h-full">
                              {(() => {
                                console.log(`[DEBUG] Rendering back image for product: ${product.name} (${product.$id})`);

                                // Try to get back image URL from product data
                                const backImageUrl = (product as any).backImageUrl;
                                const mainImageUrl = (product as any).mainImageUrl;
                                const mediaId = (product as any).media_id;

                                console.log(`[DEBUG] Product: ${product.name}`);
                                console.log(`[DEBUG] backImageUrl:`, backImageUrl);
                                console.log(`[DEBUG] mainImageUrl:`, mainImageUrl);
                                console.log(`[DEBUG] media_id:`, mediaId);
                                // Determine the best image source with fallback chain
                                const getBestImageSource = () => {
                                  // First priority: backImageUrl (if it's a valid URL or public path)
                                  if (backImageUrl && (backImageUrl.startsWith('http://') || backImageUrl.startsWith('https://') || backImageUrl.startsWith('/uploads/') || backImageUrl.startsWith('/api/'))) {
                                    return backImageUrl;
                                  }

                                  // Second priority: mainImageUrl (if it's a valid URL or public path)
                                  if (mainImageUrl && (mainImageUrl.startsWith('http://') || mainImageUrl.startsWith('https://') || mainImageUrl.startsWith('/uploads/') || mainImageUrl.startsWith('/api/'))) {
                                    return mainImageUrl;
                                  }

                                  // Third priority: public directory URL from media_id
                                  if (mediaId && (mediaId.startsWith('http://') || mediaId.startsWith('https://'))) {
                                    return mediaId;
                                  }

                                  // Fourth priority: API route URL constructed from media_id
                                  if (mediaId) {
                                    return `/api/storage/files/${mediaId}`;
                                  }

                                  // Final fallback: use fallback UI instead of external placeholder
                                  return null; // This will trigger the fallback UI below
                                };

                                const imageSrc = getBestImageSource();
                                console.log(`[DEBUG] Selected image source: ${imageSrc}`);

                                // If no valid image source found, show fallback UI directly
                                if (!imageSrc) {
                                  console.log(`[DEBUG] No image source available, showing fallback UI`);
                                  return (
                                    <div className="w-full h-full bg-gray-200 flex flex-col items-center justify-center text-gray-400">
                                      <span className="back-fallback-icon text-2xl mb-1">↻</span>
                                      <span className="text-xs text-center px-2">Back view not available</span>
                                    </div>
                                  );
                                }

                                return (
                                  <Image
                                    src={imageSrc}
                                    alt={`${product.name} - back view`}
                                    className="w-full h-full object-cover"
                                    width={300}
                                    height={300}
                                    onError={(e) => {
                                       console.error(`[DEBUG] Back image failed to load: ${imageSrc}`, {
                                         productId: product.$id,
                                         productName: product.name,
                                         attemptedUrl: imageSrc,
                                         availableSources: {
                                           backImageUrl,
                                           mainImageUrl,
                                           mediaId
                                         }
                                       });

                                       // Hide the failed image
                                       e.currentTarget.style.display = 'none';

                                       // Show fallback UI
                                       const fallbackIcon = e.currentTarget.parentElement?.querySelector('.back-fallback-icon');
                                       if (fallbackIcon) {
                                         fallbackIcon.classList.remove('hidden');
                                         console.log(`[DEBUG] Showing fallback icon for failed back image`);
                                       } else {
                                         // Create fallback UI if it doesn't exist
                                         const fallbackDiv = document.createElement('div');
                                         fallbackDiv.className = 'w-full h-full bg-gray-200 flex flex-col items-center justify-center text-gray-400 back-fallback-icon';
                                         fallbackDiv.innerHTML = `
                                           <span class="text-2xl mb-1">↻</span>
                                           <span class="text-xs text-center px-2">Back view not available</span>
                                         `;
                                         e.currentTarget.parentElement?.appendChild(fallbackDiv);
                                       }
                                     }}
                                    onLoad={() => {
                                      console.log(`[DEBUG] Back image loaded successfully: ${imageSrc}`);
                                    }}
                                  />
                                );

                                // Try to parse product images if stored as JSON
                                const imagesData = (product as any).images;
                                console.log(`[DEBUG] images data:`, imagesData);

                                try {
                                  if (imagesData) {
                                    const productImages = JSON.parse(imagesData);
                                    console.log(`[DEBUG] Parsed images:`, productImages);
                                    const backImage = productImages.find((img: any) => img.type === 'back');
                                    console.log(`[DEBUG] Found back image:`, backImage);

                                    if (backImage && backImage.url) {
                                      console.log(`[DEBUG] Using parsed back image URL: ${backImage.url}`);
                                      return (
                                        <Image
                                          src={backImage.url}
                                          alt={`${product.name} - back view`}
                                          className="w-full h-full object-cover"
                                          width={300}
                                          height={300}
                                          onError={(e) => {
                                            console.error(`[DEBUG] Parsed back image failed to load: ${backImage.url}`, {
                                              productId: product.$id,
                                              productName: product.name,
                                              imageUrl: backImage.url,
                                              parsedData: productImages
                                            });
                                            e.currentTarget.style.display = 'none';
                                            const fallbackIcon = e.currentTarget.parentElement?.querySelector('.back-fallback-icon');
                                            if (fallbackIcon) {
                                              fallbackIcon.classList.remove('hidden');
                                              console.log(`[DEBUG] Showing fallback icon for failed parsed back image`);
                                            }
                                          }}
                                          onLoad={() => {
                                            console.log(`[DEBUG] Parsed back image loaded successfully: ${backImage.url}`);
                                          }}
                                        />
                                      );
                                    }
                                  }
                                } catch (error) {
                                  console.error(`[DEBUG] Error parsing product images for ${product.name}:`, {
                                    error: error,
                                    productId: product.$id,
                                    imagesData: imagesData
                                  });
                                }

                                // Log when falling back to placeholder
                                console.log(`[DEBUG] No back image found for ${product.name}, using fallback`);

                                // Fallback placeholder with informative message
                                console.log(`[DEBUG] No valid back image found for ${product.name}, using enhanced fallback`);
                                return (
                                  <div className="w-full h-full bg-gray-200 flex flex-col items-center justify-center text-gray-400">
                                    <span className="back-fallback-icon text-2xl mb-1">↻</span>
                                    <span className="text-xs text-center px-2">Back view not available</span>
                                  </div>
                                );
                              })()}
                            </div>
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
                          <button 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              addToCart(product);
                              console.log('Added to cart:', product.name);
                            }}
                            className={`w-full py-3 px-4 rounded-md transition-colors font-medium text-sm ${
                              isInCart(product.$id)
                                ? 'bg-green-600 text-white hover:bg-green-700'
                                : 'bg-[#173a6a] text-white hover:bg-[#1e4a7a]'
                            }`}
                          >
                            {isInCart(product.$id) ? 'Added to Cart ✓' : 'Add to Cart'}
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
export default function CatalogPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-lg">Loading catalog...</div></div>}>
      <CatalogPageContent />
    </Suspense>
  );
}

