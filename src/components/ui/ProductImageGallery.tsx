'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import Image from 'next/image';
import LazyImage from './LazyImage';
import { ImageSkeleton } from './LoadingStates';
import { Button } from './button';

interface ProductImage {
  src: string;
  alt: string;
  color?: string;
  isMain?: boolean;
  imageType?: 'main' | 'back' | 'variation' | 'gallery';
}

interface EnhancedProductImage {
  id: string;
  url: string;
  alt_text: string;
  image_type: 'main' | 'variation' | 'gallery' | 'back';
  variation_value?: string;
  variation_id?: string;
  sort_order: number;
}

interface OrganizedImages {
  main: EnhancedProductImage[];
  back: EnhancedProductImage[];
  gallery: EnhancedProductImage[];
  variations: Record<string, EnhancedProductImage[]>;
}

interface ProductImageGalleryProps {
  // Legacy support
  images?: ProductImage[];
  selectedColor?: string;
  onColorChange?: (color: string) => void;

  // Enhanced support
  organizedImages?: OrganizedImages;
  selectedVariations?: Record<string, string>;
  onVariationChange?: (type: string, value: string) => void;

  className?: string;
  priority?: boolean;
  showThumbnails?: boolean;
  maxThumbnails?: number;
  enableZoom?: boolean;
  enableFullscreen?: boolean;
}

interface ImageState {
  isLoading: boolean;
  hasError: boolean;
  currentIndex: number;
}

