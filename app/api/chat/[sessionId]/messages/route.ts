import { NextResponse } from "next/server";
import { getConversationHistory } from "@/lib/chat";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    const messages = await getConversationHistory(sessionId);

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Error getting messages:", error);
    return NextResponse.json(
      { error: "Failed to get messages" },
      { status: 500 }
    );
  }
}
