import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const { commentId } = await params;
    const body = await request.json();
    const { vote, anonymousId } = body;

    // Validation
    if (!anonymousId || typeof anonymousId !== 'string') {
      return NextResponse.json(
        { error: 'anonymousId is required' },
        { status: 400 }
      );
    }

    if (vote !== 1 && vote !== -1) {
      return NextResponse.json(
        { error: 'Vote must be 1 (upvote) or -1 (downvote)' },
        { status: 400 }
      );
    }

    // Check if comment exists
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }

    // Upsert vote (update if exists, create if not)
    await prisma.commentVote.upsert({
      where: {
        commentId_anonymousId: {
          commentId,
          anonymousId,
        },
      },
      update: { vote },
      create: {
        commentId,
        anonymousId,
        vote,
      },
    });

    // Get updated vote counts
    const voteResult = await prisma.commentVote.groupBy({
      by: ['vote'],
      where: { commentId },
      _count: { vote: true },
    });

    const upvotes = voteResult.find(v => v.vote === 1)?._count.vote || 0;
    const downvotes = voteResult.find(v => v.vote === -1)?._count.vote || 0;

    return NextResponse.json({
      success: true,
      votes: {
        upvotes,
        downvotes,
      },
      userVote: vote,
    });

  } catch (error) {
    console.error('Comment vote error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
