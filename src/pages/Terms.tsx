import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Home
        </Link>

        <h1 className="text-3xl font-bold text-foreground mb-2">Terms & Conditions</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: December 2024</p>

        <div className="prose prose-sm max-w-none space-y-6 text-foreground">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. About NevorAI</h2>
            <p className="text-muted-foreground leading-relaxed">
              NevorAI is a subscription-based software-as-a-service (SaaS) platform designed to help network marketers, sales professionals, and business owners manage their prospects and follow-ups effectively. Our tools help you track leads, manage your sales funnel, and never miss a follow-up opportunity.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Eligibility & Account</h2>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li>You must be at least 18 years old to create an account and use NevorAI.</li>
              <li>You are responsible for providing accurate and complete information during registration.</li>
              <li>You must keep your login credentials secure and confidential.</li>
              <li>You are responsible for all activities that occur under your account.</li>
              <li>Notify us immediately if you suspect unauthorized access to your account.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Acceptable Use</h2>
            <p className="text-muted-foreground mb-2">When using NevorAI, you agree NOT to:</p>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li>Use the service for any illegal or unauthorized purpose.</li>
              <li>Send spam, unsolicited messages, or engage in harassment.</li>
              <li>Attempt to access other users' accounts or data.</li>
              <li>Scrape, copy, or extract data from the platform without permission.</li>
              <li>Share your account credentials with others.</li>
              <li>Interfere with or disrupt the service or its servers.</li>
              <li>Use automated tools or bots without our written consent.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Subscriptions & Auto-Pay</h2>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li>NevorAI is a subscription-based digital service that may use recurring billing or AutoPay.</li>
              <li>By subscribing, you authorize us to charge your payment method on a recurring basis until you cancel.</li>
              <li>You can cancel your subscription or AutoPay at any time before the next billing date to stop future charges.</li>
              <li><strong className="text-foreground">Important:</strong> Cancelling AutoPay only stops future renewals. Payments already collected for current or previous billing periods are non-refundable.</li>
              <li>Your subscription provides access to NevorAI features for the duration of your billing period.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Fees & Changes</h2>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li>Subscription fees are displayed at the time of purchase and may vary by plan.</li>
              <li>We reserve the right to update pricing or modify plans with reasonable advance notice.</li>
              <li>Price changes will apply to future billing cycles and will not affect your current subscription period.</li>
              <li>Continued use of the service after a price change constitutes acceptance of the new pricing.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Third-Party Payments</h2>
            <p className="text-muted-foreground leading-relaxed">
              Payments are processed securely by trusted third-party payment gateways such as PhonePe, Razorpay, or similar services. NevorAI does not store your full card numbers, UPI details, or other sensitive payment information. All payment data is handled according to industry-standard security practices by our payment partners.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Intellectual Property</h2>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li>NevorAI branding, logos, content, and software are owned by the company and protected by intellectual property laws.</li>
              <li>Your subscription grants you a limited, non-exclusive, non-transferable license to use the service for its intended purpose.</li>
              <li>You may not copy, modify, distribute, or create derivative works from our platform without written permission.</li>
              <li>You retain ownership of the data you upload to NevorAI.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Limitation of Liability & No Guarantee</h2>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li>NevorAI is a productivity tool and does not guarantee any specific business results, income, or outcomes.</li>
              <li>Your success depends on your own efforts, skills, and business decisions.</li>
              <li>To the maximum extent permitted by law, our liability is limited to the amount you paid for the service in the most recent billing period.</li>
              <li>We are not liable for indirect, incidental, or consequential damages arising from your use of the service.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Termination</h2>
            <p className="text-muted-foreground mb-2">We may suspend or terminate your account if you:</p>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li>Violate these Terms & Conditions.</li>
              <li>Engage in fraudulent or illegal activities.</li>
              <li>Fail to pay subscription fees when due.</li>
              <li>Abuse the service or other users.</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              Upon termination, your access to the service will be revoked, and we may delete your data after a reasonable retention period.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Governing Law & Disputes</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms & Conditions are governed by and construed in accordance with the laws of India. Any disputes arising from these terms or your use of NevorAI shall be subject to the exclusive jurisdiction of the courts in Chhatarpur, Madhya Pradesh, India.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about these Terms & Conditions, please contact us at:
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
