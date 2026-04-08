import { create } from 'zustand';
import api from '../services/api';

interface VoteStore {
  // postId -> { count, voted }
  votes: Record<string, { count: number; voted: boolean }>;
  init: (postId: string, count: number, voted: boolean) => void;
  toggle: (postId: string) => void;
}

const useVoteStore = create<VoteStore>((set, get) => ({
  votes: {},

  init: (postId, count, voted) => {
    // Always sync with server data — server is authoritative
    set(s => ({ votes: { ...s.votes, [postId]: { count, voted } } }));
  },

  toggle: (postId) => {
    const current = get().votes[postId];
    if (!current) return;

    const prevVoted = current.voted;
    const prevCount = current.count;

    // Optimistic update — instant everywhere
    set(s => ({
      votes: {
        ...s.votes,
        [postId]: { count: prevCount + (prevVoted ? -1 : 1), voted: !prevVoted },
      },
    }));

    // Fire API in background
    api.post(`/votes/${postId}`).then(res => {
      if (res.data.success) {
        // Sync with server's authoritative count
        set(s => ({
          votes: {
            ...s.votes,
            [postId]: { count: res.data.data.post.voteCount, voted: !prevVoted },
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
