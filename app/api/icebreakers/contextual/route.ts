import { NextResponse } from "next/server";
import { generateContextualIcebreakers } from "@/lib/icebreaker";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { conversationHistory, user1Prefs, user2Prefs, language, userId } = body;

    if (!conversationHistory || !Array.isArray(conversationHistory)) {
      return NextResponse.json(
        { error: "Invalid conversation history" },
        { status: 400 }
      );
    }

    // Identify authenticated user (prevent spoofing)
    const { getUserIdFromRequest } = await import("@/lib/auth-utils");
    const authUserId = await getUserIdFromRequest(request);
    if (!authUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use authenticated user id
    const { db } = await import("@/db");
    const { user: userTable } = await import("@/db/schema");
    const { redis } = await import("@/lib/redis");

    const u = await db.select().from(userTable).where(eq(userTable.id, authUserId)).limit(1).then((r) => r[0]);
    const isPremium = !!u?.isPremium;
    const dailyLimit = isPremium ? 100 : 10;
    const cooldown = isPremium ? 10 : 60; // seconds

    const dateKey = new Date().toISOString().slice(0, 10);
    const countKey = `icebreaker:count:${userId}:${dateKey}`;
    const lastKey = `icebreaker:last:${userId}`;

    const usedRaw = await redis.get(countKey);
    const used = usedRaw ? parseInt(usedRaw, 10) : 0;
    const last = await redis.get(lastKey);
    const lastTs = last ? parseInt(last, 10) : null;

    if (lastTs) {
      const elapsed = Math.floor((Date.now() - lastTs) / 1000);
      if (elapsed < cooldown) {
        return NextResponse.json(
          { error: "Cooldown", cooldownRemaining: cooldown - elapsed },
          { status: 429 }
        );
      }
    }

    if (used >= dailyLimit) {
      return NextResponse.json(
        { error: "Limit reached", dailyLimit },
        { status: 429 }
      );
    }

    // Proceed and record usage
    const icebreakers = await generateContextualIcebreakers(
      conversationHistory,
      user1Prefs,
      user2Prefs,
      language || "en-US"
    );

    // Increment count and set last time
    await redis.incr(countKey);
    await redis.expire(countKey, 24 * 60 * 60);
    await redis.set(lastKey, Date.now().toString());

    return NextResponse.json({ icebreakers, usage: { used: used + 1, dailyLimit, cooldown } });
  } catch (error) {
    console.error("Error in contextual icebreakers API:", error);
    return NextResponse.json(
      { error: "Failed to generate contextual icebreakers" },
      { status: 500 }
    );
  }
