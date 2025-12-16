import Groq from "groq-sdk";
import { redis } from "./redis";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "" });

interface UserPreferences {
  gender?: string;
  chatStyle?: string;
}

/**
 * Generate AI-powered icebreakers with failover: Qwen -> Mock
 */
export async function generateIcebreakers(
  user1Prefs?: UserPreferences,
  user2Prefs?: UserPreferences
): Promise<string[]> {
  const cacheKey = `icebreaker:${user1Prefs?.chatStyle || "default"}:${
    user2Prefs?.chatStyle || "default"
  }`;

  // Check cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  let icebreakers: string[] = [];

  // 1. Try Qwen (via Groq) - only if API key is valid (starts with gsk_)
  if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.startsWith("gsk_")) {
    try {
      icebreakers = await generateWithQwen(user1Prefs, user2Prefs);
      if (icebreakers.length >= 3) {
        await redis.setex(cacheKey, 300, JSON.stringify(icebreakers)); // Cache for 5 min
        return icebreakers;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.warn("Qwen failed:", error.message || error);
    }
  } else if (process.env.GROQ_API_KEY) {
    console.warn("Invalid GROQ_API_KEY format - must start with 'gsk_'");
  }

  // 2. Final fallback to mock data
  console.warn("Qwen API unavailable, using mock icebreakers");
  icebreakers = generateMockIcebreakers();
  return icebreakers;
}

/**
 * Generate icebreakers using Qwen API (via Groq)
 */
async function generateWithQwen(
  user1Prefs?: UserPreferences,
  user2Prefs?: UserPreferences
): Promise<string[]> {
  const systemPrompt =
    "You are a friendly conversation starter assistant. Generate engaging, fun, and appropriate icebreaker questions for strangers to start chatting. Keep them light, positive, and universally relatable.\n\n" +
    "IMPORTANT: Output ONLY the 3 questions, nothing else. No explanations, no commentary, no thinking process. Just the questions.";

  const userPrompt = buildPrompt(user1Prefs, user2Prefs);

  const result = await groq.chat.completions.create({
    model: "qwen/qwen3-32b",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.9,
    max_tokens: 150,
  });

  const response = result.choices[0].message.content;
  if (!response) {
    throw new Error("Empty response from Qwen");
  }

  return parseIcebreakers(response);
}

/**
 * Parse icebreakers from LLM response
 */
function parseIcebreakers(response: string): string[] {
  const icebreakers = response
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => line.replace(/^\d+\.\s*/, "").trim())
    .filter((line) => line.length > 10);

  return icebreakers.slice(0, 3);
}

/**
 * Build a contextual prompt based on user preferences
 */
function buildPrompt(
  user1Prefs?: UserPreferences,
  user2Prefs?: UserPreferences
): string {
  let prompt =
    "Generate exactly 3 fun and engaging icebreaker questions for two strangers who just matched in an anonymous chat. ";

  // Add context based on chat styles
  const styles = [user1Prefs?.chatStyle, user2Prefs?.chatStyle].filter(Boolean);
  if (styles.length > 0) {
    const styleContext = getStyleContext(styles as string[]);
    prompt += styleContext + " ";
  }

  prompt +=
    "Make them interesting, positive, and easy to answer.\n\n" +
    "OUTPUT FORMAT:\n" +
    "1. [First question]\n" +
    "2. [Second question]\n" +
    "3. [Third question]\n\n" +
    "Do not include any other text, explanations, or commentary. ONLY output the 3 numbered questions.";

  return prompt;
}

/**
 * Get context description based on chat styles
 */
function getStyleContext(styles: string[]): string {
  const uniqueStyles = [...new Set(styles)];

  if (uniqueStyles.includes("fun")) {
    return "Make the questions playful and entertaining.";
  } else if (uniqueStyles.includes("professional")) {
    return "Keep the questions thoughtful but professional.";
  } else if (uniqueStyles.includes("casual")) {
    return "Keep the questions relaxed and casual.";
  } else if (uniqueStyles.includes("friendly")) {
    return "Make the questions warm and friendly.";
  }

  return "Make the questions engaging and conversational.";
}

