import { Suspense } from "react"
import {
  Navbar,
  Hero,
  Problem,
  ParallelSolution,
  NoPerfectTime,
  HowItWorks,
  PricingPreview,
  FAQ,
  FeedbackSection,
  Footer,
  LandingScrollHandler,
} from "@/components/landing"

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <Suspense fallback={null}>
        <LandingScrollHandler />
      </Suspense>
      <Navbar />
      <Hero />
      <Problem />
      <ParallelSolution />
      <NoPerfectTime />
      <HowItWorks />
      <PricingPreview />
      <FAQ />
      <FeedbackSection />
      <Footer />
    </div>
  )
}
