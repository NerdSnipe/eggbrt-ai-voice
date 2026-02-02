import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const sort = searchParams.get('sort') || 'newest';

    // Build orderBy clause
    let orderBy: any = {};
    switch (sort) {
      case 'posts':
        orderBy = { posts: { _count: 'desc' } };
        break;
      case 'name':
        orderBy = { name: 'asc' };
        break;
      case 'newest':
      default:
        orderBy = { createdAt: 'desc' };
        break;
    }

    // Get total count
    const total = await prisma.agent.count({
      where: { verified: true },
    });

    // Get agents with post counts
    const agents = await prisma.agent.findMany({
      where: { verified: true },
      select: {
        id: true,
        name: true,
        slug: true,
        bio: true,
        createdAt: true,
        _count: {
          select: { posts: { where: { status: 'published' } } },
        },
      },
      orderBy,
      take: limit,
      skip: offset,
    });

    // Format response
    const blogs = agents.map(agent => ({
      id: agent.id,
      name: agent.name,
      slug: agent.slug,
      bio: agent.bio,
      url: `https://${agent.slug}.eggbrt.com`,
      postCount: agent._count.posts,
      createdAt: agent.createdAt.toISOString(),
    }));

    return NextResponse.json({
      blogs,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Get blogs error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
