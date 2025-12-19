"use client";

import type { Metadata } from "next";
import { ProtectedLayout } from "@/components/layout/protected-layout";

export const metadata: Metadata = {
  title: "AnonChat — Dashboard",
  description: "Overview of your account, usage stats, and quick actions.",
  openGraph: {
    title: "AnonChat — Dashboard",
    description: "Overview of your account, usage stats, and quick actions.",
    images: ["/icons/opengraph-image.png"],
    url: `${
      process.env.NEXT_PUBLIC_SITE_URL ?? "https://anochat.online"
    }/portal/dashboard`,
  },
  twitter: {
    card: "summary",
    title: "AnonChat — Dashboard",
    description: "Overview of your account, usage stats, and quick actions.",
    images: ["/icons/twitter-image.png"],
  },
};
import { useSession, signOut } from "@/lib/auth-client";
import { LocaleText } from "@/components/ui/locale-text";

export default function DashboardPage() {
  const { data: session } = useSession();

  return (
    <ProtectedLayout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white rounded-lg shadow p-6">
            <h1 className="text-2xl font-bold mb-4">
              <LocaleText k="dashboardTitle" />
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-blue-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-900">
                  <LocaleText k="totalUsers" />
                </h3>
                <p className="text-3xl font-bold text-blue-600 mt-2">1,234</p>
              </div>
              <div className="bg-green-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-green-900">
                  <LocaleText k="revenue" />
                </h3>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  $12,345
                </p>
              </div>
              <div className="bg-purple-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-purple-900">
                  <LocaleText k="products" />
                </h3>
                <p className="text-3xl font-bold text-purple-600 mt-2">56</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-4">
                <LocaleText k="accountInformation" />
              </h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    <LocaleText k="emailLabel" />
                  </span>
                  <span className="font-medium">{session?.user.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    <LocaleText k="nameLabel" />
                  </span>
                  <span className="font-medium">{session?.user.name}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => signOut()}
              className="mt-6 w-full bg-red-600 text-white rounded-md px-4 py-2 hover:bg-red-700 transition-colors"
            >
              <LocaleText k="signOut" />
            </button>
          </div>
        </div>
      </div>
    </ProtectedLayout>
  );
}
