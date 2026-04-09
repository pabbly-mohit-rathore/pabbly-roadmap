import { create } from 'zustand';
import api from '../services/api';

interface VoteState {
  count: number;
  voted: boolean;
  lockedUntil?: number; // timestamp — don't overwrite until this time
}

interface VoteStore {
  votes: Record<string, VoteState>;
  init: (postId: string, count: number, voted: boolean) => void;
  toggle: (postId: string) => void;
}

const useVoteStore = create<VoteStore>((set, get) => ({
  votes: {},

  init: (postId, count, voted) => {
    const existing = get().votes[postId];
    // Don't overwrite if there was a recent toggle (within 5 seconds)
    if (existing?.lockedUntil && Date.now() < existing.lockedUntil) {
      return;
    }
    set(s => ({ votes: { ...s.votes, [postId]: { count, voted } } }));
  },

  toggle: (postId) => {
    const current = get().votes[postId];
    if (!current) return;

    const prevVoted = current.voted;
    const prevCount = current.count;

    // Optimistic update — instant everywhere + lock for 5 seconds
    set(s => ({
      votes: {
        ...s.votes,
        [postId]: {
          count: prevCount + (prevVoted ? -1 : 1),
          voted: !prevVoted,
          lockedUntil: Date.now() + 5000,
        },
      },
    }));

    // Fire API in background
    api.post(`/votes/${postId}`).then(res => {
      if (res.data.success) {
        // Sync with server's authoritative count
        set(s => ({
          votes: {
            ...s.votes,
            [postId]: {
              count: res.data.data.post.voteCount,
              voted: !prevVoted,
            },
          },
        }));
      }
    }).catch(() => {
      // Revert on error
      set(s => ({
        votes: {
          ...s.votes,
          [postId]: { count: prevCount, voted: prevVoted },
        },
      }));
    });
  },
}));

export default useVoteStore;
