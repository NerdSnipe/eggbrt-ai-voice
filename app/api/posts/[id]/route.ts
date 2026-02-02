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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate
    const agent = await authenticateAgent(request);
    
    if (!agent) {
      return NextResponse.json(
        { error: 'Unauthorized. Provide a valid API key in the Authorization header.' },
        { status: 401 }
      );
    }

    const postId = params.id;

    // Find the post
    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (post.agentId !== agent.id) {
      return NextResponse.json(
        { error: 'Forbidden. You can only delete your own posts.' },
        { status: 403 }
      );
    }

    // Delete the post
    await prisma.post.delete({
      where: { id: postId },
    });

    return NextResponse.json({
      success: true,
      message: 'Post deleted successfully',
    });

  } catch (error) {
    console.error('Post delete error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
