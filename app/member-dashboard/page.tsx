"use client"

import { useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { RotationWindowBanner } from "@/components/rotation-window-banner"

// ─── Mock data (hardcoded) ────────────────────────────────────────────────
const MOCK = {
  member: {
    name: "Alex Chen",
    timezone: "America/Los_Angeles",
  },
  nextMeeting: {
    dateTime: "Tue, Mar 10 • 8:00 AM",
    badge: "Early for you",
    participants: ["Alex", "Maria", "Tom", "Li"],
  },
  burden: {
    thisMonth: 4.0,
    lastMonth: 2.5,
    maxHours: 8, // for progress bar scale
  },
  teamFairness: {
    highest: { name: "Alex", hrs: 6.0 },
    lowest: { name: "Maria", hrs: 2.0 },
    status: "Slightly Imbalanced",
  },
}

// ─── Page ───────────────────────────────────────────────────────────────────
export default function MemberDashboardPage() {
  const [modalOpen, setModalOpen] = useState(false)

  const burdenPercent = Math.min(
    100,
    (MOCK.burden.thisMonth / MOCK.burden.maxHours) * 100
  )

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Rotation Window / Lock Status banner */}
        <RotationWindowBanner />

        {/* Header */}
        <header className="mb-10 mt-8">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Member Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your personal fairness status and availability
          </p>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
            <span>
              <strong className="font-medium text-foreground">Name:</strong>{" "}
              {MOCK.member.name}
            </span>
            <span>
              <strong className="font-medium text-foreground">Timezone:</strong>{" "}
              {MOCK.member.timezone}
            </span>
          </div>
        </header>

        {/* Cards grid */}
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Card 1: My Next Meeting */}
          <Card>
            <CardHeader>
              <CardTitle>Next Meeting</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-lg font-medium text-foreground">
                {MOCK.nextMeeting.dateTime}
              </p>
              <Badge variant="secondary">{MOCK.nextMeeting.badge}</Badge>
              <p className="text-sm text-muted-foreground">
                Participants: {MOCK.nextMeeting.participants.join(", ")}
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" disabled>
                View Details
              </Button>
            </CardFooter>
          </Card>

          {/* Card 2: My Burden This Month */}
          <Card>
            <CardHeader>
              <CardTitle>This Month Burden</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-2xl font-semibold text-foreground">
                {MOCK.burden.thisMonth} hrs inconvenience
              </p>
              <p className="text-sm text-muted-foreground">
                Last Month: {MOCK.burden.lastMonth} hrs
              </p>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary/70 transition-all"
                  style={{ width: `${burdenPercent}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Team Fairness Snapshot */}
          <Card className="sm:col-span-2">
            <CardHeader>
              <CardTitle>Team Fairness Snapshot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Highest Burden: {MOCK.teamFairness.highest.name} (
                {MOCK.teamFairness.highest.hrs} hrs)
              </p>
              <p className="text-sm text-muted-foreground">
                Lowest Burden: {MOCK.teamFairness.lowest.name} (
                {MOCK.teamFairness.lowest.hrs} hrs)
              </p>
              <Badge variant="outline">{MOCK.teamFairness.status}</Badge>
            </CardContent>
          </Card>
        </div>

        {/* CTA: Update Availability */}
        <section className="mt-10 border-t border-border pt-8">
          <Dialog open={modalOpen} onOpenChange={setModalOpen}>
            <DialogTrigger asChild>
              <Button size="lg">Update My Availability</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Update My Availability</DialogTitle>
                <DialogDescription>
                  Set your working hours and times you are never available. This
                  helps the team planner distribute meeting times fairly across
                  all members.
                </DialogDescription>
              </DialogHeader>
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-sm text-muted-foreground">
                  [Mock availability editor placeholder — no editing logic]
                </p>
              </div>
              <DialogFooter>
                <Button disabled>Save</Button>
                <Button variant="outline" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </section>
      </div>
    </main>
  )
}
