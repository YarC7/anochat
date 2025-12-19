"use client";

import type { Metadata } from "next";
import React, { useEffect } from "react";

export const metadata: Metadata = {
  title: "AnonChat — Chat anonymously",
  description:
    "Start anonymous one-on-one chats. Get AI suggestions to break the ice and connect safely.",
  openGraph: {
    title: "AnonChat — Chat anonymously",
    description:
      "Start anonymous one-on-one chats. Get AI suggestions to break the ice and connect safely.",
    images: ["/icons/opengraph-image.png"],
    url: `${
      process.env.NEXT_PUBLIC_SITE_URL ?? "https://anochat.online"
    }/portal/chat`,
  },
  twitter: {
    card: "summary_large_image",
    title: "AnonChat — Chat anonymously",
    description:
      "Start anonymous one-on-one chats. Get AI suggestions to break the ice and connect safely.",
    images: ["/icons/twitter-image.png"],
  },
};
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { MatchingLobby } from "@/components/matching-lobby";
import { Loader2 } from "lucide-react";

export default function ChatPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  // Derive userId from session without useState
  const userId = session?.user?.id || null;

  useEffect(() => {
    if (!isPending && !session?.user) {
      // Redirect to login if not authenticated
      router.push("/login");
    }
  }, [session, isPending, router]);

  if (isPending) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#1a1a2e]">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-purple-500 mx-auto" />
          <p className="text-white/60">Loading...</p>
        </div>
      </div>
    );
  }

  if (!userId) {
    return null;
  }

  return (
    <div className="h-screen bg-[#1a1a2e]">
      <MatchingLobby userId={userId} />
    </div>
  );
}
