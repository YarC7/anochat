"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChatRoom } from "@/components/chat-room";
import { useWebSocket } from "@/hooks/use-websocket";

export function MatchingLobby({ userId }: { userId: string }) {
  const [isSearching, setIsSearching] = useState(false);
  const [matchFound, setMatchFound] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [queueCount, setQueueCount] = useState(0);

  const { isConnected, lastMessage } = useWebSocket();

  // Restore active session from localStorage on mount
  useEffect(() => {
    const storedSession = localStorage.getItem(`activeSession_${userId}`);
    if (storedSession) {
      try {
        const { sessionId: savedSessionId, partnerId: savedPartnerId } =
          JSON.parse(storedSession);

        // Verify session is still active
        fetch(`/api/chat/${savedSessionId}/status`)
          .then((res) => res.json())
          .then((data) => {
            if (data.status === "active") {
              setSessionId(savedSessionId);
              setPartnerId(savedPartnerId);
              setMatchFound(true);
            } else {
              // Session ended, clear localStorage
              localStorage.removeItem(`activeSession_${userId}`);
            }
          })
          .catch(() => {
            localStorage.removeItem(`activeSession_${userId}`);
          });
      } catch (error) {
        console.error("Error restoring session:", error);
      }
    }
  }, [userId]);

  // Listen for match notifications via WebSocket
  useEffect(() => {
    if (!lastMessage) return;

    // Handle session ended by partner
    if (
      lastMessage.type === "session_ended" &&
      lastMessage.sessionId === sessionId
    ) {
      // Partner left the room
      localStorage.removeItem(`activeSession_${userId}`);
      alert("Your chat partner has left the conversation.");
      window.location.reload();
      return;
    }

    if (lastMessage.type !== "match_found") return;

    // Support both shapes: { type: 'match_found', payload: {...} } and flat { type: 'match_found', userId: '...', sessionId: '...', partnerId: '...' }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = (lastMessage as any).payload ?? lastMessage;

    console.debug("MatchingLobby received match_found payload:", payload);

    if (payload?.userId === userId) {
      // Use queueMicrotask to defer state updates and avoid cascading renders
      queueMicrotask(() => {
        const newSessionId = payload.sessionId || null;
        const newPartnerId = payload.partnerId || null;

        setSessionId(newSessionId);
        setPartnerId(newPartnerId);
        setMatchFound(true);
        setIsSearching(false);

        // Save to localStorage for persistence
        if (newSessionId && newPartnerId) {
          localStorage.setItem(
            `activeSession_${userId}`,
            JSON.stringify({
              sessionId: newSessionId,
              partnerId: newPartnerId,
            })
          );
        }
      });
    }
  }, [lastMessage, userId, sessionId]);

  // Poll queue stats while searching
  useEffect(() => {
    if (!isSearching) return;

    // Fetch immediately when starting
    const fetchQueue = async () => {
      try {
        const response = await fetch("/api/matching/queue");
        if (response.ok) {
          const data = await response.json();
          setQueueCount(data.count);
        }
      } catch (error) {
        console.error("Error fetching queue stats:", error);
      }
    };

    fetchQueue(); // Initial fetch

    const interval = setInterval(fetchQueue, 2000);

    return () => clearInterval(interval);
  }, [isSearching]);

  const startMatching = async () => {
    setIsSearching(true);

    try {
      const response = await fetch("/api/matching/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        const data = await response.json();

        if (data.matched) {
          setSessionId(data.sessionId);
          setPartnerId(data.partnerId);
          setMatchFound(true);
          setIsSearching(false);

          // Save to localStorage for persistence
          localStorage.setItem(
            `activeSession_${userId}`,
            JSON.stringify({
              sessionId: data.sessionId,
              partnerId: data.partnerId,
            })
          );
        } else {
          // User added to queue, WebSocket will notify when matched
          // Continue showing searching state
        }
      }
    } catch (error) {
      console.error("Error joining queue:", error);
      setIsSearching(false);
    }
  };

  const cancelMatching = async () => {
    try {
      await fetch("/api/matching/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
    } catch (error) {
      console.error("Error leaving queue:", error);
    }
    setIsSearching(false);
  };

  if (matchFound && sessionId && partnerId) {
    return (
      <ChatRoom
        sessionId={sessionId}
        currentUserId={userId}
        partnerId={partnerId}
      />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#1a1a2e] px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 mb-4 shadow-lg shadow-purple-500/20">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            Anonymous Chat
          </h2>
          <p className="text-gray-400 text-lg">
            {isSearching
              ? "Finding you a chat partner..."
              : "Ready to meet someone new?"}
          </p>
        </div>

        {/* Connection Status */}
        {!isConnected && !isSearching && (
          <div className="flex items-center justify-center gap-2 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 animate-pulse">
            <div className="w-2 h-2 rounded-full bg-yellow-500 animate-ping" />
            <span className="text-sm text-yellow-400 font-medium">
              Connecting to server...
            </span>
          </div>
        )}

        {/* Waiting Room */}
        {isSearching ? (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* Queue Status Card */}
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#16162a] shadow-xl">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-indigo-500/10" />

              <div className="relative p-8 space-y-6">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-white">
                    <svg
                      className="w-5 h-5 text-purple-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                      />
                    </svg>
                    Waiting Room
                  </h3>
                  <span
                    className={`text-sm font-medium px-3 py-1 rounded-full ${
                      isConnected
                        ? "bg-green-500/20 text-green-400"
                        : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    <span
                      className={`inline-block w-1.5 h-1.5 rounded-full mr-2 ${
                        isConnected
                          ? "bg-green-500 animate-pulse"
                          : "bg-red-500"
                      }`}
                    />
                    {isConnected ? "Connected" : "Disconnected"}
                  </span>
                </div>

                {/* Animated Spinner */}
                <div className="flex items-center justify-center py-4">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full border-4 border-white/5 animate-pulse" />
                    <div className="absolute inset-0 w-24 h-24 rounded-full border-4 border-transparent border-t-purple-500 border-r-indigo-500 animate-spin" />
                    <div
                      className="absolute inset-3 w-18 h-18 rounded-full border-4 border-transparent border-t-indigo-400 border-r-purple-400 animate-spin animation-delay-150"
                      style={{ animationDirection: "reverse" }}
                    />
                  </div>
                </div>

                {/* Queue Count */}
                <div className="text-center space-y-3 py-4">
                  <div className="flex flex-col items-center gap-3">
                    {/* Main Queue Number */}
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 blur-2xl opacity-30 animate-pulse" />
                      <div className="relative px-8 py-4 rounded-2xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/30">
                        <span className="text-6xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
                          {queueCount}
                        </span>
                      </div>
                    </div>

                    {/* Queue Label */}
                    <div className="space-y-1">
                      <p className="text-base text-white font-semibold">
                        {queueCount === 0 && "No users waiting"}
                        {queueCount === 1 && "1 person in queue"}
                        {queueCount > 1 && `${queueCount} people in queue`}
                      </p>
                      <p className="text-xs text-gray-500">
                        {queueCount === 0 && "You're the first one here!"}
                        {queueCount === 1 && "You'll be matched soon"}
                        {queueCount > 1 &&
                          "High activity - quick match expected!"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Status Messages */}
                <div className="space-y-2 text-center">
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" />
                      <span
                        className="w-2 h-2 rounded-full bg-purple-500 animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      />
                      <span
                        className="w-2 h-2 rounded-full bg-purple-500 animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      />
                    </div>
                    <span>Searching for a chat partner...</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    This usually takes less than 30 seconds
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={cancelMatching}
              variant="outline"
              size="lg"
              className="w-full h-12 text-base mb-4"
            >
              Cancel Matching
            </Button>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-500">
            <Button
              onClick={startMatching}
              size="lg"
              disabled={!isConnected}
              className="w-full h-14 text-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isConnected ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                  Start Matching
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Connecting...
                </span>
              )}
            </Button>

            <div className="text-center">
              <p className="text-sm text-gray-400">
                You&apos;ll be matched with a random user
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Chat anonymously and make new friends
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
