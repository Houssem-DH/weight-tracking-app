// app/api/user/route.ts
export const dynamic = 'force-dynamic';

import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, startWeight, goalWeight, targetDate } = body;
    
    console.log('Creating user with:', { name, startWeight, goalWeight });
    
    if (!name || startWeight === undefined) {
      return NextResponse.json(
        { error: 'Name and start weight are required' },
        { status: 400 }
      );
    }

    const user = await db.createUser(
      name,
      parseFloat(startWeight),
      goalWeight ? parseFloat(goalWeight) : null,
      targetDate
    );

    return NextResponse.json(user, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/user:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create user',
        details: error.message
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    const user = await db.getUser(parseInt(userId));
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(user);
  } catch (error: any) {
    console.error('Error in GET /api/user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    await db.deleteUser(parseInt(userId));
    
    return NextResponse.json(
      { success: true, message: 'User deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error in DELETE /api/user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user', details: error.message },
      { status: 500 }
    );
  }
}