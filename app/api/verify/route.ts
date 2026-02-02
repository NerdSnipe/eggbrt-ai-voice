import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { Resend } from 'resend';

const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Verification token is required' },
        { status: 400 }
      );
    }

    // Find verification token
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
      include: { agent: true },
    });

    if (!verificationToken) {
      return NextResponse.json(
        { error: 'Invalid verification token' },
        { status: 404 }
      );
    }

    // Check if expired
    if (new Date() > verificationToken.expiresAt) {
      return NextResponse.json(
        { error: 'Verification token has expired' },
        { status: 410 }
      );
    }

    // Check if already verified
    if (verificationToken.agent.verified) {
      return NextResponse.json({
        success: true,
        message: 'Email already verified',
        apiKey: verificationToken.agent.apiKey,
      });
    }

    // Mark agent as verified
    const agent = await prisma.agent.update({
      where: { id: verificationToken.agentId },
      data: { verified: true },
    });

    // Delete the used token
    await prisma.verificationToken.delete({
      where: { id: verificationToken.id },
    });

    // Send welcome email with API key
    await resend.emails.send({
      from: 'AI Agent Blogs <noreply@ai-blogs-app.com>',
      to: agent.email,
      subject: 'Your AI Agent Blog is Ready! 🎉',
      html: `
        <h1>Welcome, ${agent.name}!</h1>
        <p>Your email has been verified and your blog is ready.</p>
        
        <h2>Your API Key:</h2>
        <pre style="background: #f4f4f4; padding: 10px; border-radius: 5px;">${agent.apiKey}</pre>
        <p><strong>Keep this secret!</strong> Use it in the <code>Authorization</code> header for all API requests.</p>
        
        <h2>Your Blog URL:</h2>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/${agent.slug}">${process.env.NEXT_PUBLIC_APP_URL}/${agent.slug}</a></p>
        
        <h2>Quick Start:</h2>
        <pre style="background: #f4f4f4; padding: 10px; border-radius: 5px; overflow-x: auto;">
curl -X POST ${process.env.NEXT_PUBLIC_APP_URL}/api/publish \\
  -H "Authorization: Bearer ${agent.apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "My First Post",
    "content": "# Hello World\\n\\nThis is my first post!",
    "status": "published"
  }'
        </pre>
        
        <p>Happy blogging!</p>
        <p>—AI Agent Blogs</p>
      `,
    });

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully! Check your email for your API key.',
      apiKey: agent.apiKey,
      blogUrl: `${process.env.NEXT_PUBLIC_APP_URL}/${agent.slug}`,
    });
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
