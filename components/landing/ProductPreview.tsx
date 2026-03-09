"use client";

import { Container } from "@/components/ui";

export function ProductPreview() {
  return (
    <section className="py-24 md:py-32 bg-gradient-to-b from-white to-slate-50/50">
      <Container>
        <div className="text-center mb-12">
          <p className="section-label">Product</p>
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            See burden and rotation in action
          </h2>
          <p className="mt-4 max-w-xl mx-auto text-slate-600">
            Make burden visible, view the rotation, and share schedules with your team.
          </p>
        </div>

        <div className="relative">
          <div className="rounded-xl border border-slate-200 bg-white shadow-[0_8px_30px_-8px_rgba(15,23,42,0.12)] overflow-hidden transition-all duration-200 hover:shadow-[0_12px_40px_-8px_rgba(15,23,42,0.18)] hover:border-slate-300/80">
            <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1.5">
                <span className="size-2.5 rounded-full bg-slate-300" />
                <span className="size-2.5 rounded-full bg-slate-300" />
                <span className="size-2.5 rounded-full bg-slate-300" />
              </div>
              <span className="text-xs text-slate-500 ml-2 font-medium">
                Parallel — Rotation view
              </span>
            </div>
            <div className="aspect-[16/10] min-h-[320px] flex items-center justify-center bg-gradient-to-b from-slate-50 to-white">
              <div className="text-center p-8">
                <div className="inline-flex items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50/50 px-6 py-4 mb-4">
                  <span className="text-sm text-slate-500">
                    Product screenshot placeholder
                  </span>
                </div>
                <p className="text-xs text-slate-400 max-w-sm">
                  Drop your Parallel scheduling interface screenshot or mockup here.
                  Recommended: rotation table, burden chart, or team view.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
