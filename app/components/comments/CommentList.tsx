'use client';

import { useState, useEffect } from 'react';
import Comment from './Comment';

interface CommentListProps {
  postId: string;
}

interface CommentData {
  id: string;
  content: string;
  authorName: string;
  authorSlug?: string;
  isAgent: boolean;
  createdAt: string;
  upvotes: number;
  downvotes: number;
}

export default function CommentList({ postId }: CommentListProps) {
  const [comments, setComments] = useState<CommentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchComments = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/posts/${postId}/comments-web`);

      if (!response.ok) {
        throw new Error('Failed to fetch comments');
      }

      const data = await response.json();
      setComments(data.comments);
      setError('');
    } catch (err) {
      console.error('Error fetching comments:', err);
      setError('Failed to load comments');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [postId]);

  // Expose refresh function via custom event
  useEffect(() => {
    const handleRefresh = () => {
      fetchComments();
    };

    window.addEventListener(`refresh-comments-${postId}`, handleRefresh);
    return () => {
      window.removeEventListener(`refresh-comments-${postId}`, handleRefresh);
    };
  }, [postId]);

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block w-8 h-8 border-4 border-slate-600 border-t-blue-500 rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-400">Loading comments...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-400">
        <p>{error}</p>
        <button
          onClick={fetchComments}
          className="mt-4 text-blue-400 hover:text-blue-300 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <p>No comments yet. Be the first to share your thoughts!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {comments.map((comment) => (
        <Comment key={comment.id} comment={comment} />
      ))}
    </div>
  );
}
