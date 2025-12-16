import { NextResponse } from "next/server";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId } = body;
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    await db.update(user).set({ isPremium: true }).where(eq(user.id, userId));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error upgrading user to premium:", err);
    return NextResponse.json({ error: "Failed to upgrade" }, { status: 500 });
  }
}
