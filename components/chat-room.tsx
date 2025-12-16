"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useWebSocket } from "@/hooks/use-websocket";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users,
  MessageCircle,
  Crown,
  Settings,
  Sparkles,
  Flag,
  Menu,
  X,
  Mic,
  Square,
  Loader2,
} from "lucide-react";

interface ChatMessage {
  id: string;
  sessionId: string;
  senderId: string;
  content: string;
  type: "text" | "icebreaker" | "system" | "voice";
  createdAt: Date;
  audioUrl?: string;
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
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [isPremiumUser, setIsPremiumUser] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [usageInfo, setUsageInfo] = useState<{
    used: number;
    dailyLimit: number;
    cooldownRemaining: number;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const processedMessageIds = useRef<Set<string>>(new Set());
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();
  const { t, language } = useLanguage();

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

    // Fetch user plan/usage info
    async function loadPlan() {
      try {
        const res = await fetch(`/api/user/${currentUserId}/plan`);
        if (res.ok) {
          const data = await res.json();
          setIsPremiumUser(!!data.isPremium);
          setUsageInfo({
            used: data.used || 0,
            dailyLimit: data.dailyLimit || (data.isPremium ? 100 : 10),
            cooldownRemaining: data.cooldownRemaining || 0,
          });
        }
      } catch (err) {
        console.error("Error fetching plan info:", err);
      }
    }
    loadPlan();
  }, [sessionId, currentUserId]);

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
          language,
        }),
      });

      if (response.status === 429) {
        const err = await response.json();
        if (err.error === "Cooldown") {
          alert(
            `Please wait ${err.cooldownRemaining}s before generating again.`
          );
        } else if (err.error === "Limit reached") {
          alert(
            `Daily limit reached (${err.dailyLimit}). Upgrade to premium for more.`
          );
        } else {
          alert("Rate limit exceeded. Please try later.");
        }
        // refresh plan info
        const planRes = await fetch(`/api/user/${currentUserId}/plan`);
        if (planRes.ok) setUsageInfo(await planRes.json());
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setIcebreakers(data.icebreakers || []);
        if (data.usage) {
          // set usage and start cooldown timer if needed
          setUsageInfo({
            used: data.usage.used || 0,
            dailyLimit: data.usage.dailyLimit || (isPremiumUser ? 100 : 10),
            cooldownRemaining: data.usage.cooldown || 0,
          });
          if (data.usage.cooldown && data.usage.cooldown > 0) {
            let remaining = data.usage.cooldown;
            setUsageInfo((prev) =>
              prev ? { ...prev, cooldownRemaining: remaining } : prev
            );
            const interval = setInterval(() => {
              remaining -= 1;
              setUsageInfo((prev) =>
                prev
                  ? { ...prev, cooldownRemaining: Math.max(0, remaining) }
                  : prev
              );
              if (remaining <= 0) clearInterval(interval);
            }, 1000);
          }
        }
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

  const handleReport = () => {
    setShowReportForm(true);
  };

  const submitReport = async () => {
    if (!reportReason.trim()) return;

    setIsSubmittingReport(true);
    try {
      await fetch(`/api/chat/${sessionId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reporterId: currentUserId,
          reportedUserId: partnerId,
          reason: reportReason.trim(),
          sessionId,
        }),
      });
      setShowReportForm(false);
      setReportReason("");
      alert("Report submitted. Thank you for keeping our community safe.");
    } catch (error) {
      console.error("Error reporting user:", error);
      alert("Failed to submit report. Please try again.");
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const cancelReport = () => {
    setShowReportForm(false);
    setReportReason("");
  };

  // Upgrade modal handlers
  const handleUpgradeNow = () => {
    setShowUpgradeModal(false);
    router.push("/premium");
  };

  const handleCloseUpgrade = () => {
    setShowUpgradeModal(false);
  };

  const startRecording = async () => {
    if (!isPremiumUser) {
      if (
        confirm(
          "Voice messages are available for Premium users only. Upgrade now?"
        )
      ) {
        router.push("/premium");
      }
      return;
    }

    try {
      if (!isPremiumUser) {
        setShowUpgradeModal(true);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });

        // Upload to Cloudinary
        const formData = new FormData();
        formData.append("audio", audioBlob, "voice-message.webm");

        try {
          const uploadResponse = await fetch("/api/upload-audio", {
            method: "POST",
            body: formData,
          });

          if (!uploadResponse.ok) {
            if (uploadResponse.status === 403) {
              setShowUpgradeModal(true);
              return;
            }
            throw new Error("Failed to upload audio");
          }

          const { url: cloudinaryUrl } = await uploadResponse.json();

          // Send voice message with Cloudinary URL
          const timestamp = Date.now();
          const newMessage: ChatMessage = {
            id: timestamp.toString(),
            sessionId,
            senderId: currentUserId,
            content: "🎤 Voice message",
            type: "voice",
            audioUrl: cloudinaryUrl,
            createdAt: new Date(timestamp),
          };
          setMessages((prev) => [...prev, newMessage]);

          // Send via WebSocket
          const messageData = {
            type: "chat_message",
            sessionId,
            senderId: currentUserId,
            content: "🎤 Voice message",
            messageType: "voice",
            audioUrl: cloudinaryUrl,
            timestamp,
          };
          sendMessage(messageData);

          // Save to backend
          await fetch(`/api/chat/${sessionId}/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content: "🎤 Voice message",
              type: "voice",
              audioUrl: cloudinaryUrl,
            }),
          });
        } catch (error) {
          console.error("Error uploading voice message:", error);
          alert("Failed to send voice message. Please try again.");
        }

        // Clean up
        stream.getTracks().forEach((track) => track.stop());
        setRecordingTime(0);
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Start timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex h-screen bg-[#0f0f1e]">
      {/* Sidebar */}
      <div
        className={`bg-[#16162a] border-r border-white/10 flex flex-col transition-all duration-300 ${
          sidebarVisible ? "w-64" : "w-16"
        }`}
      >
        <div
          className={`p-6 flex items-center ${
            sidebarVisible ? "justify-between" : "justify-center"
          }`}
        >
          {sidebarVisible && (
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <MessageCircle className="w-6 h-6 text-purple-500" />
              AnoChat
            </h1>
          )}
          <button
            onClick={() => setSidebarVisible(!sidebarVisible)}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition"
            title={sidebarVisible ? t("hide_sidebar") : t("show_sidebar")}
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        <nav
          className={`flex-1 ${
            sidebarVisible ? "px-3" : "px-2"
          } space-y-1 mt-8`}
        >
          <button
            onClick={() => router.push("/chat")}
            className={`w-full flex items-center gap-3 rounded-lg bg-purple-600 text-white font-medium ${
              sidebarVisible ? "px-4 py-3" : "p-3 justify-center"
            }`}
            title={t("nav_activeChat")}
          >
            <MessageCircle className="w-5 h-5 shrink-0" />
            {sidebarVisible && <span>{t("nav_activeChat")}</span>}
          </button>
          <button
            onClick={() => router.push("/premium")}
            className={`w-full flex items-center gap-3 rounded-lg text-gray-400 hover:bg-white/5 transition ${
              sidebarVisible ? "px-4 py-3" : "p-3 justify-center"
            }`}
            title={t("nav_premium")}
          >
            <Crown className="w-5 h-5 shrink-0" />
            {sidebarVisible && <span>{t("nav_premium")}</span>}
          </button>
          <button
            onClick={() => router.push("/settings")}
            className={`w-full flex items-center gap-3 rounded-lg text-gray-400 hover:bg-white/5 transition ${
              sidebarVisible ? "px-4 py-3" : "p-3 justify-center"
            }`}
            title={t("nav_settings")}
          >
            <Settings className="w-5 h-5 shrink-0" />
            {sidebarVisible && <span>{t("nav_settings")}</span>}
          </button>
        </nav>

        {/* User profile at bottom
        {sidebarVisible && (
          <div className="p-4 ">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
                {currentUserId.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-medium text-white truncate">You</p>
                <p className="text-xs text-gray-500">{t("online")}</p>
              </div>
            </div>
          </div>
        )} */}
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
                {t("stranger")} #{partnerId.slice(-4)}
              </h2>
              <p className="text-sm text-gray-400">
                {isConnected
                  ? `🟢 ${t("connected")}`
                  : `🔴 ${t("disconnected")}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReport}
              className="p-2 text-gray-400 hover:text-red-400 hover:bg-white/5 rounded-lg transition"
              title={t("report_user")}
            >
              <Flag className="w-5 h-5" />
            </button>
            <Button
              onClick={handleNextStranger}
              className="bg-purple-600 hover:bg-purple-700 text-white font-medium"
            >
              {t("next_stranger")}
            </Button>
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 my-scroll-container">
          {/* System message */}
          <div className="flex justify-center">
            <div className="bg-white/5 text-gray-400 text-xs px-4 py-2 rounded-full">
              {t("today")} 10:23 AM
            </div>
          </div>
          <div className="flex justify-center">
            <div className="bg-white/5 text-gray-400 text-xs px-4 py-2 rounded-full">
              {t("chatting_with_stranger")}
            </div>
          </div>

          {messages.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">{t("no_messages")}</p>
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
                    className={`px-5 py-2 rounded-2xl ${
                      isMe
                        ? "bg-purple-600 text-white rounded-tr-sm"
                        : "bg-[#2a2a3e] text-gray-100 rounded-tl-sm"
                    }`}
                  >
                    {message.type === "voice" && message.audioUrl ? (
                      <audio controls className="h-8">
                        <source src={message.audioUrl} type="audio/webm" />
                      </audio>
                    ) : (
                      <p className="text-base leading-relaxed">
                        {message.content}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Report Form Modal */}
        {showReportForm && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-20 flex items-center justify-center p-6">
            <div className="bg-[#16162a] rounded-2xl border border-white/10 p-6 max-w-md w-full shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Flag className="w-5 h-5 text-red-400" />
                  Report User
                </h3>
                <button
                  onClick={cancelReport}
                  className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                {t("report_description", { stranger: partnerId.slice(-4) })}
              </p>
              <textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder={t("describe_issue")}
                rows={4}
                className="w-full bg-[#0f0f1e] border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:border-purple-500 focus:outline-none resize-none"
              />
              <div className="flex gap-3 mt-4">
                <Button
                  onClick={cancelReport}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-white"
                >
                  {t("cancel")}
                </Button>
                <Button
                  onClick={submitReport}
                  disabled={!reportReason.trim() || isSubmittingReport}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                >
                  {isSubmittingReport ? t("submitting") : t("submit_report")}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* AI Conversation Starters - Overlay */}
        {icebreakers.length > 0 && (
          <div className="absolute bottom-28 left-0 right-0 px-6 py-4 bg-[#16162a] border-t border-white/10 shadow-2xl z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                  {t("aiIcebreakers")}
                </span>
              </div>
              <button
                onClick={() => setIcebreakers([])}
                className="text-xs text-gray-500 hover:text-gray-300"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {icebreakers.map((ice, idx) => (
                <button
                  key={idx}
                  onClick={() => handleUseIcebreaker(ice)}
                  className="px-4 py-2.5 bg-[#2a2a3e] hover:bg-purple-600 hover:text-white text-gray-300 text-sm rounded-lg transition text-left truncate"
                >
                  {ice}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message Input */}
        <div className="bg-[#16162a] border-t border-white/10 px-6 py-4">
          {isRecording && (
            <div className="mb-3 flex items-center justify-center gap-3 text-red-400">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-medium">
                {t("recording")} {formatTime(recordingTime)}
              </span>
            </div>
          )}
          <div className="flex items-center gap-3">
            <button
              onClick={handleGenerateIcebreakers}
              disabled={
                loadingIcebreakers ||
                isRecording ||
                (usageInfo
                  ? usageInfo.used >= usageInfo.dailyLimit ||
                    usageInfo.cooldownRemaining > 0
                  : false)
              }
              className="p-2 text-gray-400 hover:text-purple-400 hover:bg-white/5 rounded-lg transition disabled:opacity-50"
              title={t("ai_suggestions")}
            >
              {loadingIcebreakers ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Sparkles className="w-5 h-5" />
              )}
            </button>
            <div className="text-xs text-gray-400">
              {usageInfo ? `${usageInfo.used}/${usageInfo.dailyLimit}` : ""}
              {usageInfo && usageInfo.cooldownRemaining > 0 && (
                <span className="ml-2 text-amber-400">
                  ({usageInfo.cooldownRemaining}s)
                </span>
              )}
            </div>
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) =>
                e.key === "Enter" && !e.shiftKey && handleSendMessage()
              }
              placeholder={t("placeholder_type_message")}
              disabled={isRecording}
              className="flex-1 bg-[#0f0f1e] border-white/10 text-white placeholder:text-gray-500 focus:border-purple-500 disabled:opacity-50"
            />
            {isRecording ? (
              <button
                onClick={stopRecording}
                className="p-3 text-red-400 hover:text-red-300 hover:bg-white/5 rounded-lg transition"
                title={t("recording")}
              >
                <Square className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={startRecording}
                className="p-3 text-gray-400 hover:text-purple-400 hover:bg-white/5 rounded-lg transition"
                title={t("voice_message")}
              >
                <Mic className="w-5 h-5" />
              </button>
            )}
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isRecording}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 font-medium disabled:opacity-50"
            >
              {t("send")}
            </Button>
          </div>
          <p className="text-xs text-gray-600 mt-2 text-center">
            {t("chats_anonymous")}{" "}
            <span className="underline cursor-pointer">
              {t("community_guidelines")}
            </span>
          </p>
        </div>

        {/* Upgrade Modal */}
        {showUpgradeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-[#0f0f1e] rounded-lg p-6 w-full max-w-md border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-2">
                Upgrade to Premium
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                Voice messages are available for Premium users. Upgrade to send
                voice messages and get higher AI limits.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleCloseUpgrade}
                  className="px-4 py-2 bg-white/5 text-white rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpgradeNow}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg"
                >
                  Upgrade
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
