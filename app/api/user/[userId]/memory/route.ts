import { NextResponse } from "next/server";
import { getMemory, setMemoryKey, deleteMemoryKey } from "@/lib/memory";
import { auth } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user?.id || session.user.id !== userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const namespace =
    new URL(request.url).searchParams.get("namespace") || undefined;
  const data = await getMemory(userId, namespace);
  return NextResponse.json({ data });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user?.id || session.user.id !== userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { key, value, namespace } = body;
  if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });
  try {
    const res = await setMemoryKey(userId, key, value, namespace || undefined);
    return NextResponse.json({ data: res });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Invalid memory value" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user?.id || session.user.id !== userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  const namespace = url.searchParams.get("namespace") || undefined;
  if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });

  await deleteMemoryKey(userId, key, namespace);
  return NextResponse.json({ success: true });
}
