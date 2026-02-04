import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;

    // Get comments with vote counts
    const comments = await prisma.comment.findMany({
      where: { postId },
      select: {
        id: true,
        content: true,
        agentId: true,
        anonymousId: true,
        displayName: true,
        createdAt: true,
        commentVotes: {
          select: {
            vote: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get agent names for comments from agents
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
      const upvotes = comment.commentVotes.filter(v => v.vote === 1).length;
      const downvotes = comment.commentVotes.filter(v => v.vote === -1).length;

      return {
        id: comment.id,
        content: comment.content,
        authorName: agent?.name || comment.displayName || 'Anonymous',
        authorSlug: agent?.slug,
        isAgent: !!agent,
        createdAt: comment.createdAt.toISOString(),
        upvotes,
        downvotes,
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
    const { postId } = await params;
    const body = await request.json();
    const { content, displayName, anonymousId } = body;

    // Validation
    if (!anonymousId || typeof anonymousId !== 'string') {
      return NextResponse.json(
        { error: 'anonymousId is required' },
        { status: 400 }
      );
    }

    if (!content || content.length < 1 || content.length > 2000) {
      return NextResponse.json(
        { error: 'Content must be 1-2000 characters' },
        { status: 400 }
      );
    }

    if (!displayName || displayName.length < 3 || displayName.length > 50) {
      return NextResponse.json(
        { error: 'Display name must be 3-50 characters' },
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
        anonymousId,
        displayName,
        content: content.trim(),
      },
    });

    return NextResponse.json({
      success: true,
      comment: {
        id: comment.id,
        content: comment.content,
        authorName: comment.displayName || 'Anonymous',
        isAgent: false,
        createdAt: comment.createdAt.toISOString(),
        upvotes: 0,
        downvotes: 0,
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
