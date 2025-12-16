import { NextResponse } from "next/server";
import { joinMatchingQueue } from "@/lib/matching";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, preference } = body;

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const pref =
      preference === "female" || preference === "male" ? preference : "any";

    const result = await joinMatchingQueue(userId, pref);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in matching/join:", error);
    return NextResponse.json(
      { error: "Failed to join matching queue" },
      { status: 500 }
    );
  }
}
