import Link from "next/link"
import { Container } from "@/components/ui"
import { Navbar, Footer } from "@/components/landing"
import { PrivacyContactSection } from "@/components/privacy/PrivacyContactSection"

export const metadata = {
  title: "Privacy Policy | Parallel – Fair Meeting Rotation for Global Teams",
  description:
    "Privacy Policy for Parallel. How we collect, use, and protect your information when using our scheduling platform for global teams.",
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="py-12 md:py-16">
        <Container size="narrow" className="max-w-2xl">
          <div className="space-y-10">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
                Privacy Policy
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Last updated: March 2026
              </p>
            </div>

            <p className="text-muted-foreground leading-relaxed">
              Parallel (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) respects your privacy and is committed to protecting your personal information. This Privacy Policy explains how we collect, use, and safeguard information when you use our website and services.
            </p>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                1. Information We Collect
              </h2>

              <div className="space-y-4 text-muted-foreground">
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-1">
                    Account Information
                  </h3>
                  <p className="text-sm leading-relaxed">
                    When you create an account, we collect your name, email address, and any login credentials you provide. This information is used to create and maintain your account, authenticate you, and support account-related features.
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-foreground mb-1">
                    Team &amp; Scheduling Data
                  </h3>
                  <p className="text-sm leading-relaxed">
                    To generate fair meeting rotation recommendations, we collect team member names, time zones, availability preferences, and scheduling constraints (such as meeting cadence and hard boundaries). This data is used solely to power the scheduling recommendations and coordinate your team&apos;s rotations.
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-foreground mb-1">
                    Payment Information
                  </h3>
                  <p className="text-sm leading-relaxed">
                    If you subscribe to a paid plan, payments are processed securely through Stripe. Parallel does not store full credit card numbers or sensitive payment details. Stripe handles payment data in accordance with their own privacy policies.
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                2. How We Use Your Information
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We use your information to:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground leading-relaxed">
                <li>Operate and maintain the Parallel scheduling service</li>
                <li>Generate fair meeting rotation recommendations based on your team&apos;s time zones and availability</li>
                <li>Manage user accounts and authentication</li>
                <li>Process subscriptions and payments</li>
                <li>Improve product performance, reliability, and user experience</li>
                <li>Respond to support requests, feedback, and inquiries</li>
              </ul>
              <p className="text-sm font-medium text-foreground">
                We do not sell your personal information.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                3. Email Communications
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We may send you emails that are essential to the service, including:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground leading-relaxed">
                <li>Account verification and password resets</li>
                <li>Team invitations and collaboration notifications</li>
                <li>Product and service updates</li>
                <li>Support-related communications</li>
              </ul>
              <p className="text-sm">
                These emails are necessary for the platform to function. We do not send marketing emails unless you have opted in.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                4. Third-Party Services
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Parallel uses trusted third-party providers to operate the platform:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground leading-relaxed">
                <li><strong className="text-foreground">Stripe</strong> — payment processing</li>
                <li><strong className="text-foreground">Amazon Web Services</strong> — infrastructure and transactional email delivery</li>
                <li><strong className="text-foreground">Supabase</strong> — database and authentication</li>
              </ul>
              <p className="text-sm">
                These providers process data only as needed to operate the service. They are bound by their own privacy and security commitments.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                5. Data Security
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We use reasonable safeguards to protect your information from unauthorized access, disclosure, or misuse. This includes encryption in transit and at rest, secure authentication, and access controls. That said, no online platform can guarantee absolute security. We encourage you to use a strong password and keep your account credentials secure.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                6. Data Retention
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We retain your data while your account is active and as needed to operate the service, comply with legal obligations, resolve disputes, or enforce our agreements. If you delete your account, we will remove or anonymize associated personal data within a reasonable period, except where we must retain it for legal or operational reasons.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                7. Your Rights
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Depending on where you live, you may have rights to access, correct, or request deletion of your personal information. You can submit these requests by contacting us at the email below. We will respond to valid requests within a reasonable time.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                8. Changes to This Policy
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We may update this Privacy Policy from time to time. When we do, we will post the updated version on this page with a revised &quot;Last updated&quot; date. Continued use of Parallel after changes take effect constitutes acceptance of the updated policy.
              </p>
            </section>

            <PrivacyContactSection />

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
