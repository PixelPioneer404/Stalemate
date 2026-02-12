import { io } from 'socket.io-client';

export const createSocketClient = () => {
  const explicitUrl = import.meta.env.VITE_SOCKET_URL;

  return io(explicitUrl || undefined, {
    autoConnect: false,
    transports: ['websocket', 'polling'],
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    forceNew: false,
    // Mobile-specific optimizations
    upgrade: true,
    rememberUpgrade: true,
    perMessageDeflate: false,
  });
};
