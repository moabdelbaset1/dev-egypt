'use client'

export interface ImageFormat {
  format: 'webp' | 'avif' | 'jpg' | 'png'
  quality: number
  priority: number
}

export interface OptimizedImageSrc {
  src: string
  format: string
  width: number
  height: number
  quality: number
}

export interface ImageOptimizationOptions {
  formats?: ImageFormat[]
  sizes?: number[]
  quality?: number
  enableWebP?: boolean
  enableAVIF?: boolean
  fallbackFormat?: 'jpg' | 'png'
}

export class ImageOptimizationService {
  private static instance: ImageOptimizationService
  private supportedFormats: Set<string> = new Set()
  private formatSupportChecked = false

  static getInstance(): ImageOptimizationService {
    if (!ImageOptimizationService.instance) {
      ImageOptimizationService.instance = new ImageOptimizationService()
    }
    return ImageOptimizationService.instance
  }

  private constructor() {
    this.detectFormatSupport()
  }

  private async detectFormatSupport() {
    if (this.formatSupportChecked) return

    try {
      // Check WebP support
      const webpSupported = await this.checkFormatSupport('webp')
      if (webpSupported) this.supportedFormats.add('webp')

      // Check AVIF support
      const avifSupported = await this.checkFormatSupport('avif')
      if (avifSupported) this.supportedFormats.add('avif')
    } catch (error) {
      console.warn('Error detecting format support:', error)
    } finally {
      this.formatSupportChecked = true
    }
  }

  private async checkFormatSupport(format: string): Promise<boolean> {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => resolve(true)
      img.onerror = () => resolve(false)
      img.src = `data:image/${format};base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`
    })
  }

  /**
   * Generate optimized image sources for different formats and sizes
   */
  generateOptimizedSources(
    baseSrc: string,
    options: ImageOptimizationOptions = {}
  ): OptimizedImageSrc[] {
    const {
      formats = [
        { format: 'webp', quality: 80, priority: 1 },
        { format: 'jpg', quality: 75, priority: 2 }
      ],
      sizes = [320, 640, 768, 1024, 1280, 1920],
      quality = 80,
      enableWebP = this.supportedFormats.has('webp'),
      enableAVIF = this.supportedFormats.has('avif'),
      fallbackFormat = 'jpg'
    } = options

    const sources: OptimizedImageSrc[] = []
    const supportedFormats = formats
      .filter(format =>
        (format.format === 'webp' && enableWebP) ||
        (format.format === 'avif' && enableAVIF) ||
        (format.format !== 'webp' && format.format !== 'avif')
      )
      .sort((a, b) => a.priority - b.priority)

    // Generate sources for each format and size combination
    supportedFormats.forEach(format => {
      sizes.forEach(size => {
        const optimizedSrc = this.generateOptimizedUrl(baseSrc, {
          width: size,
          format: format.format,
          quality: format.quality || quality
        })

        if (optimizedSrc) {
          sources.push({
            src: optimizedSrc,
            format: format.format,
            width: size,
            height: Math.round(size * 0.75), // Assume 4:3 aspect ratio
            quality: format.quality || quality
          })
        }
      })
    })

    return sources
  }

  /**
   * Generate optimized URL for specific dimensions and format
   */
  private generateOptimizedUrl(
    baseSrc: string,
    options: { width: number; format: string; quality: number }
  ): string | null {
    try {
      const { width, format, quality } = options

      // For Appwrite storage URLs, modify the parameters
      if (baseSrc.includes('/api/storage/files/')) {
        const url = new URL(baseSrc)
        url.searchParams.set('width', width.toString())
        url.searchParams.set('format', format)
        url.searchParams.set('quality', quality.toString())
        return url.toString()
      }

      // For regular image URLs, use Next.js image optimization
      if (baseSrc.startsWith('http') || baseSrc.startsWith('/')) {
        // Next.js will handle the optimization automatically
        return baseSrc
      }

      return null
    } catch (error) {
      console.warn('Error generating optimized URL:', error)
      return baseSrc
    }
  }

  /**
   * Get the best supported image format for the current browser
   */
  getBestSupportedFormat(): string {
    if (this.supportedFormats.has('avif')) return 'avif'
    if (this.supportedFormats.has('webp')) return 'webp'
    return 'jpg'
  }

  /**
   * Generate responsive image attributes for HTML img tag
   */
  generateResponsiveAttributes(
    baseSrc: string,
    options: ImageOptimizationOptions = {}
  ): {
    src: string
    srcSet: string
    sizes: string
  } {
    const sources = this.generateOptimizedSources(baseSrc, options)
    const bestFormat = this.getBestSupportedFormat()

    // Filter sources for the best format
    const bestFormatSources = sources.filter(src => src.format === bestFormat)

    // Generate srcSet
    const srcSet = bestFormatSources
      .map(src => `${src.src} ${src.width}w`)
      .join(', ')

    // Get the smallest size as the default src
    const defaultSrc = bestFormatSources[0]?.src || baseSrc

    // Generate sizes attribute for responsive loading
    const defaultSizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'
    const sizes = typeof options.sizes === 'string' ? options.sizes : defaultSizes

    return {
      src: defaultSrc,
      srcSet,
      sizes
    }
  }

  /**
   * Preload critical images for better performance
   */
  preloadCriticalImages(imageSrcs: string[]): void {
    if (typeof window === 'undefined') return

    imageSrcs.forEach(src => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'image'
      link.href = src
      document.head.appendChild(link)
    })
  }

  /**
   * Generate blur placeholder for images
   */
  async generateBlurPlaceholder(src: string): Promise<string> {
    // Use local placeholder service instead of external images
    const { placeholderService } = await import('./placeholder-service')
    return placeholderService.getLoadingPlaceholder()
  }
}

// Export singleton instance
export const imageOptimizationService = ImageOptimizationService.getInstance()

// React hook for using image optimization
export function useImageOptimization() {
  return {
    generateOptimizedSources: (src: string, options?: ImageOptimizationOptions) =>
      imageOptimizationService.generateOptimizedSources(src, options),

    generateResponsiveAttributes: (src: string, options?: ImageOptimizationOptions) =>
      imageOptimizationService.generateResponsiveAttributes(src, options),

    getBestSupportedFormat: () => imageOptimizationService.getBestSupportedFormat(),

    preloadCriticalImages: (srcs: string[]) =>
      imageOptimizationService.preloadCriticalImages(srcs),

    generateBlurPlaceholder: (src: string) =>
      imageOptimizationService.generateBlurPlaceholder(src)
  }
}