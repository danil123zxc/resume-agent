import Link from "next/link";

export default function Home() {
  return (
    <div className="grid gap-8">
      <section className="rounded-2xl border border-white/10 bg-[#111A2E] p-6">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">이력서 최적화, 빠르게</h1>
            <p className="mt-2 text-sm text-white/70 max-w-2xl">
              Paste a job posting and upload your resume (or generate a new one). JobHunt AI will
              produce an ATS-friendly version you can edit and export to PDF.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-xl bg-[#6D5EF6] hover:brightness-110 transition text-sm"
            >
              시작하기
            </Link>
            <Link
              href="/library"
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 transition text-sm"
            >
              보관함 보기
            </Link>
          </div>
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-white/10 bg-[#111A2E] p-5">
          <div className="text-sm font-medium">1) 채용공고</div>
          <div className="mt-2 text-sm text-white/70">URL 또는 텍스트를 붙여넣기</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#111A2E] p-5">
          <div className="text-sm font-medium">2) 이력서</div>
          <div className="mt-2 text-sm text-white/70">PDF 업로드 또는 새로 생성</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#111A2E] p-5">
          <div className="text-sm font-medium">3) 편집 & PDF</div>
          <div className="mt-2 text-sm text-white/70">결과를 수정하고 PDF로 다운로드</div>
        </div>
      </section>
    </div>
  );
}

