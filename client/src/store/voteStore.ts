import { create } from 'zustand';
import api from '../services/api';

interface VoteState {
  count: number;
  voted: boolean;
}

interface VoteStore {
  votes: Record<string, VoteState>;
  init: (postId: string, count: number, voted: boolean) => void;
  toggle: (postId: string) => void;
}

const pendingTimers: Record<string, ReturnType<typeof setTimeout>> = {};
const baseState: Record<string, { count: number; voted: boolean }> = {};

const useVoteStore = create<VoteStore>((set, get) => ({
  votes: {},

  init: (postId, count, voted) => {
    if (pendingTimers[postId]) return;
    set(s => ({ votes: { ...s.votes, [postId]: { count, voted } } }));
  },

  toggle: (postId) => {
    const current = get().votes[postId];
    if (!current) return;

    if (!pendingTimers[postId]) {
      baseState[postId] = { count: current.count, voted: current.voted };
    }

    const newVoted = !current.voted;
    const newCount = current.count + (current.voted ? -1 : 1);

    set(s => ({
      votes: {
        ...s.votes,
        [postId]: { count: newCount, voted: newVoted },
      },
    }));

    if (pendingTimers[postId]) {
      clearTimeout(pendingTimers[postId]);
    }

    pendingTimers[postId] = setTimeout(() => {
      const finalState = get().votes[postId];
      const base = baseState[postId];

      if (finalState.voted === base.voted) {
        delete pendingTimers[postId];
        delete baseState[postId];
        return;
      }

      api.post(`/votes/${postId}`).then(res => {
        if (res.data.success) {
          set(s => ({
            votes: {
              ...s.votes,
              [postId]: {
                count: res.data.data.post.voteCount,
                voted: finalState.voted,
              },
            },
          }));
        }
      }).catch(() => {
        set(s => ({
          votes: {
            ...s.votes,
            [postId]: { count: base.count, voted: base.voted },
          },
        }));
      }).finally(() => {
        delete pendingTimers[postId];
        delete baseState[postId];
      });
    }, 500);
  },
}));

export default useVoteStore;
