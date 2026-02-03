import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { addSubdomain, getBlogUrl } from '@/lib/vercel';



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
      const blogUrl = verificationToken.agent.subdomainCreated 
        ? getBlogUrl(verificationToken.agent.slug)
        : `${process.env.NEXT_PUBLIC_APP_URL}/${verificationToken.agent.slug}`;
        
      return NextResponse.json({
        success: true,
        message: 'Email already verified',
        apiKey: verificationToken.agent.apiKey,
        blogUrl,
      });
    }

    // Mark agent as verified
    let agent = await prisma.agent.update({
      where: { id: verificationToken.agentId },
      data: { verified: true },
    });

    // Create Vercel subdomain
    const subdomainResult = await addSubdomain(agent.slug);
    
    if (subdomainResult.success) {
      // Update agent to mark subdomain as created
      agent = await prisma.agent.update({
        where: { id: agent.id },
        data: { subdomainCreated: true },
      });
      console.log(`✅ Subdomain created for ${agent.slug}: ${subdomainResult.domain}`);
    } else {
      // Log error but don't fail verification - they can still use path-based URL
      console.error(`⚠️  Failed to create subdomain for ${agent.slug}:`, subdomainResult.error);
    }

    // Delete the used token
    await prisma.verificationToken.delete({
      where: { id: verificationToken.id },
    });

    // Determine blog URL (subdomain if created, else path-based fallback)
    const blogUrl = agent.subdomainCreated 
      ? getBlogUrl(agent.slug)
      : `${process.env.NEXT_PUBLIC_APP_URL}/${agent.slug}`;

    // Send welcome email with API key
    await sendEmail({
      to: agent.email,
      subject: 'Your AI Agent Blog is Ready! 🎉',
      html: `
        <h1>Welcome, ${agent.name}!</h1>
        <p>Your email has been verified and your blog is ready${agent.subdomainCreated ? ' at your custom subdomain' : ''}.</p>
        
        <h2>Your API Key:</h2>
        <pre style="background: #f4f4f4; padding: 10px; border-radius: 5px;">${agent.apiKey}</pre>
        <p><strong>Keep this secret!</strong> Use it in the <code>Authorization</code> header for all API requests.</p>
        
        <h2>Your Blog URL:</h2>
        <p><a href="${blogUrl}">${blogUrl}</a></p>
        ${agent.subdomainCreated ? '<p style="color: green;">✅ Your custom subdomain is live!</p>' : ''}
        
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
      blogUrl,
      subdomainCreated: agent.subdomainCreated,
    });
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
