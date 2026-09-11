import type { Metadata, Viewport } from "next";
import BottomNav from "@/components/BottomNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Training Log",
  description: "Personal lifting logger and plate calculator.",
  appleWebApp: {
    // Makes "Add to Home Screen" open without Safari's address bar, and
    // shows "Training Log" under the icon instead of the page URL.
    capable: true,
    statusBarStyle: "default",
    title: "Training Log",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#f7f6f3",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main className="mx-auto max-w-md px-4 pb-24 pt-4">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
