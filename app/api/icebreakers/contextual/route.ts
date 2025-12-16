import { NextResponse } from "next/server";
import { generateContextualIcebreakers } from "@/lib/icebreaker";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { conversationHistory, user1Prefs, user2Prefs } = body;

    if (!conversationHistory || !Array.isArray(conversationHistory)) {
      return NextResponse.json(
        { error: "Invalid conversation history" },
        { status: 400 }
      );
    }

    const icebreakers = await generateContextualIcebreakers(
      conversationHistory,
      user1Prefs,
      user2Prefs
    );

    return NextResponse.json({ icebreakers });
  } catch (error) {
    console.error("Error in contextual icebreakers API:", error);
    return NextResponse.json(
      { error: "Failed to generate contextual icebreakers" },
      { status: 500 }
    );
  }
}
