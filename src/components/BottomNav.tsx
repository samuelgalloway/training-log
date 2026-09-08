"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/today", label: "Today", icon: "📋" },
  { href: "/week", label: "Week", icon: "🗓️" },
  { href: "/history", label: "History", icon: "📈" },
  { href: "/body", label: "Body", icon: "⚖️" },
  { href: "/setup", label: "Setup", icon: "⚙️" },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 flex border-t border-line bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      {LINKS.map((link) => {
        const active = pathname === link.href || pathname.startsWith(link.href + "/");
        return (
          <Link key={link.href} href={link.href} className="bottom-nav-link" data-active={active}>
            <span className="text-xl leading-none">{link.icon}</span>
            <span>{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
