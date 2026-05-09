import type { Metadata } from "next";
import { Geist, Geist_Mono, Bricolage_Grotesque } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: "variable",
});

export const metadata: Metadata = {
  title: "Quizly - Live Quiz Platform",
  description: "Create quizzes, launch rooms, and grade students in real-time",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${bricolage.variable} h-full antialiased`}
    >
      <body
        className="min-h-full flex flex-col"
        style={{ background: "var(--q-bg)", color: "var(--q-ink)" }}
      >
        <style>{`
          :root {
            --q-display: var(--font-bricolage, system-ui, sans-serif);
            --q-sans: var(--font-geist-sans, system-ui, sans-serif);
            --q-mono: var(--font-geist-mono, ui-monospace, monospace);
          }
        `}</style>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
