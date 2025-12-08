import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function Privacy() {
  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="max-w-3xl mx-auto px-4 py-4 flex-shrink-0">
        <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Home
        </Link>

        <h1 className="text-3xl font-bold text-foreground mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-4">Last updated: December 2025</p>
      </div>

      <ScrollArea className="flex-1 px-4">
        <div className="max-w-3xl mx-auto pb-8">
          <div className="prose prose-sm max-w-none space-y-6 text-foreground">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
              <p className="text-muted-foreground leading-relaxed">
                This Privacy Policy explains how NevorAI ("we", "us", or "our") collects, uses, stores, and protects your personal information when you use our service. By using NevorAI, you agree to the practices described in this policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Data We Collect</h2>
              <p className="text-muted-foreground mb-2">We collect the following types of information:</p>
              <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                <li><strong className="text-foreground">Account Information:</strong> Name, email address, phone number, and password when you create an account.</li>
                <li><strong className="text-foreground">Profile Data:</strong> Company name, city, bio, and other details you choose to provide.</li>
                <li><strong className="text-foreground">Usage Data:</strong> Information about how you use the service, including features accessed, pages visited, and actions taken.</li>
                <li><strong className="text-foreground">Device Information:</strong> Browser type, operating system, and device identifiers for analytics and security purposes.</li>
                <li><strong className="text-foreground">Billing Information:</strong> Limited billing-related data such as transaction IDs and subscription status. Full payment details are handled by our payment partners.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. Payment Information</h2>
              <p className="text-muted-foreground leading-relaxed">
                All card numbers, UPI details, and other sensitive payment information are processed securely by trusted third-party payment gateways such as PhonePe, Razorpay, or similar providers. <strong className="text-foreground">NevorAI does not store your full payment details.</strong> We only receive limited information such as transaction confirmations and subscription status from our payment partners.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. How We Use Your Data</h2>
              <p className="text-muted-foreground mb-2">We use your information to:</p>
              <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                <li>Create and manage your account.</li>
                <li>Provide, maintain, and improve the NevorAI service.</li>
                <li>Send important updates, notifications, and service-related communications via email, WhatsApp, or SMS.</li>
                <li>Process payments and manage subscriptions.</li>
                <li>Analyze usage patterns to improve features and user experience.</li>
                <li>Detect and prevent fraud, abuse, or security issues.</li>
                <li>Comply with legal obligations.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Legal Basis & Consent</h2>
              <p className="text-muted-foreground leading-relaxed">
                By creating an account and using NevorAI, you consent to the collection and processing of your data as described in this Privacy Policy. We process your data based on your consent, our legitimate business interests, and our legal obligations.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Cookies & Tracking</h2>
              <p className="text-muted-foreground leading-relaxed">
                NevorAI may use cookies and similar tracking technologies to:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-muted-foreground mt-2">
                <li>Keep you logged in and maintain your session.</li>
                <li>Remember your preferences and settings.</li>
                <li>Analyze usage patterns and improve the service.</li>
                <li>Ensure security and prevent fraud.</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                You can control cookies through your browser settings. However, disabling certain cookies may affect your ability to use some features of the service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Data Sharing</h2>
              <p className="text-muted-foreground mb-2">We only share your data with:</p>
              <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                <li><strong className="text-foreground">Service Providers:</strong> Trusted third parties who help us operate the service, such as hosting providers, analytics tools, and payment gateways.</li>
                <li><strong className="text-foreground">Legal Requirements:</strong> When required by law, court order, or government request.</li>
                <li><strong className="text-foreground">Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets, your data may be transferred as part of the transaction.</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                We do not sell your personal information to third parties for marketing purposes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Data Retention</h2>
              <p className="text-muted-foreground leading-relaxed">
                We retain your personal data only as long as necessary to provide the service and fulfill the purposes described in this policy. We may also retain certain information for legal, accounting, or regulatory compliance purposes. When your data is no longer needed, we will securely delete or anonymize it.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Your Rights</h2>
              <p className="text-muted-foreground mb-2">You have the right to:</p>
              <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                <li>Access the personal data we hold about you.</li>
                <li>Request correction of inaccurate information.</li>
                <li>Request deletion of your data, subject to legal limitations.</li>
                <li>Withdraw consent for certain data processing activities.</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                To exercise these rights, please contact us at teamnevorai@gmail.com. We will respond to your request within a reasonable timeframe.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">10. Security</h2>
              <p className="text-muted-foreground leading-relaxed">
                We implement reasonable technical and organizational measures to protect your personal data from unauthorized access, loss, misuse, or alteration. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">11. Policy Changes</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. The latest version will always be available on our website. We encourage you to review this policy periodically.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">12. Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have any questions or concerns about this Privacy Policy or how we handle your data, please contact us at:
              </p>
              <ul className="list-none space-y-1 text-muted-foreground mt-2">
                <li><strong className="text-foreground">Email:</strong> teamnevorai@gmail.com</li>
                <li><strong className="text-foreground">Address:</strong> Chhatarpur, MP, India</li>
                <li><strong className="text-foreground">Contact number:</strong> +91 9329040508</li>
              </ul>
              <p className="text-muted-foreground mt-4 text-sm italic">
                This website is managed by Adarsh Chaturvedi.
              </p>
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
      </ScrollArea>
    </div>
  );
}