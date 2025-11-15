import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/appwrite-admin"

// Get database ID from environment
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || ''
const PRODUCTS_COLLECTION_ID = 'products'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      )
    }

    // Create admin client
    const { databases } = await createAdminClient()

    // Fetch the product
    const product = await databases.getDocument(
      DATABASE_ID,
      PRODUCTS_COLLECTION_ID,
      id
    )

    return NextResponse.json({ product })

  } catch (error: any) {
    console.error("Error fetching product:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch product" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const updateData = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      )
    }

    // Create admin client
    const { databases } = await createAdminClient()

    // Filter allowed fields for product updates
    const allowedFields = [
      'name', 'slug', 'brand_id', 'category_id', 'units', 'price', 
      'discount_price', 'min_order_quantity', 'description', 'is_active', 
      'is_new', 'is_featured', 'hasVariations', 'variations', 'colorOptions', 
      'sizeOptions', 'backImageId', 'mainImageUrl', 'backImageUrl', 
      'galleryImages', 'imageVariations', 'mainImageId', 'media_id', 
      'meta_title', 'meta_description', 'meta_keywords', 'compareAtPrice', 
      'costPerItem', 'sku', 'stockQuantity', 'lowStockThreshold', 'tags', 
      'status', 'featuredImageId', 'viewCount', 'salesCount', 'lastViewedAt',
      'season', 'customProductId', 'cartonCode'
    ]

    const filteredUpdateData: any = {}
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        filteredUpdateData[field] = updateData[field]
      }
    })

    // Handle season field - store in meta_keywords like in the main products API
    if (updateData.season) {
      const existingMetaKeywords = filteredUpdateData.meta_keywords || ''
      // Remove any existing season data
      const cleanedKeywords = existingMetaKeywords.replace(/season:\w+,?\s*/g, '').trim()
      // Add new season data
      const updatedKeywords = [
        cleanedKeywords,
        `season:${updateData.season}`
      ].filter(Boolean).join(', ')
      
      filteredUpdateData.meta_keywords = updatedKeywords
    }

    // Update the product
    const updatedProduct = await databases.updateDocument(
      DATABASE_ID,
      PRODUCTS_COLLECTION_ID,
      id,
      filteredUpdateData
    )

    return NextResponse.json({ product: updatedProduct })

  } catch (error: any) {
    console.error("Error updating product:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update product" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      )
    }

    // Create admin client
    const { databases } = await createAdminClient()

    // Delete the product
    await databases.deleteDocument(
      DATABASE_ID,
      PRODUCTS_COLLECTION_ID,
      id
    )

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error("Error deleting product:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete product" },
      { status: 500 }
    )
  }
}