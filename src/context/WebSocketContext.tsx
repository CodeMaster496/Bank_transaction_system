import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext.tsx';
import { LiveNotification } from '../types/banking.ts';

interface WebSocketContextType {
  isConnected: boolean;
  notifications: LiveNotification[];
  unreadCount: number;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  onBalanceUpdateCallbacks: React.MutableRefObject<Array<() => void>>;
}

const WebSocketContext = createContext<WebSocketContextType>({} as WebSocketContextType);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<LiveNotification[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const balanceCallbacks = useRef<Array<() => void>>([]);

  const addNotification = (notif: Omit<LiveNotification, 'id' | 'read' | 'timestamp'>) => {
    const item: LiveNotification = {
      ...notif,
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      read: false,
    };
    setNotifications((prev) => [item, ...prev].slice(0, 30));
  };

  const connect = useCallback(() => {
    if (!currentUser) return;

    if (wsRef.current) {
      wsRef.current.close();
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?userId=${currentUser.id}`;

    try {
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        setIsConnected(true);
        // Identify user
        socket.send(JSON.stringify({ type: 'IDENTIFY', userId: currentUser.id }));
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'BALANCE_UPDATED') {
            // Trigger callbacks to reload account balances
            balanceCallbacks.current.forEach((cb) => cb());
          } else if (data.type === 'TRANSFER_SENT') {
            addNotification({
              type: 'TRANSFER_SENT',
              title: 'Funds Sent Successfully',
              message: `Sent $${data.payload.transaction.amount} to ${data.payload.toName} (Ref: ${data.payload.transaction.referenceId})`,
              amount: data.payload.transaction.amount,
            });
          } else if (data.type === 'TRANSFER_RECEIVED') {
            addNotification({
              type: 'TRANSFER_RECEIVED',
              title: 'Funds Received via Live Stream',
              message: `Received $${data.payload.transaction.amount} from ${data.payload.fromName}!`,
              amount: data.payload.transaction.amount,
            });
            balanceCallbacks.current.forEach((cb) => cb());
          }
        } catch (e) {
          console.error('Error parsing WS message:', e);
        }
      };

      socket.onclose = () => {
        setIsConnected(false);
        // Exponential reconnect backoff
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      };

      socket.onerror = (err) => {
        console.warn('WebSocket connection notice:', err);
        socket.close();
      };
    } catch (err) {
      console.warn('WebSocket init exception:', err);
    }
  }, [currentUser]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <WebSocketContext.Provider
      value={{
        isConnected,
        notifications,
        unreadCount,
        markAllAsRead,
        clearNotifications,
        onBalanceUpdateCallbacks: balanceCallbacks,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => useContext(WebSocketContext);
