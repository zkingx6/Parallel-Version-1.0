"use client"

import { useState } from "react"
import { TeamMember, RotationWeek } from "@/lib/types"
import { mockTeam, mockBurden, mockRotation } from "@/lib/mock-data"
import { Header } from "./header"
import { TeamSection } from "./team-section"
import { BurdenOverview } from "./burden-overview"
import { RotationPlanner } from "./rotation-planner"
import { FairnessStatement } from "./fairness-statement"

export function ParallelApp() {
  const [team, setTeam] = useState<TeamMember[]>(mockTeam)
  const [rotation, setRotation] = useState<RotationWeek[] | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = () => {
    setIsGenerating(true)
    setRotation(null)
    setTimeout(() => {
      setRotation(mockRotation)
      setIsGenerating(false)
    }, 1800)
  }

  const handleEditMember = (updated: TeamMember) => {
    setTeam((prev) =>
      prev.map((m) =>
        m.id === updated.id
          ? {
              ...updated,
              initials: updated.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2),
            }
          : m
      )
    )
  }

  return (
    <div className="min-h-screen">
      <Header />

      <main className="mx-auto max-w-3xl px-5 sm:px-8 pt-10 sm:pt-14 pb-6">
        <TeamSection team={team} onEditMember={handleEditMember} />

        <div className="mt-16 sm:mt-24">
          <BurdenOverview team={team} burden={mockBurden} />
        </div>

        <div className="mt-14 sm:mt-20">
          <RotationPlanner
            team={team}
            rotation={rotation}
            isGenerating={isGenerating}
            onGenerate={handleGenerate}
          />
        </div>

        {rotation && !isGenerating && (
          <div className="mt-10 sm:mt-14">
            <FairnessStatement
              team={team}
              burden={mockBurden}
              rotation={rotation}
            />
          </div>
        )}
      </main>

      <footer className="mt-20 sm:mt-28 border-t border-border/20">
        <div className="mx-auto max-w-3xl px-5 sm:px-8 py-10 sm:py-14">
          <p className="text-sm text-muted-foreground/40 leading-relaxed max-w-md">
            Parallel does not eliminate inconvenience. It ensures the same
            people are not always the ones absorbing it.
          </p>
        </div>
      </footer>
    </div>
  )
}
