'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Client, Databases, Storage } from 'appwrite';
import MainLayout from '../../../components/MainLayout';
import { useCart } from '../../../context/CartContext';
import { useCurrency } from '../../../context/CurrencyContext';
import { Product } from '../../../types/product';
import { ShoppingCart, Heart, Share2, Star, Check, Truck, Shield, RotateCcw, Ruler } from 'lucide-react';
import Link from 'next/link';
import CurrencyConverter from '../../../components/CurrencyConverter';
import ProductErrorBoundary from '../../../components/ui/ProductErrorBoundary';
import Image from 'next/image';
import { Button } from '../../../components/ui/button';
import { useProductDetails } from '../../../hooks/useProductDetails';
import { PageLoadingSpinner, ProgressiveLoader } from '../../../components/ui/LoadingStates';
import ProductImageGallery from '../../../components/ui/ProductImageGallery';
import ProductVariations, { VariationGroup, VariationOption } from '../../../components/ui/ProductVariations';
import RelatedProducts from '../../../components/ui/RelatedProducts';
import MultiVariantSelector from '../../../components/ui/MultiVariantSelector';
import SizeChartModal from '../../../components/ui/SizeChartModal';

interface Brand {
  $id: string;
  name: string;
  prefix: string;
  status: boolean;
}

interface Category {
  $id: string;
  name: string;
  status: boolean;
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { addToCart, isInCart } = useCart();
  const { formatPrice } = useCurrency();

  // Initialize Appwrite client with debugging
  console.log('🔧 Initializing Appwrite client for product page');
  console.log('Environment check:', {
    endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT,
    projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
    databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID
  });

