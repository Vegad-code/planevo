import Link from 'next/link';
import { LegalPageShell, LegalSection } from '@/components/legal/LegalPageShell';

export const metadata = {
  title: 'Cookie Policy — Planevo',
  description: 'How Planevo uses cookies and similar tracking technologies.',
};

export default function CookiesPage() {
  return (
    <LegalPageShell title="Cookie Policy" lastUpdated="July 6, 2026" backLinkTestId="cookies-back-home-link">
      <section>
        <p>
          This Cookie Policy explains how Planevo (&quot;<strong>Company</strong>,&quot; &quot;<strong>we</strong>,&quot;
          &quot;<strong>us</strong>,&quot; and &quot;<strong>our</strong>&quot;) uses cookies and similar technologies to
          recognize you when you visit our website at{' '}
          <a href="https://www.planevo.co" className="text-brand-600 underline">https://www.planevo.co</a>{' '}
          (&quot;<strong>Website</strong>&quot;). It explains what these technologies are and why we use them, as well
          as your rights to control our use of them.
        </p>
      </section>

      <LegalSection heading="1. What are cookies?">
        <p>
          Cookies are small data files that are placed on your computer or mobile device when you visit a website.
          Cookies are widely used by website owners in order to make their websites work, or to work more efficiently,
          as well as to provide reporting information.
        </p>
        <p className="mt-3">
          Cookies set by the website owner (in this case, Planevo) are called &quot;first-party cookies.&quot; Cookies
          set by parties other than the website owner are called &quot;third-party cookies.&quot; Third-party cookies
          enable third-party features or functionality to be provided on or through the website (e.g., analytics and
          payment processing).
        </p>
      </LegalSection>

      <LegalSection heading="2. Why do we use cookies?">
        <p>
          We use first-party and third-party cookies for several reasons. Some cookies are required for technical
          reasons in order for our Website to operate, and we refer to these as &quot;essential&quot; or
          &quot;strictly necessary&quot; cookies. Other cookies enable us to track and target the interests of our
          users to enhance the experience on our Website and to understand how our Services are used.
        </p>
        <p className="mt-3">The specific types of cookies served through our Website include:</p>
        <ul className="list-disc pl-6 space-y-2 mt-3">
          <li>
            <strong>Essential cookies</strong> — Supabase authentication session cookies. Required to keep you signed
            in and to maintain the security of your account.
          </li>
          <li>
            <strong>Analytics cookies</strong> — PostHog (when enabled). Used to understand which features are useful
            so we can improve the product. We do not use advertising or cross-site tracking cookies.
          </li>
          <li>
            <strong>Payment cookies</strong> — Stripe cookies during checkout (only on payment pages).
          </li>
        </ul>
        <p className="mt-3">We do not use advertising cookies. We do not share data with ad networks.</p>
      </LegalSection>

      <LegalSection heading="3. How can I control cookies?">
        <p>
          You have the right to decide whether to accept or reject cookies. Essential cookies cannot be rejected as
          they are strictly necessary to provide you with services. If you choose to reject non-essential cookies, you
          may still use our Website though your access to some functionality and areas may be restricted.
        </p>
        <p className="mt-3">
          You can manage your cookie preferences through your browser settings. Most browsers allow you to refuse or
          delete cookies. Note that clearing essential cookies will sign you out of Planevo.
        </p>
      </LegalSection>

      <LegalSection heading="4. How can I control cookies on my browser?">
        <p>
          As the means by which you can refuse cookies through your web browser controls vary from browser to browser,
          you should visit your browser&apos;s help menu for more information. The following links may be helpful:
        </p>
        <ul className="list-disc pl-6 space-y-2 mt-3">
          <li>
            <a href="https://support.google.com/chrome/answer/95647" className="text-brand-600 underline" target="_blank" rel="noopener noreferrer">Chrome</a>
          </li>
          <li>
            <a href="https://support.mozilla.org/en-US/kb/enhanced-tracking-protection-firefox-desktop" className="text-brand-600 underline" target="_blank" rel="noopener noreferrer">Firefox</a>
          </li>
          <li>
            <a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" className="text-brand-600 underline" target="_blank" rel="noopener noreferrer">Safari</a>
          </li>
          <li>
            <a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" className="text-brand-600 underline" target="_blank" rel="noopener noreferrer">Microsoft Edge</a>
          </li>
        </ul>
        <p className="mt-3">
          In addition, most advertising networks offer you a way to opt out of targeted advertising. If you would like
          to find out more information, please visit{' '}
          <a href="https://www.aboutads.info/choices/" className="text-brand-600 underline" target="_blank" rel="noopener noreferrer">Digital Advertising Alliance</a>,{' '}
          <a href="https://youradchoices.ca/" className="text-brand-600 underline" target="_blank" rel="noopener noreferrer">Digital Advertising Alliance of Canada</a>, or{' '}
          <a href="https://www.youronlinechoices.eu/" className="text-brand-600 underline" target="_blank" rel="noopener noreferrer">European Interactive Digital Advertising Alliance</a>.
        </p>
      </LegalSection>

      <LegalSection heading="5. What about other tracking technologies, like web beacons?">
        <p>
          Cookies are not the only way to recognize or track visitors to a website. We may use other, similar
          technologies from time to time, like web beacons (sometimes called &quot;tracking pixels&quot; or &quot;clear
          gifs&quot;). These are tiny graphics files that contain a unique identifier that enable us to recognize when
          someone has visited our Website or opened an email including them. This allows us, for example, to monitor
          the traffic patterns of users from one page within a website to another, to deliver or communicate with
          cookies, to understand whether you have come to the website from an online advertisement displayed on a
          third-party website, to improve site performance, and to measure the success of email marketing campaigns. In
          many instances, these technologies are reliant on cookies to function properly, and so declining cookies will
          impair their functioning.
        </p>
      </LegalSection>

      <LegalSection heading="6. Do you serve targeted advertising?">
        <p>
          We do not serve targeted advertising through our Website. Third parties may serve cookies through our
          Website for analytics and payment processing purposes as described above. These third parties may use
          information about your visits to this and other websites in order to provide relevant services, but they do
          not collect directly identifying information (such as your name or email address) unless you choose to provide
          it.
        </p>
      </LegalSection>

      <LegalSection heading="7. How often will you update this Cookie Policy?">
        <p>
          We may update this Cookie Policy from time to time in order to reflect, for example, changes to the cookies
          we use or for other operational, legal, or regulatory reasons. Please therefore revisit this Cookie Policy
          regularly to stay informed about our use of cookies and related technologies. The &quot;Last updated&quot;
          date at the top of this Cookie Policy indicates when it was last revised.
        </p>
      </LegalSection>

      <LegalSection heading="8. Where can I get further information?">
        <p>
          If you have any questions about our use of cookies or other technologies, please email us at{' '}
          <a href="mailto:support@planevo.co" className="text-brand-600 underline">support@planevo.co</a>.
        </p>
        <p className="mt-3">
          For more information about how we collect, use, and share your personal information, see our{' '}
          <Link href="/privacy" className="text-brand-600 underline">Privacy Policy</Link>.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
