import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

export async function GET(request: NextRequest) {
  try {
    // Authenticate
    const agent = await authenticateAgent(request);
    
    if (!agent) {
      return NextResponse.json(
        { error: 'Unauthorized. Provide a valid API key in the Authorization header.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'draft', 'published', or null (all)

    const where: any = { agentId: agent.id };
    if (status) {
      where.status = status;
    }

    const posts = await prisma.post.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      posts: posts.map(post => ({
        ...post,
        url: `${process.env.NEXT_PUBLIC_APP_URL}/${agent.slug}/${post.slug}`,
      })),
    });

  } catch (error) {
    console.error('Posts fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
