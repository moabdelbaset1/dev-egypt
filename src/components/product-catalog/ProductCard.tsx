// Enhanced Product Card Component
// Features flip animations, color switching, and lazy loading

import React, { useState, useCallback, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ProductColor, ProductVariation } from '@/lib/product-variation-service';
import { UploadResult } from '@/lib/image-service';
import LazyImage from '@/components/ui/LazyImage';
import { useWishlist } from '@/hooks/useWishlist';
import { useCurrency } from '@/context/CurrencyContext';
import { Heart } from 'lucide-react';

export interface ProductCardProps {
  product: {
    $id: string;
    name: string;
    slug: string;
    price: number;
    compareAtPrice?: number;
    mainImageUrl?: string;
    backImageUrl?: string;
    galleryImages?: string[];
    colorOptions?: ProductColor[];
    variations?: ProductVariation[];
    isActive: boolean;
    isNew?: boolean;
    isFeatured?: boolean;
    stock?: number; // Add stock field for non-variation products
    units?: number; // Alternative stock field
  };
  onColorChange?: (colorId: string) => void;
  onAddToCart?: (productId: string, variationId?: string) => void;
  onWishlistToggle?: (productId: string) => void;
  className?: string;
  priority?: boolean;
  enableFlipAnimation?: boolean;
  enableColorSwitching?: boolean;
  enableLazyLoading?: boolean;
}

