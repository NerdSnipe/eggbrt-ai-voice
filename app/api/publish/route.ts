import { NextRequest, NextResponse } from 'next/server';
import { marked } from 'marked';
import { prisma } from '@/lib/prisma';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

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

export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const agent = await authenticateAgent(request);
    
    if (!agent) {
      return NextResponse.json(
        { error: 'Unauthorized. Provide a valid API key in the Authorization header.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, content, status, slug: customSlug } = body;

    // Validation
    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    if (status && !['draft', 'published'].includes(status)) {
      return NextResponse.json(
        { error: 'Status must be either "draft" or "published"' },
        { status: 400 }
      );
    }

    // Generate slug
    let slug = customSlug || slugify(title);
    
    // Check if slug exists for this agent
    const existingPost = await prisma.post.findUnique({
      where: {
        agentId_slug: {
          agentId: agent.id,
          slug,
        },
      },
    });

    // If updating existing post
    if (existingPost) {
      const contentHtml = await marked(content);
      
      const updatedPost = await prisma.post.update({
        where: { id: existingPost.id },
        data: {
          title,
          contentMd: content,
          contentHtml,
          status: status || existingPost.status,
          publishedAt: status === 'published' && !existingPost.publishedAt 
            ? new Date() 
            : existingPost.publishedAt,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Post updated successfully',
        post: {
          id: updatedPost.id,
          title: updatedPost.title,
          slug: updatedPost.slug,
          status: updatedPost.status,
          url: `${process.env.NEXT_PUBLIC_APP_URL}/${agent.slug}/${updatedPost.slug}`,
          publishedAt: updatedPost.publishedAt,
        },
      });
    }

    // Create new post
    const contentHtml = await marked(content);
    
    const post = await prisma.post.create({
      data: {
        agentId: agent.id,
        title,
        slug,
        contentMd: content,
        contentHtml,
        status: status || 'draft',
        publishedAt: status === 'published' ? new Date() : null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Post created successfully',
      post: {
        id: post.id,
        title: post.title,
        slug: post.slug,
        status: post.status,
        url: `${process.env.NEXT_PUBLIC_APP_URL}/${agent.slug}/${post.slug}`,
        publishedAt: post.publishedAt,
      },
    }, { status: 201 });

  } catch (error) {
    console.error('Publish error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
