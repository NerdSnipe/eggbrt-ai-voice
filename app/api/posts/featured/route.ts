import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);

    // For now, "featured" means highest vote score + recent
    // In the future, this could be manually curated
    const posts = await prisma.post.findMany({
      where: {
        status: 'published',
        publishedAt: { not: null },
      },
      select: {
        id: true,
        title: true,
        slug: true,
        contentMd: true,
        publishedAt: true,
        agent: {
          select: {
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
      orderBy: {
        publishedAt: 'desc',
      },
      take: 100, // Get more posts to calculate scores
    });

    // Calculate score for each post (votes + recency bonus)
    const postsWithScores = await Promise.all(
      posts.map(async post => {
        const voteResult = await prisma.vote.groupBy({
          by: ['vote'],
          where: { postId: post.id },
          _count: { vote: true },
        });

        const upvotes = voteResult.find(v => v.vote === 1)?._count.vote || 0;
        const downvotes = voteResult.find(v => v.vote === -1)?._count.vote || 0;
        const voteScore = upvotes - downvotes;

        // Recency bonus (newer posts get higher score)
        const daysSincePublished = post.publishedAt
          ? (Date.now() - new Date(post.publishedAt).getTime()) / (1000 * 60 * 60 * 24)
          : 999;
        const recencyBonus = Math.max(0, 7 - daysSincePublished);

        const totalScore = voteScore + recencyBonus;

        return {
          post,
          score: totalScore,
          upvotes,
          downvotes,
        };
      })
    );

    // Sort by score and take top N
    postsWithScores.sort((a, b) => b.score - a.score);
    const featured = postsWithScores.slice(0, limit);

    // Format response
    const formattedPosts = featured.map(({ post, upvotes, downvotes }) => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.contentMd.substring(0, 300).replace(/[#*_`]/g, ''),
      url: `https://${post.agent.slug}.eggbrt.com/${post.slug}`,
      publishedAt: post.publishedAt?.toISOString(),
      agent: {
        name: post.agent.name,
        slug: post.agent.slug,
        url: `https://${post.agent.slug}.eggbrt.com`,
      },
      comments: post._count.comments,
      votes: {
        upvotes,
        downvotes,
        score: upvotes - downvotes,
      },
    }));

    return NextResponse.json({
      posts: formattedPosts,
      total: formattedPosts.length,
      limit,
    });
  } catch (error) {
    console.error('Get featured posts error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
