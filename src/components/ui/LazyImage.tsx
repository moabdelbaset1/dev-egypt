'use client';

// Lazy Image Component
// Provides optimized image loading with intersection observer and fallback

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
// import { useImageOptimization } from '../../lib/image-optimization-service';

export interface LazyImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  quality?: number;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  onLoad?: () => void;
  onError?: () => void;
  fallbackSrc?: string;
  rootMargin?: string;
  threshold?: number;
  sizes?: string;
}

interface LazyImageState {
  isLoaded: boolean;
  isInView: boolean;
  hasError: boolean;
  imageSrc: string;
}

const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  quality = 75,
  placeholder = 'empty',
  blurDataURL,
  onLoad,
  onError,
  fallbackSrc = '/images/placeholder.svg',
  rootMargin = '50px',
  threshold = 0.1,
  sizes
}) => {
  const [state, setState] = useState<LazyImageState>({
    isLoaded: false,
    isInView: false,
    hasError: false,
    imageSrc: src
  });

  // const { generateResponsiveAttributes, getBestSupportedFormat } = useImageOptimization();
  const getBestSupportedFormat = () => 'jpg';

  const imgRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority) {
      // If priority is true, load immediately
      setState(prev => ({ ...prev, isInView: true }));
      return;
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setState(prev => ({ ...prev, isInView: true }));
            if (observerRef.current) {
              observerRef.current.disconnect();
            }
          }
        });
      },
      {
        rootMargin,
        threshold
      }
    );

    if (imgRef.current) {
      observerRef.current.observe(imgRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [priority, rootMargin, threshold]);

  // Handle image load
  const handleImageLoad = () => {
    setState(prev => ({ ...prev, isLoaded: true }));
    onLoad?.();
  };

  // Handle image error
  const handleImageError = () => {
    setState(prev => ({
      ...prev,
      hasError: true,
      imageSrc: fallbackSrc
    }));
    onError?.();
  };

  // Generate blur placeholder if needed
  const getBlurDataURL = () => {
    if (blurDataURL) return blurDataURL;

    // Generate a simple SVG blur placeholder
    const svg = `
      <svg width="${width || 400}" height="${height || 300}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f3f4f6"/>
        <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="14" fill="#9ca3af" text-anchor="middle" dy=".3em">
          Loading...
        </text>
      </svg>
    `;

    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  };

  return (
    <div ref={imgRef} className={`relative overflow-hidden ${className}`}>
      {/* Loading placeholder */}
      {!state.isLoaded && !state.hasError && (
        <div
          className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center"
          style={{
            width: width || '100%',
            height: height || 'auto',
            aspectRatio: width && height ? `${width}/${height}` : undefined
          }}
        >
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
        </div>
      )}

      {/* Error fallback */}
      {state.hasError && (
        <div
          className="absolute inset-0 bg-gray-100 flex items-center justify-center"
          style={{
            width: width || '100%',
            height: height || 'auto',
            aspectRatio: width && height ? `${width}/${height}` : undefined
          }}
        >
          <div className="text-center">
            <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-xs text-gray-500">Failed to load</p>
          </div>
        </div>
      )}

      {/* Actual image */}
      {state.isInView && (
        <Image
          src={state.imageSrc}
          alt={alt}
          width={width}
          height={height}
          quality={quality}
          priority={priority}
          placeholder={placeholder}
          blurDataURL={placeholder === 'blur' ? getBlurDataURL() : undefined}
          onLoad={handleImageLoad}
          onError={handleImageError}
          sizes={sizes}
          className={`transition-opacity duration-300 ${
            state.isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            width: width || '100%',
            height: height || 'auto',
            aspectRatio: width && height ? `${width}/${height}` : undefined
          }}
          // Use modern format if available
          {...(getBestSupportedFormat() !== 'jpg' && {
            src: state.imageSrc.replace(/\.(jpg|jpeg|png)$/i, `.${getBestSupportedFormat()}`)
          })}
        />
      )}
    </div>
  );
};

// Lazy Image with automatic dimensions detection
export interface AutoLazyImageProps extends Omit<LazyImageProps, 'width' | 'height'> {
  aspectRatio?: number;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
}

export const AutoLazyImage: React.FC<AutoLazyImageProps> = ({
  aspectRatio = 1,
  objectFit = 'cover',
  className = '',
  ...props
}) => {
  return (
    <div
      className={`relative ${className}`}
      style={{ aspectRatio: aspectRatio.toString() }}
    >
      <LazyImage
        {...props}
        className={`absolute inset-0 w-full h-full`}
      />
    </div>
  );
};

// Image Gallery with Lazy Loading
export interface LazyImageGalleryProps {
  images: Array<{
    src: string;
    alt: string;
    caption?: string;
  }>;
  columns?: 2 | 3 | 4 | 5;
  gap?: 'sm' | 'md' | 'lg';
  aspectRatio?: number;
  priority?: boolean;
  className?: string;
}

export const LazyImageGallery: React.FC<LazyImageGalleryProps> = ({
  images,
  columns = 3,
  gap = 'md',
  aspectRatio = 1,
  priority = false,
  className = ''
}) => {
  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6'
  };

  const columnClasses = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5'
  };

  return (
    <div className={`grid ${columnClasses[columns]} ${gapClasses[gap]} ${className}`}>
      {images.map((image, index) => (
        <div key={index} className="relative group">
          <AutoLazyImage
            src={image.src}
            alt={image.alt}
            aspectRatio={aspectRatio}
            priority={priority && index < columns} // Prioritize first row
            className="w-full h-full object-cover rounded-lg"
          />

          {/* Caption overlay */}
          {image.caption && (
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-end">
              <div className="p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <p className="text-white text-sm">{image.caption}</p>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default LazyImage;