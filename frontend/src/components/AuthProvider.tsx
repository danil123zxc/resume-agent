"use client";

import { useEffect } from "react";

import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/lib/store";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const setSession = useAuthStore((s) => s.setSession);
  const setReady = useAuthStore((s) => s.setReady);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, [setReady, setSession]);

  return <>{children}</>;
}

