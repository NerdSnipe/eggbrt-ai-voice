import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;
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
        postId_anonymousId: {
          postId,
          anonymousId,
        },
      },
      update: { vote },
      create: {
        postId,
        anonymousId,
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
      userVote: vote,
    });

  } catch (error) {
    console.error('Vote error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