interface AnimationState {
  isFlipped: boolean;
  isHovered: boolean;
  currentColorId?: string;
  imageLoaded: boolean;
  backImageLoaded: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onColorChange,
  onAddToCart,
  onWishlistToggle,
  className = '',
  priority = false,
  enableFlipAnimation = true,
  enableColorSwitching = true,
  enableLazyLoading = true
}) => {
  const [animationState, setAnimationState] = useState<AnimationState>({
    isFlipped: false,
    isHovered: false,
    currentColorId: product.colorOptions?.[0]?.id,
    imageLoaded: false,
    backImageLoaded: false
  });

  const cardRef = useRef<HTMLDivElement>(null);
  const frontImageRef = useRef<HTMLImageElement>(null);
  const backImageRef = useRef<HTMLImageElement>(null);
  const router = useRouter();
  const { formatPrice } = useCurrency();

  // Use wishlist functionality
  const { isInWishlist, toggleWishlist, wishlist } = useWishlist(true);
  const isWishlisted = isInWishlist(product.$id);

  // Get current color data
  const currentColor = product.colorOptions?.find(c => c.id === animationState.currentColorId);
  const availableColors = product.colorOptions?.filter(c => c.isActive) || [];

  // Get current image based on selected color
  const getCurrentImage = useCallback(() => {
    if (currentColor?.images?.[0]) {
      return currentColor.images[0];
    }
    return product.mainImageUrl;
  }, [currentColor, product.mainImageUrl]);

  const getBackImage = useCallback(() => {
    if (currentColor?.images?.[1]) {
      return currentColor.images[1];
    }
    return product.backImageUrl || product.mainImageUrl;
  }, [currentColor, product.backImageUrl, product.mainImageUrl]);

  // Handle mouse events for flip animation
  const handleMouseEnter = useCallback(() => {
    if (enableFlipAnimation && product.backImageUrl) {
      setAnimationState(prev => ({ ...prev, isHovered: true }));
    }
  }, [enableFlipAnimation, product.backImageUrl]);

  const handleMouseLeave = useCallback(() => {
    if (enableFlipAnimation) {
      setAnimationState(prev => ({ ...prev, isHovered: false, isFlipped: false }));
    }
  }, [enableFlipAnimation]);

  // Handle touch events for mobile devices
  const handleTouchStart = useCallback(() => {
    if (enableFlipAnimation && product.backImageUrl) {
      setAnimationState(prev => ({ ...prev, isHovered: true }));
    }
  }, [enableFlipAnimation, product.backImageUrl]);

  const handleTouchEnd = useCallback(() => {
    if (enableFlipAnimation) {
      // Add a small delay before resetting to allow users to see the flip
      setTimeout(() => {
        setAnimationState(prev => ({ ...prev, isHovered: false, isFlipped: false }));
      }, 2000);
    }
  }, [enableFlipAnimation]);

  // Handle color change
  const handleColorChange = useCallback((colorId: string) => {
    setAnimationState(prev => ({ ...prev, currentColorId: colorId }));
    onColorChange?.(colorId);
  }, [onColorChange]);

  // Handle add to cart
  const handleAddToCart = useCallback(() => {
    const variationId = product.variations?.find(v =>
      v.colorId === animationState.currentColorId && v.isActive
    )?.id;

    onAddToCart?.(product.$id, variationId);
  }, [product, animationState.currentColorId, onAddToCart]);

  // Handle card click to navigate to product details
  const handleCardClick = useCallback((e: React.MouseEvent) => {
    // Don't navigate if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'BUTTON' ||
      target.closest('button') ||
      target.closest('.color-swatch') ||
      target.closest('.wishlist-button')
    ) {
      return;
    }

    // Debug logging
    console.log('ProductCard clicked:', {
      productId: product.$id,
      productSlug: product.slug,
      target: target.className,
      targetTag: target.tagName
    });

    // Navigate to product details page
    const targetSlug = product.slug || product.$id;
    console.log('Navigating to:', `/product/${targetSlug}`);
    router.push(`/product/${targetSlug}`);
  }, [product.slug, product.$id, router]);

  // Preload back image for smooth animation
  useEffect(() => {
    if (enableFlipAnimation && product.backImageUrl) {
      const backImg = new window.Image();
      backImg.onload = () => {
        setAnimationState(prev => ({ ...prev, backImageLoaded: true }));
      };
      backImg.src = product.backImageUrl;
    }
  }, [enableFlipAnimation, product.backImageUrl]);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!enableLazyLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setAnimationState(prev => ({ ...prev, imageLoaded: true }));
            observer.disconnect();
          }
        });
      },
      { threshold: 0.1 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, [enableLazyLoading]);

  return (
    <div className={`group relative ${className}`}>
      {/* New/Featured Badges */}
      <div className="absolute top-3 left-3 z-10 flex flex-col space-y-2">
        {product.isNew && (
          <span className="px-2 py-1 bg-green-500 text-white text-xs font-medium rounded-full shadow-sm">
            New
          </span>
        )}
        {product.isFeatured && (
          <span className="px-2 py-1 bg-purple-500 text-white text-xs font-medium rounded-full shadow-sm">
            Featured
          </span>
        )}
        {/* Stock Status Badge */}
        {(() => {
          const stock = currentColor?.stock || product.stock || product.units || 0;
          const hasStockInfo = currentColor || product.stock !== undefined || product.units !== undefined;

          if (hasStockInfo && stock <= 5 && stock > 0) {
            return (
              <span className="px-2 py-1 bg-yellow-500 text-white text-xs font-medium rounded-full shadow-sm">
                Low Stock
              </span>
            );
          } else if (hasStockInfo && stock === 0) {
            return (
              <span className="px-2 py-1 bg-red-500 text-white text-xs font-medium rounded-full shadow-sm">
                Out of Stock
              </span>
            );
          }
          return null;
        })()}
      </div>

      {/* Wishlist Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          toggleWishlist(product.$id);
        }}
        className={`absolute top-3 right-3 z-10 p-2 rounded-full transition-all wishlist-button ${
          isWishlisted
            ? 'bg-red-500 text-white shadow-lg'
            : 'bg-white bg-opacity-90 text-gray-600 hover:bg-opacity-100 hover:text-red-500 shadow-md'
        }`}
        aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
      >
        <Heart
          className={`w-5 h-5 transition-colors ${
            isWishlisted ? 'fill-current text-white' : ''
          }`}
        />
      </button>

      {/* Product Card */}
      <div
        ref={cardRef}
        className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flip-card-hover cursor-pointer"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={handleCardClick}
      >
        {/* Image Container */}
        <div className="relative aspect-square bg-gray-100 overflow-hidden flip-card-container">
          {/* Enhanced Flip Animation Container */}
          <div
            className={`flip-card-inner ${
              animationState.isHovered && enableFlipAnimation ? 'rotate-y-180' : ''
            }`}
          >
            {/* Front Image */}
            <div className="flip-card-front">
              <LazyImage
                src={getCurrentImage() || '/placeholder-product.jpg'}
                alt={product.name}
                width={400}
                height={400}
                className="w-full h-full object-cover"
                priority={priority}
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                rootMargin="100px"
                threshold={0.1}
              />
            </div>

            {/* Back Image */}
            {enableFlipAnimation && product.backImageUrl && (
              <div className="flip-card-back">
                <LazyImage
                  src={getBackImage() || '/placeholder-product.jpg'}
                  alt={`${product.name} - back view`}
                  width={400}
                  height={400}
                  className="w-full h-full object-cover"
                  priority={priority}
                  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                  rootMargin="100px"
                  threshold={0.1}
                />
              </div>
            )}
          </div>

          {/* Color Selection Overlay */}
          {enableColorSwitching && availableColors.length > 1 && (
            <div className="absolute bottom-3 left-3 right-3">
              <div className="flex flex-wrap gap-1 justify-center">
                {availableColors.slice(0, 5).map((color) => (
                  <button
                    key={color.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleColorChange(color.id);
                    }}
                    className={`w-6 h-6 rounded-full border-2 color-swatch ${
                      animationState.currentColorId === color.id
                        ? 'border-gray-800 selected'
                        : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color.hexCode }}
                    title={color.name}
                    aria-label={`Select ${color.name}`}
                  />
                ))}
                {availableColors.length > 5 && (
                  <span className="px-2 py-1 bg-black bg-opacity-50 text-white text-xs rounded">
                    +{availableColors.length - 5}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Price Overlay with Currency */}
          <div className="absolute top-3 left-3 bg-white bg-opacity-95 px-3 py-2 rounded-lg text-sm font-medium shadow-sm border border-gray-200">
            <span className="text-[#173a6a] font-semibold">{formatPrice(product.price)}</span>
            {product.compareAtPrice && (
              <span className="text-gray-500 line-through ml-2 text-xs">
                {formatPrice(product.compareAtPrice)}
              </span>
            )}
          </div>
        </div>

        {/* Product Info */}
        <div className="p-4">
          <h3 className="font-medium text-gray-900 mb-1 line-clamp-2">
            {product.name}
          </h3>

          {/* Selected Color Info */}
          {currentColor && (
            <p className="text-sm text-gray-600 mb-2">
              Color: {currentColor.name}
            </p>
          )}

          {/* Stock Status - Handle both variation and non-variation products */}
          {(() => {
            const stock = currentColor?.stock || product.stock || product.units || 0;
            const hasStockInfo = currentColor || product.stock !== undefined || product.units !== undefined;

            if (hasStockInfo) {
              return (
                <div className="mb-3">
                  <p className={`text-sm font-medium ${
                    stock > 5 ? 'text-green-600' :
                    stock > 0 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {stock > 0
                      ? `${stock} in stock`
                      : 'Out of stock'
                    }
                  </p>
                  {stock === 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      This item is currently unavailable
                    </p>
                  )}
                </div>
              );
            }
            return null;
          })()}

          {/* Add to Cart Button */}
          <button
            onClick={handleAddToCart}
            disabled={!product.isActive || ((currentColor?.stock || product.stock || product.units || 0) === 0)}
            className={`w-full py-3 px-4 text-sm font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:transform-none disabled:shadow-none ${
              !product.isActive || ((currentColor?.stock || product.stock || product.units || 0) === 0)
                ? 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-600 cursor-not-allowed'
                : 'bg-gradient-to-r from-[#173a6a] to-[#1e4a7a] text-white hover:from-[#1e4a7a] hover:to-[#244b8a]'
            }`}
          >
            {product.isActive
              ? (currentColor?.stock || product.stock || product.units || 0) > 0
                ? 'Add to Cart'
                : 'Out of Stock'
              : 'Unavailable'
            }
          </button>
        </div>
      </div>

      {/* All Colors Modal/Tooltip (for more than 5 colors) */}
      {enableColorSwitching && availableColors.length > 5 && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
          <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
            <p className="text-sm font-medium text-gray-900 mb-2">All Colors</p>
            <div className="grid grid-cols-5 gap-2">
              {availableColors.map((color) => (
                <button
                  key={color.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleColorChange(color.id);
                  }}
                  className={`w-8 h-8 rounded-full border-2 color-swatch ${
                    animationState.currentColorId === color.id
                      ? 'border-gray-800 selected'
                      : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: color.hexCode }}
                  title={color.name}
                  aria-label={`Select ${color.name}`}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Enhanced Product Card with Variation Support
export interface ProductCardWithVariationsProps extends Omit<ProductCardProps, 'product'> {
  product: ProductCardProps['product'] & {
    variations?: ProductVariation[];
    sizeOptions?: Array<{
      id: string;
      name: string;
      sku: string;
      stock: number;
      price?: number;
      isActive: boolean;
    }>;
  };
  selectedVariation?: ProductVariation;
  onVariationChange?: (variation: ProductVariation) => void;
}

export const ProductCardWithVariations: React.FC<ProductCardWithVariationsProps> = ({
  product,
  selectedVariation,
  onVariationChange,
  ...props
}) => {
  const [currentVariation, setCurrentVariation] = useState<ProductVariation | undefined>(selectedVariation);

  const handleVariationChange = useCallback((variation: ProductVariation) => {
    setCurrentVariation(variation);
    onVariationChange?.(variation);
  }, [onVariationChange]);

  // Enhanced product data with variation info
  const enhancedProduct = {
    ...product,
    price: currentVariation?.price || product.price,
    mainImageUrl: currentVariation ?
      product.colorOptions?.find(c => c.id === currentVariation.colorId)?.images?.[0] || product.mainImageUrl :
      product.mainImageUrl
  };

  return (
    <ProductCard
      {...props}
      product={enhancedProduct}
      onColorChange={(colorId) => {
        // Find a variation with the selected color
        const variation = product.variations?.find(v => v.colorId === colorId && v.isActive);
        if (variation) {
          handleVariationChange(variation);
        }
        props.onColorChange?.(colorId);
      }}
    />
  );
};

export default ProductCard;