"use client";

import { useState } from "react";
import { ChevronLeft, Users, ChevronRight } from "lucide-react";
import {
  generateRotationGuarded,
  isRotationResult,
  isNoViableTimeResult,
  isInputContractViolation,
} from "@/lib/rotation";
import type { MeetingConfig, RotationWeekData, TeamMember } from "@/lib/types";
import { RotationOutput } from "@/components/parallel/rotation-output";
import { FairnessSummary } from "@/components/parallel/fairness-summary";
import { useMemo } from "react";
import { DateTime } from "luxon";
import {
  ensureDisplayTimezoneIana,
  getTimezoneOptions,
} from "@/lib/timezone";
import { BASE_TIME_OPTIONS } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  DEMO_TEAMS,
  getDemoTeamMembers,
  getDemoTeamDisplayMembers,
  DEFAULT_DEMO_CONFIG,
  buildDemoMeetingConfig,
} from "./demo-scheduler-data";

type DemoView = "teams" | "team-detail" | "config" | "generated-result";

function BackLink({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      <ChevronLeft className="size-4" />
      {children}
    </button>
  );
}

function MemberAvatar({ initials }: { initials: string }) {
  return (
    <span className="flex shrink-0 size-9 rounded-full bg-primary/15 border border-primary/20 items-center justify-center text-sm font-medium text-primary">
      {initials}
    </span>
  );
}

