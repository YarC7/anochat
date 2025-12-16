import { NextResponse } from "next/server";
import { sendMessage } from "@/lib/chat";
import { eq } from "drizzle-orm";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const { content, type = "text", audioUrl } = body;

    // Identify authenticated user (prevent spoofing)
    const { getUserIdFromRequest } = await import("@/lib/auth-utils");
    const authUserId = await getUserIdFromRequest(request as Request);
    if (!authUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!content) {
      return NextResponse.json({ error: "Missing content" }, { status: 400 });
    }

    // If voice message, check premium
    if (type === "voice") {
      const { db } = await import("@/db");
      const { user: userTable } = await import("@/db/schema");
      const u = await db
        .select()
        .from(userTable)
        .where(eq(userTable.id, authUserId))
        .limit(1)
        .then((r) => r[0]);
      if (!u?.isPremium) {
        return NextResponse.json(
          { error: "Premium required to send voice messages" },
          { status: 403 }
        );
      }
    }

    // Just save to database - WebSocket already handles broadcasting
    const message = await sendMessage(
      sessionId,
      authUserId,
      content,
      type,
      audioUrl
    );

    return NextResponse.json({ message });
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
