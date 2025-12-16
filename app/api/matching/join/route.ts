import { NextResponse } from "next/server";
import { joinMatchingQueue } from "@/lib/matching";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, preferences } = body;

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const result = await joinMatchingQueue(userId);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in matching/join:", error);
    return NextResponse.json(
      { error: "Failed to join matching queue" },
      { status: 500 }
    );
  }
}
