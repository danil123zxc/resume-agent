"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { apiRequest, downloadBlob } from "@/lib/api";
import { useAuthStore } from "@/lib/store";

type JobPost = {
  id: string;
  title: string;
  company: string | null;
  url: string | null;
  description: string;
  updated_at: string;
};

type Resume = {
  id: string;
  title: string;
  job_post_id: string | null;
  optimized_text: string;
  updated_at: string;
};

export default function LibraryPage() {
  const router = useRouter();
  const { user, isReady } = useAuthStore();

  const [tab, setTab] = useState<"resumes" | "jobs">("resumes");
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady) return;
    if (!user) router.push("/login");
  }, [isReady, router, user]);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [jobsRes, resumesRes] = await Promise.all([
        apiRequest<JobPost[]>("/api/jobs", { auth: true }),
        apiRequest<Resume[]>("/api/resumes", { auth: true }),
      ]);
      setJobs(jobsRes);
      setResumes(resumesRes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load library");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!user) return;
    refresh();
  }, [user]);

  async function deleteJob(id: string) {
    if (!confirm("Delete this job post?")) return;
    setError(null);
    try {
      await apiRequest<{ status: string }>(`/api/jobs/${id}`, { method: "DELETE", auth: true });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete job post");
    }
  }

  async function deleteResume(id: string) {
    if (!confirm("Delete this resume?")) return;
    setError(null);
    try {
      await apiRequest<{ status: string }>(`/api/resumes/${id}`, { method: "DELETE", auth: true });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete resume");
    }
  }

  async function downloadResume(id: string, title: string) {
    setError(null);
    try {
      const blob = await apiRequest<Blob>(`/api/resumes/${id}/pdf`, { auth: true });
      downloadBlob(blob, `${title || "resume"}.pdf`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to download resume");
    }
  }

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">보관함</h1>
          <div className="mt-1 text-sm text-white/70">Saved resumes and job posts.</div>
        </div>
        <button
          onClick={refresh}
          className="px-3 py-2 rounded-xl text-sm bg-white/10 hover:bg-white/15 transition"
        >
          {loading ? "불러오는중..." : "새로고침"}
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="flex gap-2">
        <button
          onClick={() => setTab("resumes")}
          className={`px-3 py-2 rounded-xl text-sm border transition ${
            tab === "resumes" ? "bg-white/10 border-white/20" : "bg-transparent border-white/10 text-white/70 hover:bg-white/5"
          }`}
        >
          이력서
        </button>
        <button
          onClick={() => setTab("jobs")}
          className={`px-3 py-2 rounded-xl text-sm border transition ${
            tab === "jobs" ? "bg-white/10 border-white/20" : "bg-transparent border-white/10 text-white/70 hover:bg-white/5"
          }`}
        >
          채용공고
        </button>
      </div>

      {tab === "resumes" ? (
        <div className="grid gap-3">
          {resumes.length ? (
            resumes.map((r) => (
              <div key={r.id} className="rounded-2xl border border-white/10 bg-[#111A2E] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{r.title}</div>
                    <div className="mt-1 text-xs text-white/60">Updated: {new Date(r.updated_at).toLocaleString()}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => downloadResume(r.id, r.title)}
                      className="px-3 py-2 rounded-xl text-xs bg-white/10 hover:bg-white/15 transition"
                    >
                      PDF
                    </button>
                    <button
                      onClick={() => deleteResume(r.id)}
                      className="px-3 py-2 rounded-xl text-xs bg-red-500/10 border border-red-500/20 hover:brightness-110 transition"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-white/70">No saved resumes yet.</div>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {jobs.length ? (
            jobs.map((j) => (
              <div key={j.id} className="rounded-2xl border border-white/10 bg-[#111A2E] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{j.title}</div>
                    <div className="mt-1 text-xs text-white/60">
                      {j.company ? `${j.company} · ` : ""}Updated: {new Date(j.updated_at).toLocaleString()}
                    </div>
                    {j.url ? (
                      <a className="mt-2 inline-block text-xs text-[#6D5EF6] hover:underline" href={j.url} target="_blank" rel="noreferrer">
                        Open URL
                      </a>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => deleteJob(j.id)}
                      className="px-3 py-2 rounded-xl text-xs bg-red-500/10 border border-red-500/20 hover:brightness-110 transition"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-white/70">No saved job posts yet.</div>
          )}
        </div>
      )}
    </div>
  );
}
