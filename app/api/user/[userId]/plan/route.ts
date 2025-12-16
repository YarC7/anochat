import { NextResponse } from "next/server";
import { db } from "@/db";
import { user as userTable } from "@/db/schema";
import { redis } from "@/lib/redis";
import { eq } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;
    if (!userId)
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });

    // Ensure the requester is the same user (prevent spoofing)
    const { getUserIdFromRequest } = await import("@/lib/auth-utils");
    const authUserId = await getUserIdFromRequest(request);
    if (!authUserId || authUserId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const u = await db
      .select()
      .from(userTable)
      .where(eq(userTable.id, userId))
      .limit(1)
      .then((r) => r[0]);
    const isPremium = !!u?.isPremium;

    const dateKey = new Date().toISOString().slice(0, 10);
    const countKey = `icebreaker:count:${userId}:${dateKey}`;
    const lastKey = `icebreaker:last:${userId}`;

    const usedRaw = await redis.get(countKey);
    const used = usedRaw ? parseInt(usedRaw, 10) : 0;
    const last = await redis.get(lastKey);
    const lastTs = last ? parseInt(last, 10) : null;

    const dailyLimit = isPremium ? 100 : 10;
    const cooldown = isPremium ? 10 : 60;

    let cooldownRemaining = 0;
    if (lastTs) {
      const elapsed = Math.floor((Date.now() - lastTs) / 1000);
      cooldownRemaining = Math.max(0, cooldown - elapsed);
    }

    return NextResponse.json({
      isPremium,
      dailyLimit,
      used,
      cooldownRemaining,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch plan" },
      { status: 500 }
    );
  }
}