  const client = useMemo(() => new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || ''), []);

  console.log('✅ Appwrite client initialized');

  const databases = useMemo(() => new Databases(client), [client]);
  const storage = useMemo(() => new Storage(client), [client]);

  // Use the enhanced product details hook
  console.log('🎣 Calling useProductDetails with slug:', slug);

  const {
    product: dynamicProduct,
    loading,
    error,
    selectedVariations,
    selectedColor,
    selectedSize,
    quantity,
    currentImageIndex,
    pricing,
    availability,
    processedImages,
    setSelectedColor,
    setSelectedSize,
    setQuantity,
    setCurrentImageIndex,
    setSelectedVariations,
    handleVariationChange,
    refetch
  } = useProductDetails(slug, databases, storage);

  // Debug hook return values
  console.log('📊 Hook returned values:', {
    hasProduct: !!dynamicProduct,
    loading,
    hasError: !!error,
    errorMessage: error,
    slug
  });

  const [brand, setBrand] = useState<Brand | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [addedToCart, setAddedToCart] = useState(false);
  const [addEmbroidery, setAddEmbroidery] = useState(false);
  const [featuresExpanded, setFeaturesExpanded] = useState(true);
  const [sizeChartOpen, setSizeChartOpen] = useState(false);

  // Fallback static product data
  const staticProduct: Product = {
    $id: 'BSS577',
    name: 'Butter-Soft STRETCH Men\'s 4-Pocket V-Neck Scrub Top',
    slug: 'yellow-shirt',
    brand_id: 'brand1',
    category_id: 'cat1',
    units: 100,
    price: 26.99,
    discount_price: 11.91,
    min_order_quantity: 1,
    description: 'Premium medical scrubs with 4 pockets, classic fit, and 2-way stretch comfort fabric.',
    is_active: true,
    is_new: false,
    is_featured: true,
    hasVariations: true,
    variations: 'color,size',
    colorOptions: 'Royal,Navy,Black,White,Gray,Teal,Purple,Green',
    sizeOptions: 'XS,S,M,L,XL,2X,3X,4X,5X',
    mainImageUrl: '/figma/product-images/main-product-royal.png',
    media_id: 'main-product-royal.png',
    $createdAt: new Date().toISOString(),
    $updatedAt: new Date().toISOString()
  };

  // Use dynamic data if available, otherwise fall back to static data
  const product = dynamicProduct || staticProduct;
  const isUsingStaticData = !dynamicProduct;

  console.log('🎯 Final product decision:', {
    slug,
    usingStaticData: isUsingStaticData,
    hasDynamicProduct: !!dynamicProduct,
    hasStaticProduct: !!staticProduct,
    productName: product?.name,
    productId: isUsingStaticData ? (product as any)?.$id : (product as any)?.id,
    hasVariations: !!product.variations,
    variationsType: Array.isArray(product.variations) ? 'array' : typeof product.variations,
    variationsCount: Array.isArray(product.variations) ? product.variations.length : 0,
    loading,
    error
  });

  // Memoize the product to prevent unnecessary re-renders
  const memoizedProduct = useMemo(() => product, [(product as any)?.$id || (product as any)?.id, product?.name, product?.price]);

  // Auto-select first available color and size when product loads
  useEffect(() => {
    console.log('🔍 Auto-select check:', {
      isUsingStaticData,
      hasDynamicProduct: !!dynamicProduct,
      hasSelectedColor: !!selectedColor,
      hasSelectedSize: !!selectedSize,
      selectedColor,
      selectedSize
    });
    
    if (!isUsingStaticData && dynamicProduct && !selectedColor && !selectedSize) {
      // Auto-select first color
      if (Array.isArray(dynamicProduct.variations)) {
        const colorVariations = dynamicProduct.variations.filter((v: any) => v.variation_type === 'color');
        console.log('🎨 Found color variations:', colorVariations.length);
        if (colorVariations.length > 0) {
          const firstColor = colorVariations[0].variation_value;
          console.log('🎨 Auto-selecting color:', firstColor);
          setSelectedColor(firstColor);
        }
        
        // Auto-select first size
        const sizeVariations = dynamicProduct.variations.filter((v: any) => v.variation_type === 'size');
        console.log('📏 Found size variations:', sizeVariations.length);
        if (sizeVariations.length > 0) {
          const firstSize = sizeVariations[0].variation_value;
          console.log('📏 Auto-selecting size:', firstSize);
          setSelectedSize(firstSize);
        }
      }
    }
  }, [dynamicProduct, isUsingStaticData, selectedColor, selectedSize, setSelectedColor, setSelectedSize]);

  // Fetch additional data (brand, category) for both static and dynamic products
  useEffect(() => {
    const fetchAdditionalData = async () => {
      try {
        // Fetch brand details
        if (isUsingStaticData) {
          // For static data, use mock brand/category
          setBrand({ $id: 'brand1', name: 'Butter-Soft', prefix: 'BS', status: true } as Brand);
          setCategory({ $id: 'cat1', name: 'Medical Scrubs', status: true } as Category);
        } else {
          const dynamicProd = product as any;
          if (dynamicProd.brand_id) {
            const brandResponse = await fetch(`/api/admin/brands?status=true`);
            const brandData = await brandResponse.json();
            const productBrand = brandData.brands?.find((b: Brand) => b.$id === dynamicProd.brand_id);
            setBrand(productBrand || null);
          }

          if (dynamicProd.category_id) {
            const categoryResponse = await fetch(`/api/admin/categories?status=true`);
            const categoryData = await categoryResponse.json();
            const productCategory = categoryData.categories?.find((c: Category) => c.$id === dynamicProd.category_id);
            setCategory(productCategory || null);
          }
        }

      } catch (error) {
        console.error('Failed to fetch additional data:', error);
      }
    };

    if (memoizedProduct) {
      fetchAdditionalData();
    }
  }, [memoizedProduct, isUsingStaticData]);

  const handleAddToCart = () => {
    if (product) {
      // Use pricing from the hook if available, otherwise fall back to static calculation
      let totalPrice: number;

      if (!isUsingStaticData && pricing) {
        totalPrice = pricing.finalPrice;

        // Add embroidery cost if selected
        if (addEmbroidery && (product as any).embroidery_available) {
          const embroideryPrice = (product as any).embroidery_price || 7.99;
          totalPrice += embroideryPrice;
        }
      } else {
        // Fallback to static calculation for static data or when pricing is not available
        totalPrice = isUsingStaticData
          ? parseFloat((product as Product).price.toString())
          : (product as any).discount_price > 0 ? (product as any).discount_price : (product as any).price;

        // Add price modifiers from selected variations
        Object.entries(selectedVariations).forEach(([groupId, optionId]) => {
          if (isUsingStaticData) {
            if (groupId === 'size' && ['2X', '3X', '4X', '5X'].includes(optionId)) {
              totalPrice += 50;
            }
          } else {
            const variation = (product as any).variations.find((v: any) => v.id === optionId);
            if (variation) {
              totalPrice += variation.price_modifier;
            }
          }
        });

        // Add embroidery cost if selected
        if (addEmbroidery && (isUsingStaticData || (product as any).embroidery_available)) {
          const embroideryPrice = isUsingStaticData ? 7.99 : (product as any).embroidery_price;
          totalPrice += embroideryPrice;
        }
      }

      // Convert to Product type for cart
      const cartProduct: Product = {
        $id: isUsingStaticData ? (product as Product).$id : (product as any).id,
        name: product.name,
        slug: product.slug || 'yellow-shirt',
        brand_id: isUsingStaticData ? (product as Product).brand_id : (product as any).brand_id,
        category_id: isUsingStaticData ? (product as Product).category_id : (product as any).category_id,
        units: isUsingStaticData ? (product as Product).units : (product as any).stock_quantity || 100,
        price: totalPrice,
        discount_price: 0,
        min_order_quantity: 1,
        description: product.description || 'Product description',
        is_active: true,
        is_new: false,
        is_featured: false,
        hasVariations: true,
        variations: 'color,size',
        colorOptions: 'Royal,Navy,Black,White,Gray,Teal,Purple,Green',
        sizeOptions: 'XS,S,M,L,XL,2X,3X,4X,5X',
        mainImageUrl: '/figma/product-images/main-product-royal.png',
        media_id: 'main-product-royal.png',
        $createdAt: new Date().toISOString(),
        $updatedAt: new Date().toISOString()
      };

      addToCart(cartProduct, quantity, selectedSize, selectedColor);
      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 3000);
    }
  };

  // Helper function to get the correct image source from product data (same logic as catalog)
  const getImageSrc = (product: Product) => {
    // First, check if product has mainImageUrl (this is the primary field used)
    if ((product as any).mainImageUrl) {
      // If it's already a full URL (starts with http), return as-is
      if ((product as any).mainImageUrl.startsWith('http://') || (product as any).mainImageUrl.startsWith('https://')) {
        return (product as any).mainImageUrl;
      }
      // If it's a blob URL, return as-is (these are temporary and may fail)
      if ((product as any).mainImageUrl.startsWith('blob:')) {
        console.log(`[DEBUG] Using blob URL for main image: ${(product as any).mainImageUrl}`);
        return (product as any).mainImageUrl;
      }
      // Otherwise, it's likely already a full API path, return as-is
      return (product as any).mainImageUrl;
    }

    // Check if product has mainImageId (fallback)
    if ((product as any).mainImageId) {
      return `/uploads/images/${(product as any).mainImageId}`;
    }

    // Check if product has featuredImageId
    if ((product as any).featuredImageId) {
      return `/uploads/images/${(product as any).featuredImageId}`;
    }

    // Check if product has media_id (legacy field)
    if ((product as any).media_id) {
      // Check if it's a URL (starts with http:// or https://)
      if ((product as any).media_id.startsWith('http://') || (product as any).media_id.startsWith('https://')) {
        return (product as any).media_id;
      }
      // Otherwise, treat it as a file ID
      return `/uploads/images/${(product as any).media_id}`;
    }

    // Default fallback for products without images
    return 'https://via.placeholder.com/400x600?text=No+Image';
  };

  // Get all product images for gallery with color variation support
  const getProductImages = (product: any): Array<{ src: string; alt: string; color?: string; isMain?: boolean; imageType?: 'main' | 'back' | 'variation' | 'gallery' }> => {
    const images: Array<{ src: string; alt: string; color?: string; isMain?: boolean; imageType?: 'main' | 'back' | 'variation' | 'gallery' }> = [];

    console.log('🖼️ Getting product images:', {
      hasImages: !!product.images,
      isArray: Array.isArray(product.images),
      imageCount: product.images?.length,
      hasMainImageUrl: !!product.mainImageUrl,
      isUsingStatic: isUsingStaticData,
      hasVariations: !!product.variations,
      variationsType: typeof product.variations
    });

    // If we have images array from ProductRepository
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
      // Deduplicate images by URL to avoid showing same image for each size variation
      const seenUrls = new Set<string>();
      const uniqueImages: any[] = [];
      
      // First, add main front and back images (no variation_id)
      const mainImages = product.images.filter((img: any) => 
        !img.variation_id || img.variation_id === '' ||
        img.image_type === 'front' || img.image_type === 'back'
      );
      
      mainImages.forEach((img: any) => {
        const url = img.url || img.image_url;
        if (!seenUrls.has(url)) {
          seenUrls.add(url);
          uniqueImages.push(img);
        }
      });
      
      // Then, add gallery images (deduplicated by URL)
      const galleryImages = product.images.filter((img: any) => 
        img.image_type === 'gallery' && img.variation_id
      );
      
      galleryImages.forEach((img: any) => {
        const url = img.url || img.image_url;
        if (!seenUrls.has(url)) {
          seenUrls.add(url);
          uniqueImages.push(img);
        }
      });
      
      // Convert to image array format
      uniqueImages.forEach((img: any, index: number) => {
        // Extract color from variation if available
        let colorValue = img.variation_value;
        
        if (!colorValue && img.variation_id && product.variations) {
          // Try exact match first
          let variation = product.variations.find((v: any) => v.id === img.variation_id);
          
          // If no exact match, try matching variations that start with this ID (handles synthetic IDs with suffixes)
          if (!variation) {
            variation = product.variations.find((v: any) => 
              v.id && v.id.startsWith(img.variation_id) && v.variation_type === 'color'
            );
          }
          
          // If found a color variation, use its value
          if (variation && variation.variation_type === 'color') {
            colorValue = variation.variation_value;
          }
          // Otherwise extract from SKU
          else if (variation && variation.sku) {
            const skuParts = variation.sku.split('-');
            if (skuParts.length >= 2) {
              colorValue = skuParts[1];
            }
          }
        }
        
        const imageObj = {
          src: img.url || img.image_url,
          alt: img.alt_text || `${product.name} - ${img.image_type} view ${index + 1}`,
          color: colorValue || undefined,
          isMain: img.image_type === 'front' || img.image_type === 'main',
          imageType: (img.image_type as 'main' | 'back' | 'variation' | 'gallery')
        };
        
        console.log(`🖼️ Image ${index + 1}:`, {
          type: img.image_type,
          hasVariationId: !!img.variation_id,
          detectedColor: colorValue,
          url: imageObj.src.substring(imageObj.src.lastIndexOf('/') - 30)
        });
        
        images.push(imageObj);
      });
      
      console.log('✅ Filtered to unique images:', images.length, 'images from', product.images.length, 'original images');
      console.log('📊 Final images array:', images.map(i => ({ type: i.imageType, color: i.color, isMain: i.isMain })));
    } else if (isUsingStaticData) {
      // For static products, create images for each color
      const colors = (product as Product).colorOptions?.split(',') || ['Royal', 'Navy', 'Black'];
      colors.forEach((color: string) => {
        const trimmedColor = color.trim();
        images.push({
          src: `/figma/product-images/main-product-${trimmedColor.toLowerCase()}.png`,
          alt: `${product.name} - ${trimmedColor} - Main View`,
          color: trimmedColor,
          isMain: true,
          imageType: 'main' as const
        });
        images.push({
          src: `/figma/product-images/main-product-${trimmedColor.toLowerCase()}.png`,
          alt: `${product.name} - ${trimmedColor} - Back View`,
          color: trimmedColor,
          isMain: false,
          imageType: 'back' as const
        });
      });
    } else {
      // Fallback for dynamic products without images array
      const mainImageSrc = getImageSrc(product);
      if (mainImageSrc && !mainImageSrc.includes('placeholder')) {
        images.push({
          src: mainImageSrc,
          alt: `${product.name} - main view`,
          isMain: true,
          imageType: 'main' as const
        });
      }
    }

    // Fallback to placeholder if no images found
    if (images.length === 0) {
      console.warn('⚠️ No images found, using placeholder');
      images.push({
        src: 'https://via.placeholder.com/400x600?text=No+Image+Available',
        alt: `${product.name} - no image available`,
        isMain: true,
        imageType: 'main' as const
      });
    }

    console.log('✅ Product images prepared:', images.length, 'images', images.map(i => ({ color: i.color, type: i.imageType })));
    return images;
  };

  // Use pricing from hook if available, otherwise calculate from product data
  const currentPrice = (!isUsingStaticData && pricing)
    ? pricing.basePrice
    : (product && product.discount_price > 0 ? product.discount_price : product?.price || 0);

  const savings = (!isUsingStaticData && pricing)
    ? pricing.savings
    : (product && product.discount_price > 0 ? product.price - product.discount_price : 0);

  const savingsPercent = (!isUsingStaticData && pricing)
    ? pricing.savingsPercent
    : (savings > 0 && product ? Math.round((savings / product.price) * 100) : 0);

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-[1920px] mx-auto px-[50px]">
            <div className="animate-pulse">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="h-96 bg-gray-200 rounded-lg"></div>
                <div className="space-y-4">
                  <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-24 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!product) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-[1920px] mx-auto px-[50px]">
            <div className="text-center py-16">
              <div className="mb-6">
                <div className="text-6xl mb-4">🔍</div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Product Not Found</h1>
                <p className="text-gray-600 mb-6">
                  The product "{slug}" could not be found or may no longer be available.
                </p>
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
                    <h3 className="font-semibold text-red-800 mb-2">Error Details:</h3>
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <Link href="/catalog">
                  <button className="bg-[#173a6a] text-white px-6 py-3 rounded-md font-semibold hover:bg-[#1e4a7a] transition-colors">
                    Browse All Products
                  </button>
                </Link>
                <div>
                  <button
                    onClick={() => window.location.reload()}
                    className="text-[#173a6a] hover:text-[#1e4a7a] font-medium"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50 py-4 md:py-8">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-[50px]">
          {/* Breadcrumb */}
          <nav className="mb-8 text-sm">
            <ol className="flex items-center space-x-2 text-gray-600">
              <li><Link href="/" className="hover:text-[#173a6a]">Home</Link></li>
              <li>/</li>
              <li><Link href="/catalog" className="hover:text-[#173a6a]">Products</Link></li>
              {category && (
                <>
                  <li>/</li>
                  <li><Link href={`/catalog?category=${category.$id}`} className="hover:text-[#173a6a]">{category.name}</Link></li>
                </>
              )}
              <li>/</li>
              <li className="text-gray-900 font-medium truncate">{product.name}</li>
            </ol>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 lg:gap-12">
            {/* Enhanced Product Images - Full Width, No Thumbnails */}
            <ProductErrorBoundary>
              <div className="space-y-4">
                {/* Enhanced Image Gallery - Full width image display */}
                <div className="bg-white rounded-lg p-6 shadow-lg sticky top-8">
                  <ProductImageGallery
                    images={getProductImages(product)}
                    selectedColor={selectedColor}
                    onColorChange={setSelectedColor}
                    className="w-full"
                    priority={true}
                    showThumbnails={false}
                    maxThumbnails={0}
                  />
                </div>
              </div>
            </ProductErrorBoundary>

            {/* Enhanced Product Info */}
            <div className="space-y-6">
              {/* Brand */}
              {brand && (
                <Link href={`/catalog?brand=${brand.$id}`} className="inline-block">
                  <span className="text-sm text-gray-600 hover:text-[#173a6a] font-medium">
                    {brand.name}
                  </span>
                </Link>
              )}

              {/* Title */}
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">{product.name}</h1>

              {/* Price with Currency Conversion */}
              <div className="border-t border-b py-6">
                <div className="flex flex-wrap items-baseline gap-3 md:gap-4">
                  <span className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#173a6a]">
                    {formatPrice(currentPrice)}
                  </span>
                  {isUsingStaticData ? (
                    <span className="text-xl sm:text-2xl text-gray-500 line-through">
                      {formatPrice((product as Product).price * 1.2)}
                    </span>
                  ) : (
                    savings > 0 && (
                      <>
                        <span className="text-xl sm:text-2xl text-gray-500 line-through">
                          {formatPrice(product.price)}
                        </span>
                        <span className="text-base sm:text-lg font-medium text-red-600">
                          Save {formatPrice(savings)}
                        </span>
                      </>
                    )
                  )}
                </div>
              </div>

              {/* Enhanced Product Variations - Dynamic */}
              <ProductErrorBoundary>
                <div className="space-y-6">
                  {/* Enhanced Color Selection with Product Images */}
                  {(!isUsingStaticData && Array.isArray(product.variations) && product.variations.length > 0) ? (() => {
                    // Get unique colors from variations
                    const colorVariations = product.variations.filter((v: any) =>
                      v.variation_type === 'color'
                    );
                    
                    // Remove duplicates
                    const uniqueColors = colorVariations.filter((v: any, index: number, self: any[]) =>
                      self.findIndex(t => t.variation_value === v.variation_value) === index
                    );

                    if (uniqueColors.length === 0) return null;

                    // Get color images from product images
                    const colorImages = getProductImages(product);

                    return (
                      <div className="space-y-3">
                        <h3 className="text-base font-semibold text-gray-900">Select Color</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {uniqueColors.map((colorVariation: any) => {
                            const colorName = colorVariation.variation_value;
                            const isSelected = selectedColor === colorName;
                            const inStock = colorVariation.stock_quantity > 0;
                            
                            // Find matching image for this color
                            const colorImage = colorImages.find(img => img.color === colorName);

                            return (
                              <button
                                key={colorVariation.id}
                                onClick={() => setSelectedColor(colorName)}
                                disabled={!inStock}
                                className={`group relative rounded-xl border-3 transition-all overflow-hidden ${
                                  isSelected
                                    ? 'border-[#173a6a] ring-4 ring-[#173a6a] ring-opacity-30 shadow-xl scale-105'
                                    : 'border-gray-200 hover:border-gray-400 hover:shadow-lg'
                                } ${!inStock ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                {/* Product Image */}
                                <div className="aspect-square bg-gray-100 overflow-hidden">
                                  {colorImage && (
                                    <Image
                                      src={colorImage.src}
                                      alt={`${colorName} option`}
                                      width={150}
                                      height={150}
                                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                    />
                                  )}
                                </div>
                                
                                {/* Color Info */}
                                <div className="p-3 bg-white">
                                  <p className="font-bold text-gray-900 text-center">{colorName}</p>
                                  <p className={`text-sm text-center mt-1 ${
                                    inStock ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {inStock ? '✓ In Stock' : '✗ Out of Stock'}
                                  </p>
                                </div>
                                
                                {/* Selected Indicator */}
                                {isSelected && (
                                  <div className="absolute top-2 right-2 bg-[#173a6a] text-white rounded-full p-1.5">
                                    <Check className="h-5 w-5" />
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })() : (isUsingStaticData && (product as Product).colorOptions) ? (
                    <div className="space-y-4">
                      <h3 className="text-xl font-bold text-gray-900">Select Color</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {(product as Product).colorOptions.split(',').map((color: string) => {
                          const colorName = color.trim();
                          const isSelected = selectedColor === colorName;
                          
                          // Get image for this color
                          const colorImages = getProductImages(product);
                          const colorImage = colorImages.find(img => img.color === colorName);

                          return (
                            <button
                              key={colorName}
                              onClick={() => setSelectedColor(colorName)}
                              className={`group relative rounded-xl border-3 transition-all overflow-hidden ${
                                isSelected
                                  ? 'border-[#173a6a] ring-4 ring-[#173a6a] ring-opacity-30 shadow-xl scale-105'
                                  : 'border-gray-200 hover:border-gray-400 hover:shadow-lg'
                              }`}
                            >
                              {/* Product Image */}
                              <div className="aspect-square bg-gray-100 overflow-hidden">
                                {colorImage && (
                                  <Image
                                    src={colorImage.src}
                                    alt={`${colorName} option`}
                                    width={150}
                                    height={150}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                  />
                                )}
                              </div>
                              
                              {/* Color Info */}
                              <div className="p-3 bg-white">
                                <p className="font-bold text-gray-900 text-center">{colorName}</p>
                                <p className="text-sm text-green-600 text-center mt-1">✓ In Stock</p>
                              </div>
                              
                              {/* Selected Indicator */}
                              {isSelected && (
                                <div className="absolute top-2 right-2 bg-[#173a6a] text-white rounded-full p-1.5">
                                  <Check className="h-5 w-5" />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  {/* Size Selection - Dynamic from product data */}
                  {(!isUsingStaticData && Array.isArray(product.variations) && product.variations.length > 0) ? (() => {
                    // Get unique sizes from variations
                    const sizeVariations = product.variations.filter((v: any) => 
                      v.variation_type === 'size'
                    );
                    
                    // Remove duplicates
                    const uniqueSizes = sizeVariations.filter((v: any, index: number, self: any[]) => 
                      self.findIndex(t => t.variation_value === v.variation_value) === index
                    );

                    if (uniqueSizes.length === 0) return null;

                    return (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-gray-900">Size Selection</h3>
                          {(product as any).size_chart_image && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSizeChartOpen(true)}
                              className="text-[#173a6a] hover:bg-blue-50"
                            >
                              <Ruler className="h-4 w-4 mr-2" />
                              Size Chart
                            </Button>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {uniqueSizes.map((sizeVariation: any) => {
                            const sizeName = sizeVariation.variation_value;
                            const isSelected = selectedSize === sizeName;
                            const inStock = sizeVariation.stock_quantity > 0;
                            const priceModifier = sizeVariation.price_modifier || 0;

                            return (
                              <button
                                key={sizeVariation.id}
                                onClick={() => setSelectedSize(sizeName)}
                                disabled={!inStock}
                                className={`py-3 px-4 rounded-md border-2 font-medium transition-all min-w-[60px] ${
                                  isSelected
                                    ? 'border-blue-600 bg-blue-600 text-white'
                                    : 'border-gray-200 hover:border-gray-300'
                                } ${!inStock ? 'opacity-50 cursor-not-allowed line-through' : ''}`}
                              >
                                <div>{sizeName}</div>
                                {priceModifier > 0 && (
                                  <div className="text-xs mt-1">+${priceModifier.toFixed(2)}</div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })() : (isUsingStaticData && (product as Product).sizeOptions) ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">Size Selection</h3>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSizeChartOpen(true)}
                          className="text-[#173a6a] hover:bg-blue-50"
                        >
                          <Ruler className="h-4 w-4 mr-2" />
                          Size Chart
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(product as Product).sizeOptions.split(',').map((size: string) => {
                          const sizeName = size.trim();
                          const isSelected = selectedSize === sizeName;

                          return (
                            <button
                              key={sizeName}
                              onClick={() => setSelectedSize(sizeName)}
                              className={`py-3 px-4 rounded-md border-2 font-medium transition-all min-w-[60px] ${
                                isSelected
                                  ? 'border-blue-600 bg-blue-600 text-white'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <div>{sizeName}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  {/* Selection Summary */}
                  {(selectedColor || selectedSize) && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-800">
                        ✓ {selectedColor && `Color: ${selectedColor}`} {selectedColor && selectedSize && ' • '} {selectedSize && `Size: ${selectedSize}`}
                      </p>
                    </div>
                  )}
                </div>
              </ProductErrorBoundary>

              {/* Description */}
              {product.description && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-700 leading-relaxed">{product.description}</p>
                </div>
              )}

              {/* Quantity Selector */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Quantity (Min: {(product as any).min_order_quantity || 1})
                </label>
                <div className="flex items-center gap-4">
                  <div className="flex items-center border border-gray-300 rounded-md">
                    <button
                      type="button"
                      onClick={() => {
                        if (quantity > 1) {
                          setQuantity(quantity - 1);
                        }
                      }}
                      className="px-4 py-3 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={quantity <= 1}
                    >
                      -
                    </button>
                    <span className="px-6 py-3 font-medium min-w-[4rem] text-center border-x">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setQuantity(quantity + 1);
                      }}
                      className="px-4 py-3 hover:bg-gray-100 transition-colors"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-sm text-gray-600">
                    Max: {(!isUsingStaticData && availability)
                      ? availability.maxOrderQuantity
                      : (isUsingStaticData ? '100' : (product as any).stock_quantity || '100')
                    } available
                  </span>
                </div>
              </div>

              {/* Multi-Variant Selector */}
              {!isUsingStaticData && Array.isArray(product.variations) && product.variations.length > 0 && (() => {
                const colorVariations = product.variations.filter((v: any) => v.variation_type === 'color');
                const sizeVariations = product.variations.filter((v: any) => v.variation_type === 'size');
                
                const uniqueColors = colorVariations.filter((v: any, index: number, self: any[]) =>
                  self.findIndex(t => t.variation_value === v.variation_value) === index
                ).map((v: any) => ({
                  id: v.id,
                  name: v.variation_value,
                  inStock: v.stock_quantity > 0,
                  stockQuantity: v.stock_quantity
                }));

                const uniqueSizes = sizeVariations.filter((v: any, index: number, self: any[]) =>
                  self.findIndex(t => t.variation_value === v.variation_value) === index
                ).map((v: any) => ({
                  id: v.id,
                  name: v.variation_value,
                  inStock: v.stock_quantity > 0,
                  stockQuantity: v.stock_quantity,
                  priceModifier: v.price_modifier || 0
                }));

                if (uniqueColors.length > 0 && uniqueSizes.length > 0) {
                  return (
                    <div className="my-6">
                      <MultiVariantSelector
                        colors={uniqueColors}
                        sizes={uniqueSizes}
                        onAddToCart={(variants) => {
                          // Add each variant combination to cart
                          variants.forEach(variant => {
                            const variantProduct = {
                              ...product,
                              selectedColor: variant.color,
                              selectedSize: variant.size
                            };
                            // You can customize the addToCart logic here
                            console.log('Adding to cart:', variant);
                          });
                          setAddedToCart(true);
                          setTimeout(() => setAddedToCart(false), 3000);
                        }}
                        minOrderQuantity={(product as any).min_order_quantity || 1}
                      />
                    </div>
                  );
                }
                return null;
              })()}

              {/* Add to Cart Button */}
              <div className="space-y-3">
                {(() => {
                  console.log('📭 Button state:', { selectedColor, selectedSize, disabled: !selectedColor || !selectedSize });
                  return null;
                })()}
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={!selectedColor || !selectedSize}
                  className={`w-full py-4 px-6 rounded-md font-semibold text-lg flex items-center justify-center gap-3 transition-colors ${
                    !selectedColor || !selectedSize
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : addedToCart
                      ? 'bg-green-600 text-white'
                      : 'bg-[#173a6a] text-white hover:bg-[#1e4a7a]'
                  }`}
                >
                  {addedToCart ? (
                    <>
                      <Check className="h-6 w-6" />
                      Added to Cart!
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-6 w-6" />
                      Add to Cart {!selectedColor || !selectedSize ? '(Select Options)' : ''}
                    </>
                  )}
                </button>

                <Link href="/cart">
                  <button className="w-full py-4 px-6 border-2 border-[#173a6a] text-[#173a6a] rounded-md font-semibold text-lg hover:bg-[#173a6a] hover:text-white transition-colors">
                    View Cart
                  </button>
                </Link>
              </div>

              {/* Size Chart Image Display */}
              {(product as any).size_chart_image && (
                <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                      <Ruler className="h-4 w-4" />
                      Size Guide
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSizeChartOpen(true)}
                      className="text-xs text-[#173a6a] hover:bg-blue-50"
                    >
                      View Full Chart
                    </Button>
                  </div>
                  <div className="relative w-full bg-gray-50 rounded-md overflow-hidden">
                    <Image
                      src={(product as any).size_chart_image}
                      alt={`Size chart for ${product.name}`}
                      width={600}
                      height={400}
                      className="w-full h-auto"
                      style={{ objectFit: 'contain' }}
                    />
                  </div>
                </div>
              )}

              {/* Currency Converter */}
              <CurrencyConverter
                basePrice={(!isUsingStaticData && pricing) ? pricing.finalPrice : currentPrice}
                baseCurrency="USD"
                className="mb-6"
              />

              {/* Trust Signals */}
              <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <Truck className="h-5 w-5 text-[#173a6a] mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900">Free Shipping</h4>
                    <p className="text-sm text-gray-600">On orders over $50</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <RotateCcw className="h-5 w-5 text-[#173a6a] mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900">30-Day Returns</h4>
                    <p className="text-sm text-gray-600">Easy returns within 30 days</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-[#173a6a] mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900">Secure Checkout</h4>
                    <p className="text-sm text-gray-600">100% secure payment</p>
                  </div>
                </div>
              </div>

              {/* Product Meta */}
              <div className="border-t pt-6 space-y-2 text-sm">
                <div className="flex gap-2">
                  <span className="text-gray-600 font-medium">SKU:</span>
                  <span className="text-gray-900">
                    {isUsingStaticData ? 'BSS577' : (product as any).$id?.substring(0, 12) || 'BSS577'}
                  </span>
                </div>
                {category && (
                  <div className="flex gap-2">
                    <span className="text-gray-600 font-medium">Category:</span>
                    <Link href={`/catalog?category=${category.$id}`} className="text-[#173a6a] hover:underline">
                      {category.name}
                    </Link>
                  </div>
                )}
                {brand && (
                  <div className="flex gap-2">
                    <span className="text-gray-600 font-medium">Brand:</span>
                    <Link href={`/catalog?brand=${brand.$id}`} className="text-[#173a6a] hover:underline">
                      {brand.name}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Size Chart Modal */}
          <SizeChartModal
            open={sizeChartOpen}
            onOpenChange={setSizeChartOpen}
            sizeChartImage={(product as any).size_chart_image}
            productName={product.name}
          />

          {/* Related Products Section */}
          <div className="mt-16">
            <RelatedProducts
              currentProductId={(product as any).$id || (product as any).id || 'unknown'}
              categoryId={category?.$id}
              limit={4}
              className="w-full"
            />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
