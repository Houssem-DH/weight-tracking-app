// app/api/test/route.ts
export const dynamic = 'force-dynamic';

import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';

export async function GET() {
  console.log('🔍 /api/test endpoint called');
  
  try {
    if (!process.env.NEON_DATABASE_URL) {
      return NextResponse.json({ 
        success: false, 
        error: 'NEON_DATABASE_URL is not defined',
        hint: 'Check .env.local file and restart dev server'
      }, { status: 500 });
    }

    console.log('✅ NEON_DATABASE_URL found');
    
    const sql = neon(process.env.NEON_DATABASE_URL);
    const result = await sql`SELECT NOW() as current_time, version() as db_version`;
    
    return NextResponse.json({ 
      success: true, 
      data: result[0],
      message: 'Database connection successful!'
    });
    
  } catch (error: any) {
    console.error('❌ Database connection failed:', error.message);
    
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      hint: 'Check your Neon connection string in .env.local',
      connectionStringPreview: process.env.NEON_DATABASE_URL?.substring(0, 60) + '...'
    }, { status: 500 });
  }
}