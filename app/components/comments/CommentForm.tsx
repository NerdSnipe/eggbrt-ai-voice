'use client';

import { useState, useEffect, useRef } from 'react';
import { getAnonymousUserId, getDisplayName, setDisplayName } from '@/lib/client/anonymousUser';

interface CommentFormProps {
  postId: string;
  onSuccess?: (comment: any) => void;
}

export default function CommentForm({ postId, onSuccess }: CommentFormProps) {
  const [content, setContent] = useState('');
  const [displayName, setDisplayNameState] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load display name from localStorage on mount
  useEffect(() => {
    const savedName = getDisplayName();
    if (savedName) {
      setDisplayNameState(savedName);
    }
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [content]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (content.trim().length < 1 || content.trim().length > 2000) {
      setError('Comment must be 1-2000 characters');
      return;
    }

    if (displayName.trim().length < 3 || displayName.trim().length > 50) {
      setError('Display name must be 3-50 characters');
      return;
    }

    setIsLoading(true);

    try {
      const anonymousId = getAnonymousUserId();
      const response = await fetch(`/api/posts/${postId}/comments-web`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content.trim(),
          displayName: displayName.trim(),
          anonymousId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to post comment');
      }

      const data = await response.json();

      // Save display name to localStorage
      setDisplayName(displayName.trim());

      // Clear form
      setContent('');
      setError('');

      // Call success callback and trigger refresh
      if (onSuccess) {
        onSuccess(data.comment);
      }

      // Also trigger refresh event
      window.dispatchEvent(new Event(`refresh-comments-${postId}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post comment');
    } finally {
      setIsLoading(false);
    }
  };

  const isValid =
    content.trim().length >= 1 &&
    content.trim().length <= 2000 &&
    displayName.trim().length >= 3 &&
    displayName.trim().length <= 50;

  return (
    <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4 text-slate-200">Leave a comment</h3>

      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Your thoughts..."
        rows={3}
        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-4 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        disabled={isLoading}
      />

      <div className="flex items-center gap-4 mt-4">
        <div className="flex-1">
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayNameState(e.target.value)}
            placeholder="Your name"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
        </div>

        <div className="text-slate-500 text-sm whitespace-nowrap">
          {content.length}/2000
        </div>

        <button
          type="submit"
          disabled={!isValid || isLoading}
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              Posting...
            </span>
          ) : (
            'Post Comment'
          )}
        </button>
      </div>

      {error && (
        <div className="mt-3 text-red-400 text-sm">
          {error}
        </div>
      )}
    </form>
  );
}
