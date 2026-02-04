'use client';

import { useState, useEffect } from 'react';
import { getAnonymousUserId } from '@/lib/client/anonymousUser';

interface CommentVoteButtonsProps {
  commentId: string;
  initialUpvotes: number;
  initialDownvotes: number;
  className?: string;
}

export default function CommentVoteButtons({
  commentId,
  initialUpvotes,
  initialDownvotes,
  className = '',
}: CommentVoteButtonsProps) {
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [userVote, setUserVote] = useState<1 | -1 | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load user's previous vote from localStorage on mount
  useEffect(() => {
    const storedVote = localStorage.getItem(`comment-vote-${commentId}`);
    if (storedVote === '1') {
      setUserVote(1);
    } else if (storedVote === '-1') {
      setUserVote(-1);
    }
  }, [commentId]);

  const handleVote = async (direction: 1 | -1) => {
    if (isLoading) return;

    const anonymousId = getAnonymousUserId();
    const previousVote = userVote;
    const previousUpvotes = upvotes;
    const previousDownvotes = downvotes;

    // If user clicked same vote, no change
    if (userVote === direction) {
      return;
    }

    setIsLoading(true);

    // Calculate new vote counts
    let newUpvotes = upvotes;
    let newDownvotes = downvotes;

    if (previousVote === 1) {
      newUpvotes -= 1;
    } else if (previousVote === -1) {
      newDownvotes -= 1;
    }

    if (direction === 1) {
      newUpvotes += 1;
    } else {
      newDownvotes += 1;
    }

    setUserVote(direction);
    setUpvotes(newUpvotes);
    setDownvotes(newDownvotes);

    try {
      const response = await fetch(`/api/comments/${commentId}/vote-web`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ vote: direction, anonymousId }),
      });

      if (!response.ok) {
        throw new Error('Vote failed');
      }

      const data = await response.json();

      // Update with server response
      setUpvotes(data.votes.upvotes);
      setDownvotes(data.votes.downvotes);
      setUserVote(data.userVote);

      // Store vote in localStorage
      localStorage.setItem(`comment-vote-${commentId}`, String(direction));
    } catch (error) {
      // Revert on error
      setUserVote(previousVote);
      setUpvotes(previousUpvotes);
      setDownvotes(previousDownvotes);
      alert('Failed to vote. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <button
        onClick={() => handleVote(1)}
        disabled={isLoading}
        className={`
          flex items-center gap-1 text-sm px-2 py-1 rounded border transition-all duration-200
          ${
            userVote === 1
              ? 'border-blue-500 bg-blue-500/10 text-blue-400'
              : 'border-slate-700 text-slate-400 hover:bg-slate-800'
          }
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      >
        <span>▲</span>
        <span className="font-medium">{upvotes}</span>
      </button>

      <button
        onClick={() => handleVote(-1)}
        disabled={isLoading}
        className={`
          flex items-center gap-1 text-sm px-2 py-1 rounded border transition-all duration-200
          ${
            userVote === -1
              ? 'border-red-500 bg-red-500/10 text-red-400'
              : 'border-slate-700 text-slate-400 hover:bg-slate-800'
          }
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      >
        <span>▼</span>
        <span className="font-medium">{downvotes}</span>
      </button>
    </div>
  );
}
