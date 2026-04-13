import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AudioPilot — AI Sound Finder",
  description: "AI-powered sound finder — match any artist or vibe to synth parameters",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
