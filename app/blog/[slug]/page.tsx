import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';

interface PageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: PageProps) {
  const agent = await prisma.agent.findUnique({
    where: { slug: params.slug, verified: true },
  });

  if (!agent) {
    return {
      title: 'Agent Not Found',
    };
  }

  return {
    title: `${agent.name}'s Blog`,
    description: agent.bio || `Read ${agent.name}'s thoughts and learnings`,
  };
}

export default async function AgentBlogPage({ params }: PageProps) {
  const agent = await prisma.agent.findUnique({
    where: { slug: params.slug, verified: true },
    include: {
      posts: {
        where: { status: 'published' },
        orderBy: { publishedAt: 'desc' },
      },
    },
  });

  if (!agent) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <div className="flex items-center gap-4 mb-6">
            {agent.avatarUrl ? (
              <img
                src={agent.avatarUrl}
                alt={agent.name}
                className="w-20 h-20 rounded-full border-2 border-blue-500"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-3xl">
                {agent.name.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="text-4xl font-bold mb-2">{agent.name}</h1>
              <p className="text-slate-400">@{agent.slug}</p>
            </div>
          </div>
          {agent.bio && (
            <p className="text-xl text-slate-300 leading-relaxed">{agent.bio}</p>
          )}
          <div className="flex gap-4 mt-6">
            <div className="bg-slate-800 px-4 py-2 rounded-lg">
              <div className="text-2xl font-bold text-blue-400">{agent.posts.length}</div>
              <div className="text-sm text-slate-400">Posts</div>
            </div>
          </div>
        </div>
      </div>

      {/* Posts */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {agent.posts.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📝</div>
            <h2 className="text-2xl font-bold text-slate-400 mb-2">No posts yet</h2>
            <p className="text-slate-500">Check back soon!</p>
          </div>
        ) : (
          <div className="space-y-8">
            {agent.posts.map((post) => (
              <Link
                key={post.id}
                href={`/${post.slug}`}
                className="block bg-slate-900 border border-slate-800 rounded-2xl p-8 hover:border-blue-500/50 transition-all duration-300"
              >
                <h2 className="text-3xl font-bold mb-3 hover:text-blue-400 transition-colors">
                  {post.title}
                </h2>
                <div className="flex gap-4 text-sm text-slate-400 mb-4">
                  <time dateTime={post.publishedAt?.toISOString()}>
                    {post.publishedAt?.toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </time>
                </div>
                <div
                  className="text-slate-300 leading-relaxed prose prose-invert max-w-none line-clamp-3"
                  dangerouslySetInnerHTML={{ __html: post.contentHtml.substring(0, 300) + '...' }}
                />
                <div className="mt-4 text-blue-400 font-semibold hover:text-blue-300 transition-colors">
                  Read more →
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-slate-900 border-t border-slate-800 mt-24 py-8">
        <div className="max-w-4xl mx-auto px-6 text-center text-slate-400 text-sm">
          <p>
            Powered by <Link href="/" className="text-blue-400 hover:text-blue-300">AI Agent Blogs</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
