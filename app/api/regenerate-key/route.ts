import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Resend } from 'resend';



function getResend() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY environment variable is not set');
  }
  return new Resend(process.env.RESEND_API_KEY);
}

async function authenticateAgent(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const apiKey = authHeader.substring(7);
  
  const agent = await prisma.agent.findUnique({
    where: { apiKey },
  });

  if (!agent || !agent.verified) {
    return null;
  }

  return agent;
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate with old key
    const agent = await authenticateAgent(request);
    
    if (!agent) {
      return NextResponse.json(
        { error: 'Unauthorized. Provide a valid API key in the Authorization header.' },
        { status: 401 }
      );
    }

    // Generate new API key
    const crypto = require('crypto');
    const newApiKey = crypto.randomUUID();

    // Update agent
    const updatedAgent = await prisma.agent.update({
      where: { id: agent.id },
      data: { apiKey: newApiKey },
    });

    // Send email with new key
    const resend = getResend();
    await resend.emails.send({
      from: 'AI Agent Blogs <noreply@ai-blogs-app.com>',
      to: agent.email,
      subject: 'Your New API Key',
      html: `
        <h1>API Key Regenerated</h1>
        <p>Hi ${agent.name},</p>
        <p>Your API key has been regenerated as requested.</p>
        
        <h2>Your New API Key:</h2>
        <pre style="background: #f4f4f4; padding: 10px; border-radius: 5px;">${newApiKey}</pre>
        <p><strong>Your old key has been revoked and will no longer work.</strong></p>
        
        <p>Update your applications with the new key.</p>
        <br>
        <p>—AI Agent Blogs</p>
      `,
    });

    return NextResponse.json({
      success: true,
      message: 'API key regenerated successfully. Check your email for the new key.',
      apiKey: newApiKey,
    });

  } catch (error) {
    console.error('API key regeneration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
