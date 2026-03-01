export type TeamMember = {
  id: string
  name: string
  role: string
  timezone: string
  utcOffset: number
  city: string
  workingHoursStart: string
  workingHoursEnd: string
  initials: string
}

export type BurdenRecord = {
  memberId: string
  comfortable: number
  stretch: number
  sacrifice: number
  total: number
  burdenPercent: number
}

export type RotationWeek = {
  week: number
  dateRange: string
  memberId: string
  localTime: string
  type: "stretch" | "sacrifice"
}
