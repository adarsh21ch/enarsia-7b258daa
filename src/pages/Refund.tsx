import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import { useBranding } from '@/hooks/useBranding';

const SUPPORT_EMAIL = 'support@nevorai.com';
const SUPPORT_WHATSAPP = '+919329040508';

export default function Refund() {
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
        <h1 className="text-3xl font-bold text-foreground mb-2">Refund Policy</h1>
        <p className="text-sm text-muted-foreground mb-4">Last updated: May 2026</p>
      </div>

      <ScrollArea className="flex-1 px-4">
        <div className="max-w-3xl mx-auto pb-8">
          <div className="prose prose-sm max-w-none space-y-6 text-foreground">
            <section className="bg-primary/5 border border-primary/15 rounded-xl p-4">
              <p className="text-muted-foreground leading-relaxed m-0">
                Enarsia is a digital subscription service. Refund eligibility depends on the plan you purchased. Read this policy carefully before subscribing.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">1. Nature of Product</h2>
              <p className="text-muted-foreground leading-relaxed">
                Enarsia is a digital, subscription-based SaaS product delivered entirely online. No physical products are shipped. Once you subscribe, you get immediate access for the duration of your billing period.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Plan-Specific Refund Rules</h2>
              <div className="space-y-3 mt-2">
                <div className="p-3 rounded-lg bg-card border border-border">
                  <h3 className="font-semibold text-foreground mb-1">Monthly Plan</h3>
                  <p className="text-muted-foreground text-sm m-0">
                    Payments for the Enarsia monthly plan are <strong className="text-destructive">NON-REFUNDABLE</strong>. You retain access for the full month after subscribing, but no refunds are issued regardless of cancellation timing.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-card border border-border">
                  <h3 className="font-semibold text-foreground mb-1">Yearly Plan</h3>
                  <p className="text-muted-foreground text-sm m-0">
                    Payments for Enarsia yearly plans (including discounted offers) are eligible for a <strong className="text-emerald-600">full refund within 7 days</strong> of the purchase date. After 7 days, yearly payments become <strong className="text-destructive">NON-REFUNDABLE</strong>.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. Auto-Renewal — No Refund for Past Periods</h2>
              <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                <li>You can cancel your subscription or AutoPay at any time before the next billing date to stop future charges.</li>
                <li>Charges already collected for current or previous billing periods are <strong className="text-foreground">non-refundable</strong> (subject to the 7-day window for yearly plans only).</li>
                <li>Cancelling AutoPay only stops future renewals — it does not entitle you to a refund for payments already made.</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                The only exceptions are duplicate charges or technical failures, reviewed case-by-case.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Special Cases</h2>
              <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                <li><strong className="text-foreground">Duplicate Payments:</strong> charged twice for the same period due to a technical error.</li>
                <li><strong className="text-foreground">Technical Failures:</strong> a fault on our end prevented you from accessing the service after payment.</li>
                <li><strong className="text-foreground">Billing Mistakes:</strong> other clear errors verified by our support team.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Refund Process & Timelines</h2>
              <ol className="list-decimal pl-5 space-y-2 text-muted-foreground">
                <li>Email <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">{SUPPORT_EMAIL}</a> with subject "Refund Request — [your email]" and include your name, registered email, transaction ID and reason.</li>
                <li>We respond within 24 hours on business days.</li>
                <li>Approved refunds are initiated within 5–7 business days back to your original payment method.</li>
                <li>Bank credit time depends on your bank/UPI provider (usually 1–5 additional business days).</li>
              </ol>
              <p className="text-muted-foreground mt-2">
                You can also reach us on WhatsApp: <a href={buildWhatsAppLink(SUPPORT_WHATSAPP)} target="_blank" rel="noreferrer" className="text-primary hover:underline">Chat with us</a>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Plan Upgrades</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you upgrade from a lower plan to a higher plan mid-cycle, you are charged only the prorated difference. The upgrade charge follows the same plan-specific refund rules above.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. No Chargeback Abuse</h2>
              <p className="text-muted-foreground leading-relaxed">
                Please contact our support before initiating a chargeback. Filing a chargeback without first attempting resolution may result in account suspension and legal action.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Changes to This Policy</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update this Refund Policy from time to time. The latest version will always be available on this page. Continued use of Enarsia after changes constitutes acceptance.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Contact</h2>
              <ul className="list-none space-y-1 text-muted-foreground mt-2">
                <li><strong className="text-foreground">Email:</strong> <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">{SUPPORT_EMAIL}</a></li>
                <li><strong className="text-foreground">WhatsApp:</strong> <a href={buildWhatsAppLink(SUPPORT_WHATSAPP)} target="_blank" rel="noreferrer" className="text-primary hover:underline">Chat with us</a></li>
                <li><strong className="text-foreground">Address:</strong> Chhatarpur, MP, India</li>
              </ul>
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
