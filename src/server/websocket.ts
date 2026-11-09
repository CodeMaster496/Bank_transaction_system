import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';

interface ClientConnection {
  ws: WebSocket;
  userId?: number;
  isAlive: boolean;
}

const clients = new Set<ClientConnection>();

export function setupWebSocketServer(httpServer: Server) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const userIdParam = url.searchParams.get('userId');
    const parsedUserId = userIdParam ? parseInt(userIdParam, 10) : undefined;

    const client: ClientConnection = {
      ws,
      userId: !isNaN(parsedUserId as number) ? parsedUserId : undefined,
      isAlive: true,
    };

    clients.add(client);

    // Send initial connection ACK
    ws.send(
      JSON.stringify({
        type: 'SYSTEM_CONNECTED',
        payload: {
          timestamp: new Date().toISOString(),
          message: 'Connected to ApexVault Real-Time Financial Stream',
          activeSubscribers: clients.size,
        },
      })
    );

    ws.on('pong', () => {
      client.isAlive = true;
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === 'IDENTIFY' && message.userId) {
          client.userId = parseInt(message.userId, 10);
          ws.send(
            JSON.stringify({
              type: 'IDENTIFIED',
              payload: { userId: client.userId },
            })
          );
        } else if (message.type === 'PING') {
          ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
        }
      } catch (e) {
        // Ignore malformed client message
      }
    });

    ws.on('close', () => {
      clients.delete(client);
    });

    ws.on('error', (err) => {
      console.warn('WebSocket client error:', err);
      clients.delete(client);
    });
  });

  // Health-check interval every 30s
  const interval = setInterval(() => {
    for (const client of clients) {
      if (!client.isAlive) {
        client.ws.terminate();
        clients.delete(client);
      } else {
        client.isAlive = false;
        client.ws.ping();
      }
    }
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });

  return {
    broadcastUser(userId: number, event: string, payload: any) {
      const msg = JSON.stringify({ type: event, payload, timestamp: new Date().toISOString() });
      for (const client of clients) {
        if (client.userId === userId && client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(msg);
        }
      }
    },
    broadcastAll(event: string, payload: any) {
      const msg = JSON.stringify({ type: event, payload, timestamp: new Date().toISOString() });
      for (const client of clients) {
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(msg);
        }
      }
    },
  };
}

export type WSBroadcaster = ReturnType<typeof setupWebSocketServer>;
