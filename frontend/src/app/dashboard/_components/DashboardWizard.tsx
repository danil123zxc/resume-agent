"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { apiRequest, downloadBlob } from "@/lib/api";
import { useAuthStore, useResumeWizardStore } from "@/lib/store";

type Step = 1 | 2 | 3 | 4;

type OptimizeResponse = {
  optimizedResumeText: string;
  extractedKeywords: string[];
  pdfBase64: string;
  pdfFilename: string;
};

type JobPost = {
  id: string;
  title: string;
  company: string | null;
  url: string | null;
  description: string;
};

type Resume = {
  id: string;
  title: string;
  job_post_id: string | null;
  source_text: string;
  optimized_text: string;
};

const stepPath: Record<Step, string> = {
  1: "/dashboard/job",
  2: "/dashboard/resume",
  3: "/dashboard/options",
  4: "/dashboard/result",
};

function base64ToPdfBlob(base64: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: "application/pdf" });
}

function StepPill({
  label,
  active,
  done,
  onClick,
}: {
  label: string;
  active: boolean;
  done: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs border transition cursor-pointer hover:brightness-110 ${
        active
          ? "bg-[#6D5EF6]/20 border-[#6D5EF6]/40"
          : done
          ? "bg-white/5 border-white/10 text-white/80"
          : "bg-transparent border-white/10 text-white/50"
      }`}
    >
      {label}
    </button>
  );
}

export default function DashboardWizard({ step }: { step: Step }) {
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    jobUrl,
    jobTitle,
    jobCompany,
    jobText,
    resumeMode,
    resumeText,
    tone,
    length,
    keywords,
    optimizedText,
    resumeTitle,
    savedJob,
    savedResume,
    updateWizard,
    resetJobFields,
  } = useResumeWizardStore();

  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [optimizedPdf, setOptimizedPdf] = useState<{ base64: string; filename: string; sourceText: string } | null>(null);

  function goToStep(targetStep: Step) {
    router.push(stepPath[targetStep]);
  }

  async function onExtractFromUrl() {
    setLoading("extract");
    setError(null);
    try {
      const res = await apiRequest<{ description: string }>("/api/jobs/extract", {
        method: "POST",
        body: { url: jobUrl },
      });
      updateWizard({ jobText: res.description });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to extract job posting");
    } finally {
      setLoading(null);
    }
  }

  async function onParseResume(file: File) {
    setLoading("parse");
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const data = await apiRequest<{ resumeText: string }>("/api/resumes/parse", {
        method: "POST",
        body: form,
      });
      updateWizard({ resumeText: data.resumeText });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to parse resume");
    } finally {
      setLoading(null);
    }
  }

  async function onOptimize() {
    const trimmedJobText = jobText.trim();
    if (trimmedJobText.length < 20) {
      setError("Please enter at least 20 characters in the job description.");
      return;
    }
    setLoading("optimize");
    setError(null);
    try {
      const mode = resumeMode === "generate" || !resumeText.trim() ? "generate" : "optimize";
      const res = await apiRequest<OptimizeResponse>("/api/analyze/optimize", {
        method: "POST",
        retries: 2,
        retryDelayMs: 800,
        body: {
          jobPostText: trimmedJobText,
          resumeText,
          mode,
          options: { tone, length },
        },
      });
      updateWizard({
        optimizedText: res.optimizedResumeText,
        keywords: res.extractedKeywords || [],
      });
      setOptimizedPdf(
        res.pdfBase64
          ? {
              base64: res.pdfBase64,
              filename: res.pdfFilename || "optimized_resume.pdf",
              sourceText: res.optimizedResumeText,
            }
          : null,
      );
      goToStep(4);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Optimization failed");
    } finally {
      setLoading(null);
    }
  }

  async function onDownloadPdf() {
    setLoading("pdf");
    setError(null);
    try {
      if (optimizedPdf && optimizedPdf.base64 && optimizedPdf.sourceText === optimizedText) {
        downloadBlob(base64ToPdfBlob(optimizedPdf.base64), optimizedPdf.filename || `${resumeTitle || "resume"}.pdf`);
        return;
      }
      const blob = await apiRequest<Blob>("/api/analyze/pdf", {
        method: "POST",
        body: { title: resumeTitle, content: optimizedText },
      });
      downloadBlob(blob, `${resumeTitle || "resume"}.pdf`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "PDF generation failed");
    } finally {
      setLoading(null);
    }
  }

  async function onSaveJob() {
    if (!user) {
      router.push("/login");
      return;
    }
    setLoading("savejob");
    setError(null);
    try {
      const res = await apiRequest<JobPost>("/api/jobs", {
        method: "POST",
        auth: true,
        body: { title: jobTitle || "Job Post", company: jobCompany || null, url: jobUrl || null, description: jobText },
      });
      updateWizard({ savedJob: res });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save job post");
    } finally {
      setLoading(null);
    }
  }

  async function onSaveResume() {
    if (!user) {
      router.push("/login");
      return;
    }
    setLoading("saveresume");
    setError(null);
    try {
      const res = await apiRequest<Resume>("/api/resumes", {
        method: "POST",
        auth: true,
        body: {
          title: resumeTitle || "Resume",
          job_post_id: savedJob?.id || null,
          source_text: resumeText || "",
          optimized_text: optimizedText,
        },
      });
      updateWizard({ savedResume: res });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save resume");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <StepPill label="1. 채용공고" active={step === 1} done={step > 1} onClick={() => goToStep(1)} />
        <StepPill label="2. 이력서" active={step === 2} done={step > 2} onClick={() => goToStep(2)} />
        <StepPill label="3. 옵션" active={step === 3} done={step > 3} onClick={() => goToStep(3)} />
        <StepPill label="4. 편집/다운로드" active={step === 4} done={false} onClick={() => goToStep(4)} />
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {step === 1 ? (
        <section className="rounded-2xl border border-white/10 bg-[#111A2E] p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">채용공고 입력</div>
              <div className="mt-1 text-xs text-white/60">URL 추출 또는 텍스트 붙여넣기</div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => goToStep(2)}
                className="px-3 py-2 rounded-xl text-xs bg-[#6D5EF6] hover:brightness-110 transition"
              >
                다음
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            <div className="grid md:grid-cols-2 gap-3">
              <input
                value={jobTitle}
                onChange={(e) => updateWizard({ jobTitle: e.target.value })}
                className="px-3 py-2 rounded-xl bg-black/20 border border-white/10 outline-none focus:ring-2 focus:ring-[#6D5EF6]/60 text-sm"
                placeholder="Job title (optional)"
              />
              <input
                value={jobCompany}
                onChange={(e) => updateWizard({ jobCompany: e.target.value })}
                className="px-3 py-2 rounded-xl bg-black/20 border border-white/10 outline-none focus:ring-2 focus:ring-[#6D5EF6]/60 text-sm"
                placeholder="Company (optional)"
              />
            </div>
            <div className="grid md:grid-cols-[1fr_auto] gap-2">
              <input
                value={jobUrl}
                onChange={(e) => updateWizard({ jobUrl: e.target.value })}
                className="px-3 py-2 rounded-xl bg-black/20 border border-white/10 outline-none focus:ring-2 focus:ring-[#6D5EF6]/60 text-sm"
                placeholder="Job URL (optional)"
              />
              <button
                disabled={!jobUrl.trim() || loading !== null}
                onClick={onExtractFromUrl}
                className="px-3 py-2 rounded-xl text-sm bg-white/10 hover:bg-white/15 disabled:opacity-40 transition"
              >
                {loading === "extract" ? "추출중..." : "URL 추출"}
              </button>
            </div>
            <textarea
              value={jobText}
              onChange={(e) => updateWizard({ jobText: e.target.value })}
              className="min-h-[220px] px-3 py-2 rounded-xl bg-black/20 border border-white/10 outline-none focus:ring-2 focus:ring-[#6D5EF6]/60 text-sm"
              placeholder="Paste the full job description here..."
            />
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={resetJobFields}
                className="px-3 py-2 rounded-xl text-xs bg-white/5 hover:bg-white/10 transition text-white/80"
              >
                초기화
              </button>
              <button
                onClick={onSaveJob}
                disabled={!jobText.trim() || loading !== null}
                className="px-3 py-2 rounded-xl text-xs bg-white/10 hover:bg-white/15 disabled:opacity-40 transition"
              >
                {savedJob ? "저장됨" : "채용공고 저장"}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="rounded-2xl border border-white/10 bg-[#111A2E] p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">이력서 입력</div>
              <div className="mt-1 text-xs text-white/60">PDF 업로드 또는 새 이력서 생성</div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => goToStep(1)}
                className="px-3 py-2 rounded-xl text-xs bg-white/10 hover:bg-white/15 transition"
              >
                이전
              </button>
              <button
                onClick={() => goToStep(3)}
                className="px-3 py-2 rounded-xl text-xs bg-[#6D5EF6] hover:brightness-110 transition"
              >
                다음
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            <div className="flex gap-2">
              <button
                onClick={() => updateWizard({ resumeMode: "upload" })}
                className={`px-3 py-2 rounded-xl text-xs border transition ${
                  resumeMode === "upload" ? "bg-white/10 border-white/20" : "bg-transparent border-white/10 text-white/70 hover:bg-white/5"
                }`}
              >
                업로드
              </button>
              <button
                onClick={() => updateWizard({ resumeMode: "generate" })}
                className={`px-3 py-2 rounded-xl text-xs border transition ${
                  resumeMode === "generate" ? "bg-white/10 border-white/20" : "bg-transparent border-white/10 text-white/70 hover:bg-white/5"
                }`}
              >
                새로 생성
              </button>
            </div>

            {resumeMode === "upload" ? (
              <label className="grid gap-2">
                <span className="text-xs text-white/70">PDF 파일</span>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onParseResume(f);
                  }}
                  className="block w-full text-sm text-white/70 file:mr-4 file:rounded-xl file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-sm file:text-white hover:file:bg-white/15"
                />
              </label>
            ) : (
              <div className="text-sm text-white/70">
                No resume needed. A new tailored resume will be generated.
              </div>
            )}

            <textarea
              value={resumeText}
              onChange={(e) => updateWizard({ resumeText: e.target.value })}
              className="min-h-[180px] px-3 py-2 rounded-xl bg-black/20 border border-white/10 outline-none focus:ring-2 focus:ring-[#6D5EF6]/60 text-sm"
              placeholder="Extracted resume text will appear here (editable)"
            />
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="rounded-2xl border border-white/10 bg-[#111A2E] p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">최적화 옵션</div>
              <div className="mt-1 text-xs text-white/60">Tone and target length</div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => goToStep(2)}
                className="px-3 py-2 rounded-xl text-xs bg-white/10 hover:bg-white/15 transition"
              >
                이전
              </button>
              <button
                disabled={loading !== null}
                onClick={onOptimize}
                className="px-3 py-2 rounded-xl text-xs bg-[#6D5EF6] hover:brightness-110 disabled:opacity-40 transition"
              >
                {loading === "optimize" ? "생성중..." : "AI 최적화 실행"}
              </button>
            </div>
          </div>

          <div className="mt-4 grid md:grid-cols-2 gap-3">
            <label className="grid gap-1">
              <span className="text-xs text-white/70">Tone</span>
              <select
                value={tone}
                onChange={(e) => updateWizard({ tone: e.target.value as "conservative" | "balanced" | "bold" })}
                className="px-3 py-2 rounded-xl bg-black/20 border border-white/10 outline-none focus:ring-2 focus:ring-[#6D5EF6]/60 text-sm"
              >
                <option value="conservative">Conservative</option>
                <option value="balanced">Balanced</option>
                <option value="bold">Bold</option>
              </select>
            </label>
            <label className="grid gap-1">
              <span className="text-xs text-white/70">Length</span>
              <select
                value={length}
                onChange={(e) => updateWizard({ length: e.target.value as "1page" | "2page" })}
                className="px-3 py-2 rounded-xl bg-black/20 border border-white/10 outline-none focus:ring-2 focus:ring-[#6D5EF6]/60 text-sm"
              >
                <option value="1page">1 page</option>
                <option value="2page">2 pages</option>
              </select>
            </label>
          </div>
          <div className="mt-3 text-xs text-white/60">Job description must be at least 20 characters.</div>
        </section>
      ) : null}

      {step === 4 ? (
        <div className="grid gap-6">
          <section className="rounded-2xl border border-white/10 bg-[#111A2E] p-5">
            <div className="text-sm font-medium">키워드</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {keywords.length ? (
                keywords.map((k) => (
                  <span key={k} className="px-2 py-1 rounded-full text-xs bg-white/10 border border-white/10">
                    {k}
                  </span>
                ))
              ) : (
                <div className="text-sm text-white/60">Run optimization to extract keywords.</div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#111A2E] p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">결과 편집</div>
                <div className="mt-1 text-xs text-white/60">Edit and export to PDF</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => goToStep(3)}
                  className="px-3 py-2 rounded-xl text-xs bg-white/10 hover:bg-white/15 transition"
                >
                  이전
                </button>
                <button
                  disabled={!optimizedText.trim() || loading !== null}
                  onClick={onDownloadPdf}
                  className="px-3 py-2 rounded-xl text-xs bg-white/10 hover:bg-white/15 disabled:opacity-40 transition"
                >
                  {loading === "pdf" ? "생성중..." : "PDF 다운로드"}
                </button>
                <button
                  disabled={!optimizedText.trim() || loading !== null}
                  onClick={onSaveResume}
                  className="px-3 py-2 rounded-xl text-xs bg-[#22C55E]/20 border border-[#22C55E]/30 hover:brightness-110 disabled:opacity-40 transition"
                >
                  {savedResume ? "저장됨" : "이력서 저장"}
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              <input
                value={resumeTitle}
                onChange={(e) => updateWizard({ resumeTitle: e.target.value })}
                className="px-3 py-2 rounded-xl bg-black/20 border border-white/10 outline-none focus:ring-2 focus:ring-[#6D5EF6]/60 text-sm"
                placeholder="Resume title"
              />
              <textarea
                value={optimizedText}
                onChange={(e) => updateWizard({ optimizedText: e.target.value })}
                className="min-h-[460px] px-3 py-2 rounded-xl bg-black/20 border border-white/10 outline-none focus:ring-2 focus:ring-[#6D5EF6]/60 text-sm"
                placeholder="Optimized resume will appear here..."
              />
            </div>
          </section>

          {!user ? (
            <div className="rounded-2xl border border-white/10 bg-[#111A2E] p-5">
              <div className="text-sm font-medium">저장하려면 로그인 필요</div>
              <div className="mt-2 text-sm text-white/70">
                You can optimize and download without logging in, but saving to your library requires an account.
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
