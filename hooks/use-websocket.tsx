"use client";

import { useEffect, useState, useRef, useCallback } from "react";

export interface WebSocketMessage {
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any;
  sessionId?: string;
  senderId?: string;
  content?: string;
  timestamp?: number;
}

interface UseWebSocketOptions {
  url?: string;
  reconnect?: boolean;
  reconnectInterval?: number;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    url = typeof window !== "undefined"
        ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}/ws`
      : "ws://localhost:8080",
    reconnect = true,
    reconnectInterval = 3000,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const isConnectingRef = useRef(false);
  const retryCountRef = useRef(0);
  const maxRetries = 5; // Max 5 retries before giving up

  const connect = useCallback(() => {
    // Prevent multiple simultaneous connection attempts
    if (isConnectingRef.current) {
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    // Close existing connection if any
    if (wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    isConnectingRef.current = true;

    try {
      // console.log("Connecting to WebSocket:", url);
      const ws = new WebSocket(url);

      ws.onopen = () => {
        // console.log("✓ WebSocket connected");
        setIsConnected(true);
        isConnectingRef.current = false;
        retryCountRef.current = 0; // Reset retry count on successful connection
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          setLastMessage(message);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      ws.onclose = (event) => {
        console.log("WebSocket disconnected", event.code, event.reason);
        setIsConnected(false);
        isConnectingRef.current = false;

        if (reconnect) {
          retryCountRef.current++;

          if (retryCountRef.current > maxRetries) {
            console.error(
              `WebSocket failed to connect after ${maxRetries} attempts. Giving up.`
            );
            console.warn(
              "Please ensure WebSocket server is running: npm run start:ws"
            );
            return;
          }

          // Exponential backoff: 3s, 6s, 12s, 24s, 30s (max)
          const delay = Math.min(
            reconnectInterval * Math.pow(2, retryCountRef.current - 1),
            30000
          );
          console.log(
            `Reconnecting in ${delay}ms... (attempt ${retryCountRef.current}/${maxRetries})`
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };

      ws.onerror = (event) => {
        console.error("WebSocket error event:", {
          type: event.type,
          target: event.target,
          url: url,
        });
        isConnectingRef.current = false;
      };

      wsRef.current = ws;
    } catch (error) {
      console.error("Error creating WebSocket:", error);
      isConnectingRef.current = false;
    }
  }, [url, reconnect, reconnectInterval]);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket is not connected");
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    isConnectingRef.current = false;
    retryCountRef.current = 0; // Reset retry count on manual disconnect
  }, []);

  const manualReconnect = useCallback(() => {
    retryCountRef.current = 0; // Reset retry count for manual reconnect
    connect();
  }, [connect]);

  useEffect(() => {
    // Only connect once on mount
    console.log("useWebSocket mounted, initiating connection...");
    connect();

    return () => {
      // Cleanup on unmount
      console.log("useWebSocket unmounting, closing connection...");
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        // Set flag to prevent reconnection on cleanup
        wsRef.current.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run once

  return {
    isConnected,
    lastMessage,
    sendMessage,
    disconnect,
    reconnect: manualReconnect,
  };
}
