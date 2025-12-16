import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { eq } from "drizzle-orm";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    // Identify authenticated user (prevent spoofing)
    const { getUserIdFromRequest } = await import("@/lib/auth-utils");
    const authUserId = await getUserIdFromRequest(request as Request);
    if (!authUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check premium status
    const { db } = await import("@/db");
    const { user: userTable } = await import("@/db/schema");
    const u = await db
      .select()
      .from(userTable)
      .where(eq(userTable.id, authUserId))
      .limit(1)
      .then((r) => r[0]);
    if (!u?.isPremium) {
      return NextResponse.json({ error: "Premium required" }, { status: 403 });
    }

    // Convert file to base64
    const bytes = await audioFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Audio = `data:${audioFile.type};base64,${buffer.toString(
      "base64"
    )}`;

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(base64Audio, {
      resource_type: "video", // audio files use 'video' resource type in Cloudinary
      folder: "chat-audio",
      format: "mp3", // Convert to mp3 for better compatibility
    });

    return NextResponse.json({
      url: result.secure_url,
      publicId: result.public_id,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Error uploading audio:", error);
    return NextResponse.json(
      { error: "Failed to upload audio", details: error.message },
      { status: 500 }
    );
  }
}
