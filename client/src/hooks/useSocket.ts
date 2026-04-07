import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

let socket: Socket | null = null;

function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
  }
  return socket;
}

interface UseSocketOptions {
  postId?: string;
  onVoteUpdated?: (data: { postId: string; voteCount: number }) => void;
  onCommentAdded?: (data: { postId: string; comment: any }) => void;
  onCommentUpdated?: (data: { postId: string; comment: any }) => void;
  onCommentDeleted?: (data: { postId: string; commentId: string }) => void;
}

export default function useSocket({
  postId,
  onVoteUpdated,
  onCommentAdded,
  onCommentUpdated,
  onCommentDeleted,
}: UseSocketOptions) {
  const callbacksRef = useRef({ onVoteUpdated, onCommentAdded, onCommentUpdated, onCommentDeleted });
  callbacksRef.current = { onVoteUpdated, onCommentAdded, onCommentUpdated, onCommentDeleted };

  useEffect(() => {
    if (!postId) return;

    const s = getSocket();
    s.emit('join-post', postId);

    const handleVote = (data: any) => callbacksRef.current.onVoteUpdated?.(data);
    const handleCommentAdd = (data: any) => callbacksRef.current.onCommentAdded?.(data);
    const handleCommentUpdate = (data: any) => callbacksRef.current.onCommentUpdated?.(data);
    const handleCommentDelete = (data: any) => callbacksRef.current.onCommentDeleted?.(data);

    s.on('vote-updated', handleVote);
    s.on('comment-added', handleCommentAdd);
    s.on('comment-updated', handleCommentUpdate);
    s.on('comment-deleted', handleCommentDelete);

    return () => {
      s.emit('leave-post', postId);
      s.off('vote-updated', handleVote);
      s.off('comment-added', handleCommentAdd);
      s.off('comment-updated', handleCommentUpdate);
      s.off('comment-deleted', handleCommentDelete);
    };
  }, [postId]);
}
