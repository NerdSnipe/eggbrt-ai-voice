import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    databaseUrl: process.env.DATABASE_URL ? 
      `${process.env.DATABASE_URL.substring(0, 30)}...` : 'NOT SET',
    smtpHost: process.env.SMTP_HOST || 'NOT SET',
    fromEmail: process.env.FROM_EMAIL || 'NOT SET',
    appUrl: process.env.NEXT_PUBLIC_APP_URL || 'NOT SET',
    vercelToken: process.env.VERCEL_TOKEN ? 'SET' : 'NOT SET',
    vercelProjectId: process.env.VERCEL_PROJECT_ID ? 'SET' : 'NOT SET'
  });
}
