import { NextRequest, NextResponse } from 'next/server';
import { DatabaseMigration } from '@/lib/database-migration';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting database migration...');
    
    // Check migration status first
    const status = await DatabaseMigration.checkMigrationStatus();
    console.log('📊 Migration status:', status);
    
    if (!status.needsMigration) {
      return NextResponse.json({
        success: true,
        message: 'No migrations needed - all fields already exist',
        status
      });
    }
    
    // Run migrations
    const result = await DatabaseMigration.runAllMigrations();
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Database migration completed successfully',
        fieldsAdded: result.details.fieldsAdded,
        result
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Database migration completed with errors',
        errors: result.details.errors,
        fieldsAdded: result.details.fieldsAdded,
        result
      }, { status: 500 });
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const status = await DatabaseMigration.checkMigrationStatus();
    
    return NextResponse.json({
      success: true,
      status
    });
  } catch (error) {
    console.error('❌ Failed to check migration status:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}