import type { Metadata } from "next";
import { DM_Sans, DM_Serif_Display, Heebo } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { AuthProvider } from "@/components/auth-provider";
import { LocaleProvider } from "@/components/locale-provider";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const dmSerif = DM_Serif_Display({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: "400",
});

const heebo = Heebo({
  variable: "--font-hebrew",
  subsets: ["latin", "hebrew"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Glow — Skincare Tracker",
  description: "Your personal skincare routine tracker and product manager",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${dmSerif.variable} ${heebo.variable} h-full`}>
      <body className="min-h-full flex flex-col font-sans">
        <LocaleProvider>
          <AuthProvider>{children}</AuthProvider>
        </LocaleProvider>
        <Analytics />
      </body>
    </html>
  );
}
