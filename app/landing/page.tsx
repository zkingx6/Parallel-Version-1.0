import {
  Navbar,
  Hero,
  Problem,
  WhyCurrentToolsFail,
  ParallelSolution,
  HowItWorks,
  ProductPreview,
  PricingPreview,
  FAQ,
  FinalCTA,
  Footer,
} from "@/components/landing"

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Hero />
      <Problem />
      <WhyCurrentToolsFail />
      <ParallelSolution />
      <HowItWorks />
      <ProductPreview />
      <PricingPreview />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>
  )
}
