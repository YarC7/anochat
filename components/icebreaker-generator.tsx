"use client";

import { useState } from "react";

interface UserPreferences {
  gender?: string;
  chatStyle?: string;
}

export function IcebreakerGenerator() {
  const [icebreakers, setIcebreakers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [chatStyle, setChatStyle] = useState<string>("friendly");
  const [conversationHistory, setConversationHistory] = useState<string>("");

  const generateIcebreakers = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/icebreakers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user1Prefs: { chatStyle },
          user2Prefs: { chatStyle },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate icebreakers");
      }

      const data = await response.json();
      setIcebreakers(data.icebreakers);
    } catch (error) {
      console.error("Error:", error);
      setIcebreakers([
        "What is the most interesting thing that happened to you this week?",
        "If you could travel anywhere right now, where would you go?",
        "What is your favorite way to spend a weekend?",
      ]);
    } finally {
      setLoading(false);
    }
  };

  const generateContextualIcebreakers = async () => {
    if (!conversationHistory.trim()) {
      alert("Please enter some conversation history first");
      return;
    }

    setLoading(true);
    try {
      const messages = conversationHistory
        .split("\n")
        .filter((line) => line.trim().length > 0);

      const response = await fetch("/api/icebreakers/contextual", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversationHistory: messages,
          user1Prefs: { chatStyle },
          user2Prefs: { chatStyle },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate contextual icebreakers");
      }

      const data = await response.json();
      setIcebreakers(data.icebreakers);
    } catch (error) {
      console.error("Error:", error);
      setIcebreakers([
        "Based on what you shared, what happened next?",
        "That sounds interesting! Tell me more about that.",
        "How did that make you feel?",
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">AI Icebreaker Generator</h2>
        <p className="text-muted-foreground mb-6">
          Generate engaging conversation starters using AI
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Chat Style</label>
          <select
            value={chatStyle}
            onChange={(e) => setChatStyle(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value="friendly">Friendly</option>
            <option value="fun">Fun</option>
            <option value="casual">Casual</option>
            <option value="professional">Professional</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button
            onClick={generateIcebreakers}
            disabled={loading}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "Generating..." : "Generate Icebreakers"}
          </button>
        </div>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold mb-4">
          Contextual Icebreakers (Optional)
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Conversation History (one message per line)
            </label>
            <textarea
              value={conversationHistory}
              onChange={(e) => setConversationHistory(e.target.value)}
              placeholder="User 1: Hey, how are you?&#10;User 2: I'm great! Just got back from a trip.&#10;User 1: Oh cool! Where did you go?"
              className="w-full px-3 py-2 border rounded-md h-32"
            />
          </div>
          <button
            onClick={generateContextualIcebreakers}
            disabled={loading || !conversationHistory.trim()}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 disabled:opacity-50"
          >
            {loading ? "Generating..." : "Generate Contextual Icebreakers"}
          </button>
        </div>
      </div>

      {icebreakers.length > 0 && (
        <div className="border rounded-lg p-6 bg-muted/50">
          <h3 className="text-lg font-semibold mb-4">Generated Icebreakers</h3>
          <ul className="space-y-3">
            {icebreakers.map((icebreaker, index) => (
              <li
                key={index}
                className="flex items-start gap-3 p-3 bg-background rounded-md"
              >
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </span>
                <p className="flex-1">{icebreaker}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
