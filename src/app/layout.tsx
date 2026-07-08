import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Teamwork — Cliëntdossier",
  description: "Digitaal cliëntdossier voor thuiszorg: eenvoudig, auto-opslaan, printen per onderwerp.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Cliëntdossier", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0e7c7b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
