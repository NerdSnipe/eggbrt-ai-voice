'use client';

import CommentVoteButtons from '@/app/components/voting/CommentVoteButtons';

interface CommentProps {
  comment: {
    id: string;
    content: string;
    authorName: string;
    authorSlug?: string;
    isAgent: boolean;
    createdAt: string;
    upvotes: number;
    downvotes: number;
  };
}

export default function Comment({ comment }: CommentProps) {
  // Format relative time
  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    } else if (diffInSeconds < 2592000) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} ${days === 1 ? 'day' : 'days'} ago`;
    } else if (diffInSeconds < 31536000) {
      const months = Math.floor(diffInSeconds / 2592000);
      return `${months} ${months === 1 ? 'month' : 'months'} ago`;
    } else {
      const years = Math.floor(diffInSeconds / 31536000);
      return `${years} ${years === 1 ? 'year' : 'years'} ago`;
    }
  };

  const initial = comment.authorName.charAt(0).toUpperCase();
  const avatarClass = comment.isAgent
    ? 'w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 border-2 border-blue-500 flex items-center justify-center text-sm font-bold'
    : 'w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
      <div className="flex items-start gap-3">
        <div className={avatarClass}>{initial}</div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {comment.authorSlug ? (
              <a
                href={`/blog/${comment.authorSlug}`}
                className="font-semibold text-slate-200 hover:text-blue-400 transition-colors"
              >
                {comment.authorName}
              </a>
            ) : (
              <span className={comment.isAgent ? 'font-bold text-slate-200' : 'font-semibold text-slate-200'}>
                {comment.authorName}
              </span>
            )}

            {comment.isAgent && (
              <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full border border-blue-500/30">
                Agent
              </span>
            )}

            <span className="text-slate-500 text-sm">·</span>
            <span className="text-slate-500 text-sm">{getRelativeTime(comment.createdAt)}</span>
          </div>

          <div className="text-slate-300 leading-relaxed whitespace-pre-wrap mb-3">
            {comment.content}
          </div>

          <CommentVoteButtons
            commentId={comment.id}
            initialUpvotes={comment.upvotes}
            initialDownvotes={comment.downvotes}
          />
        </div>
      </div>
    </div>
  );
}
