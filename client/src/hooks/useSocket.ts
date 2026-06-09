import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getSocket } from '@/lib/socket';
import { useAuth } from '@/auth/useAuth';

export function useGlobalSocket() {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    if (!socket) return;

    const onNotification = (notif: any) => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications', 'unread'] });
      if (notif?.type === 'doubt.new') {
        toast.info('New doubt raised', {
          description: notif.payload?.title ?? 'A student raised a new doubt',
        });
      } else if (notif?.type === 'doubt.reply') {
        toast.info('New reply on your doubt', {
          description: notif.payload?.title ?? '',
        });
      }
    };
    const onDoubtUpdate = () => {
      qc.invalidateQueries({ queryKey: ['doubts'] });
    };
    const onMessage = (msg: any) => {
      qc.invalidateQueries({ queryKey: ['messages', 'contacts'] });
      qc.invalidateQueries({ queryKey: ['messages', 'unread'] });
      if (msg?.senderId) {
        qc.invalidateQueries({ queryKey: ['messages', 'thread', msg.senderId] });
      }
    };
    const onRoomMessage = (payload: any) => {
      if (payload?.roomId) {
        qc.invalidateQueries({ queryKey: ['rooms', payload.roomId, 'messages'] });
      }
      qc.invalidateQueries({ queryKey: ['rooms'] });
    };
    const onRoomUpdated = (payload: any) => {
      if (payload?.roomId) {
        qc.invalidateQueries({ queryKey: ['rooms', payload.roomId] });
      }
      qc.invalidateQueries({ queryKey: ['rooms'] });
    };

    socket.on('notification', onNotification);
    socket.on('doubt:new', onDoubtUpdate);
    socket.on('doubt:update', onDoubtUpdate);
    socket.on('message:new', onMessage);
    socket.on('room:message', onRoomMessage);
    socket.on('room:updated', onRoomUpdated);
    socket.on('room:invited', onRoomUpdated);
    socket.on('room:kicked', onRoomUpdated);
    socket.on('room:deleted', onRoomUpdated);

    return () => {
      socket.off('notification', onNotification);
      socket.off('doubt:new', onDoubtUpdate);
      socket.off('doubt:update', onDoubtUpdate);
      socket.off('message:new', onMessage);
      socket.off('room:message', onRoomMessage);
      socket.off('room:updated', onRoomUpdated);
      socket.off('room:invited', onRoomUpdated);
      socket.off('room:kicked', onRoomUpdated);
      socket.off('room:deleted', onRoomUpdated);
    };
  }, [user, qc]);
}
