"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/hooks/use-language";
import { signOut } from "@/lib/auth-client";
import {
  MessageCircle,
  User,
  Shield,
  Bell,
  Sparkles,
  Headphones,
  BellRing,
  LogOut,
  Lock,
  Mail,
  Search,
  Info,
  EyeOff,
  Save,
  ArrowLeft,
  Globe,
} from "lucide-react";
import { LocaleText } from "@/components/ui/locale-text";

type SettingsTab =
  | "account"
  | "privacy"
  | "notifications"
  | "ai"
  | "support"
  | "language";

export default function SettingsPage() {
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<SettingsTab>("account");

  // Account Settings
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState("user@anonchat.com");

  // Privacy & Matching Settings
  const [matchingPreference, setMatchingPreference] = useState("everyone");
  const [ageRange, setAgeRange] = useState([18, 35]);
  const [languagePreference, setLanguagePreference] = useState("english");
  const [locationPreference, setLocationPreference] = useState("global");
  const [showLocation, setShowLocation] = useState(true);

  // AI Features
  const [smartIcebreakers, setSmartIcebreakers] = useState(true);
  const [contentFilter, setContentFilter] = useState(true);

  const handleUpdatePassword = () => {
    console.log("Update password");
  };

  const handleVerifyEmail = () => {
    console.log("Verify email");
  };

  const handleDeleteAccount = () => {
    if (confirm(t("deleteWarning"))) {
      console.log("Delete account");
    }
  };

  const handleLogout = async () => {
    if (confirm(t("confirmLogout") || "Are you sure you want to logout?")) {
      try {
        await signOut();
        router.push("/login");
      } catch (error) {
        console.error("Logout error:", error);
        alert("Failed to logout. Please try again.");
      }
    }
  };

  const handleSaveChanges = () => {
    // Language is already saved by the hook when changed
    console.log("Save all changes, language:", language);
  };

  return (
    <div className="min-h-screen bg-[#1a1a2e] flex">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-[#16162a] border-r border-white/10 p-6">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-linear-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <MessageCircle className="text-white text-xl" />
            </div>
            <span className="text-white font-bold text-lg">
              <LocaleText k="appName" />
            </span>
          </div>
          <h1 className="text-white text-xl font-bold mb-1">{t("settings")}</h1>
          <p className="text-gray-400 text-sm">{t("managePreferences")}</p>
        </div>

        <nav className="space-y-1">
          <SettingsNavItem
            icon={<User />}
            label={t("account")}
            active={activeTab === "account"}
            onClick={() => setActiveTab("account")}
          />
          <SettingsNavItem
            icon={<Shield />}
            label={t("privacy")}
            active={activeTab === "privacy"}
            onClick={() => setActiveTab("privacy")}
          />
          <SettingsNavItem
            icon={<Bell />}
            label={t("notifications")}
            active={activeTab === "notifications"}
            onClick={() => setActiveTab("notifications")}
          />
          <SettingsNavItem
            icon={<Sparkles />}
            label={t("aiFeatures")}
            active={activeTab === "ai"}
            onClick={() => setActiveTab("ai")}
          />
          <SettingsNavItem
            icon={<Globe />}
            label={t("language")}
            active={activeTab === "language"}
            onClick={() => setActiveTab("language")}
          />
          <SettingsNavItem
            icon={<Headphones />}
            label={t("support")}
            active={activeTab === "support"}
            onClick={() => setActiveTab("support")}
          />
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-8">
          {/* Header Actions */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 p-2 hover:bg-white/5 rounded-lg transition-colors text-gray-400 hover:text-white"
            >
              <ArrowLeft className="text-lg" />
              <span className="text-sm font-medium">{t("back")}</span>
            </button>
            <div className="flex items-center gap-3">
              <button className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                <BellRing className="text-gray-400" />
              </button>
              <button
                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                onClick={handleLogout}
              >
                <LogOut className="text-gray-400" />
              </button>
              <div className="w-10 h-10 rounded-full bg-linear-to-br from-orange-400 to-pink-400 flex items-center justify-center">
                <span className="text-white font-semibold text-sm">U</span>
              </div>
            </div>
          </div>

          {/* Account Settings */}
          {activeTab === "account" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-white text-2xl font-bold mb-2">
                  {t("accountSettings")}
                </h2>
                <p className="text-gray-400 text-sm">
                  {t("managePasswordAndDetails")}
                </p>
              </div>

              {/* Change Password */}
              <div className="bg-[#1e1e32] rounded-2xl border border-white/10 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Lock className="text-white" />
                  <h3 className="text-white font-semibold">
                    {t("changePassword")}
                  </h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">
                      {t("currentPassword")}
                    </label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder={t("enterCurrentPassword")}
                      className="w-full bg-[#252540] text-white placeholder-gray-500 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">
                      {t("newPassword")}
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={t("minimum8Characters")}
                      className="w-full bg-[#252540] text-white placeholder-gray-500 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">
                      {t("confirmNewPassword")}
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={t("retypeNewPassword")}
                      className="w-full bg-[#252540] text-white placeholder-gray-500 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={handleUpdatePassword}
                      className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
                    >
                      {t("updatePassword")}
                    </button>
                  </div>
                </div>
              </div>

              {/* Recovery Email */}
              <div className="bg-[#1e1e32] rounded-2xl border border-white/10 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Mail className="text-white" />
                  <h3 className="text-white font-semibold">
                    {t("recoveryEmail")}
                  </h3>
                </div>
                <p className="text-gray-400 text-sm mb-4">
                  {t("optionalRecovery")}
                </p>
                <div className="flex gap-3">
                  <input
                    type="email"
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    className="flex-1 bg-[#252540] text-white placeholder-gray-500 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />
                  <button
                    onClick={handleVerifyEmail}
                    className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    {t("verify")}
                  </button>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="bg-red-950/20 rounded-2xl border border-red-500/30 p-6">
                <h3 className="text-red-400 font-semibold mb-2">
                  {t("dangerZone")}
                </h3>
                <p className="text-gray-400 text-sm mb-4">
                  {t("deleteWarning")}
                </p>
                <button
                  onClick={handleDeleteAccount}
                  className="px-6 py-2.5 bg-transparent border border-red-500 text-red-400 hover:bg-red-500/10 font-semibold rounded-lg transition-colors"
                >
                  {t("deleteAccount")}
                </button>
              </div>
            </div>
          )}

          {/* Privacy & Matching Settings */}
          {activeTab === "privacy" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-white text-2xl font-bold mb-2">
                  {t("privacyMatching")}
                </h2>
                <p className="text-gray-400 text-sm">
                  {t("controlChatAndShare")}
                </p>
              </div>

              {/* Matching Preference */}
              <SettingCard
                title={t("matchingPreference")}
                description={t("selectMatchingPreference")}
              >
                <select
                  value={matchingPreference}
                  onChange={(e) => setMatchingPreference(e.target.value)}
                  className="w-full bg-[#252540] text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 cursor-pointer"
                >
                  <option value="everyone">{t("everyone")}</option>
                  <option value="male">{t("male")}</option>
                  <option value="female">{t("female")}</option>
                  <option value="non-binary">{t("nonBinary")}</option>
                </select>
              </SettingCard>

              {/* Age Range Preference */}
              <SettingCard
                title={t("ageRangePreference")}
                description={t("specifyAgeRange")}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-purple-400 font-semibold">18</span>
                    <span className="text-white font-semibold">
                      {ageRange[0]} - {ageRange[1]}
                    </span>
                    <span className="text-purple-400 font-semibold">65+</span>
                  </div>
                  <input
                    type="range"
                    min="18"
                    max="65"
                    value={ageRange[1]}
                    onChange={(e) =>
                      setAgeRange([ageRange[0], parseInt(e.target.value)])
                    }
                    className="w-full h-2 bg-[#252540] rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-600"
                  />
                </div>
              </SettingCard>

              {/* Language Preference */}
              <SettingCard
                title={t("languagePreference")}
                description={t("selectLanguagePreference")}
              >
                <select
                  value={languagePreference}
                  onChange={(e) => setLanguagePreference(e.target.value)}
                  className="w-full bg-[#252540] text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 cursor-pointer"
                >
                  <option value="english">{t("english")}</option>
                  <option value="spanish">Spanish</option>
                  <option value="french">French</option>
                  <option value="german">German</option>
                </select>
              </SettingCard>

              {/* Location Preference */}
              <SettingCard
                title={t("locationPreference")}
                description={t("selectLocationPreference")}
              >
                <div className="space-y-3">
                  <select
                    value={locationPreference}
                    onChange={(e) => setLocationPreference(e.target.value)}
                    className="w-full bg-[#252540] text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 cursor-pointer"
                  >
                    <option value="global">{t("global")}</option>
                    <option value="country">{t("sameCountry")}</option>
                    <option value="city">{t("sameCity")}</option>
                  </select>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xl" />
                    <input
                      type="text"
                      placeholder={t("cityOrDistrict")}
                      className="w-full bg-[#252540] text-white placeholder-gray-500 pl-11 pr-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                    />
                  </div>
                </div>
              </SettingCard>

              {/* Show Approximate Location */}
              <SettingCard
                title={t("showLocation")}
                description={t("allowLocationSharing")}
                icon={<Info />}
              >
                <Toggle enabled={showLocation} onChange={setShowLocation} />
              </SettingCard>
            </div>
          )}

          {/* AI Features Settings */}
          {activeTab === "ai" && (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <h2 className="text-white text-2xl font-bold">
                  {t("aiFeatures")}
                </h2>
                <span className="text-xs bg-purple-600/20 text-purple-400 px-2 py-1 rounded font-semibold">
                  BETA
                </span>
              </div>
              <p className="text-gray-400 text-sm">{t("aiDescription")}</p>

              {/* Smart Icebreakers */}
              <SettingCard
                icon={<Sparkles />}
                iconBg="bg-purple-600"
                title={t("smartIcebreakers")}
                description={t("smartIcebreakersDescription")}
              >
                <Toggle
                  enabled={smartIcebreakers}
                  onChange={setSmartIcebreakers}
                />
              </SettingCard>

              {/* Sensitive Content Filter */}
              <SettingCard
                icon={<EyeOff />}
                iconBg="bg-purple-600"
                title={t("sensitiveContentFilter")}
                description={t("sensitiveContentFilterDescription")}
              >
                <Toggle enabled={contentFilter} onChange={setContentFilter} />
              </SettingCard>
            </div>
          )}

          {/* Notifications */}
          {activeTab === "notifications" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-white text-2xl font-bold mb-2">
                  {t("notifications")}
                </h2>
                <p className="text-gray-400 text-sm">
                  {t("manageNotifications")}
                </p>
              </div>
              <div className="text-gray-400 text-center py-12">
                Coming soon...
              </div>
            </div>
          )}

          {/* Language Settings */}
          {activeTab === "language" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-white text-2xl font-bold mb-2">
                  {t("language")}
                </h2>
                <p className="text-gray-400 text-sm">
                  {t("selectAppLanguage")}
                </p>
              </div>

              <SettingCard
                title={t("applicationLanguage")}
                description={t("selectAppLanguage")}
              >
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <input
                      type="radio"
                      id="vi-VN"
                      name="language"
                      value="vi-VN"
                      checked={language === "vi-VN"}
                      onChange={(e) =>
                        setLanguage(e.target.value as "vi-VN" | "en-US")
                      }
                      className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 focus:ring-purple-500"
                    />
                    <label htmlFor="vi-VN" className="text-white font-medium">
                      {t("vietnameseVN")}
                    </label>
                  </div>
                  <div className="flex items-center space-x-4">
                    <input
                      type="radio"
                      id="en-US"
                      name="language"
                      value="en-US"
                      checked={language === "en-US"}
                      onChange={(e) =>
                        setLanguage(e.target.value as "vi-VN" | "en-US")
                      }
                      className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 focus:ring-purple-500"
                    />
                    <label htmlFor="en-US" className="text-white font-medium">
                      {t("englishUS")}
                    </label>
                  </div>
                </div>
              </SettingCard>
            </div>
          )}

          {/* Support */}
          {activeTab === "support" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-white text-2xl font-bold mb-2">
                  {t("support")}
                </h2>
                <p className="text-gray-400 text-sm">{t("supportHelp")}</p>
              </div>
              <div className="text-gray-400 text-center py-12">
                Coming soon...
              </div>
            </div>
          )}

          {/* Save Button */}
          {(activeTab === "account" ||
            activeTab === "privacy" ||
            activeTab === "ai" ||
            activeTab === "language") && (
            <div className="flex justify-end pt-6">
              <button
                onClick={handleSaveChanges}
                className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
              >
                <Save />
                <span>{t("saveAllChanges")}</span>
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

interface SettingsNavItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

function SettingsNavItem({
  icon,
  label,
  active,
  onClick,
}: SettingsNavItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
        active
          ? "bg-purple-600 text-white"
          : "text-gray-400 hover:bg-white/5 hover:text-white"
      }`}
    >
      <div className="text-xl">{icon}</div>
      <span className="font-medium text-sm">{label}</span>
    </button>
  );
}

interface SettingCardProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  iconBg?: string;
  children: React.ReactNode;
}

function SettingCard({
  title,
  description,
  icon,
  iconBg,
  children,
}: SettingCardProps) {
  return (
    <div className="bg-[#1e1e32] rounded-2xl border border-white/10 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {icon && (
              <div
                className={`w-8 h-8 ${
                  iconBg || "bg-purple-600/20"
                } rounded-lg flex items-center justify-center`}
              >
                <div
                  className={`text-xl ${
                    iconBg ? "text-white" : "text-purple-400"
                  }`}
                >
                  {icon}
                </div>
              </div>
            )}
            <h3 className="text-white font-semibold">{title}</h3>
          </div>
          <p className="text-gray-400 text-sm">{description}</p>
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
}

interface ToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

function Toggle({ enabled, onChange }: ToggleProps) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative w-12 h-6 rounded-full transition-colors ${
        enabled ? "bg-purple-600" : "bg-gray-600"
      }`}
    >
      <div
        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
          enabled ? "right-0.5" : "left-0.5"
        }`}
      />
    </button>
  );
}
