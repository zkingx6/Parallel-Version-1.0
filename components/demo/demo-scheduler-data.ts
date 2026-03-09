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

/** Design Sync — 4 members. Some have hard no ranges for realism. */
const DESIGN_SYNC_MEMBERS: TeamMember[] = [
  {
    id: "ds-1",
    name: "Alex Chen",
    timezone: "America/New_York",
    workStartHour: 9,
    workEndHour: 18,
    hardNoRanges: [],
    initials: "AC",
  },
  {
    id: "ds-2",
    name: "Olivia Brown",
    timezone: "Europe/London",
    workStartHour: 9,
    workEndHour: 17.5,
    hardNoRanges: [{ start: 19, end: 22 }], // 7:00 PM – 10:00 PM local
    initials: "OB",
  },
  {
    id: "ds-3",
    name: "Wei Zhang",
    timezone: "Asia/Singapore",
    workStartHour: 9,
    workEndHour: 18,
    hardNoRanges: [{ start: 22, end: 7 }], // 10:00 PM – 7:00 AM local (overnight)
    initials: "WZ",
  },
  {
    id: "ds-4",
    name: "Liam O'Connor",
    timezone: "Australia/Sydney",
    workStartHour: 8.5,
    workEndHour: 17,
    hardNoRanges: [{ start: 6, end: 8 }], // 6:00 AM – 8:00 AM local
    initials: "LO",
  },
];

/** Global Product — 8 members */
const GLOBAL_PRODUCT_MEMBERS: TeamMember[] = [
  ...DESIGN_SYNC_MEMBERS,
  {
    id: "gp-5",
    name: "Emma Wilson",
    timezone: "America/Los_Angeles",
    workStartHour: 9,
    workEndHour: 17,
    hardNoRanges: [],
    initials: "EW",
  },
  {
    id: "gp-6",
    name: "Hans Mueller",
    timezone: "Europe/Berlin",
    workStartHour: 9,
    workEndHour: 18,
    hardNoRanges: [],
    initials: "HM",
  },
  {
    id: "gp-7",
    name: "Sara Al-Hassan",
    timezone: "Asia/Dubai",
    workStartHour: 9,
    workEndHour: 18,
    hardNoRanges: [],
    initials: "SA",
  },
  {
    id: "gp-8",
    name: "Yuki Tanaka",
    timezone: "Asia/Tokyo",
    workStartHour: 10,
    workEndHour: 19,
    hardNoRanges: [],
    initials: "YT",
  },
];

/** Display data for Design Sync members (UI labels) */
const DESIGN_SYNC_DISPLAY: DemoMemberDisplay[] = [
  { id: "ds-1", name: "Alex Chen", timezone: "America/New_York", timezoneLabel: "New York", initials: "AC", isOwner: true, workHours: "9:00 AM – 6:00 PM" },
  { id: "ds-2", name: "Olivia Brown", timezone: "Europe/London", timezoneLabel: "London", initials: "OB", workHours: "9:00 AM – 5:30 PM" },
  { id: "ds-3", name: "Wei Zhang", timezone: "Asia/Singapore", timezoneLabel: "Singapore", initials: "WZ", workHours: "9:00 AM – 6:00 PM" },
  { id: "ds-4", name: "Liam O'Connor", timezone: "Australia/Sydney", timezoneLabel: "Sydney", initials: "LO", workHours: "8:30 AM – 5:00 PM" },
];

/** Display data for Global Product members (UI labels) */
const GLOBAL_PRODUCT_DISPLAY: DemoMemberDisplay[] = [
  ...DESIGN_SYNC_DISPLAY,
  { id: "gp-5", name: "Emma Wilson", timezone: "America/Los_Angeles", timezoneLabel: "Los Angeles", initials: "EW", workHours: "9:00 AM – 5:00 PM" },
  { id: "gp-6", name: "Hans Mueller", timezone: "Europe/Berlin", timezoneLabel: "Berlin", initials: "HM", workHours: "9:00 AM – 6:00 PM" },
  { id: "gp-7", name: "Sara Al-Hassan", timezone: "Asia/Dubai", timezoneLabel: "Dubai", initials: "SA", workHours: "9:00 AM – 6:00 PM" },
  { id: "gp-8", name: "Yuki Tanaka", timezone: "Asia/Tokyo", timezoneLabel: "Tokyo", initials: "YT", workHours: "10:00 AM – 7:00 PM" },
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
    memberCount: 8,
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
