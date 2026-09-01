"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "grid" },
  { href: "/mcqs", label: "All MCQs", icon: "list" },
  { href: "/practice", label: "Practice", icon: "book" },
  { href: "/exam", label: "Exam Mode", icon: "clock" },
  { href: "/random-test", label: "Random Test", icon: "shuffle" },
  { href: "/subject-test", label: "Subject Test", icon: "layers" },
  { href: "/admin", label: "Admin", icon: "shield" }
] as const;

function NavIcon({ name }: { name: string }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2 };
  switch (name) {
    case "grid": return <svg {...common}><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>;
    case "list": return <svg {...common}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>;
    case "book": return <svg {...common}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>;
    case "clock": return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>;
    case "shuffle": return <svg {...common}><path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" /></svg>;
    case "layers": return <svg {...common}><path d="M12 2 2 7l10 5 10-5-10-5ZM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>;
    case "shield": return <svg {...common}><path d="M12 2 4 5v6c0 5 3.5 8.5 8 11 4.5-2.5 8-6 8-11V5l-8-3Z" /></svg>;
    default: return null;
  }
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  return (
    <div className="min-h-screen flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col w-64 shrink-0 border-r border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 px-4 py-6 sticky top-0 h-screen">
        <Link href="/" className="flex items-center gap-2 px-2 mb-8 focus-ring rounded-lg">
          <span className="h-9 w-9 rounded-xl bg-emerald-600 text-white grid place-items-center font-display font-bold text-sm">UDC</span>
          <div className="leading-tight">
            <div className="font-display font-semibold text-sm">NCCIA UDC Prep</div>
            <div className="text-xs text-ink-400">MCQ Practice Platform</div>
          </div>
        </Link>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  "focus-ring flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors " +
                  (active
                    ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-600/15 dark:text-emerald-400"
                    : "text-ink-700 dark:text-paper-100 hover:bg-ink-100 dark:hover:bg-ink-800")
                }
              >
                <NavIcon name={item.icon} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto flex items-center justify-between px-2 pt-4 border-t border-ink-200 dark:border-ink-800">
          <span className="text-xs text-ink-400">Theme</span>
          <ThemeToggle />
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 border-b border-ink-200 dark:border-ink-800 bg-white/90 dark:bg-ink-900/90 backdrop-blur">
          <Link href="/" className="flex items-center gap-2 focus-ring rounded-lg">
            <span className="h-7 w-7 rounded-lg bg-emerald-600 text-white grid place-items-center font-display font-bold text-xs">UDC</span>
            <span className="font-display font-semibold text-sm">NCCIA UDC Prep</span>
          </Link>
          <ThemeToggle />
        </header>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8 pb-24 md:pb-8">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-ink-900 border-t border-ink-200 dark:border-ink-800 flex justify-around py-2">
          {NAV_ITEMS.filter((i) => i.href !== "/admin").slice(0, 5).map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  "focus-ring flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-medium " +
                  (active ? "text-emerald-600 dark:text-emerald-400" : "text-ink-400")
                }
              >
                <NavIcon name={item.icon} />
                {item.label.split(" ")[0]}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
