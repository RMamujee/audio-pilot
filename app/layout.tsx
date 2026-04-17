import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AudioPilot — Artist Sound Finder",
  description: "Search any artist and find every sound in their sonic palette. Preview and copy synth parameters instantly.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
