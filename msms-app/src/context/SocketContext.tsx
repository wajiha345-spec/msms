import React, {
  createContext, useContext,
  useEffect, useRef, useState
} from 'react';
import { useAuth } from './AuthContext';

// Lazy import socket — don't import at module level because
// on a cold restart the env var may not be set yet
let SocketIOClient: typeof import('socket.io-client').io | null = null;

type Socket = import('socket.io-client').Socket;

interface SocketContextType {
  socket:    Socket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null, connected: false,
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth();
  const socketRef          = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // 1. Wait for auth to finish reading AsyncStorage
    if (loading) return;

    // 2. No token — disconnect if connected, then stop
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setConnected(false);
      }
      return;
    }

    // 3. Check URL — skip socket entirely if not configured
    const url = process.env.EXPO_PUBLIC_SOCKET_URL;
    if (!url) {
      console.warn('EXPO_PUBLIC_SOCKET_URL not set — realtime disabled');
      return;
    }

    // 4. Already have a socket, don't create another
    if (socketRef.current) return;

    // 5. Lazy load the socket.io client
    const connect = async () => {
      try {
        if (!SocketIOClient) {
          const mod = await import('socket.io-client');
          SocketIOClient = mod.io;
        }

        const socket = SocketIOClient(url, {
          auth:              { token },
          reconnection:      true,
          reconnectionDelay: 2000,
          reconnectionAttempts: 5,
          timeout:           8000,
          transports:        ['websocket'],
        });

        socket.on('connect', () => {
          socket.emit('join', 'shop:main');
          setConnected(true);
        });

        socket.on('connect_error', (err: Error) => {
          // Silent — app works fine without realtime
          console.warn('Socket error (non-fatal):', err.message);
          setConnected(false);
        });

        socket.on('disconnect', () => {
          setConnected(false);
        });

        socketRef.current = socket;
      } catch (err) {
        // Socket failure must NEVER crash the app
        console.warn('Socket setup failed (non-fatal):', err);
      }
    };

    connect();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setConnected(false);
      }
    };
  }, [token, loading]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);