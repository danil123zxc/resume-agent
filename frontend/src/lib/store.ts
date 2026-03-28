import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";

type AuthState = {
  session: Session | null;
  user: User | null;
  isReady: boolean;
  setSession: (session: Session | null) => void;
  setReady: (ready: boolean) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  isReady: false,
  setSession: (session) => set({ session, user: session?.user ?? null }),
  setReady: (isReady) => set({ isReady }),
}));

type WizardJobPost = {
  id: string;
  title: string;
  company: string | null;
  url: string | null;
  description: string;
};

type WizardResume = {
  id: string;
  title: string;
  job_post_id: string | null;
  source_text: string;
  optimized_text: string;
};

type ResumeWizardState = {
  jobUrl: string;
  jobTitle: string;
  jobCompany: string;
  jobText: string;
  resumeMode: "upload" | "generate";
  resumeText: string;
  tone: "conservative" | "balanced" | "bold";
  length: "1page" | "2page";
  keywords: string[];
  optimizedText: string;
  resumeTitle: string;
  savedJob: WizardJobPost | null;
  savedResume: WizardResume | null;
  updateWizard: (patch: Partial<ResumeWizardStateData>) => void;
  resetJobFields: () => void;
};

type ResumeWizardStateData = Omit<ResumeWizardState, "updateWizard" | "resetJobFields">;

export const useResumeWizardStore = create<ResumeWizardState>((set) => ({
  jobUrl: "",
  jobTitle: "",
  jobCompany: "",
  jobText: "",
  resumeMode: "upload",
  resumeText: "",
  tone: "balanced",
  length: "1page",
  keywords: [],
  optimizedText: "",
  resumeTitle: "Optimized Resume",
  savedJob: null,
  savedResume: null,
  updateWizard: (patch) => set((state) => ({ ...state, ...patch })),
  resetJobFields: () =>
    set((state) => ({
      ...state,
      jobUrl: "",
      jobTitle: "",
      jobCompany: "",
      jobText: "",
      savedJob: null,
      optimizedText: "",
      keywords: [],
      savedResume: null,
    })),
}));
