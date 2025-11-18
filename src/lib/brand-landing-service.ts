// Brand Landing Page Generator Service
// This service handles the creation and management of brand landing pages

import { Databases } from 'node-appwrite';
import { ID } from 'appwrite';

// Types for brand landing pages
export interface LandingPageSection {
  id: string;
  type: 'carousel' | 'category-grid' | 'testimonial' | 'features' | 'cta' | 'hero' | 'products';
  title: string;
  content: any; // Section-specific content
  images: string[];
  isActive: boolean;
  order: number;
  settings?: Record<string, any>;
}

export interface HeroSection {
  title: string;
  subtitle?: string;
  ctaText?: string;
  ctaUrl?: string;
  backgroundImage?: string;
  textColor?: string;
  overlayOpacity?: number;
}

export interface BrandLandingPage {
  brandId: string;
  sections: LandingPageSection[];
  hero: HeroSection;
  metadata: PageMetadata;
  isActive: boolean;
  templateVersion: string;
  customCss?: string;
}

export interface PageMetadata {
  title?: string;
  description?: string;
  keywords?: string[];
  lastModified?: string;
  viewCount?: number;
}

export interface BrandLandingService {
  // Page generation
  generateLandingPage(brandId: string): Promise<BrandLandingPage>;
  cloneHomePageStructure(brandId: string): Promise<BrandLandingPage>;
  createFromTemplate(brandId: string, templateId: string): Promise<BrandLandingPage>;

  // Section management
  addSection(pageId: string, section: Omit<LandingPageSection, 'id'>): Promise<LandingPageSection>;
  updateSection(pageId: string, sectionId: string, updates: Partial<LandingPageSection>): Promise<LandingPageSection>;
  deleteSection(pageId: string, sectionId: string): Promise<void>;
  reorderSections(pageId: string, sectionIds: string[]): Promise<void>;

  // Page management
  getLandingPage(brandId: string): Promise<BrandLandingPage | null>;
  updateLandingPage(pageId: string, updates: Partial<BrandLandingPage>): Promise<BrandLandingPage>;
  deleteLandingPage(pageId: string): Promise<void>;

  // Image management
  generateImagePlaceholders(sections: LandingPageSection[]): PlaceholderImage[];
  assignImagesToSections(pageId: string, sectionId: string, imageIds: string[]): Promise<void>;

  // Auto-routing
  generateBrandRoutes(): Promise<RouteDefinition[]>;
  updateNavigationMenu(): Promise<void>;
}

export interface PlaceholderImage {
  sectionId: string;
  sectionType: string;
  placeholderUrl: string;
  recommendedSize: { width: number; height: number };
  altText: string;
}

export interface RouteDefinition {
  path: string;
  component: string;
  brandId: string;
  title: string;
}

class BrandLandingPageService implements BrandLandingService {
  private databases: Databases;
  private readonly DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || '';
  private readonly BRAND_LANDING_PAGES_COLLECTION_ID = 'brand_landing_pages';

  // Predefined templates
  private readonly templates = {
    default: {
      hero: {
        title: 'Welcome to {BRAND_NAME}',
        subtitle: 'Discover our premium collection',
        ctaText: 'Shop Now',
        ctaUrl: '/catalog?brand={BRAND_SLUG}'
      },
      sections: [
        {
          type: 'hero' as const,
          title: 'Featured Products',
          order: 1,
          isActive: true
        },
        {
          type: 'products' as const,
          title: 'Popular Items',
          order: 2,
          isActive: true
        },
        {
          type: 'features' as const,
          title: 'Why Choose Us',
          order: 3,
          isActive: true
        }
      ]
    },
    minimal: {
      hero: {
        title: '{BRAND_NAME}',
        subtitle: 'Quality products for discerning customers'
      },
      sections: [
        {
          type: 'hero' as const,
          title: 'Our Collection',
          order: 1,
          isActive: true
        }
      ]
    }
  };

  constructor(databases: Databases) {
    this.databases = databases;
  }

