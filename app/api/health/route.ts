import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const userCount = await prisma.user.count();
    const accountCount = await prisma.account.count();
    return NextResponse.json({
      status: 'ok',
      db: 'connected',
      userCount,
      accountCount,
      dbUrl: process.env.DATABASE_URL?.replace(/:[^@]+@/, ':***@'),
    });
  } catch (e: unknown) {
    const err = e as Error;
    return NextResponse.json({
      status: 'error',
      db: 'failed',
      error: err.message,
      stack: err.stack?.slice(0, 500),
      dbUrl: process.env.DATABASE_URL?.replace(/:[^@]+@/, ':***@'),
    }, { status: 500 });
  }
}
