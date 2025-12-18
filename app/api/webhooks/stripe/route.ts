import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import type Stripe from "stripe";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";
import Redis from "ioredis";

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("Missing STRIPE_WEBHOOK_SECRET");
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 500 }
    );
  }

  const stripe = getStripe();

  const payload = await request.text();
  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    console.warn("Missing stripe-signature header");
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      payload,
      sig,
      webhookSecret
    ) as Stripe.Event;
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = session.metadata || {};
      const userId = (metadata as Record<string, string | undefined>).userId;

      if (!userId) {
        console.warn(
          "checkout.session.completed without userId metadata",
          session.id
        );
      } else {
        // Mark user as premium in DB
        await db
          .update(user)
          .set({ isPremium: true })
          .where(eq(user.id, userId));

        // Publish a lightweight message so other services (ws server) can react
        try {
          const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
          const r = new Redis(REDIS_URL);
          await r.publish(
            "user-updates",
            JSON.stringify({ userId, isPremium: true })
          );
          r.disconnect();
        } catch (rerr) {
          console.warn(
            "Failed to publish Redis update for user premium change:",
            rerr
          );
        }

        console.log("User marked as premium via Stripe webhook:", userId);
      }
    }
  } catch (err) {
    console.error("Error handling Stripe event:", err);
    return NextResponse.json(
      { error: "Failed to handle event" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
