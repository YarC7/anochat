import { NextResponse } from "next/server";
import { sendMessage } from "@/lib/chat";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const { senderId, content, type = "text" } = body;

    if (!senderId || !content) {
      return NextResponse.json(
        { error: "Missing senderId or content" },
        { status: 400 }
      );
    }

    // Just save to database - WebSocket already handles broadcasting
    const message = await sendMessage(sessionId, senderId, content, type);

    return NextResponse.json({ message });
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
