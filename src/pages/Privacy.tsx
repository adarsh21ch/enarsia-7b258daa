import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import { useBranding } from '@/hooks/useBranding';

const SUPPORT_EMAIL = 'support@nevorai.com';
const SUPPORT_WHATSAPP = '+919329040508';

export default function Privacy() {
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
        <h1 className="text-3xl font-bold text-foreground mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-4">Last updated: June 2, 2026</p>
      </div>

      <ScrollArea className="flex-1 px-4">
        <div className="max-w-3xl mx-auto pb-8">
          <div className="prose prose-sm max-w-none space-y-6 text-foreground">
            <section className="bg-primary/5 border border-primary/15 rounded-xl p-4">
              <p className="text-muted-foreground leading-relaxed m-0">
                Enarsia respects your privacy. This policy explains what data we collect, how we use it, and how we protect it. We comply with the Information Technology Act, 2000 and its amendments applicable in India.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">1. Who We Are</h2>
              <p className="text-muted-foreground leading-relaxed">
                Enarsia is a product of Nevorai Technologies, built for network marketers and sales professionals to manage calls, leads and follow-ups. References to "Enarsia", "we", "us" or "our" mean Nevorai Technologies and the Enarsia application.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-2">
                For privacy-related concerns, contact us at <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">{SUPPORT_EMAIL}</a>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Data We Collect</h2>
              <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                <li><strong className="text-foreground">Account data:</strong> name, email, phone number, encrypted password.</li>
                <li><strong className="text-foreground">Lead & contact data:</strong> names, phone numbers, notes you import or add about your prospects.</li>
                <li><strong className="text-foreground">Call & follow-up data:</strong> call logs, durations, timestamps, follow-up notes you create.</li>
                <li><strong className="text-foreground">Usage data:</strong> features used, pages visited, session duration.</li>
                <li><strong className="text-foreground">Payment data:</strong> plan and payment status only. Card / UPI details are handled entirely by Razorpay — we never store them.</li>
                <li><strong className="text-foreground">Device data:</strong> IP address, device type, OS, browser.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. How We Use Your Data</h2>
              <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                <li>Provide and improve the Enarsia service.</li>
                <li>Send account-related emails (verification, receipts, plan updates).</li>
                <li>Show your call history, leads and analytics inside the app.</li>
                <li>Enforce plan limits and manage your subscription.</li>
                <li>Respond to your support requests.</li>
                <li>Prevent fraud and abuse of the platform.</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                We do <strong className="text-foreground">NOT</strong> sell your data, and we do <strong className="text-foreground">NOT</strong> share your lead/contact data with any third party for marketing.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Third-Party Services</h2>
              <p className="text-muted-foreground mb-2">We share limited data only with these trusted providers:</p>
              <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                <li><strong className="text-foreground">Supabase:</strong> database & authentication infrastructure.</li>
                <li><strong className="text-foreground">Razorpay:</strong> payment processing — they handle card/UPI data, we never see it.</li>
                <li><strong className="text-foreground">Email / SMTP provider:</strong> transactional emails only.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Your Lead Data</h2>
              <p className="text-muted-foreground leading-relaxed">
                The contacts and leads you import into Enarsia belong to you. We store them securely solely to power the app for you. We do not access, use, or share your lead data for any other purpose. If you delete your account, all lead data is permanently deleted within 30 days.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Storage & Security</h2>
              <p className="text-muted-foreground leading-relaxed">
                Data is stored on Supabase infrastructure with industry-standard encryption. Passwords are hashed (bcrypt). All data transmission uses HTTPS. Production data access is restricted to authorised Nevorai team members.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Cookies</h2>
              <p className="text-muted-foreground leading-relaxed">
                We use essential cookies only — required for login sessions and core app functionality. We do not use advertising cookies or third-party tracking pixels.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Your Rights</h2>
              <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                <li>Access the data we hold about you.</li>
                <li>Correct any incorrect data.</li>
                <li>Request deletion of your account and associated data.</li>
                <li>Export your lead data as CSV at any time.</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                To exercise these rights, email <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">{SUPPORT_EMAIL}</a>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Data Retention</h2>
              <p className="text-muted-foreground leading-relaxed">
                We retain account data while your account is active. After deletion, personal data is removed within 30 days. Payment records may be retained up to 7 years as required by Indian financial regulations.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">10. Children's Privacy</h2>
              <p className="text-muted-foreground leading-relaxed">
                Enarsia is not intended for users under 18. We do not knowingly collect data from minors. Contact us if you believe a minor has created an account, and we will delete it.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">11. Changes to This Policy</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update this policy periodically. Significant changes will be communicated via email or in-app notice. Continued use after the change means you accept the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">12. Contact</h2>
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
