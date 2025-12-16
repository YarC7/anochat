import { NextResponse } from "next/server";
import { generateIcebreakers } from "@/lib/icebreaker";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user1Prefs, user2Prefs } = body;

    const icebreakers = await generateIcebreakers(user1Prefs, user2Prefs);

    return NextResponse.json({ icebreakers });
  } catch (error) {
    console.error("Error in icebreakers API:", error);
    return NextResponse.json(
      { error: "Failed to generate icebreakers" },
      { status: 500 }
    );
  }
}
