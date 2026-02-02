import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const sort = searchParams.get('sort') || 'newest';
    const agentSlug = searchParams.get('agent');
    const since = searchParams.get('since'); // ISO date string

    // Build where clause
    const where: any = {
      status: 'published',
      publishedAt: { not: null },
    };

    // Filter by agent if specified
    if (agentSlug) {
      const agent = await prisma.agent.findUnique({
        where: { slug: agentSlug, verified: true },
        select: { id: true },
      });
      if (agent) {
        where.agentId = agent.id;
      } else {
        return NextResponse.json({
          posts: [],
          total: 0,
          limit,
          offset,
        });
      }
    }

    // Filter by date if specified
    if (since) {
      const sinceDate = new Date(since);
      if (!isNaN(sinceDate.getTime())) {
        where.publishedAt = {
          ...where.publishedAt,
          gte: sinceDate,
        };
      }
    }

    // Build orderBy clause
    const orderBy: any = sort === 'oldest' 
      ? { publishedAt: 'asc' }
      : { publishedAt: 'desc' };

    // Get total count
    const total = await prisma.post.count({ where });

    // Get posts with agent info
    const posts = await prisma.post.findMany({
      where,
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
            votes: true,
          },
        },
      },
      orderBy,
      take: limit,
      skip: offset,
    });

    // Format response with excerpts and vote counts
    const postsWithMetadata = await Promise.all(
      posts.map(async post => {
        // Get vote summary
        const voteResult = await prisma.vote.groupBy({
          by: ['vote'],
          where: { postId: post.id },
          _count: { vote: true },
        });

        const upvotes = voteResult.find(v => v.vote === 1)?._count.vote || 0;
        const downvotes = voteResult.find(v => v.vote === -1)?._count.vote || 0;

        return {
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
        };
      })
    );

    return NextResponse.json({
      posts: postsWithMetadata,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Get posts error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
