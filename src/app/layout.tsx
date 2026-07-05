import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart Bricks — Customer Success Tracker",
  description: "Outreach & feedback tracker for the Product and Sales team.",
};

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/people", label: "People" },
  { href: "/outreach", label: "Outreach log" },
  { href: "/outreach/new", label: "Log a touch" },
  { href: "/sync", label: "Sync" },
];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <header className="sticky top-0 z-10 border-b border-black/10 bg-white/80 backdrop-blur dark:border-white/10 dark:bg-slate-900/80">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <span aria-hidden>🧱</span> Smart Bricks CS
            </Link>
            <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-black/10 py-4 text-center text-xs text-black/40 dark:border-white/10 dark:text-white/40">
          Product ⇄ Sales · outreach &amp; feedback tracker
        </footer>
      </body>
    </html>
  );
}
