import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import useVoteStore from '../store/voteStore';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

let feedSocket: Socket | null = null;

function getSocket(): Socket {
  if (!feedSocket) {
    feedSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
  }
  return feedSocket;
}

type CommentCountListener = (postId: string, delta: number) => void;
const commentCountListeners = new Set<CommentCountListener>();

export function onCommentCountChanged(listener: CommentCountListener) {
  commentCountListeners.add(listener);
  return () => commentCountListeners.delete(listener);
}

/**
 * Global socket subscription for cross-page live updates.
 * Joins the 'feed' room once and syncs:
 *   - Vote counts into voteStore (auto-updates all post cards using the store)
 *   - Comment counts via onCommentCountChanged subscribers
 * Mount once at the app root when authenticated.
 */
export default function useFeedSocket(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    const s = getSocket();
    s.emit('join-feed');

    const handleVote = (data: { postId: string; voteCount: number }) => {
      if (data?.postId && typeof data.voteCount === 'number') {
        useVoteStore.getState().syncCount(data.postId, data.voteCount);
      }
    };
    const handleCommentCount = (data: { postId: string; delta: number }) => {
      if (!data?.postId || typeof data.delta !== 'number') return;
      commentCountListeners.forEach((fn) => fn(data.postId, data.delta));
    };

    s.on('vote-updated', handleVote);
    s.on('comment-count-changed', handleCommentCount);

    return () => {
      s.emit('leave-feed');
      s.off('vote-updated', handleVote);
      s.off('comment-count-changed', handleCommentCount);
    };
  }, [enabled]);
}
