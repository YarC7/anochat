import { db } from "@/db";
import { session as sessionTable } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Tries to resolve the authenticated user id from the request's cookies.
 * Works by checking common cookie names that may contain the session token and
 * looking up the session in DB.
 */
export async function getUserIdFromRequest(
  request: Request
): Promise<string | null> {
  try {
    const cookieHeader = request.headers.get("cookie") || "";
    if (!cookieHeader) return null;

    const cookies: Record<string, string> = cookieHeader
      .split(";")
      .reduce((acc, part) => {
        const [k, ...rest] = part.split("=");
        if (!k) return acc;
        acc[k.trim()] = rest.join("=").trim();
        return acc;
      }, {} as Record<string, string>);

    const candidateNames = [
      "ba_session",
      "ba-session",
      "better-auth.session",
      "better_auth_session",
      "next-auth.session-token",
      "session",
      "token",
    ];

    let token: string | undefined;
    for (const name of candidateNames) {
      if (cookies[name]) {
        token = cookies[name];
        break;
      }
    }

    if (!token) return null;

    // session.token is stored in DB (drizzle schema). Try to find session by token.
    const rows = await db
      .select()
      .from(sessionTable)
      .where(eq(sessionTable.token, token))
      .limit(1);
    const s = rows[0];
    if (!s) return null;

    // Optionally check expiry if expiresAt exists
    if (s.expiresAt && new Date(s.expiresAt).getTime() < Date.now())
      return null;

    return s.userId;
  } catch (err) {
    console.error("getUserIdFromRequest error:", err);
    return null;
  }
}
