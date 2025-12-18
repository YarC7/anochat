import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getUserIdFromRequest } from "@/lib/auth-utils";

export async function POST(req: NextRequest) {
  try {
    const { priceId } = await req.json();

    const stripe = getStripe();

    // Require authenticated user to be associated with Checkout session
    const userId = await getUserIdFromRequest(req as Request);
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: { userId },
      success_url: `${req.headers.get(
        "origin"
      )}/premium/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/cancel`,
    });

    // Return the URL instead of session ID
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Error creating checkout session:", err);
    return NextResponse.json(
      { error: "Error creating checkout session" },
      { status: 500 }
    );
  }
}
