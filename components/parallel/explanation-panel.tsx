"use client"

import type { ExplanationSection } from "@/lib/explanation-generator"

export function ExplanationPanelContent({ sections }: { sections: ExplanationSection[] }) {
  return (
    <div className="space-y-6">
      {sections.map((s, i) => (
        <div key={i}>
          <h4 className="text-sm font-semibold text-[#1a1a2e] mb-1.5">{s.title}</h4>
          <p className="text-[0.88rem] text-[#6b7280] leading-relaxed">{s.content}</p>
        </div>
      ))}
    </div>
  )
}
