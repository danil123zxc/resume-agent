"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/lib/store";

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      className={`px-3 py-2 rounded-lg text-sm transition ${
        active ? "bg-white/10 text-white" : "text-white/70 hover:text-white hover:bg-white/5"
      }`}
    >
      {label}
    </Link>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  async function onSignOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <div className="min-h-screen bg-[#0B1220] text-white">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0B1220]/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <Link href="/" className="font-semibold tracking-tight">
            JobHunt AI
          </Link>
          <nav className="flex items-center gap-1">
            <NavLink href="/dashboard" label="최적화" />
            <NavLink href="/library" label="보관함" />
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <div className="hidden sm:block text-xs text-white/60 max-w-[220px] truncate">
                  {user.email}
                </div>
                <button
                  onClick={onSignOut}
                  className="px-3 py-2 rounded-lg text-sm bg-white/10 hover:bg-white/15 transition"
                >
                  로그아웃
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="px-3 py-2 rounded-lg text-sm bg-[#6D5EF6] hover:brightness-110 transition"
              >
                로그인
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}

