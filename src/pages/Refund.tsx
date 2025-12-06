import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function Refund() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Home
        </Link>

        <h1 className="text-3xl font-bold text-foreground mb-2">Refund Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: December 2024</p>

        <div className="prose prose-sm max-w-none space-y-6 text-foreground">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Nature of Product</h2>
            <p className="text-muted-foreground leading-relaxed">
              NevorAI is a digital, subscription-based software-as-a-service (SaaS) product delivered entirely online. No physical products are shipped. Once you subscribe, you get immediate access to the platform and its features for the duration of your billing period.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. General Refund Window</h2>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">New Customers:</strong> If you are a new customer and are not satisfied with the service, you may request a refund within 7 days of your initial purchase.</li>
              <li><strong className="text-foreground">After 7 Days:</strong> Once 7 days have passed from your initial purchase, payments are generally non-refundable, except in special cases outlined below.</li>
            </ul>
          </section>

          <section className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-3 text-destructive">3. Auto-Renewal & No Refund for Past Periods</h2>
            <p className="text-muted-foreground mb-3">
              Please read this section carefully:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li>You can cancel your subscription or AutoPay at any time before the next billing date to stop future charges.</li>
              <li>
                <strong className="text-foreground">Charges already collected for the current or previous billing periods are NON-REFUNDABLE</strong>, even if you cancel AutoPay or stop using the service.
              </li>
              <li>Cancelling AutoPay only stops future renewals. It does not entitle you to a refund for payments already made.</li>
            </ul>
            <p className="text-muted-foreground mt-3">
              The only exceptions are rare billing errors such as duplicate charges or technical failures, which are reviewed on a case-by-case basis.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Special Cases</h2>
            <p className="text-muted-foreground mb-2">Refunds may be considered in the following situations:</p>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">Duplicate Payments:</strong> If you were charged twice for the same billing period due to a technical error.</li>
              <li><strong className="text-foreground">Technical Failures:</strong> If a technical issue on our end prevented you from accessing the service after payment, and we were unable to resolve it.</li>
              <li><strong className="text-foreground">Billing Mistakes:</strong> Other clear billing errors verified by our support team.</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              All special case refunds are subject to manual review and approval by our support team.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Refund Process & Timelines</h2>
            <p className="text-muted-foreground mb-2">To request a refund:</p>
            <ol className="list-decimal pl-5 space-y-2 text-muted-foreground">
              <li>Email us at <strong className="text-foreground">teamnevorai@gmail.com</strong> with the following information:
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li>Your full name</li>
                  <li>Registered email address</li>
                  <li>Transaction ID or payment reference</li>
                  <li>Reason for the refund request</li>
                </ul>
              </li>
              <li>Our team will review your request and respond within 3-5 working days.</li>
              <li>If approved, refunds are initiated within 7 working days of approval.</li>
              <li>The refund will be credited to your original payment method. Actual credit time depends on your bank or payment gateway and may take an additional 5-10 working days.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. No Chargeback Abuse</h2>
            <p className="text-muted-foreground leading-relaxed">
              We take chargebacks and fraudulent disputes seriously. If you have a billing issue, please contact our support team first at teamnevorai@gmail.com. Initiating a chargeback without first attempting to resolve the issue with us may result in account suspension and potential legal action. Abuse of the chargeback process is prohibited.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Refund Policy from time to time. The latest version will always be available on our website. Your continued use of NevorAI after any changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about this Refund Policy or need assistance with a refund request, please contact us at:
            </p>
            <ul className="list-none space-y-1 text-muted-foreground mt-2">
              <li><strong className="text-foreground">Email:</strong> teamnevorai@gmail.com</li>
              <li><strong className="text-foreground">Address:</strong> Chhatarpur, MP, India</li>
            </ul>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-border">
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <Link to="/terms" className="hover:text-foreground">Terms & Conditions</Link>
            <Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link>
            <Link to="/refund" className="hover:text-foreground">Refund Policy</Link>
          </div>
          <p className="text-xs text-muted-foreground mt-4">© 2024 NevorAI. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
