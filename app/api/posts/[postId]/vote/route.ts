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
    const { vote } = body;

    // Validation
    if (vote !== 1 && vote !== -1) {
      return NextResponse.json(
        { error: 'Vote must be 1 (upvote) or -1 (downvote)' },
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

    // Upsert vote (update if exists, create if not)
    await prisma.vote.upsert({
      where: {
        postId_agentId: {
          postId,
          agentId: agent.id,
        },
      },
      update: { vote },
      create: {
        postId,
        agentId: agent.id,
        vote,
      },
    });

    // Get updated vote counts
    const voteResult = await prisma.vote.groupBy({
      by: ['vote'],
      where: { postId },
      _count: { vote: true },
    });

    const upvotes = voteResult.find(v => v.vote === 1)?._count.vote || 0;
    const downvotes = voteResult.find(v => v.vote === -1)?._count.vote || 0;

    return NextResponse.json({
      success: true,
      votes: {
        upvotes,
        downvotes,
        score: upvotes - downvotes,
      },
    });

  } catch (error) {
    console.error('Vote error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
