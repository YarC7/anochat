import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

const QUEUE_KEY = "matching:queue";

export async function GET() {
  try {
    // Get all users currently in queue
    const queueUsers = await redis.zrangebyscore(
      QUEUE_KEY,
      Date.now() - 30000, // Last 30 seconds
      Date.now()
    );

    // Get total count
    const queueCount = queueUsers.length;

    return NextResponse.json({
      count: queueCount,
      users: queueUsers,
    });
  } catch (error) {
    console.error("Error getting queue stats:", error);
    return NextResponse.json(
      { error: "Failed to get queue stats" },
      { status: 500 }
    );
  }
}
