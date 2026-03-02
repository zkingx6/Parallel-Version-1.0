"use client"

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react"

type SetupContextValue = {
  /** True when user has at least one meeting (from meetings.length > 0 on /meetings page). */
  isSetupComplete: boolean
  /** First meeting ID for nav links when on /meetings. */
  firstMeetingId: string | null
  setSetupFromMeetings: (meetings: { id: string }[]) => void
}

const SetupContext = createContext<SetupContextValue | null>(null)

export function SetupProvider({ children }: { children: ReactNode }) {
  const [isSetupComplete, setIsSetupComplete] = useState(false)
  const [firstMeetingId, setFirstMeetingId] = useState<string | null>(null)

  const setSetupFromMeetings = useCallback((meetings: { id: string }[]) => {
    const hasMeetings = meetings.length > 0
    setIsSetupComplete(hasMeetings)
    setFirstMeetingId(hasMeetings ? meetings[0].id : null)
  }, [])

  return (
    <SetupContext.Provider
      value={{ isSetupComplete, firstMeetingId, setSetupFromMeetings }}
    >
      {children}
    </SetupContext.Provider>
  )
}

export function useSetup() {
  const ctx = useContext(SetupContext)
  return ctx ?? {
    isSetupComplete: false,
    firstMeetingId: null,
    setSetupFromMeetings: () => {},
  }
}
