import { redis } from "./redis";
import { db } from "@/db";
import { user, chatSession } from "@/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

const QUEUE_KEY = "matching:queue";
const PREF_HASH = "matching:prefs";
const MATCH_TIMEOUT = 30000; // 30s timeout

type Gender = "male" | "female" | null;
type Preference = "any" | "female" | "male";

/**
 * Xác định Giới tính Mục tiêu (Target Genders) dựa trên giới tính và sở thích của người dùng
 * @param userGender - Giới tính của người dùng (male/female/null)
 * @param userPreference - Sở thích của người dùng (any/male/female)
 * @returns Mảng các giới tính mục tiêu
 */
function getTargetGenders(
  userGender: Gender,
  userPreference: Preference
): Gender[] {
  // Nếu chọn "Any", mục tiêu là cả Male và Female
  if (userPreference === "any") {
    return ["male", "female"];
  }

  // Nếu đặt cụ thể preference, mục tiêu là preference đó
  if (userPreference === "male" || userPreference === "female") {
    return [userPreference];
  }

  // Mặc định: Male tìm Female, Female tìm Male
  if (userGender === "male") {
    return ["female"];
  }
  if (userGender === "female") {
    return ["male"];
  }

  // Nếu không có giới tính, mặc định là any
  return ["male", "female"];
}

/**
 * Kiểm tra Match theo Giới tính với Tính Đối xứng (Bidirectional)
 * @param userAGender - Giới tính của User A
 * @param userAPreference - Sở thích của User A
 * @param userBGender - Giới tính của User B
 * @param userBPreference - Sở thích của User B
 * @returns true nếu A và B match nhau về giới tính
 */
function isGenderMatch(
  userAGender: Gender,
  userAPreference: Preference,
  userBGender: Gender,
  userBPreference: Preference
): boolean {
  // 1. Xác định Mục tiêu của A (A's Target)
  const aTargets = getTargetGenders(userAGender, userAPreference);

  // 2. Xác định Mục tiêu của B (B's Target)
  const bTargets = getTargetGenders(userBGender, userBPreference);

  // 3. Kiểm tra Điều kiện 1: A có muốn Match với B không?
  // UserB.gender phải nằm trong danh sách mục tiêu của A
  const condition1 = userBGender !== null && aTargets.includes(userBGender);

  // 4. Kiểm tra Điều kiện 2: B có muốn Match với A không?
  // UserA.gender phải nằm trong danh sách mục tiêu của B
  const condition2 = userAGender !== null && bTargets.includes(userAGender);

  // 5. Kết luận: Cả hai điều kiện đều phải đúng
  return condition1 && condition2;
}

/**
 * Add user to matching queue
 */
export async function joinMatchingQueue(
  userId: string,
  preference: "any" | "female" | "male" = "any"
): Promise<{ matched: boolean; sessionId?: string; partnerId?: string }> {
  try {
    // Normalize preference to lowercase
    const normalizedPref = (preference || "any")
      .toString()
      .toLowerCase() as Preference;

    // Check if already in queue
    const existingScore = await redis.zscore(QUEUE_KEY, userId);
    if (existingScore) {
      return { matched: false };
    }

    // Store preference in a hash for quick access
    await redis.hset(PREF_HASH, userId, normalizedPref);

    // Fetch current user's gender from DB
    const currentUser = await db
      .select()
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);
    const currentGenderRaw = currentUser?.[0]?.gender || null;
    const currentGender = currentGenderRaw
      ? (String(currentGenderRaw).toLowerCase() as Gender)
      : null;

    // Try to find a match from existing queue
    const potentialMatches = await redis.zrangebyscore(
      QUEUE_KEY,
      Date.now() - MATCH_TIMEOUT,
      Date.now()
    );

    if (potentialMatches.length > 0) {
      // Try to find a bidirectional match
      for (const partnerId of potentialMatches) {
        // Get partner's preference from Redis
        const partnerPrefRaw =
          (await redis.hget(PREF_HASH, partnerId)) || "any";
        const partnerPref = String(partnerPrefRaw).toLowerCase() as Preference;

        // Get partner's gender from DB
        const partnerRows = await db
          .select()
          .from(user)
          .where(eq(user.id, partnerId))
          .limit(1);
        const partnerGenderRaw = partnerRows?.[0]?.gender || null;
        const partnerGender = partnerGenderRaw
          ? (String(partnerGenderRaw).toLowerCase() as Gender)
          : null;

        // Check bidirectional gender match
        if (
          isGenderMatch(
            currentGender,
            normalizedPref,
            partnerGender,
            partnerPref
          )
        ) {
          // Found compatible partner! Create match
          await redis.zrem(QUEUE_KEY, partnerId);

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

          // Cleanup preferences from hash
          await redis.hdel(PREF_HASH, userId, partnerId);

          // Publish match notification to partner
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
      }
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
    await redis.hdel(PREF_HASH, userId);
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
