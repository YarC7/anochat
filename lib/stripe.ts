import Stripe from "stripe";

let stripeSingleton: Stripe | null = null;

export function getStripe(): Stripe {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Stripe routes require this env var (set it in .env or your deployment environment)."
    );
  }

  if (!stripeSingleton) {
    stripeSingleton = new Stripe(apiKey, {
      apiVersion: "2025-11-17.clover",
      typescript: true,
    });
  }

  return stripeSingleton;
}
