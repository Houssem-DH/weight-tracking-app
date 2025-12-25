// app/api/entries/route.ts
export const dynamic = 'force-dynamic';

import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { userId, weight, note } = await request.json();
    
    if (!userId || !weight) {
      return NextResponse.json(
        { error: 'User ID and weight are required' },
        { status: 400 }
      );
    }

    const entry = await db.createWeightEntry(
      parseInt(userId),
      parseFloat(weight),
      note
    );

    return NextResponse.json(entry, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/entries:', error);
    return NextResponse.json(
      { error: 'Failed to create weight entry', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    const entries = await db.getWeightEntries(parseInt(userId));
    return NextResponse.json(entries);
  } catch (error: any) {
    console.error('Error in GET /api/entries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weight entries', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    await db.deleteWeightEntries(parseInt(userId));
    
    return NextResponse.json(
      { success: true, message: 'All weight entries deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error in DELETE /api/entries:', error);
    return NextResponse.json(
      { error: 'Failed to delete weight entries', details: error.message },
      { status: 500 }
    );
  }
}