function DemoTeamsView({
  onSelectTeam,
}: {
  onSelectTeam: (teamId: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Your teams</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a team, invite members, then plan a fair rotation.
        </p>
      </div>

      <div className="space-y-3">
        {DEMO_TEAMS.map((team) => (
          <button
            key={team.id}
            type="button"
            onClick={() => onSelectTeam(team.id)}
            className="w-full rounded-xl border border-border bg-card hover:border-primary/20 hover:bg-background/50 text-left transition-all duration-200 flex items-center justify-between gap-4 p-4"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="flex shrink-0 size-12 rounded-xl items-center justify-center bg-background border border-border">
                <Users className="size-6 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-foreground truncate">
                  {team.name}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {team.memberCount} member{team.memberCount !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <ChevronRight className="size-4 text-muted-foreground shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}

function formatHardNoPreview(ranges: { start: number; end: number }[]): string {
  if (ranges.length === 0) return "";
  const r = ranges[0];
  const fmt = (h: number) => {
    if (h === 0 || h === 24) return "12a";
    if (h < 12) return `${h}a`;
    if (h === 12) return "12p";
    return `${h - 12}p`;
  };
  if (r.start < r.end) {
    return `${fmt(r.start)}–${fmt(r.end)}`;
  }
  return `${fmt(r.start)}–${fmt(r.end)}`;
}

function DemoTeamDetailView({
  teamId,
  onBack,
  onConfigure,
}: {
  teamId: string;
  onBack: () => void;
  onConfigure: () => void;
}) {
  const team = DEMO_TEAMS.find((t) => t.id === teamId)!;
  const members = getDemoTeamDisplayMembers(teamId);
  const teamMembers = getDemoTeamMembers(teamId);
  const memberMap = Object.fromEntries(teamMembers.map((m) => [m.id, m]));

  return (
    <div className="space-y-6">
      <BackLink onClick={onBack}>Back to Teams</BackLink>

      <div>
        <h2 className="text-xl font-semibold text-foreground">{team.name}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Invite your team, then plan a fair rotation.
        </p>
      </div>

      <div>
        <h3 className="text-sm font-medium text-foreground mb-3">
          Team ({members.length})
        </h3>
        <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
          {members.map((m) => {
            const tm = memberMap[m.id];
            const hardCount = tm?.hardNoRanges?.length ?? 0;
            const hardPreview = tm && hardCount > 0 ? formatHardNoPreview(tm.hardNoRanges) : "";

            return (
              <div
                key={m.id}
                className="flex items-center gap-4 px-4 py-3.5 bg-card hover:bg-background/50 transition-colors"
              >
                <MemberAvatar initials={m.initials} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-foreground text-sm">{m.name}</p>
                    {m.isOwner && (
                      <span className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                        Owner
                      </span>
                    )}
                    {hardCount > 0 && (
                      <span className="text-[10px] font-medium text-muted-foreground/90 px-1.5 py-0.5 rounded border border-border/60 bg-muted/30">
                        {hardCount} hard boundar{hardCount === 1 ? "y" : "ies"}
                        {hardPreview ? ` (${hardPreview})` : ""}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{m.timezoneLabel}</span>
                    <span>•</span>
                    <span>{m.workHours}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Button
        type="button"
        onClick={onConfigure}
        className="w-full sm:w-auto"
      >
        Configure rotation & plan schedule
      </Button>
    </div>
  );
}

const DEMO_DAYS = [
  { label: "Monday", value: 1 },
  { label: "Tuesday", value: 2 },
  { label: "Wednesday", value: 3 },
  { label: "Thursday", value: 4 },
  { label: "Friday", value: 5 },
];

const DEMO_DURATIONS = [
  { label: "30 min", value: 30 },
  { label: "45 min", value: 45 },
  { label: "1 hour", value: 60 },
  { label: "90 min", value: 90 },
  { label: "2 hours", value: 120 },
];

const DEMO_ROTATION_WEEKS = [
  { label: "4 weeks", value: 4 },
  { label: "6 weeks", value: 6 },
  { label: "8 weeks", value: 8 },
  { label: "10 weeks", value: 10 },
  { label: "12 weeks", value: 12 },
];

const selectClass =
  "bg-card border border-border/60 rounded-lg px-2.5 py-1.5 text-sm font-medium text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 appearance-none shadow-sm transition-colors hover:border-primary/30";

function DemoConfigView({
  config,
  onConfigChange,
  onBack,
  onGenerate,
}: {
  config: MeetingConfig;
  onConfigChange: (config: MeetingConfig) => void;
  onBack: () => void;
  onGenerate: () => void;
}) {
  const useFixedBaseTime = config.baseTimeMinutes != null;
  const baseTimeMinutes = config.baseTimeMinutes ?? 540;
  const timezoneOptions = useMemo(() => getTimezoneOptions(), []);
  const displayTimezone = ensureDisplayTimezoneIana(
    config.displayTimezone ?? "America/New_York"
  );

  return (
    <div className="space-y-6">
      <BackLink onClick={onBack}>Back</BackLink>

      <section>
        <div className="mb-5">
          <h2 className="text-lg font-semibold tracking-tight">
            The meeting
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Define cadence and cycle length. Time is chosen per week for
            fairness.
          </p>
        </div>

        <div className="rounded-xl border border-border/50 bg-card p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-3 text-sm text-muted-foreground leading-relaxed">
            <span>Weekly on</span>
            <select
              value={config.dayOfWeek}
              onChange={(e) =>
                onConfigChange({ ...config, dayOfWeek: Number(e.target.value) })
              }
              className={selectClass}
            >
              {DEMO_DAYS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {useFixedBaseTime && (
              <>
                <span>at</span>
                <select
                  value={baseTimeMinutes}
                  onChange={(e) =>
                    onConfigChange({
                      ...config,
                      baseTimeMinutes: Number(e.target.value),
                    })
                  }
                  className={selectClass}
                >
                  {BASE_TIME_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </>
            )}
            <span>for</span>
            <select
              value={config.durationMinutes}
              onChange={(e) =>
                onConfigChange({
                  ...config,
                  durationMinutes: Number(e.target.value),
                })
              }
              className={selectClass}
            >
              {DEMO_DURATIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <span>over</span>
            <select
              value={config.rotationWeeks}
              onChange={(e) =>
                onConfigChange({
                  ...config,
                  rotationWeeks: Number(e.target.value),
                })
              }
              className={selectClass}
            >
              {DEMO_ROTATION_WEEKS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-3 text-sm text-muted-foreground leading-relaxed">
            <span>displayed in</span>
            <select
              value={displayTimezone}
              onChange={(e) => {
                const iana = ensureDisplayTimezoneIana(e.target.value);
                onConfigChange({
                  ...config,
                  displayTimezone: iana,
                  anchorOffset: DateTime.now().setZone(iana).offset / 60,
                });
              }}
              className={selectClass}
            >
              {timezoneOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer pt-2">
            <input
              type="checkbox"
              checked={useFixedBaseTime}
              onChange={(e) => {
                const checked = e.target.checked;
                onConfigChange({
                  ...config,
                  baseTimeMinutes: checked ? 540 : null,
                });
              }}
              className="rounded border-border/60 text-primary focus:ring-primary/20"
            />
            <span className="text-sm text-foreground/90">
              Use a fixed base time
            </span>
          </label>

          <p className="text-xs text-muted-foreground/50 leading-relaxed pt-0.5">
            {useFixedBaseTime
              ? "Meeting time is fixed. Some members may see a different local day."
              : "Time rotates week to week."}
          </p>
        </div>
      </section>

      <div className="pt-2">
        <Button
          size="lg"
          className="w-full h-12 text-sm font-medium rounded-xl shadow-sm transition-all duration-200"
          onClick={onGenerate}
        >
          Plan the next {config.rotationWeeks} weeks fairly
        </Button>
      </div>
    </div>
  );
}

function DemoGeneratedResultView({
  onBack,
  weeks,
  error,
  teamMembers,
  config,
}: {
  onBack: () => void;
  weeks: RotationWeekData[] | null;
  error: string | null;
  teamMembers: TeamMember[];
  config: MeetingConfig;
}) {
  const displayTimezone = config.displayTimezone ?? "America/New_York";
  const useBaseTime = config.baseTimeMinutes != null;

  return (
    <div className="space-y-6">
      <BackLink onClick={onBack}>Back</BackLink>

      {error ? (
        <>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Result</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Could not generate a rotation schedule.
            </p>
          </div>
          <div className="rounded-xl border border-stretch/40 bg-stretch/15 p-4 text-center">
            <p className="text-sm text-stretch-foreground">{error}</p>
          </div>
        </>
      ) : weeks && weeks.length > 0 ? (
        <>
          <div className="space-y-4 pr-1">
            <RotationOutput
              weeks={weeks}
              team={teamMembers}
              displayTimezone={displayTimezone}
              useBaseTime={useBaseTime}
            />
          </div>
          <FairnessSummary
            team={teamMembers}
            config={config}
            weeks={weeks}
          />
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
            <p className="text-sm text-foreground">
              <span className="font-medium">Export or extend</span> — Share this
              schedule with your team or plan additional weeks.
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}

function runDemoGeneration(
  teamMembers: TeamMember[],
  config: MeetingConfig
): {
  weeks: RotationWeekData[] | null;
  error: string | null;
} {
  const fullConfig = buildDemoMeetingConfig(config);
  const result = generateRotationGuarded(teamMembers, fullConfig);
  if (isInputContractViolation(result)) {
    const msg =
      result.error.details
        ?.map((d) => d.reason || `${d.field}: invalid`)
        .join("; ") ?? result.error.message;
    return { weeks: null, error: msg };
  }
  if (isNoViableTimeResult(result)) {
    return { weeks: null, error: "No shared time fits everyone's limits." };
  }
  if (Array.isArray(result)) {
    return result.length > 0
      ? { weeks: result as RotationWeekData[], error: null }
      : { weeks: null, error: "No viable rotation with current boundaries." };
  }
  if (isRotationResult(result)) {
    return { weeks: result.weeks, error: null };
  }
  return { weeks: null, error: "Generation failed." };
}

export function DemoSchedulerPreview() {
  const [view, setView] = useState<DemoView>("teams");
  const [selectedTeamId, setSelectedTeamId] = useState<string>("team1");
  const [demoConfig, setDemoConfig] = useState<MeetingConfig>(DEFAULT_DEMO_CONFIG);
  const [generatedWeeks, setGeneratedWeeks] = useState<RotationWeekData[] | null>(
    null
  );
  const [generatedError, setGeneratedError] = useState<string | null>(null);

  const handleSelectTeam = (teamId: string) => {
    setSelectedTeamId(teamId);
    setView("team-detail");
  };

  const handleGenerate = () => {
    const teamMembers = getDemoTeamMembers(selectedTeamId);
    const fullConfig = buildDemoMeetingConfig(demoConfig);
    const { weeks, error } = runDemoGeneration(teamMembers, fullConfig);
    setGeneratedWeeks(weeks);
    setGeneratedError(error);
    setView("generated-result");
  };

  const teamMembers = getDemoTeamMembers(selectedTeamId);
  const fullConfig = buildDemoMeetingConfig(demoConfig);

  return (
    <div className="flex flex-col rounded-2xl border border-border/50 bg-card shadow-[0_8px_30px_-8px_rgba(44,43,42,0.12)] overflow-hidden w-full max-w-5xl mx-auto h-[680px]">
      <div className="flex-shrink-0 border-b border-border bg-background/80 flex items-center gap-3 px-4 py-3">
        <div className="flex gap-2" aria-hidden="true">
          <span className="size-3 rounded-full bg-[#FF5F57]" />
          <span className="size-3 rounded-full bg-[#FFBD2E]" />
          <span className="size-3 rounded-full bg-[#28C840]" />
        </div>
        <span className="text-xs text-muted-foreground font-medium">
          Parallel — Demo
        </span>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-8 lg:p-10">
        {view === "teams" && (
          <DemoTeamsView onSelectTeam={handleSelectTeam} />
        )}
        {view === "team-detail" && (
          <DemoTeamDetailView
            teamId={selectedTeamId}
            onBack={() => setView("teams")}
            onConfigure={() => setView("config")}
          />
        )}
        {view === "config" && (
          <DemoConfigView
            config={demoConfig}
            onConfigChange={setDemoConfig}
            onBack={() => setView("team-detail")}
            onGenerate={handleGenerate}
          />
        )}
        {view === "generated-result" && (
          <DemoGeneratedResultView
            onBack={() => setView("config")}
            weeks={generatedWeeks}
            error={generatedError}
            teamMembers={teamMembers}
            config={fullConfig}
          />
        )}
      </div>
    </div>
  );
}
