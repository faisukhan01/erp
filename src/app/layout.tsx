import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Space_Grotesk, Unbounded } from "next/font/google";
import "./globals.css";

const grotesk = Space_Grotesk({
  variable: "--font-grotesk",
  subsets: ["latin"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono-code",
  subsets: ["latin"],
  display: "swap",
});

const brand = Unbounded({
  variable: "--font-brand",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ONYX — The AI-native IDE",
  description:
    "Onyx is a machined-black, AI-native browser IDE: Monaco editor, real terminal, git bridge and an AI pair programmer powered by Z.AI.",
  keywords: [
    "Onyx IDE",
    "AI IDE",
    "browser IDE",
    "Monaco editor",
    "AI pair programmer",
    "Z.AI",
    "xterm",
    "Next.js",
  ],
  authors: [{ name: "Onyx" }],
  openGraph: {
    title: "ONYX — The AI-native IDE",
    description:
      "Monaco editor, real terminal, git bridge and Z.AI pair programming — in one machined-black workspace.",
    siteName: "Onyx",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#030303",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${grotesk.variable} ${mono.variable} ${brand.variable} antialiased bg-[#030303] font-sans text-[#ededed]`}
      >
        {children}
      </body>
    </html>
  );
}
