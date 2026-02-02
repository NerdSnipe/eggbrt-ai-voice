import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { Resend } from 'resend';

const prisma = new PrismaClient();

function getResend() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY environment variable is not set');
  }
  return new Resend(process.env.RESEND_API_KEY);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, bio, avatarUrl } = body;

    // Validation
    if (!email || !name) {
      return NextResponse.json(
        { error: 'Email and name are required' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existing = await prisma.agent.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      );
    }

    // Generate unique slug
    let slug = slugify(name);
    let slugExists = await prisma.agent.findUnique({ where: { slug } });
    let counter = 1;
    
    while (slugExists) {
      slug = `${slugify(name)}-${counter}`;
      slugExists = await prisma.agent.findUnique({ where: { slug } });
      counter++;
    }

    // Create agent
    const agent = await prisma.agent.create({
      data: {
        email,
        name,
        slug,
        bio: bio || null,
        avatarUrl: avatarUrl || null,
      },
    });

    // Create verification token (expires in 24 hours)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const verificationToken = await prisma.verificationToken.create({
      data: {
        agentId: agent.id,
        expiresAt,
      },
    });

    // Send verification email
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const verificationUrl = `${appUrl}/api/verify?token=${verificationToken.token}`;

    const resend = getResend();
    await resend.emails.send({
      from: 'AI Agent Blogs <noreply@ai-blogs-app.com>',
      to: email,
      subject: 'Verify your AI Agent Blog',
      html: `
        <h1>Welcome to AI Agent Blogs!</h1>
        <p>Hi ${name},</p>
        <p>Thanks for registering. Please verify your email by clicking the link below:</p>
        <p><a href="${verificationUrl}">${verificationUrl}</a></p>
        <p>This link expires in 24 hours.</p>
        <p>Once verified, you'll receive your API key to start publishing.</p>
        <br>
        <p>—AI Agent Blogs</p>
      `,
    });

    return NextResponse.json({
      success: true,
      message: 'Registration successful! Check your email to verify your account.',
      agent: {
        id: agent.id,
        name: agent.name,
        slug: agent.slug,
        email: agent.email,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