export const ProductImageGallery: React.FC<ProductImageGalleryProps> = ({
  images,
  selectedColor,
  onColorChange,
  organizedImages,
  selectedVariations,
  onVariationChange,
  className = '',
  priority = false,
  showThumbnails = true,
  maxThumbnails = 4,
  enableZoom = false,
  enableFullscreen = false
}) => {
  const [imageState, setImageState] = useState<ImageState>({
    isLoading: true,
    hasError: false,
    currentIndex: 0
  });

  // Organize images by color with main and back views
  const { displayImages, thumbnails, colorVariations } = useMemo(() => {
    const colorMap: Record<string, { main: ProductImage | null; back: ProductImage | null }> = {};
    const allThumbs: ProductImage[] = [];
    const colors: string[] = [];

    if (images) {
      // Process images to separate by color and type
      images.forEach(img => {
        const color = img.color || 'default';
        if (!colorMap[color]) {
          colorMap[color] = { main: null, back: null };
          colors.push(color);
        }

        // Determine if this is a main or back view based on image type or position
        if (img.isMain || img.imageType === 'main' || img.alt?.includes('main')) {
          colorMap[color].main = img;
        } else if (img.imageType === 'back' || img.alt?.includes('back')) {
          colorMap[color].back = img;
        } else {
          // If not explicitly marked, treat first as main, second as back
          if (!colorMap[color].main) {
            colorMap[color].main = img;
          } else if (!colorMap[color].back) {
            colorMap[color].back = img;
          }
        }
      });

      // Build thumbnails array for the selected color
      const currentColor = selectedColor || colors[0];
      const currentColorImages = colorMap[currentColor];

      if (currentColorImages?.main) allThumbs.push(currentColorImages.main);
      if (currentColorImages?.back) allThumbs.push(currentColorImages.back);

      // Add thumbnails from other colors
      colors.forEach(color => {
        if (color !== currentColor && colorMap[color]?.main) {
          allThumbs.push(colorMap[color].main!);
        }
      });
    }

    return {
      displayImages: images || [],
      thumbnails: allThumbs,
      colorVariations: colorMap
    };
  }, [images, selectedColor]);

  // Get current color's images
  const currentColorImages = useMemo(() => {
    const currentColor = selectedColor || Object.keys(colorVariations)[0];
    return colorVariations[currentColor] || { main: null, back: null };
  }, [selectedColor, colorVariations]);

  // Determine which image to show based on current index
  const currentImage = useMemo(() => {
    console.log('🖼️ Gallery state:', { 
      currentIndex: imageState.currentIndex, 
      displayImagesCount: displayImages.length,
      thumbnailsCount: thumbnails.length,
      hasDisplayImages: displayImages && displayImages.length > 0
    });
    
    // If we have displayImages, use them directly (simple mode)
    if (displayImages && displayImages.length > 0) {
      const img = displayImages[imageState.currentIndex] || displayImages[0];
      console.log('✅ Using displayImage at index', imageState.currentIndex, ':', img?.src?.substring(img.src.lastIndexOf('/') - 30));
      return img;
    }
    // Otherwise use color-based logic (legacy mode)
    console.log('⚠️ Falling back to legacy mode');
    if (imageState.currentIndex === 0 && currentColorImages.main) {
      return currentColorImages.main;
    } else if (imageState.currentIndex === 1 && currentColorImages.back) {
      return currentColorImages.back;
    }
    return thumbnails[imageState.currentIndex] || currentColorImages.main;
  }, [imageState.currentIndex, displayImages, currentColorImages, thumbnails]);

  // Helper function to get image properties
  const getImageProps = (image: ProductImage | null) => {
    if (!image) return { src: '', alt: '', color: '' };
    return {
      src: image.src,
      alt: image.alt,
      color: image.color
    };
  };

  // Preload next/previous images for smooth transitions
  useEffect(() => {
    if (thumbnails.length > 1) {
      const preloadImages = [
        thumbnails[imageState.currentIndex + 1],
        thumbnails[imageState.currentIndex - 1]
      ].filter(Boolean);

      preloadImages.forEach(image => {
        if (image) {
          const img = new window.Image();
          img.src = image.src;
        }
      });
    }
  }, [imageState.currentIndex, thumbnails]);

  // Reset to main image when color changes
  useEffect(() => {
    setImageState(prev => ({ ...prev, currentIndex: 0, isLoading: true }));
  }, [selectedColor]);

  const handleImageLoad = useCallback(() => {
    setImageState(prev => ({ ...prev, isLoading: false }));
  }, []);

  const handleImageError = useCallback(() => {
    setImageState(prev => ({ ...prev, hasError: true, isLoading: false }));
  }, []);

  const handleThumbnailClick = useCallback((index: number) => {
    setImageState(prev => ({
      ...prev,
      currentIndex: index,
      isLoading: true,
      hasError: false
    }));
  }, []);

  const handlePrevious = useCallback(() => {
    const totalImages = displayImages.length || thumbnails.length;
    console.log('⬅️ Previous clicked:', { currentIndex: imageState.currentIndex, totalImages, newIndex: imageState.currentIndex > 0 ? imageState.currentIndex - 1 : totalImages - 1 });
    setImageState(prev => ({
      ...prev,
      currentIndex: prev.currentIndex > 0 ? prev.currentIndex - 1 : totalImages - 1,
      isLoading: true
    }));
  }, [displayImages.length, thumbnails.length, imageState.currentIndex]);

  const handleNext = useCallback(() => {
    const totalImages = displayImages.length || thumbnails.length;
    console.log('➡️ Next clicked:', { currentIndex: imageState.currentIndex, totalImages, newIndex: imageState.currentIndex < totalImages - 1 ? imageState.currentIndex + 1 : 0 });
    setImageState(prev => ({
      ...prev,
      currentIndex: prev.currentIndex < totalImages - 1 ? prev.currentIndex + 1 : 0,
      isLoading: true
    }));
  }, [displayImages.length, thumbnails.length, imageState.currentIndex]);

  // Get unique colors for color selector
  const uniqueColors = useMemo(() => {
    return Object.keys(colorVariations).filter(color => colorVariations[color].main);
  }, [colorVariations]);

  if (!currentImage) {
    return (
      <div className={`bg-neutral-light rounded-lg overflow-hidden ${className}`}>
        <ImageSkeleton className="w-full aspect-[3/4]" />
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* Main Image Display - Full Width */}
      <div className="w-full space-y-4">
        <div className="relative bg-neutral-light rounded-lg overflow-hidden group">
          <div className="aspect-[3/4] relative">
            {imageState.isLoading && (
              <ImageSkeleton className="absolute inset-0 w-full h-full" />
            )}

            {imageState.hasError ? (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <div className="text-center">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm text-gray-500">Image not available</p>
                </div>
              </div>
            ) : currentImage ? (
              <LazyImage
                key={`main-image-${imageState.currentIndex}-${getImageProps(currentImage).src}`}
                src={getImageProps(currentImage).src}
                alt={getImageProps(currentImage).alt}
                width={600}
                height={800}
                priority={priority}
                className="w-full h-full object-contain"
                onLoad={handleImageLoad}
                onError={handleImageError}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
              />
            ) : null}

            {/* Navigation Arrows */}
            {displayImages.length > 1 && !imageState.hasError && (
              <>
                <button
                  onClick={handlePrevious}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Previous image"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={handleNext}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Next image"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}

            {/* Image Counter & Type Badge */}
            <div className="absolute top-2 right-2 flex gap-2">
              {displayImages.length > 1 && (
                <div className="bg-black/50 text-white text-xs px-2 py-1 rounded">
                  {imageState.currentIndex + 1} / {displayImages.length}
                </div>
              )}
              {imageState.currentIndex === 0 && (
                <div className="bg-primary/80 text-white text-xs px-2 py-1 rounded font-medium">
                  Main View
                </div>
              )}
              {imageState.currentIndex === 1 && currentColorImages.back && (
                <div className="bg-primary/80 text-white text-xs px-2 py-1 rounded font-medium">
                  Back View
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Dots - Below Image */}
        {displayImages.length > 1 && !imageState.hasError && (
          <div className="flex justify-center items-center gap-2 py-4">
            {displayImages.map((_, index) => (
              <button
                key={`dot-${index}`}
                onClick={() => handleThumbnailClick(index)}
                className={`transition-all rounded-full ${
                  index === imageState.currentIndex
                    ? 'w-3 h-3 bg-[#173a6a]'
                    : 'w-2 h-2 bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`View image ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductImageGallery;