import { io } from 'socket.io-client';

export const createSocketClient = () => {
  const explicitUrl = import.meta.env.VITE_SOCKET_URL;

  return io(explicitUrl || undefined, {
    autoConnect: false,
    transports: ['websocket', 'polling'],
    withCredentials: true,
  });
};
