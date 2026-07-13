import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { AuthSessionProvider } from "@/components/providers/session-provider";
import { siteUrl } from "@/lib/site";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Book A Piano Tuner",
  description:
    "Find and book trusted piano technicians in your area. The all-in-one platform for piano tuning, repair, and maintenance.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthSessionProvider>
            {children}
            <Toaster />
          </AuthSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
