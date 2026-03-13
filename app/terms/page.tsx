import Link from "next/link"
import { Container } from "@/components/ui"
import { Navbar, Footer } from "@/components/landing"
import { TermsContactSection } from "@/components/terms/TermsContactSection"

export const metadata = {
  title: "Terms of Service | Parallel – Fair Meeting Rotation for Global Teams",
  description:
    "Read the Terms of Service for Parallel, a scheduling platform that helps global teams create fair meeting rotations across time zones.",
}

export default function TermsPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="py-12 md:py-16">
        <Container size="narrow" className="max-w-2xl">
          <div className="space-y-10">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
                Terms of Service
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Last updated: March 2026
              </p>
            </div>

            <p className="text-muted-foreground leading-relaxed">
              Welcome to Parallel, a platform designed to help global teams create fair meeting rotations across time zones. These Terms of Service govern your use of the Parallel website and services.
            </p>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                1. Overview of the Service
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Parallel provides scheduling recommendation tools for distributed teams. The platform analyzes time zones, availability, and team constraints to generate recommended meeting rotations that distribute inconvenience more fairly among participants.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                All outputs are recommendations only. You remain responsible for your final scheduling decisions and for how you use Parallel&apos;s suggestions within your team.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                2. Eligibility
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                You must be at least 18 years old and legally able to enter into these Terms to use Parallel. You must provide accurate and complete information when creating an account or using the service.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                3. User Accounts
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                You are responsible for maintaining the security of your account credentials and for all activity that occurs under your account. Do not share your login details with others. If you become aware of any unauthorized use of your account, notify us promptly at support@parallelflow.app.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                4. Acceptable Use
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                You agree to use Parallel only for lawful purposes and in accordance with these Terms. You may not:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground leading-relaxed">
                <li>Use the service for any unlawful purpose or in violation of applicable laws</li>
                <li>Disrupt, interfere with, or attempt to gain unauthorized access to our systems, networks, or other users&apos; accounts</li>
                <li>Misuse, abuse, or overload the service in a way that harms its availability or performance</li>
                <li>Resell, reverse engineer, or exploit the service without our prior written permission</li>
              </ul>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We may suspend or terminate access for violation of acceptable use.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                5. Subscription and Payments
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Parallel may offer free and paid plans. Billing may recur (e.g., monthly or annually) depending on the plan you select. Payments are processed securely through Stripe. Parallel does not store full credit card numbers or sensitive payment details.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We may change pricing, features, or plan limits from time to time. We will provide notice of material changes where reasonably practicable. Continued use of a paid plan after changes take effect constitutes acceptance.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                6. Service Availability
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We strive to keep Parallel available and reliable, but we do not guarantee uninterrupted or error-free service. The service may experience downtime due to maintenance, updates, infrastructure issues, or third-party dependency failures. We are not liable for any loss or inconvenience resulting from service unavailability.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                7. Data and Content
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                You retain ownership of the data you submit to Parallel, including team member information, scheduling preferences, availability, and time zone settings. We may use this data as necessary to operate, maintain, improve, and secure the service.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Our collection and use of personal data are described in our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>. By using Parallel, you agree to that policy.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                8. Intellectual Property
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The Parallel software, branding, design, content, and service functionality are owned by Parallel and protected by intellectual property laws. You may not copy, resell, reverse engineer, or exploit the service without our prior written permission. You may use the service only as permitted under these Terms.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                9. Limitation of Liability
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Parallel is provided &quot;as is&quot; and &quot;as available.&quot; To the extent permitted by law, we are not liable for indirect, incidental, special, consequential, or punitive damages, including but not limited to:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground leading-relaxed">
                <li>Missed meetings, scheduling conflicts, or decisions made based on our recommendations</li>
                <li>Data loss, lost profits, or business interruption</li>
                <li>Any failure of the service to meet your requirements</li>
              </ul>
              <p className="text-sm text-muted-foreground leading-relaxed">
                You are responsible for your final use of scheduling recommendations and for any outcomes that result from them. Our total liability is limited to the amount you paid us in the twelve months preceding the claim, or one hundred dollars, whichever is greater.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                10. Termination
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We may suspend or terminate your access to Parallel if you violate these Terms or misuse the service. You may stop using the service at any time. Upon termination, your right to use Parallel ends. Sections that by their nature should survive (such as intellectual property, limitation of liability, and governing law) will continue to apply.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                11. Changes to These Terms
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We may revise these Terms from time to time. The updated version will be posted on this page with a revised &quot;Last updated&quot; date. Continued use of Parallel after changes take effect constitutes acceptance of the updated Terms. If you do not agree to the changes, you should stop using the service.
              </p>
            </section>

            <TermsContactSection />

            <div className="pt-6 border-t border-border">
              <Link
                href="/"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back to home
              </Link>
            </div>
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  )
}
