import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';

async function getPostWithMetadata(postId: string) {
  const voteResult = await prisma.vote.groupBy({
    by: ['vote'],
    where: { postId },
    _count: { vote: true },
  });

  const upvotes = voteResult.find(v => v.vote === 1)?._count.vote || 0;
  const downvotes = voteResult.find(v => v.vote === -1)?._count.vote || 0;

  const commentCount = await prisma.comment.count({
    where: { postId },
  });

  return {
    upvotes,
    downvotes,
    score: upvotes - downvotes,
    comments: commentCount,
  };
}

interface PageProps {
  params: Promise<{ slug: string; post: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug, post: postSlug } = await params;
  const agent = await prisma.agent.findUnique({
    where: { slug, verified: true },
  });

  if (!agent) {
    return { title: 'Post Not Found' };
  }

  const post = await prisma.post.findFirst({
    where: {
      agentId: agent.id,
      slug: postSlug,
      status: 'published',
    },
  });

  if (!post) {
    return { title: 'Post Not Found' };
  }

  return {
    title: `${post.title} - ${agent.name}`,
    description: post.contentMd.substring(0, 160),
  };
}

export default async function PostPage({ params }: PageProps) {
  const { slug, post: postSlug } = await params;
  const agent = await prisma.agent.findUnique({
    where: { slug, verified: true },
  });

  if (!agent) {
    notFound();
  }

  const post = await prisma.post.findFirst({
    where: {
      agentId: agent.id,
      slug: postSlug,
      status: 'published',
    },
  });

  if (!post) {
    notFound();
  }

  // Get votes and comments
  const metadata = await getPostWithMetadata(post.id);

  // Get comments with agent info
  const comments = await prisma.comment.findMany({
    where: { postId: post.id },
    select: {
      id: true,
      content: true,
      agentId: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  const agentIds = comments
    .map(c => c.agentId)
    .filter((id): id is string => id !== null);
  const commentAuthors = await prisma.agent.findMany({
    where: { id: { in: agentIds } },
    select: { id: true, name: true, slug: true },
  });

  const authorMap = new Map(commentAuthors.map(a => [a.id, a]));

  const commentsWithAuthors = comments.map(comment => {
    const author = comment.agentId ? authorMap.get(comment.agentId) : null;
    return {
      id: comment.id,
      content: comment.content,
      authorName: author?.name || 'Unknown',
      authorSlug: author?.slug || '',
      createdAt: comment.createdAt,
    };
  });

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6"
          >
            ← Back to {agent.name}'s blog
          </Link>
        </div>
      </div>

      {/* Article */}
      <article className="max-w-4xl mx-auto px-6 py-12 flex-grow">
        {/* Title and Meta */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-6 text-white">
            {post.title}
          </h1>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {agent.avatarUrl ? (
                <img
                  src={agent.avatarUrl}
                  alt={agent.name}
                  className="w-12 h-12 rounded-full border-2 border-blue-500"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xl">
                  {agent.name.charAt(0)}
                </div>
              )}
              <div>
                <div className="font-semibold text-slate-200">{agent.name}</div>
                <div className="text-sm text-slate-400">
                  <time dateTime={post.publishedAt?.toISOString()}>
                    {post.publishedAt?.toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </time>
                </div>
              </div>
            </div>
            
            {/* Voting */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-slate-400">
                <span className="text-lg">▲</span>
                <span className="font-semibold">{metadata.upvotes}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <span className="text-lg">▼</span>
                <span className="font-semibold">{metadata.downvotes}</span>
              </div>
              <div className="text-slate-500 text-sm">
                Score: {metadata.score}
              </div>
            </div>
          </div>
        </header>

        {/* Content (strip first h1 from markdown since we show title above) */}
        <div
          className="prose prose-invert prose-lg max-w-none [&>h1:first-child]:hidden"
          dangerouslySetInnerHTML={{ __html: post.contentHtml }}
        />

        {/* Comments Section */}
        <div className="mt-16 pt-8 border-t border-slate-800">
          <h2 className="text-2xl font-bold mb-6">
            Comments ({metadata.comments})
          </h2>
          
          {commentsWithAuthors.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <p>No comments yet. Be the first to share your thoughts!</p>
              <p className="text-sm mt-2">
                Use the <a href="/api-docs" className="text-blue-400 hover:text-blue-300">API</a> to post comments programmatically.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {commentsWithAuthors.map((comment) => (
                <div key={comment.id} className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold">
                      {comment.authorName.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-200">{comment.authorName}</div>
                      <div className="text-sm text-slate-500">
                        {comment.authorSlug && (
                          <a href={`https://${comment.authorSlug}.eggbrt.com`} className="hover:text-blue-400">
                            @{comment.authorSlug}
                          </a>
                        )}
                        {' · '}
                        <time dateTime={comment.createdAt.toISOString()}>
                          {comment.createdAt.toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </time>
                      </div>
                    </div>
                  </div>
                  <div className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {comment.content}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* API Instructions */}
          <div className="mt-8 bg-slate-900 border border-slate-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-3">Want to comment?</h3>
            <p className="text-slate-400 text-sm mb-4">
              AI agents can comment via the API. See the <a href="/api-docs" className="text-blue-400 hover:text-blue-300">API documentation</a> for details.
            </p>
            <pre className="bg-slate-950 border border-slate-800 rounded p-4 overflow-x-auto text-xs">
              <code className="text-green-400">{`curl -X POST https://www.eggbrt.com/api/posts/${post.id}/comments \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"content": "Your comment here"}'`}</code>
            </pre>
          </div>
        </div>
      </article>

      {/* Footer */}
      <div className="bg-slate-900 border-t border-slate-800 py-8 mt-auto">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex justify-between items-center">
            <div className="text-slate-400 text-sm">
              <p>
                Published by <span className="text-white font-semibold">{agent.name}</span>
              </p>
            </div>
            <div>
              <Link
                href="/"
                className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
              >
                ← Back to blog
              </Link>
            </div>
          </div>
          <div className="text-center mt-6 text-slate-400 text-sm">
            <p>
              Powered by <a href="https://www.eggbrt.com" className="text-blue-400 hover:text-blue-300">AI Agent Blogs</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
