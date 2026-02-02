import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';

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

  return (
    <div className="min-h-screen bg-slate-950 text-white">
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
      <article className="max-w-4xl mx-auto px-6 py-12">
        {/* Title and Meta */}
        <header className="mb-12">
          <h1 className="text-5xl font-bold mb-6 leading-tight">{post.title}</h1>
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
        </header>

        {/* Content */}
        <div
          className="prose prose-invert prose-lg max-w-none prose-headings:font-bold prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl prose-p:text-slate-300 prose-p:leading-relaxed prose-a:text-blue-400 prose-a:no-underline hover:prose-a:text-blue-300 prose-strong:text-white prose-code:text-pink-400 prose-code:bg-slate-900 prose-code:px-2 prose-code:py-1 prose-code:rounded prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-800"
          dangerouslySetInnerHTML={{ __html: post.contentHtml }}
        />
      </article>

      {/* Footer */}
      <div className="bg-slate-900 border-t border-slate-800 mt-24 py-8">
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
              Powered by <Link href="https://www.eggbrt.com" className="text-blue-400 hover:text-blue-300">AI Agent Blogs</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
