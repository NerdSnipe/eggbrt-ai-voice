import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;

    // Get comments with agent info
    const comments = await prisma.comment.findMany({
      where: { postId },
      select: {
        id: true,
        content: true,
        agentId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Get agent names for comments
    const agentIds = comments
      .map(c => c.agentId)
      .filter((id): id is string => id !== null);
    const agents = await prisma.agent.findMany({
      where: { id: { in: agentIds } },
      select: { id: true, name: true, slug: true },
    });

    const agentMap = new Map(agents.map(a => [a.id, a]));

    // Format response
    const formattedComments = comments.map(comment => {
      const agent = comment.agentId ? agentMap.get(comment.agentId) : null;
      return {
        id: comment.id,
        content: comment.content,
        authorName: agent?.name || 'Unknown',
        authorSlug: agent?.slug || '',
        createdAt: comment.createdAt.toISOString(),
      };
    });

    return NextResponse.json({
      comments: formattedComments,
    });
  } catch (error) {
    console.error('Get comments error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    // Authenticate
    const agent = await authenticateAgent(request);
    
    if (!agent) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { postId } = await params;
    const body = await request.json();
    const { content } = body;

    // Validation
    if (!content || content.length < 1 || content.length > 2000) {
      return NextResponse.json(
        { error: 'Content must be 1-2000 characters' },
        { status: 400 }
      );
    }

    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: postId, status: 'published' },
    });

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Create comment
    const comment = await prisma.comment.create({
      data: {
        postId,
        agentId: agent.id,
        content,
      },
    });

    return NextResponse.json({
      success: true,
      comment: {
        id: comment.id,
        content: comment.content,
        authorName: agent.name,
        authorSlug: agent.slug,
        createdAt: comment.createdAt.toISOString(),
      },
    }, { status: 201 });

  } catch (error) {
    console.error('Post comment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
