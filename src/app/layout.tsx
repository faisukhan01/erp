import type { Metadata } from "next";
import { Bricolage_Grotesque, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Buildora — Describe it. Watch it ship.",
  description:
    "Buildora turns a sentence into a stunning, working web app, then lets you refine it through conversation. An AI app-builder platform powered by Z.AI, FastAPI and Neon PostgreSQL.",
  keywords: [
    "Buildora",
    "AI app builder",
    "Z.AI",
    "Lovable alternative",
    "Base44 alternative",
    "FastAPI",
    "Next.js",
    "PostgreSQL",
  ],
  authors: [{ name: "Buildora" }],
  openGraph: {
    title: "Buildora — Describe it. Watch it ship.",
    description: "The AI app-builder platform powered by Z.AI. One sentence in, a working web app out.",
    siteName: "Buildora",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Buildora — Describe it. Watch it ship.",
    description: "The AI app-builder platform powered by Z.AI. One sentence in, a working web app out.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${bricolage.variable} ${jetbrainsMono.variable} antialiased bg-[#050505] font-sans text-zinc-100`}
      >
        {children}
      </body>
    </html>
  );
}
