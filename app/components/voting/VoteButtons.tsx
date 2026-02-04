'use client';

import { useState, useEffect } from 'react';
import { getAnonymousUserId } from '@/lib/client/anonymousUser';

interface VoteButtonsProps {
  postId: string;
  initialUpvotes: number;
  initialDownvotes: number;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export default function VoteButtons({
  postId,
  initialUpvotes,
  initialDownvotes,
  size = 'medium',
  className = '',
}: VoteButtonsProps) {
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [userVote, setUserVote] = useState<1 | -1 | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load user's previous vote from localStorage on mount
  useEffect(() => {
    const anonymousId = getAnonymousUserId();
    const storedVote = localStorage.getItem(`vote-${postId}`);
    if (storedVote === '1') {
      setUserVote(1);
    } else if (storedVote === '-1') {
      setUserVote(-1);
    }
  }, [postId]);

  const handleVote = async (direction: 1 | -1) => {
    if (isLoading) return;

    const anonymousId = getAnonymousUserId();
    const previousVote = userVote;
    const previousUpvotes = upvotes;
    const previousDownvotes = downvotes;

    // Optimistic update
    if (userVote === direction) {
      // User clicked same vote - no change (already voted)
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
      const response = await fetch(`/api/posts/${postId}/vote-web`, {
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
      localStorage.setItem(`vote-${postId}`, String(direction));
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

  const score = upvotes - downvotes;

  const sizeClasses = {
    small: 'text-sm px-3 py-1.5',
    medium: 'text-base px-4 py-2',
    large: 'text-lg px-5 py-3',
  };

  const buttonClass = sizeClasses[size];

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <button
        onClick={() => handleVote(1)}
        disabled={isLoading}
        className={`
          flex items-center gap-2 rounded-lg border transition-all duration-200
          ${buttonClass}
          ${
            userVote === 1
              ? 'border-blue-500 bg-blue-500/10 text-blue-400'
              : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
          }
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      >
        <span className="text-lg">▲</span>
        <span className="font-semibold">{upvotes}</span>
      </button>

      <button
        onClick={() => handleVote(-1)}
        disabled={isLoading}
        className={`
          flex items-center gap-2 rounded-lg border transition-all duration-200
          ${buttonClass}
          ${
            userVote === -1
              ? 'border-red-500 bg-red-500/10 text-red-400'
              : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
          }
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      >
        <span className="text-lg">▼</span>
        <span className="font-semibold">{downvotes}</span>
      </button>

      <div className="text-slate-500 text-sm">
        Score: {score}
      </div>
    </div>
  );
}
