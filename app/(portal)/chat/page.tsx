"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Message {
  id: number;
  text: string;
  sender: "stranger" | "user";
  timestamp?: string;
}

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "Hi there! I'm trying out the AI icebreakers, they're pretty cool. Have you used them yet?",
      sender: "stranger",
    },
    {
      id: 2,
      text: "Oh really? Which one did you get? I've been getting some funny ones lately. 😂",
      sender: "user",
    },
    {
      id: 3,
      text: 'It asked me "If animals could talk, which would be the rudest?". I think cats, definitely. They judge us silently already. 😼',
      sender: "stranger",
    },
    {
      id: 4,
      text: "Haha absolutely! Although a Llama spitting facts would be pretty brutal too. 🦙",
      sender: "user",
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(true);

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    const newMessage: Message = {
      id: messages.length + 1,
      text: inputMessage,
      sender: "user",
    };

    setMessages([...messages, newMessage]);
    setInputMessage("");
  };

  const handleAiStarter = (text: string) => {
    setInputMessage(text);
  };

  const handleNextStranger = () => {
    // TODO: Implement next stranger logic
    router.push("/preferences");
  };

  return (
    <div className="flex h-screen bg-[#1a1a2e] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-[#16162a] border-r border-white/10 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-xl">
                chat
              </span>
            </div>
            <span className="text-white font-bold text-lg">StrangerChat</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          <NavItem icon="chat_bubble" label="Active Chat" active />
          <NavItem icon="people" label="Matches" badge="2" />
          <NavItem icon="workspace_premium" label="Premium" />
          <NavItem icon="settings" label="Settings" />
        </nav>

        {/* User Profile */}
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-pink-400 flex items-center justify-center">
                <span className="text-white font-semibold">S</span>
              </div>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#16162a]"></div>
            </div>
            <div className="flex-1">
              <p className="text-white font-semibold text-sm">Sarah_99</p>
              <p className="text-green-500 text-xs flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                Online
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <header className="bg-[#16162a] border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-[#2a2a44] flex items-center justify-center">
              <span className="material-symbols-outlined text-gray-400">
                person
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-white font-semibold">Stranger #4291</h2>
                <span className="text-xs bg-purple-600/20 text-purple-400 px-2 py-0.5 rounded font-medium">
                  MATCHED
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Interest match:{" "}
                <span className="text-purple-400">Sci-Fi Movies</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="p-2 hover:bg-white/5 rounded-lg transition-colors">
              <span className="material-symbols-outlined text-gray-400">
                volume_off
              </span>
            </button>
            <button className="p-2 hover:bg-white/5 rounded-lg transition-colors">
              <span className="material-symbols-outlined text-gray-400">
                flag
              </span>
            </button>
            <button
              onClick={handleNextStranger}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
            >
              <span>Next Stranger</span>
              <span className="material-symbols-outlined text-lg">
                skip_next
              </span>
            </button>
          </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 my-scroll-container">
          {/* Timestamp */}
          <div className="flex justify-center">
            <span className="text-xs text-gray-500 bg-[#16162a] px-3 py-1 rounded-full">
              TODAY 10:23 AM
            </span>
          </div>

          {/* System Message */}
          <div className="flex justify-center">
            <p className="text-sm text-gray-400 bg-[#16162a] px-4 py-2 rounded-lg">
              You are now chatting with a random stranger. Say hi! 👋
            </p>
          </div>

          {/* Chat Messages */}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.sender === "user" ? "flex-row-reverse" : ""
              }`}
            >

              {/* Message Bubble */}
              <div
                className={`max-w-md px-4 py-3 rounded-2xl ${
                  message.sender === "stranger"
                    ? "bg-[#2a2a44] text-white"
                    : "bg-gradient-to-r from-purple-600 to-indigo-600 text-white"
                }`}
              >
                <p className="text-sm leading-relaxed">{message.text}</p>
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-[#2a2a44] flex items-center justify-center">
                  <span className="material-symbols-outlined text-gray-400 text-sm">
                    person
                  </span>
                </div>
              </div>
              <div className="bg-[#2a2a44] px-5 py-3 rounded-2xl">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </div>
              </div>
            </div>
          )}

          {/* AI Conversation Starters */}
          <div className="pt-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-purple-400 text-sm">
                auto_awesome
              </span>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                AI Conversation Starters
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <StarterButton
                icon="sentiment_very_satisfied"
                text="Tell me a dad joke"
                onClick={() => handleAiStarter("Tell me a dad joke")}
              />
              <StarterButton
                text="Would you rather...? 🤔"
                onClick={() => handleAiStarter("Would you rather...?")}
              />
              <StarterButton
                text="Best travel story 🏝️"
                onClick={() =>
                  handleAiStarter("What's your best travel story?")
                }
              />
              <StarterButton
                text="Movie recommendation 🎬"
                onClick={() => handleAiStarter("Any movie recommendations?")}
              />
            </div>
          </div>
        </div>

        {/* Input Area */}
        <div className="bg-[#16162a] border-t border-white/10 px-6 py-2">
          <div className="flex items-center gap-3">
            <button className="p-2 hover:bg-white/5 rounded-lg transition-colors">
              <span className="material-symbols-outlined text-gray-400">
                add_circle
              </span>
            </button>
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="Type a message..."
              className="flex-1 bg-[#2a2a44] text-white placeholder-gray-500 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600"
            />
            <button className="p-2 hover:bg-white/5 rounded-lg transition-colors">
              <span className="material-symbols-outlined text-gray-400">
                mood
              </span>
            </button>
            <button
              onClick={handleSendMessage}
              className="p-3 bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors"
            >
              <span className="material-symbols-outlined text-white">send</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface NavItemProps {
  icon: string;
  label: string;
  active?: boolean;
  badge?: string;
}

function NavItem({ icon, label, active, badge }: NavItemProps) {
  return (
    <button
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
        active
          ? "bg-purple-600 text-white"
          : "text-gray-400 hover:bg-white/5 hover:text-white"
      }`}
    >
      <span className="material-symbols-outlined text-xl">{icon}</span>
      <span className="font-medium text-sm flex-1 text-left">{label}</span>
      {badge && (
        <span className="bg-purple-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </button>
  );
}

interface StarterButtonProps {
  icon?: string;
  text: string;
  onClick: () => void;
}

function StarterButton({ icon, text, onClick }: StarterButtonProps) {
  return (
    <button
      onClick={onClick}
      className="bg-[#2a2a44] hover:bg-[#323252] text-white text-sm px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
    >
      {icon && (
        <span className="material-symbols-outlined text-base">{icon}</span>
      )}
      <span>{text}</span>
    </button>
  );
}
