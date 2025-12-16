import { db } from "@/db";
import { chatSession, message } from "@/db/schema";
import { eq, and, or, desc } from "drizzle-orm";
import { redis } from "./redis";
import { sendKafkaMessage } from "./kafka";
import { nanoid } from "nanoid";

export interface ChatMessage {
  id: string;
  sessionId: string;
  senderId: string;
  content: string;
  type: "text" | "icebreaker" | "system" | "voice";
  audioUrl?: string;
  createdAt: Date;
}

/**
 * Get chat session by ID
 */
export async function getChatSession(sessionId: string) {
  try {
    // Try cache first
    const cached = await redis.get(`session:${sessionId}`);
    if (cached) {
      return JSON.parse(cached);
    }

    const sessions = await db
      .select()
      .from(chatSession)
      .where(eq(chatSession.id, sessionId));
    if (sessions.length === 0) return null;

    const session = sessions[0];
    await redis.setex(`session:${sessionId}`, 3600, JSON.stringify(session));
    return session;
  } catch (error) {
    console.error("Error getting chat session:", error);
    return null;
  }
}

/**
 * Get active session for a user
 */
export async function getActiveSessionForUser(userId: string) {
  try {
    const sessions = await db
      .select()
      .from(chatSession)
      .where(
        and(
          or(eq(chatSession.user1Id, userId), eq(chatSession.user2Id, userId)),
          eq(chatSession.status, "active")
        )
      )
      .limit(1);

    return sessions[0] || null;
  } catch (error) {
    console.error("Error getting active session:", error);
    return null;
  }
}

/**
 * Send a message in a chat session
 */
export async function sendMessage(
  sessionId: string,
  senderId: string,
  content: string,
  type: "text" | "icebreaker" | "system" | "voice" = "text",
  audioUrl?: string
): Promise<ChatMessage> {
  try {
    const messageId = nanoid();
    const now = new Date();

    // Save to DB
    await db.insert(message).values({
      id: messageId,
      sessionId,
      senderId,
      content,
      type,
      audioUrl,
      createdAt: now,
    });

    const chatMessage: ChatMessage = {
      id: messageId,
      sessionId,
      senderId,
      content,
      type,
      audioUrl,
      createdAt: now,
    };

    // Publish to Kafka for analytics
    await sendKafkaMessage("chat-messages", {
      ...chatMessage,
      timestamp: now.toISOString(),
    });

    // Cache recent messages
    await redis.lpush(
      `session:${sessionId}:messages`,
      JSON.stringify(chatMessage)
    );
    await redis.ltrim(`session:${sessionId}:messages`, 0, 99); // Keep last 100 messages
    await redis.expire(`session:${sessionId}:messages`, 3600);

    return chatMessage;
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
}

/**
 * Get conversation history
 */
export async function getConversationHistory(
  sessionId: string,
  limit: number = 50
): Promise<ChatMessage[]> {
  try {
    // Try cache first
    const cached = await redis.lrange(
      `session:${sessionId}:messages`,
      0,
      limit - 1
    );
    if (cached.length > 0) {
      return cached.map((msg) => JSON.parse(msg) as ChatMessage);
    }

    // Fallback to DB
    const rows = await db
      .select()
      .from(message)
      .where(eq(message.sessionId, sessionId))
      .orderBy(desc(message.createdAt))
      .limit(limit);

    // Coerce and validate DB rows into ChatMessage[] to satisfy TypeScript
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messages = rows.map((r: any) => {
      const t = (r.type || "text") as string;
      const type =
        t === "icebreaker" || t === "system" || t === "text"
          ? (t as ChatMessage["type"])
          : "text";

      return {
        id: r.id,
        sessionId: r.sessionId,
        senderId: r.senderId,
        content: r.content,
        type,
        createdAt:
          r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt),
      } as ChatMessage;
    });

    return messages.reverse();
  } catch (error) {
    console.error("Error getting conversation history:", error);
    return [];
  }
}

/**
 * End a chat session
 */
export async function endChatSession(sessionId: string): Promise<void> {
  try {
    await db
      .update(chatSession)
      .set({ status: "ended", endedAt: new Date() })
      .where(eq(chatSession.id, sessionId));

    // Clear cache
    await redis.del(`session:${sessionId}`);
    await redis.del(`session:${sessionId}:messages`);
  } catch (error) {
    console.error("Error ending chat session:", error);
  }
}
