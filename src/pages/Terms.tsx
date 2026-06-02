import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useBranding } from '@/hooks/useBranding';

const SUPPORT_EMAIL = 'support@nevorai.com';

export default function Terms() {
  const { appName } = useBranding();
  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="max-w-3xl mx-auto px-4 py-4 flex-shrink-0 w-full">
        <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Home
        </Link>

        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-xl font-extrabold text-primary">{appName}</span>
          <span className="text-xs text-muted-foreground">by Nevorai Technologies</span>
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-4">Last updated: May 2026</p>
      </div>

      <ScrollArea className="flex-1 px-4">
        <div className="max-w-3xl mx-auto pb-8">
          <div className="prose prose-sm max-w-none space-y-6 text-foreground">
            <section className="bg-primary/5 border border-primary/15 rounded-xl p-4">
              <p className="text-muted-foreground leading-relaxed m-0">
                By creating an account or using Enarsia, you agree to these Terms of Service. Please read them carefully — if you do not agree, do not use Enarsia.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">1. About Enarsia</h2>
              <p className="text-muted-foreground leading-relaxed">
                Enarsia is a calling and lead management tool for network marketers and sales professionals, built by Nevorai Technologies Technologies. These terms govern your use of the Enarsia application and all related services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Your Account</h2>
              <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                <li>You must be at least 18 years old to create an account.</li>
                <li>You are responsible for keeping your login credentials secure.</li>
                <li>You may not share your account, or create accounts on behalf of others without permission.</li>
                <li>One account per person — duplicate accounts for the same individual are not permitted.</li>
                <li>You must provide accurate information when signing up.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. Free Trial</h2>
              <p className="text-muted-foreground leading-relaxed">
                New users receive a free trial (duration shown at signup). During the trial you get full access. After the trial ends, you must subscribe to a paid plan to continue using Enarsia. Your data is retained for 30 days after trial expiry before being eligible for deletion.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Paid Plans & Billing</h2>
              <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                <li>Plans are billed monthly or yearly, as selected at checkout.</li>
                <li>All prices are in Indian Rupees (₹) and inclusive of applicable taxes.</li>
                <li>Payments are processed securely by Razorpay.</li>
                <li>Plans renew automatically on the renewal date unless cancelled.</li>
                <li>We may change prices with 30 days' notice to existing subscribers.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Acceptable Use</h2>
              <p className="text-muted-foreground mb-2">You agree NOT to use Enarsia to:</p>
              <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                <li>Spam, harass, or send unsolicited messages.</li>
                <li>Import or store data of individuals without their consent.</li>
                <li>Violate any applicable Indian or international law.</li>
                <li>Reverse-engineer, hack, or disrupt the service.</li>
                <li>Create fake accounts or misrepresent your identity.</li>
                <li>Run any illegal multi-level marketing or pyramid scheme.</li>
                <li>Resell or white-label Enarsia without written permission from Nevorai Technologies.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Your Data</h2>
              <p className="text-muted-foreground leading-relaxed">
                You own your data — leads, contacts, call notes and any content you create inside Enarsia. By using Enarsia, you grant Nevorai Technologies a limited licence to store and process this data solely to provide the service to you. We do not use your data for any other purpose.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Plan Limits</h2>
              <p className="text-muted-foreground leading-relaxed">
                Each plan has usage limits (leads, calls, storage, etc.) shown on our pricing page. If you exceed your limit, certain features may pause until the next cycle or until you upgrade. We will show clear warnings before limits are reached.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Service Availability</h2>
              <p className="text-muted-foreground leading-relaxed">
                We aim for 99% uptime but do not guarantee uninterrupted access. Planned maintenance will be announced where possible. We are not liable for losses caused by service downtime.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Termination</h2>
              <p className="text-muted-foreground leading-relaxed">
                You may cancel your account at any time from Profile settings. We may suspend or terminate accounts that violate these terms. Upon termination, your data is retained for 30 days and then permanently deleted, unless legal requirements mandate longer retention.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">10. Limitation of Liability</h2>
              <p className="text-muted-foreground leading-relaxed">
                Enarsia is provided "as is". Nevorai Technologies is not liable for indirect, incidental or consequential damages — including lost profits, lost leads or missed business opportunities. Our total liability is limited to the amount you paid us in the 3 months preceding the claim.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">11. Governing Law</h2>
              <p className="text-muted-foreground leading-relaxed">
                These terms are governed by the laws of India, with exclusive jurisdiction of the courts of Chhatarpur, Madhya Pradesh, India. The service complies with the Information Technology Act, 2000 and its amendments.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">12. Changes to Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update these terms. Significant changes will be communicated via email or in-app notice with at least 14 days' notice. Continued use after that date constitutes acceptance.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">13. Contact</h2>
              <p className="text-muted-foreground leading-relaxed">
                Questions about these terms? Email <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">{SUPPORT_EMAIL}</a>.
              </p>
            </section>
          </div>

          <div className="mt-12 pt-6 border-t border-border">
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <Link to="/terms" className="hover:text-foreground">Terms of Service</Link>
              <Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link>
              <Link to="/refund" className="hover:text-foreground">Refund Policy</Link>
            </div>
            <p className="text-xs text-muted-foreground mt-4">© 2026 Nevorai Technologies. All rights reserved.</p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
