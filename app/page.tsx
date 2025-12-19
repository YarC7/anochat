"use client";
import type { Metadata } from "next";
import { LandingPage } from "@/components/common/landing-page";

export const metadata: Metadata = {
  title: "AnonChat — Connect instantly. Chat anonymously.",
  description:
    "Meet random strangers safely. AI suggests conversation starters and smart matching helps find your perfect chat partner.",
  openGraph: {
    title: "AnonChat — Connect instantly.",
    description:
      "Meet random strangers safely. AI suggests conversation starters and smart matching helps find your perfect chat partner.",
    images: ["/icons/opengraph-image.png"],
    url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://anochat.online",
  },
  twitter: {
    card: "summary_large_image",
    title: "AnonChat — Connect instantly.",
    description:
      "Meet random strangers safely. AI suggests conversation starters and smart matching helps find your perfect chat partner.",
    images: ["/icons/twitter-image.png"],
  },
};

export default function Home() {
  return <LandingPage />;
}
