import Groq from "groq-sdk";
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "GROQ API KEY" });

interface UserPreferences {
  gender?: string;
  chatStyle?: string;
}

/**
 * Generate AI-powered icebreakers based on user preferences
 * Falls back to mock data if Gemini API is unavailable
 */
export async function generateIcebreakers(
  user1Prefs?: UserPreferences,
  user2Prefs?: UserPreferences
): Promise<string[]> {
  // Fallback to mock data if API key is not configured
  if (!process.env.GROQ_API_KEY) {
    console.warn("GROQ_API_KEY not configured, using mock icebreakers");
    return generateMockIcebreakers();
  }

  try {
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
      throw new Error("Empty response from Groq");
    }

    // Parse the response - expecting numbered list
    const icebreakers = response
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line) => line.replace(/^\d+\.\s*/, "").trim())
      .filter((line) => line.length > 10); // Filter out very short lines

    // Ensure we have exactly 3 icebreakers
    if (icebreakers.length >= 3) {
      return icebreakers.slice(0, 3);
    }

    // Fallback if parsing failed
    console.warn("Failed to parse AI response, using mock data");
    return generateMockIcebreakers();
  } catch (error) {
    console.error("Error generating AI icebreakers:", error);
    // Fallback to mock data on error
    return generateMockIcebreakers();
  }
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
 * Generate context-aware icebreakers based on conversation history
 * Analyzes recent messages to suggest relevant follow-up topics
 */
export async function generateContextualIcebreakers(
  conversationHistory: string[],
  user1Prefs?: UserPreferences,
  user2Prefs?: UserPreferences
): Promise<string[]> {
  // Fallback if API key not configured
  if (!process.env.GROQ_API_KEY) {
    console.warn("GROQ_API_KEY not configured, using mock icebreakers");
    return generateMockIcebreakers();
  }

  try {
    // Build conversation context
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
      throw new Error("Empty response from Groq");
    }

    // Parse response
    const icebreakers = response
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line) => line.replace(/^\d+\.\s*/, "").trim())
      .filter((line) => line.length > 10);

    if (icebreakers.length >= 3) {
      return icebreakers.slice(0, 3);
    }

    // Fallback
    console.warn("Failed to parse contextual AI response, using mock data");
    return generateMockIcebreakers();
  } catch (error) {
    console.error("Error generating contextual icebreakers:", error);
    return generateMockIcebreakers();
  }
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