/**
 * Generate context-aware icebreakers with failover: Qwen -> Mock
 */
export async function generateContextualIcebreakers(
  conversationHistory: string[],
  user1Prefs?: UserPreferences,
  user2Prefs?: UserPreferences
): Promise<string[]> {
  const recentMessages = conversationHistory.slice(-10).join("\n");
  const cacheKey = `contextual:${Buffer.from(recentMessages)
    .toString("base64")
    .slice(0, 50)}`;

  // Check cache
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  let icebreakers: string[] = [];

  // 1. Try Qwen (via Groq) - only if API key is valid (starts with gsk_)
  if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.startsWith("gsk_")) {
    try {
      icebreakers = await generateContextualWithQwen(conversationHistory);
      if (icebreakers.length >= 3) {
        await redis.setex(cacheKey, 300, JSON.stringify(icebreakers));
        return icebreakers;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.warn("Qwen contextual failed:", error.message || error);
    }
  } else if (process.env.GROQ_API_KEY) {
    console.warn("Invalid GROQ_API_KEY format - must start with 'gsk_'");
  }

  // 2. Final fallback
  console.warn("Qwen API unavailable, using mock");
  return generateMockIcebreakers();
}

/**
 * Generate contextual icebreakers using Qwen
 */
async function generateContextualWithQwen(
  conversationHistory: string[]
): Promise<string[]> {
  const recentMessages = conversationHistory.slice(-10).join("\n");

  const systemPrompt =
    "You are a conversation facilitator. Analyze the conversation below and suggest 3 engaging follow-up questions that:\n" +
    "1. Build on topics already discussed\n" +
    "2. Deepen the conversation naturally\n" +
    "3. Are open-ended and interesting\n" +
    "4. Match the tone and style of the existing chat\n\n" +
    "Keep questions friendly, positive, and appropriate.\n\n" +
    "IMPORTANT: Output ONLY the 3 questions, nothing else. No explanations, no commentary, no thinking process.";

  const userPrompt =
    `Recent conversation:\n${recentMessages}\n\nGenerate 3 follow-up questions based on this conversation.\n\n` +
    "OUTPUT FORMAT:\n" +
    "1. [First question]\n" +
    "2. [Second question]\n" +
    "3. [Third question]\n\n" +
    "Do not include any other text. ONLY output the 3 numbered questions.";

  "3. [Third question]\n\n" +
    "Do not include any other text. ONLY output the 3 numbered questions.";

  const result = await groq.chat.completions.create({
    model: "qwen/qwen3-32b",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.8,
    max_tokens: 150,
  });

  const response = result.choices[0].message.content;
  if (!response) {
    throw new Error("Empty response from Qwen");
  }

  return parseIcebreakers(response);
}

/**
 * Mock icebreakers as fallback
 */
function generateMockIcebreakers(): string[] {
  const icebreakers = [
    "What is the most interesting thing that happened to you this week?",
    "If you could travel anywhere right now, where would you go?",
    "What is your favorite way to spend a weekend?",
    "Do you prefer cats or dogs? (Or neither!)",
    "What is the last movie or show that made you laugh?",
    "If you could have any superpower, what would it be?",
    "What is your go-to comfort food?",
    "Are you a morning person or a night owl?",
    "What is something you are really good at?",
    "What book or podcast would you recommend?",
    "If you could have dinner with anyone (alive or dead), who would it be?",
    "What is your hidden talent?",
    "What is the best piece of advice you have ever received?",
    "If you could learn any skill instantly, what would it be?",
    "What is your favorite childhood memory?",
  ];

  // Return 3 random icebreakers
  const shuffled = [...icebreakers].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 3);
}
