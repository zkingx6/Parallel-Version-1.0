"use client"

import { useState, useEffect } from "react"

const PHRASES = [
  "weekly standups",
  "sync meetings",
  "reviews",
  "team calls",
]

export function RotatingPhrase() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % PHRASES.length)
    }, 2500)
    return () => clearInterval(id)
  }, [])

  return (
    <span className="font-medium text-primary">
      {PHRASES[index]}
    </span>
  )
}
