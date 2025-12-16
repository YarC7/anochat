import { NextResponse } from "next/server";
import { db } from "@/db";
import { chatSession } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    const session = await db
      .select()
      .from(chatSession)
      .where(eq(chatSession.id, sessionId))
      .limit(1);

    if (session.length === 0) {
      return NextResponse.json({ status: "not_found" }, { status: 404 });
    }

    return NextResponse.json({
      status: session[0].status,
      sessionId: session[0].id,
    });
  } catch (error) {
    console.error("Error checking session status:", error);
    return NextResponse.json(
      { error: "Failed to check session status" },
      { status: 500 }
    );
  }
}
