"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useWebSocket } from "@/hooks/use-websocket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users,
  MessageCircle,
  Crown,
  Settings,
  Send,
  Sparkles,
  MoreHorizontal,
  Flag,
} from "lucide-react";

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
  const processedMessageIds = useRef<Set<string>>(new Set());
  const router = useRouter();

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

  // Handle incoming WebSocket messages (only from partner)
  useEffect(() => {
    if (
      !lastMessage ||
      lastMessage.sessionId !== sessionId ||
      lastMessage.senderId === currentUserId
    ) {
      return;
    }

    const messageId =
      lastMessage.timestamp?.toString() || Date.now().toString();

    // Check if we've already processed this message
    if (processedMessageIds.current.has(messageId)) {
      return;
    }

    // Mark as processed
    processedMessageIds.current.add(messageId);

    const newMessage: ChatMessage = {
      id: messageId,
      sessionId: lastMessage.sessionId,
      senderId: lastMessage.senderId || partnerId,
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
  }, [lastMessage, sessionId, currentUserId, partnerId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const content = inputValue.trim();
    const timestamp = Date.now();

    // Add message immediately to UI
    const newMessage: ChatMessage = {
      id: timestamp.toString(),
      sessionId,
      senderId: currentUserId,
      content,
      type: "text",
      createdAt: new Date(timestamp),
    };
    setMessages((prev) => [...prev, newMessage]);
    setInputValue("");

    const messageData = {
      type: "chat_message",
      sessionId,
      senderId: currentUserId,
      content,
      timestamp,
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
          content,
        }),
      });
    } catch (error) {
      console.error("Error sending message:", error);
    }
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
  };

  const handleNextStranger = () => {
    // Clear session from localStorage
    localStorage.removeItem(`activeSession_${currentUserId}`);

    // TODO: Implement skip/next logic - end current session
    window.location.reload();
  };

  const handleReport = async () => {
    const reason = prompt("Why are you reporting this user?");
    if (!reason) return;

    try {
      await fetch(`/api/chat/${sessionId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reporterId: currentUserId,
          reportedUserId: partnerId,
          reason,
          sessionId,
        }),
      });
      alert("Report submitted. Thank you for keeping our community safe.");
    } catch (error) {
      console.error("Error reporting user:", error);
      alert("Failed to submit report. Please try again.");
    }
  };

  return (
    <div className="flex h-screen bg-[#0f0f1e]">
      {/* Sidebar */}
      <div className="w-64 bg-[#16162a] border-r border-white/10 flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-purple-500" />
            StrangerChat
          </h1>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          <button
            onClick={() => router.push("/chat")}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-purple-600 text-white font-medium"
          >
            <MessageCircle className="w-5 h-5" />
            Active Chat
          </button>
          {/* <button
            onClick={() => router.push("/dashboard")}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-white/5 transition"
          >
            <Users className="w-5 h-5" />
            Matches
            <span className="ml-auto bg-purple-600 text-white text-xs px-2 py-1 rounded-full">
              3
            </span>
          </button> */}
          <button
            onClick={() => router.push("/premium")}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-white/5 transition"
          >
            <Crown className="w-5 h-5" />
            Premium
          </button>
          <button
            onClick={() => router.push("/settings")}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-white/5 transition"
          >
            <Settings className="w-5 h-5" />
            Settings
          </button>
        </nav>

        {/* User profile at bottom */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
              {currentUserId.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-medium text-white truncate">You</p>
              <p className="text-xs text-gray-500">Online</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative">
        {/* Chat Header */}
        <div className="bg-[#16162a] border-b border-white/10 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-lg">
                Stranger #{partnerId.slice(-4)}
              </h2>
              <p className="text-sm text-gray-400">
                {isConnected ? "🟢 Connected" : "🔴 Disconnected"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReport}
              className="p-2 text-gray-400 hover:text-red-400 hover:bg-white/5 rounded-lg transition"
              title="Report user"
            >
              <Flag className="w-5 h-5" />
            </button>
            <Button
              onClick={handleNextStranger}
              className="bg-purple-600 hover:bg-purple-700 text-white font-medium"
            >
              Next Stranger →
            </Button>
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 my-scroll-container">
          {/* System message */}
          <div className="flex justify-center">
            <div className="bg-white/5 text-gray-400 text-xs px-4 py-2 rounded-full">
              TODAY 10:23 AM
            </div>
          </div>
          <div className="flex justify-center">
            <div className="bg-white/5 text-gray-400 text-xs px-4 py-2 rounded-full">
              You are now chatting with a random stranger. Say hi! 👋
            </div>
          </div>

          {messages.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">
                No messages yet. Start the conversation!
              </p>
            </div>
          )}

          {messages.map((message) => {
            const isMe = message.senderId === currentUserId;
            return (
              <div
                key={message.id}
                className={`flex gap-4 ${
                  isMe ? "flex-row-reverse" : "flex-row"
                }`}
              >
                {/* Message bubble */}
                <div className="flex flex-col max-w-[65%]">
                  <div
                    className={`px-5 py-3.5 rounded-2xl ${
                      isMe
                        ? "bg-purple-600 text-white rounded-tr-sm"
                        : "bg-[#2a2a3e] text-gray-100 rounded-tl-sm"
                    }`}
                  >
                    <p className="text-base leading-relaxed">
                      {message.content}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* AI Conversation Starters - Overlay */}
        {icebreakers.length > 0 && (
          <div className="absolute bottom-28 left-0 right-0 px-6 py-4 bg-[#16162a] border-t border-white/10 shadow-2xl z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                  AI Conversation Starters
                </span>
              </div>
              <button
                onClick={() => setIcebreakers([])}
                className="text-xs text-gray-500 hover:text-gray-300"
              >
                ✕
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 my-scroll-container">
              {icebreakers.map((ice, idx) => (
                <button
                  key={idx}
                  onClick={() => handleUseIcebreaker(ice)}
                  className="px-4 py-2.5 bg-[#2a2a3e] hover:bg-purple-600 hover:text-white text-gray-300 text-sm rounded-lg transition whitespace-nowrap flex-shrink-0"
                >
                  {ice}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message Input */}
        <div className="bg-[#16162a] border-t border-white/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleGenerateIcebreakers}
              disabled={loadingIcebreakers}
              className="p-3 text-gray-400 hover:text-purple-400 hover:bg-white/5 rounded-lg transition disabled:opacity-50"
              title="Get AI suggestions"
            >
              <Sparkles className="w-5 h-5" />
            </button>
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) =>
                e.key === "Enter" && !e.shiftKey && handleSendMessage()
              }
              placeholder="Type a message..."
              className="flex-1 bg-[#0f0f1e] border-white/10 text-white placeholder:text-gray-500 focus:border-purple-500"
            />
            <button className="p-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition">
              <MoreHorizontal className="w-5 h-5" />
            </button>
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim()}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 font-medium"
            >
              Send →
            </Button>
          </div>
          <p className="text-xs text-gray-600 mt-2 text-center">
            Chats are anonymous and encrypted.{" "}
            <span className="underline cursor-pointer">
              Community Guidelines
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
