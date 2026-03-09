import type { TeamMember, MeetingConfig } from "@/lib/types";
import { DateTime } from "luxon";

/** Demo-only data. No Supabase, no real product data. */

export type DemoTeam = {
  id: string;
  name: string;
  memberCount: number;
  /** TeamMember[] for the rotation algorithm. */
  teamMembers: TeamMember[];
};

export type DemoMemberDisplay = {
  id: string;
  name: string;
  timezone: string;
  timezoneLabel: string;
  initials: string;
  isOwner?: boolean;
  workHours: string;
};

/** Design Sync — 4 members (Americas, Europe, Dubai). */
const DESIGN_SYNC_MEMBERS: TeamMember[] = [
  {
    id: "ds-1",
    name: "Alex Chen",
    timezone: "America/New_York",
    workStartHour: 9,
    workEndHour: 18,
    hardNoRanges: [{ start: 0, end: 6 }], // 12am–6am local
    initials: "AC",
  },
  {
    id: "ds-2",
    name: "Olivia Brown",
    timezone: "Europe/London",
    workStartHour: 9,
    workEndHour: 18,
    hardNoRanges: [{ start: 23, end: 7 }], // 11pm–7am local (overnight)
    initials: "OB",
  },
  {
    id: "ds-3",
    name: "Hans Mueller",
    timezone: "Europe/Berlin",
    workStartHour: 9,
    workEndHour: 18,
    hardNoRanges: [{ start: 23, end: 7 }], // 11pm–7am local (overnight)
    initials: "HM",
  },
  {
    id: "ds-4",
    name: "Sara Al-Hassan",
    timezone: "Asia/Dubai",
    workStartHour: 9,
    workEndHour: 19,
    hardNoRanges: [{ start: 0, end: 7 }], // 12am–7am local
    initials: "SA",
  },
];

/** Global Product — 6 members (Design Sync + Singapore, Tokyo). */
const GLOBAL_PRODUCT_MEMBERS: TeamMember[] = [
  ...DESIGN_SYNC_MEMBERS,
  {
    id: "gp-5",
    name: "Wei Zhang",
    timezone: "Asia/Singapore",
    workStartHour: 9,
    workEndHour: 19,
    hardNoRanges: [{ start: 0, end: 7 }], // 12am–7am local
    initials: "WZ",
  },
  {
    id: "gp-6",
    name: "Yuki Tanaka",
    timezone: "Asia/Tokyo",
    workStartHour: 10,
    workEndHour: 20,
    hardNoRanges: [{ start: 0, end: 7 }], // 12am–7am local
    initials: "YT",
  },
];

/** Display data for Design Sync members (UI labels) */
const DESIGN_SYNC_DISPLAY: DemoMemberDisplay[] = [
  { id: "ds-1", name: "Alex Chen", timezone: "America/New_York", timezoneLabel: "New York", initials: "AC", isOwner: true, workHours: "9:00 AM – 6:00 PM" },
  { id: "ds-2", name: "Olivia Brown", timezone: "Europe/London", timezoneLabel: "London", initials: "OB", workHours: "9:00 AM – 6:00 PM" },
  { id: "ds-3", name: "Hans Mueller", timezone: "Europe/Berlin", timezoneLabel: "Berlin", initials: "HM", workHours: "9:00 AM – 6:00 PM" },
  { id: "ds-4", name: "Sara Al-Hassan", timezone: "Asia/Dubai", timezoneLabel: "Dubai", initials: "SA", workHours: "9:00 AM – 7:00 PM" },
];

/** Display data for Global Product members (UI labels) */
const GLOBAL_PRODUCT_DISPLAY: DemoMemberDisplay[] = [
  ...DESIGN_SYNC_DISPLAY,
  { id: "gp-5", name: "Wei Zhang", timezone: "Asia/Singapore", timezoneLabel: "Singapore", initials: "WZ", workHours: "9:00 AM – 7:00 PM" },
  { id: "gp-6", name: "Yuki Tanaka", timezone: "Asia/Tokyo", timezoneLabel: "Tokyo", initials: "YT", workHours: "10:00 AM – 8:00 PM" },
];

export const DEMO_TEAMS: DemoTeam[] = [
  {
    id: "team1",
    name: "Design Sync",
    memberCount: 4,
    teamMembers: DESIGN_SYNC_MEMBERS,
  },
  {
    id: "team2",
    name: "Global Product",
    memberCount: 6,
    teamMembers: GLOBAL_PRODUCT_MEMBERS,
  },
];

export function getDemoTeamMembers(teamId: string): TeamMember[] {
  const team = DEMO_TEAMS.find((t) => t.id === teamId);
  return team?.teamMembers ?? [];
}

export function getDemoTeamDisplayMembers(teamId: string): DemoMemberDisplay[] {
  if (teamId === "team1") return DESIGN_SYNC_DISPLAY;
  if (teamId === "team2") return GLOBAL_PRODUCT_DISPLAY;
  return [];
}

/** Default demo meeting config. */
export const DEFAULT_DEMO_CONFIG: MeetingConfig = {
  dayOfWeek: 3,
  anchorHour: 12,
  anchorOffset: -5,
  durationMinutes: 45,
  rotationWeeks: 8,
  baseTimeMinutes: null,
  displayTimezone: "America/New_York",
};

/** Build MeetingConfig from demo config. Uses current DST offset for display timezone. */
export function buildDemoMeetingConfig(config: MeetingConfig): MeetingConfig {
  const displayTimezone = config.displayTimezone ?? "America/New_York";
  const anchorOffset = Math.round(
    DateTime.now().setZone(displayTimezone).offset / 60
  );
  return {
    ...config,
    anchorOffset,
    displayTimezone,
  };
}