  async generateLandingPage(brandId: string): Promise<BrandLandingPage> {
    try {
      // Check if landing page already exists
      const existingPage = await this.getLandingPage(brandId);
      if (existingPage) {
        return existingPage;
      }

      // Generate new landing page from default template
      return this.createFromTemplate(brandId, 'default');
    } catch (error) {
      console.error('Error generating landing page:', error);
      throw new Error(`Failed to generate landing page: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async cloneHomePageStructure(brandId: string): Promise<BrandLandingPage> {
    try {
      // In a real implementation, this would clone the home page structure
      // For now, we'll use the default template
      return this.createFromTemplate(brandId, 'default');
    } catch (error) {
      console.error('Error cloning home page structure:', error);
      throw error;
    }
  }

  async createFromTemplate(brandId: string, templateId: string): Promise<BrandLandingPage> {
    try {
      // Get brand information
      const brand = await this.getBrandInfo(brandId);
      if (!brand) {
        throw new Error(`Brand not found: ${brandId}`);
      }

      // Get template
      const template = this.templates[templateId as keyof typeof this.templates];
      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }

      // Create hero section
      const hero: HeroSection = {
        title: template.hero.title.replace('{BRAND_NAME}', brand.name),
        subtitle: template.hero.subtitle?.replace('{BRAND_NAME}', brand.name),
        ctaText: 'ctaText' in template.hero ? template.hero.ctaText : undefined,
        ctaUrl: 'ctaUrl' in template.hero ? template.hero.ctaUrl?.replace('{BRAND_SLUG}', brand.slug) : undefined
      };

      // Create sections
      const sections: LandingPageSection[] = template.sections.map((sectionTemplate, index) => ({
        id: ID.unique(),
        type: sectionTemplate.type,
        title: sectionTemplate.title,
        content: this.getDefaultContentForSection(sectionTemplate.type),
        images: [],
        isActive: sectionTemplate.isActive,
        order: sectionTemplate.order || index + 1
      }));

      // Create landing page
      const landingPage: BrandLandingPage = {
        brandId,
        sections,
        hero,
        metadata: {
          title: `${brand.name} - Premium Collection`,
          description: `Discover ${brand.name}'s premium collection of quality products`,
          viewCount: 0
        },
        isActive: true,
        templateVersion: 'v1'
      };

      // Save to database
      const result = await this.databases.createDocument(
        this.DATABASE_ID,
        this.BRAND_LANDING_PAGES_COLLECTION_ID,
        ID.unique(),
        {
          brandId: landingPage.brandId,
          heroImageId: null,
          heroImageUrl: null,
          heroTitle: landingPage.hero.title,
          heroSubtitle: landingPage.hero.subtitle,
          heroCtaText: landingPage.hero.ctaText,
          heroCtaUrl: landingPage.hero.ctaUrl,
          sections: landingPage.sections,
          isActive: landingPage.isActive,
          templateVersion: landingPage.templateVersion,
          customCss: landingPage.customCss,
          metaTitle: landingPage.metadata.title,
          metaDescription: landingPage.metadata.description,
          viewCount: 0
        }
      );

      return landingPage;
    } catch (error) {
      console.error('Error creating from template:', error);
      throw error;
    }
  }

  async addSection(pageId: string, section: Omit<LandingPageSection, 'id'>): Promise<LandingPageSection> {
    try {
      const newSection: LandingPageSection = {
        id: ID.unique(),
        ...section
      };

      // Get current page
      const page = await this.getLandingPageById(pageId);
      if (!page) {
        throw new Error(`Landing page not found: ${pageId}`);
      }

      // Add section
      page.sections.push(newSection);

      // Update page
      await this.databases.updateDocument(
        this.DATABASE_ID,
        this.BRAND_LANDING_PAGES_COLLECTION_ID,
        pageId,
        {
          sections: page.sections
        }
      );

      return newSection;
    } catch (error) {
      console.error('Error adding section:', error);
      throw error;
    }
  }

  async updateSection(pageId: string, sectionId: string, updates: Partial<LandingPageSection>): Promise<LandingPageSection> {
    try {
      const page = await this.getLandingPageById(pageId);
      if (!page) {
        throw new Error(`Landing page not found: ${pageId}`);
      }

      const sectionIndex = page.sections.findIndex(s => s.id === sectionId);
      if (sectionIndex === -1) {
        throw new Error(`Section not found: ${sectionId}`);
      }

      // Update section
      page.sections[sectionIndex] = { ...page.sections[sectionIndex], ...updates };

      // Save changes
      await this.databases.updateDocument(
        this.DATABASE_ID,
        this.BRAND_LANDING_PAGES_COLLECTION_ID,
        pageId,
        {
          sections: page.sections
        }
      );

      return page.sections[sectionIndex];
    } catch (error) {
      console.error('Error updating section:', error);
      throw error;
    }
  }

  async deleteSection(pageId: string, sectionId: string): Promise<void> {
    try {
      const page = await this.getLandingPageById(pageId);
      if (!page) {
        throw new Error(`Landing page not found: ${pageId}`);
      }

      page.sections = page.sections.filter(s => s.id !== sectionId);

      await this.databases.updateDocument(
        this.DATABASE_ID,
        this.BRAND_LANDING_PAGES_COLLECTION_ID,
        pageId,
        {
          sections: page.sections
        }
      );
    } catch (error) {
      console.error('Error deleting section:', error);
      throw error;
    }
  }

  async reorderSections(pageId: string, sectionIds: string[]): Promise<void> {
    try {
      const page = await this.getLandingPageById(pageId);
      if (!page) {
        throw new Error(`Landing page not found: ${pageId}`);
      }

      // Reorder sections based on provided IDs
      const reorderedSections = sectionIds.map((id, index) => {
        const section = page.sections.find(s => s.id === id);
        if (section) {
          return { ...section, order: index + 1 };
        }
        return null;
      }).filter(Boolean) as LandingPageSection[];

      await this.databases.updateDocument(
        this.DATABASE_ID,
        this.BRAND_LANDING_PAGES_COLLECTION_ID,
        pageId,
        {
          sections: reorderedSections
        }
      );
    } catch (error) {
      console.error('Error reordering sections:', error);
      throw error;
    }
  }

  async getLandingPage(brandId: string): Promise<BrandLandingPage | null> {
    try {
      const result = await this.databases.listDocuments(
        this.DATABASE_ID,
        this.BRAND_LANDING_PAGES_COLLECTION_ID,
        [
          `brandId=${brandId}`,
          'isActive=true'
        ]
      );

      if (result.documents.length === 0) {
        return null;
      }

      const doc = result.documents[0];
      return this.mapDocumentToLandingPage(doc);
    } catch (error) {
      console.error('Error getting landing page:', error);
      return null;
    }
  }

  async updateLandingPage(pageId: string, updates: Partial<BrandLandingPage>): Promise<BrandLandingPage> {
    try {
      const updateData: any = {};

      if (updates.hero) {
        updateData.heroTitle = updates.hero.title;
        updateData.heroSubtitle = updates.hero.subtitle;
        updateData.heroCtaText = updates.hero.ctaText;
        updateData.heroCtaUrl = updates.hero.ctaUrl;
      }

      if (updates.sections) {
        updateData.sections = updates.sections;
      }

      if (updates.metadata) {
        updateData.metaTitle = updates.metadata.title;
        updateData.metaDescription = updates.metadata.description;
      }

      if (updates.isActive !== undefined) {
        updateData.isActive = updates.isActive;
      }

      if (updates.customCss !== undefined) {
        updateData.customCss = updates.customCss;
      }

      const result = await this.databases.updateDocument(
        this.DATABASE_ID,
        this.BRAND_LANDING_PAGES_COLLECTION_ID,
        pageId,
        updateData
      );

      return this.mapDocumentToLandingPage(result);
    } catch (error) {
      console.error('Error updating landing page:', error);
      throw error;
    }
  }

  async deleteLandingPage(pageId: string): Promise<void> {
    try {
      await this.databases.deleteDocument(
        this.DATABASE_ID,
        this.BRAND_LANDING_PAGES_COLLECTION_ID,
        pageId
      );
    } catch (error) {
      console.error('Error deleting landing page:', error);
      throw error;
    }
  }

  generateImagePlaceholders(sections: LandingPageSection[]): PlaceholderImage[] {
    return sections.map(section => {
      const size = this.getRecommendedSizeForSection(section.type);
      return {
        sectionId: section.id,
        sectionType: section.type,
        placeholderUrl: `/placeholders/${section.type}-${section.id}.jpg`,
        recommendedSize: size,
        altText: `${section.title} placeholder`
      };
    });
  }

  async assignImagesToSections(pageId: string, sectionId: string, imageIds: string[]): Promise<void> {
    try {
      const page = await this.getLandingPageById(pageId);
      if (!page) {
        throw new Error(`Landing page not found: ${pageId}`);
      }

      const sectionIndex = page.sections.findIndex(s => s.id === sectionId);
      if (sectionIndex === -1) {
        throw new Error(`Section not found: ${sectionId}`);
      }

      page.sections[sectionIndex].images = imageIds;

      await this.databases.updateDocument(
        this.DATABASE_ID,
        this.BRAND_LANDING_PAGES_COLLECTION_ID,
        pageId,
        {
          sections: page.sections
        }
      );
    } catch (error) {
      console.error('Error assigning images to section:', error);
      throw error;
    }
  }

  async generateBrandRoutes(): Promise<RouteDefinition[]> {
    try {
      // Get all active brands with landing pages
      const result = await this.databases.listDocuments(
        this.DATABASE_ID,
        this.BRAND_LANDING_PAGES_COLLECTION_ID,
        ['isActive=true']
      );

      return result.documents.map(doc => ({
        path: `/brand/${doc.brandId}`,
        component: 'BrandLandingPage',
        brandId: doc.brandId,
        title: doc.heroTitle || 'Brand Page'
      }));
    } catch (error) {
      console.error('Error generating brand routes:', error);
      return [];
    }
  }

  async updateNavigationMenu(): Promise<void> {
    try {
      // In a real implementation, this would update the navigation menu
      // to include links to brand landing pages
      console.log('Updating navigation menu with brand routes');
    } catch (error) {
      console.error('Error updating navigation menu:', error);
      throw error;
    }
  }

  private async getLandingPageById(pageId: string): Promise<BrandLandingPage | null> {
    try {
      const result = await this.databases.getDocument(
        this.DATABASE_ID,
        this.BRAND_LANDING_PAGES_COLLECTION_ID,
        pageId
      );

      return this.mapDocumentToLandingPage(result);
    } catch (error) {
      console.error('Error getting landing page by ID:', error);
      return null;
    }
  }

  private async getBrandInfo(brandId: string): Promise<any> {
    try {
      // Import the admin client dynamically to avoid circular dependencies
      const { createAdminClient } = await import('@/lib/appwrite-admin');
      const { databases } = await createAdminClient();

      const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || '';
      const BRANDS_COLLECTION_ID = 'brands';

      const brand = await databases.getDocument(DATABASE_ID, BRANDS_COLLECTION_ID, brandId);

      return {
        name: brand.name,
        slug: brand.prefix.toLowerCase(),
        prefix: brand.prefix,
        logo_id: brand.logo_id
      };
    } catch (error) {
      console.error('Error fetching brand info:', error);
      // Return fallback data
      return {
        name: 'Unknown Brand',
        slug: 'unknown-brand',
        prefix: 'UNK'
      };
    }
  }

  private getDefaultContentForSection(type: LandingPageSection['type']): any {
    const defaults = {
      carousel: { slides: [], autoplay: true },
      'category-grid': { categories: [], columns: 3 },
      testimonial: { quotes: [] },
      features: { items: [] },
      cta: { text: 'Call to Action', buttonText: 'Learn More' },
      hero: { height: '60vh' },
      products: { productIds: [], layout: 'grid' }
    };

    return defaults[type] || {};
  }

  private getRecommendedSizeForSection(type: LandingPageSection['type']): { width: number; height: number } {
    const sizes = {
      carousel: { width: 1200, height: 600 },
      'category-grid': { width: 400, height: 400 },
      testimonial: { width: 200, height: 200 },
      features: { width: 600, height: 400 },
      cta: { width: 1200, height: 400 },
      hero: { width: 1920, height: 800 },
      products: { width: 400, height: 400 }
    };

    return sizes[type] || { width: 800, height: 600 };
  }

  private mapDocumentToLandingPage(doc: any): BrandLandingPage {
    return {
      brandId: doc.brandId,
      sections: doc.sections || [],
      hero: {
        title: doc.heroTitle,
        subtitle: doc.heroSubtitle,
        ctaText: doc.heroCtaText,
        ctaUrl: doc.heroCtaUrl
      },
      metadata: {
        title: doc.metaTitle,
        description: doc.metaDescription,
        viewCount: doc.viewCount
      },
      isActive: doc.isActive,
      templateVersion: doc.templateVersion,
      customCss: doc.customCss
    };
  }
}

// Factory function to create the service
export const createBrandLandingService = (databases: Databases): BrandLandingService => {
  return new BrandLandingPageService(databases);
};