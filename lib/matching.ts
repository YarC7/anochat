import { redis } from "./redis";
import { db } from "@/db";
import { user, chatSession } from "@/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

const QUEUE_KEY = "matching:queue";
const MATCH_TIMEOUT = 30000; // 30s timeout

/**
 * Add user to matching queue
 */
export async function joinMatchingQueue(
  userId: string
): Promise<{ matched: boolean; sessionId?: string; partnerId?: string }> {
  try {
    // Check if already in queue
    const existingScore = await redis.zscore(QUEUE_KEY, userId);
    if (existingScore) {
      return { matched: false };
    }

    // Try to find a match first
    const potentialMatches = await redis.zrangebyscore(
      QUEUE_KEY,
      Date.now() - MATCH_TIMEOUT,
      Date.now()
    );

    if (potentialMatches.length > 0) {
      // Found a match! Take the first one
      const partnerId = potentialMatches[0];
      await redis.zrem(QUEUE_KEY, partnerId);

      // Create chat session
      const sessionId = nanoid();
      await db.insert(chatSession).values({
        id: sessionId,
        user1Id: userId,
        user2Id: partnerId,
        status: "active",
        createdAt: new Date(),
      });

      // Update both users' isSearching status
      await db
        .update(user)
        .set({ isSearching: false })
        .where(eq(user.id, userId));
      await db
        .update(user)
        .set({ isSearching: false })
        .where(eq(user.id, partnerId));

      // Cache session info in Redis for quick access
      await redis.setex(
        `session:${sessionId}`,
        3600,
        JSON.stringify({ user1Id: userId, user2Id: partnerId })
      );

      // Publish match notification to Redis for WebSocket broadcast
      await redis.publish(
        "broadcast",
        JSON.stringify({
          type: "match_found",
          userId: partnerId,
          sessionId,
          partnerId: userId,
          timestamp: Date.now(),
        })
      );

      return { matched: true, sessionId, partnerId };
    }

    // No match found, add to queue
    await redis.zadd(QUEUE_KEY, Date.now(), userId);
    await db.update(user).set({ isSearching: true }).where(eq(user.id, userId));

    return { matched: false };
  } catch (error) {
    console.error("Error in joinMatchingQueue:", error);
    throw error;
  }
}

/**
 * Remove user from matching queue
 */
export async function leaveMatchingQueue(userId: string): Promise<void> {
  try {
    await redis.zrem(QUEUE_KEY, userId);
    await db
      .update(user)
      .set({ isSearching: false })
      .where(eq(user.id, userId));
  } catch (error) {
    console.error("Error in leaveMatchingQueue:", error);
  }
}

/**
 * Clean up expired queue entries
 */
export async function cleanupExpiredMatches(): Promise<void> {
  try {
    const cutoff = Date.now() - MATCH_TIMEOUT;
    await redis.zremrangebyscore(QUEUE_KEY, 0, cutoff);
  } catch (error) {
    console.error("Error in cleanupExpiredMatches:", error);
  }
}
