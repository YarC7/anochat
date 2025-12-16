import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export async function GET() {
  try {
    const raw = await redis.hgetall("matching:prefs");
    return NextResponse.json({ prefs: raw });
  } catch (err) {
    console.error("Error fetching matching prefs:", err);
    return NextResponse.json({ prefs: {} });
  }
}
