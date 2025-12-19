import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { LanguageProvider } from "@/hooks/use-language";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AnoChat",
  description: "Anonymous Chat, Talk to Strangers, Make Friends",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <LanguageProvider>
          <Sonner position="top-center" />
          {/* <LangSelector /> */}
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
