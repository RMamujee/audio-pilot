import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Serum Dupe — AI Sound Finder",
  description: "Find synth sounds and samples matching any artist or vibe",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
