import { NextResponse } from "next/server";
import { leaveMatchingQueue } from "@/lib/matching";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    await leaveMatchingQueue(userId);
    try {
      // remove preference from redis hash if present
      const redis = (await import("@/lib/redis")).redis;
      await redis.hdel("matching:prefs", userId);
    } catch (err) {
      // ignore
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in matching/leave:", error);
    return NextResponse.json(
      { error: "Failed to leave matching queue" },
      { status: 500 }
    );
  }
}
