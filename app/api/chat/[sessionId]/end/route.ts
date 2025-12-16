import { NextResponse } from "next/server";
import { db } from "@/db";
import { chatSession } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redis } from "@/lib/redis";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const { userId } = body;

    // Get session to find the other user
    const sessions = await db
      .select()
      .from(chatSession)
      .where(eq(chatSession.id, sessionId))
      .limit(1);

    if (sessions.length === 0) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const session = sessions[0];

    // Update session status to ended
    await db
      .update(chatSession)
      .set({
        status: "ended",
        endedAt: new Date(),
      })
      .where(eq(chatSession.id, sessionId));

    // Notify the other user via WebSocket that session ended
    try {
      await redis.publish(
        "broadcast",
        JSON.stringify({
          type: "session_ended",
          sessionId,
          endedBy: userId,
          timestamp: Date.now(),
        })
      );
    } catch (redisError) {
      console.warn(
        "Redis not available for session end notification:",
        redisError
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error ending session:", error);
    return NextResponse.json(
      { error: "Failed to end session" },
      { status: 500 }
    );
  }
}
