"use client";
import { ProtectedLayout } from "@/components/layout/protected-layout";

import { useSession } from "@/lib/auth-client";
import Image from "next/image";
import { LocaleText } from "@/components/ui/locale-text";

export default function ProfilePage() {
  const { data: session } = useSession();

  return (
    <ProtectedLayout>
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-8">
              <div className="flex items-center gap-6 mb-8">
                {session?.user.image && (
                  <Image
                    src={session.user.image}
                    alt={session.user.name || "User"}
                    width={96}
                    height={96}
                    className="rounded-full"
                  />
                )}
                <div>
                  <h1 className="text-3xl font-bold">{session?.user.name}</h1>
                  <p className="text-gray-600">{session?.user.email}</p>
                </div>
              </div>

              <div className="border-t pt-6">
                <h2 className="text-xl font-semibold mb-4">
                  <LocaleText k="profileInformation" />
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      <LocaleText k="fullName" />
                    </label>
                    <input
                      type="text"
                      defaultValue={session?.user.name || ""}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      <LocaleText k="emailLabel" />
                    </label>
                    <input
                      type="email"
                      defaultValue={session?.user.email || ""}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                      disabled
                    />
                  </div>
                  <button className="bg-blue-600 text-white rounded-md px-4 py-2 hover:bg-blue-700">
                    <LocaleText k="saveChanges" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedLayout>
  );
}
