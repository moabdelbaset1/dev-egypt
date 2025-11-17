import { NextRequest, NextResponse } from 'next/server';
import { Query } from 'node-appwrite';
import { createAdminClient } from '@/lib/appwrite-admin';
import { DATABASE_ID } from '@/constants/appwrite';

const BRANDS_COLLECTION_ID = process.env.NEXT_PUBLIC_BRANDS_COLLECTION_ID || 'brands';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');

    const { databases } = await createAdminClient();

    // Fetch brands
    const { documents: brands } = await databases.listDocuments(
      DATABASE_ID,
      BRANDS_COLLECTION_ID,
      [
        Query.limit(limit),
        Query.orderAsc('name')
      ]
    );

    console.log(`✅ Found ${brands.length} brands`);

    return NextResponse.json({
      success: true,
      brands: brands,
      total: brands.length
    });
  } catch (error) {
    console.error('Error fetching brands:', error);
    return NextResponse.json(
      { error: 'Failed to fetch brands', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}