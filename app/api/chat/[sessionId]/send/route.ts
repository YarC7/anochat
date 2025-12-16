import { NextResponse } from "next/server";
import { sendMessage } from "@/lib/chat";
import { publishChannel } from "@/lib/redis";

export async function POST(
  request: Request,
  { params }: { params: { sessionId: string } }
) {
  try {
    const sessionId = params.sessionId;
    const body = await request.json();
    const { senderId, content, type = "text" } = body;

    if (!senderId || !content) {
      return NextResponse.json(
        { error: "Missing senderId or content" },
        { status: 400 }
      );
    }

    const message = await sendMessage(sessionId, senderId, content, type);

    // Publish to Redis for WebSocket broadcast
    await publishChannel("broadcast", {
      type: "chat_message",
      sessionId,
      senderId: message.senderId,
      content: message.content,
      timestamp: message.createdAt.getTime(),
    });

    return NextResponse.json({ message });
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
