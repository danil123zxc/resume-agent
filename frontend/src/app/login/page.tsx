"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const canSubmit = useMemo(() => email.trim() && password.trim(), [email, password]);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);

    try {
      if (mode === "signin") {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
      } else {
        const { error: err } = await supabase.auth.signUp({ email, password });
        if (err) throw err;
      }
      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="rounded-2xl border border-white/10 bg-[#111A2E] p-6">
        <h1 className="text-xl font-semibold tracking-tight">로그인</h1>
        <p className="mt-2 text-sm text-white/70">
          Save resumes and job posts to your account.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            onClick={() => setMode("signin")}
            className={`px-3 py-2 rounded-xl text-sm transition ${
              mode === "signin" ? "bg-white/10" : "bg-white/5 hover:bg-white/10 text-white/70"
            }`}
          >
            로그인
          </button>
          <button
            onClick={() => setMode("signup")}
            className={`px-3 py-2 rounded-xl text-sm transition ${
              mode === "signup" ? "bg-white/10" : "bg-white/5 hover:bg-white/10 text-white/70"
            }`}
          >
            회원가입
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-5 grid gap-3">
          <label className="grid gap-1">
            <span className="text-xs text-white/70">이메일</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="px-3 py-2 rounded-xl bg-black/20 border border-white/10 outline-none focus:ring-2 focus:ring-[#6D5EF6]/60"
              type="email"
              placeholder="you@example.com"
              required
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-white/70">비밀번호</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="px-3 py-2 rounded-xl bg-black/20 border border-white/10 outline-none focus:ring-2 focus:ring-[#6D5EF6]/60"
              type="password"
              placeholder="••••••••"
              required
            />
          </label>

          {error ? <div className="text-sm text-red-300">{error}</div> : null}

          <button
            disabled={!canSubmit || loading}
            className="mt-2 px-4 py-2 rounded-xl bg-[#6D5EF6] disabled:opacity-40 hover:brightness-110 transition text-sm"
            type="submit"
          >
            {loading ? "처리중..." : mode === "signin" ? "로그인" : "계정 만들기"}
          </button>
        </form>
      </div>
    </div>
  );
}

