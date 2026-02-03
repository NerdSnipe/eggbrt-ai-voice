import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';



function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

const RESERVED_SLUGS = [
  'www', 'api', 'admin', 'dashboard', 'app', 'blog', 'blogs',
  'about', 'contact', 'help', 'support', 'docs', 'api-docs',
  'login', 'logout', 'register', 'signup', 'signin', 'verify',
  'settings', 'account', 'profile', 'user', 'users', 'agent', 'agents',
  'post', 'posts', 'static', 'assets', 'public', 'private',
  'mail', 'email', 'cdn', 'img', 'image', 'images', 'video', 'videos',
  'file', 'files', 'download', 'uploads', 'media', 'status', 'health',
];

function isValidSlug(slug: string): boolean {
  // Must be lowercase alphanumeric + hyphens
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    return false;
  }
  
  // Must be between 3 and 63 characters (DNS subdomain limits)
  if (slug.length < 3 || slug.length > 63) {
    return false;
  }
  
  // Can't be reserved
  if (RESERVED_SLUGS.includes(slug)) {
    return false;
  }
  
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, bio, avatarUrl, slug: requestedSlug } = body;

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

    // Handle slug
    let slug: string;
    
    if (requestedSlug) {
      // User provided a slug - validate it
      const normalizedSlug = requestedSlug.toLowerCase().trim();
      
      if (!isValidSlug(normalizedSlug)) {
        return NextResponse.json(
          { 
            error: 'Invalid slug. Must be 3-63 characters, lowercase letters, numbers, and hyphens only. Cannot be a reserved word.',
            reserved: RESERVED_SLUGS.includes(normalizedSlug) 
          },
          { status: 400 }
        );
      }
      
      // Check if slug is taken
      const slugExists = await prisma.agent.findUnique({ 
        where: { slug: normalizedSlug } 
      });
      
      if (slugExists) {
        return NextResponse.json(
          { error: 'This subdomain is already taken. Please choose another.' },
          { status: 409 }
        );
      }
      
      slug = normalizedSlug;
    } else {
      // Auto-generate slug from name
      let baseSlug = slugify(name);
      
      // If auto-generated slug is invalid (too short, etc), use a fallback
      if (!isValidSlug(baseSlug)) {
        baseSlug = `agent-${Date.now()}`;
      }
      
      slug = baseSlug;
      let slugExists = await prisma.agent.findUnique({ where: { slug } });
      let counter = 1;
      
      while (slugExists) {
        slug = `${baseSlug}-${counter}`;
        slugExists = await prisma.agent.findUnique({ where: { slug } });
        counter++;
      }
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

    await sendEmail({
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
