"use client";

import { useState, useEffect, useRef } from "react";
import { useWebSocket } from "@/hooks/use-websocket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ChatMessage {
  id: string;
  sessionId: string;
  senderId: string;
  content: string;
  type: "text" | "icebreaker" | "system";
  createdAt: Date;
}

interface ChatRoomProps {
  sessionId: string;
  currentUserId: string;
  partnerId: string;
}

export function ChatRoom({
  sessionId,
  currentUserId,
  partnerId,
}: ChatRoomProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [icebreakers, setIcebreakers] = useState<string[]>([]);
  const [loadingIcebreakers, setLoadingIcebreakers] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { isConnected, lastMessage, sendMessage } = useWebSocket();

  // Load conversation history
  useEffect(() => {
    async function loadHistory() {
      try {
        const response = await fetch(`/api/chat/${sessionId}/messages`);
        if (response.ok) {
          const data = await response.json();
          setMessages(data.messages || []);
        }
      } catch (error) {
        console.error("Error loading history:", error);
      }
    }
    loadHistory();
  }, [sessionId]);

  // Handle incoming WebSocket messages
  useEffect(() => {
    if (lastMessage && lastMessage.sessionId === sessionId) {
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        sessionId: lastMessage.sessionId,
        senderId: lastMessage.senderId || currentUserId,
        content: lastMessage.content || "",
        type:
          lastMessage.type === "text" ||
          lastMessage.type === "system" ||
          lastMessage.type === "icebreaker"
            ? lastMessage.type
            : "text",
        createdAt: new Date(lastMessage.timestamp || Date.now()),
      };
      setMessages((prev) => [...prev, newMessage]);
    }
  }, [lastMessage, sessionId, currentUserId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const messageData = {
      type: "chat_message",
      sessionId,
      senderId: currentUserId,
      content: inputValue.trim(),
      timestamp: Date.now(),
    };

    // Send via WebSocket
    sendMessage(messageData);

    // Also save to backend
    try {
      await fetch(`/api/chat/${sessionId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: currentUserId,
          content: inputValue.trim(),
        }),
      });
    } catch (error) {
      console.error("Error sending message:", error);
    }

    setInputValue("");
  };

  const handleGenerateIcebreakers = async () => {
    setLoadingIcebreakers(true);
    try {
      const conversationHistory = messages.map((m) => m.content);
      const response = await fetch("/api/icebreakers/contextual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationHistory,
          sessionId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setIcebreakers(data.icebreakers || []);
      }
    } catch (error) {
      console.error("Error generating icebreakers:", error);
    } finally {
      setLoadingIcebreakers(false);
    }
  };

  const handleUseIcebreaker = (icebreaker: string) => {
    setInputValue(icebreaker);
    setIcebreakers([]);
  };

  return (
    <div className="flex flex-col h-[600px] max-w-2xl mx-auto border rounded-lg">
      {/* Header */}
      <div className="p-4 border-b bg-muted/50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Chat Room</h2>
            <p className="text-sm text-muted-foreground">
              {isConnected ? "🟢 Connected" : "🔴 Disconnected"}
            </p>
          </div>
          <Button
            onClick={handleGenerateIcebreakers}
            disabled={loadingIcebreakers || messages.length === 0}
            variant="outline"
            size="sm"
          >
            {loadingIcebreakers ? "Loading..." : "💡 Get Icebreakers"}
          </Button>
        </div>
      </div>

      {/* Icebreakers */}
      {icebreakers.length > 0 && (
        <div className="p-4 bg-blue-50 dark:bg-blue-950 border-b space-y-2">
          <p className="text-sm font-medium">Suggested questions:</p>
          {icebreakers.map((ice, idx) => (
            <button
              key={idx}
              onClick={() => handleUseIcebreaker(ice)}
              className="block w-full text-left p-2 text-sm rounded bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              {ice}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <p>No messages yet. Start the conversation!</p>
            <Button
              onClick={handleGenerateIcebreakers}
              disabled={loadingIcebreakers}
              variant="outline"
              className="mt-4"
            >
              Get Starter Questions
            </Button>
          </div>
        )}

        {messages.map((message) => {
          const isMe = message.senderId === currentUserId;
          return (
            <div
              key={message.id}
              className={`flex ${isMe ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[70%] rounded-lg px-4 py-2 ${
                  isMe
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                <p className="text-sm">{message.content}</p>
                <p className="text-xs mt-1 opacity-70">
                  {new Date(message.createdAt).toLocaleTimeString()}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
          placeholder="Type a message..."
          className="flex-1"
        />
        <Button onClick={handleSendMessage} disabled={!inputValue.trim()}>
          Send
        </Button>
      </div>
    </div>
  );
}
