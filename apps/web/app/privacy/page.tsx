import { LegalPageShell, LegalSection, LegalSubheading } from '@/components/legal/LegalPageShell';

export const metadata = {
  title: 'Privacy Policy — Planevo',
  description: 'How Planevo collects, uses, shares, and protects your personal information.',
};

const TOC = [
  { id: 'infocollect', label: '1. WHAT INFORMATION DO WE COLLECT?' },
  { id: 'infouse', label: '2. HOW DO WE PROCESS YOUR INFORMATION?' },
  { id: 'legalbases', label: '3. WHAT LEGAL BASES DO WE RELY ON TO PROCESS YOUR PERSONAL INFORMATION?' },
  { id: 'whoshare', label: '4. WHEN AND WITH WHOM DO WE SHARE YOUR PERSONAL INFORMATION?' },
  { id: 'cookies', label: '5. DO WE USE COOKIES AND OTHER TRACKING TECHNOLOGIES?' },
  { id: 'ai', label: '6. DO WE OFFER ARTIFICIAL INTELLIGENCE-BASED PRODUCTS?' },
  { id: 'sociallogins', label: '7. HOW DO WE HANDLE YOUR SOCIAL LOGINS?' },
  { id: 'intltransfers', label: '8. IS YOUR INFORMATION TRANSFERRED INTERNATIONALLY?' },
  { id: 'inforetain', label: '9. HOW LONG DO WE KEEP YOUR INFORMATION?' },
  { id: 'infosafe', label: '10. HOW DO WE KEEP YOUR INFORMATION SAFE?' },
  { id: 'privacyrights', label: '11. WHAT ARE YOUR PRIVACY RIGHTS?' },
  { id: 'dnt', label: '12. CONTROLS FOR DO-NOT-TRACK FEATURES' },
  { id: 'uslaws', label: '13. DO UNITED STATES RESIDENTS HAVE SPECIFIC PRIVACY RIGHTS?' },
  { id: 'policyupdates', label: '14. DO WE MAKE UPDATES TO THIS NOTICE?' },
  { id: 'contact', label: '15. HOW CAN YOU CONTACT US ABOUT THIS NOTICE?' },
  { id: 'request', label: '16. HOW CAN YOU REVIEW, UPDATE, OR DELETE THE DATA WE COLLECT FROM YOU?' },
];

const CCPA_TABLE = [
  {
    category: 'A. Identifiers',
    examples:
      'Contact details, such as real name, alias, postal address, telephone or mobile contact number, unique personal identifier, online identifier, Internet Protocol address, email address, and account name',
    collected: 'YES',
  },
  {
    category: 'B. Personal information as defined in the California Customer Records statute',
    examples: 'Name, contact information, education, employment, employment history, and financial information',
    collected: 'YES',
  },
  {
    category: 'C. Protected classification characteristics under state or federal law',
    examples:
      'Gender, age, date of birth, race and ethnicity, national origin, marital status, and other demographic data',
    collected: 'NO',
  },
  {
    category: 'D. Commercial information',
    examples: 'Transaction information, purchase history, financial details, and payment information',
    collected: 'YES',
  },
  {
    category: 'E. Biometric information',
    examples: 'Fingerprints and voiceprints',
    collected: 'NO',
  },
  {
    category: 'F. Internet or other similar network activity',
    examples:
      'Browsing history, search history, online behavior, interest data, and interactions with our and other websites, applications, systems, and advertisements',
    collected: 'YES',
  },
  {
    category: 'G. Geolocation data',
    examples: 'Device location',
    collected: 'NO',
  },
  {
    category: 'H. Audio, electronic, sensory, or similar information',
    examples: 'Images and audio, video or call recordings created in connection with our business activities',
    collected: 'NO',
  },
  {
    category: 'I. Professional or employment-related information',
    examples:
      'Business contact details in order to provide you our Services at a business level or job title, work history, and professional qualifications if you apply for a job with us',
    collected: 'NO',
  },
  {
    category: 'J. Education Information',
    examples: 'Student records and directory information',
    collected: 'YES',
  },
  {
    category: 'K. Inferences drawn from collected personal information',
    examples:
      'Inferences drawn from any of the collected personal information listed above to create a profile or summary about, for example, an individual\'s preferences and characteristics',
    collected: 'NO',
  },
  {
    category: 'L. Sensitive personal Information',
    examples: '',
    collected: 'NO',
  },
] as const;

export default function PrivacyPage() {
  return (
    <LegalPageShell title="Privacy Policy" lastUpdated="June 02, 2026" backLinkTestId="privacy-back-home-link">
      <section>
        <p>
          This Privacy Notice for <strong>Planevo</strong> (&quot;<strong>we</strong>,&quot; &quot;<strong>us</strong>,&quot;
          or &quot;<strong>our</strong>&quot;) describes how and why we might access, collect, store, use, and/or share
          (&quot;<strong>process</strong>&quot;) your personal information when you use our services
          (&quot;<strong>Services</strong>&quot;), including when you:
        </p>
        <ul className="list-disc pl-6 space-y-2 mt-3">
          <li>
            Visit our website at{' '}
            <a href="https://www.planevo.co" className="text-brand-600 underline">https://www.planevo.co</a> or any
            website of ours that links to this Privacy Notice
          </li>
          <li>
            Download and use our mobile application (Planevo), or any other application of ours that links to this
            Privacy Notice
          </li>
          <li>
            Use Planevo. Planevo is an AI-powered personal productivity, calendar, and task management application.
            The platform helps users manage their schedules, plan their time-blocking preferences, sync external calendars
            (such as Google Calendar), integrate educational platforms (such as Canvas), and manage tasks with the
            assistance of a proactive, personalized AI scheduling assistant (referred to as &quot;Bruno&quot;). Planevo
            is accessible via web browsers and mobile applications.
          </li>
          <li>Engage with us in other related ways, including any marketing or events</li>
        </ul>
        <p className="mt-3">
          <strong>Questions or concerns?</strong> Reading this Privacy Notice will help you understand your privacy
          rights and choices. We are responsible for making decisions about how your personal information is processed.
          If you do not agree with our policies and practices, please do not use our Services. If you still have any
          questions or concerns, please contact us at{' '}
          <a href="mailto:support@planevo.co" className="text-brand-600 underline">support@planevo.co</a>.
        </p>
      </section>

      <LegalSection id="summary" heading="SUMMARY OF KEY POINTS">
        <p className="mb-3">
          <strong>
            <em>
              This summary provides key points from our Privacy Notice, but you can find out more details about any of
              these topics by clicking the link following each key point or by using our{' '}
            </em>
          </strong>
          <a href="#toc" className="text-brand-600 underline">
            <strong><em>table of contents</em></strong>
          </a>
          <strong>
            <em> below to find the section you are looking for.</em>
          </strong>
        </p>
        <p className="mt-3">
          <strong>What personal information do we process?</strong> When you visit, use, or navigate our Services, we
          may process personal information depending on how you interact with us and the Services, the choices you make,
          and the products and features you use. Learn more about{' '}
          <a href="#infocollect" className="text-brand-600 underline">personal information you disclose to us</a>.
        </p>
        <p className="mt-3">
          <strong>Do we process any sensitive personal information?</strong> Some of the information may be considered
          &quot;special&quot; or &quot;sensitive&quot; in certain jurisdictions, for example your racial or ethnic
          origins, sexual orientation, and religious beliefs. We do not process sensitive personal information.
        </p>
        <p className="mt-3">
          <strong>Do we collect any information from third parties?</strong> We may collect information from public
          databases, marketing partners, social media platforms, and other outside sources. Learn more about{' '}
          <a href="#othersources" className="text-brand-600 underline">information collected from other sources</a>.
        </p>
        <p className="mt-3">
          <strong>How do we process your information?</strong> We process your information to provide, improve, and
          administer our Services, communicate with you, for security and fraud prevention, and to comply with law. We
          may also process your information for other purposes with your consent. We process your information only when
          we have a valid legal reason to do so. Learn more about{' '}
          <a href="#infouse" className="text-brand-600 underline">how we process your information</a>.
        </p>
        <p className="mt-3">
          <strong>In what situations and with which types of parties do we share personal information?</strong> We may
          share information in specific situations and with specific categories of third parties. Learn more about{' '}
          <a href="#whoshare" className="text-brand-600 underline">when and with whom we share your personal information</a>.
        </p>
        <p className="mt-3">
          <strong>How do we keep your information safe?</strong> We have adequate organizational and technical
          processes and procedures in place to protect your personal information. However, no electronic transmission
          over the internet or information storage technology can be guaranteed to be 100% secure, so we cannot promise
          or guarantee that hackers, cybercriminals, or other unauthorized third parties will not be able to defeat our
          security and improperly collect, access, steal, or modify your information. Learn more about{' '}
          <a href="#infosafe" className="text-brand-600 underline">how we keep your information safe</a>.
        </p>
        <p className="mt-3">
          <strong>What are your rights?</strong> Depending on where you are located geographically, the applicable privacy
          law may mean you have certain rights regarding your personal information. Learn more about{' '}
          <a href="#privacyrights" className="text-brand-600 underline">your privacy rights</a>.
        </p>
        <p className="mt-3">
          <strong>How do you exercise your rights?</strong> The easiest way to exercise your rights is by visiting{' '}
          <a href="mailto:support@planevo.co" className="text-brand-600 underline">support@planevo.co</a>, or by
          contacting us. We will consider and act upon any request in accordance with applicable data protection laws.
        </p>
        <p className="mt-3">
          Want to learn more about what we do with any information we collect?{' '}
          <a href="#toc" className="text-brand-600 underline">Review the Privacy Notice in full</a>.
        </p>
      </LegalSection>

      <LegalSection id="toc" heading="TABLE OF CONTENTS">
        <ul className="list-none pl-0 space-y-1">
          {TOC.map((item) => (
            <li key={item.id}>
              <a href={`#${item.id}`} className="text-brand-600 underline">{item.label}</a>
            </li>
          ))}
        </ul>
      </LegalSection>

      <LegalSection id="infocollect" heading="1. WHAT INFORMATION DO WE COLLECT?">
        <LegalSubheading id="personalinfo">Personal information you disclose to us</LegalSubheading>
        <p>
          <strong><em>In Short:</em></strong> <em>We collect personal information that you provide to us.</em>
        </p>
        <p className="mt-3">
          We collect personal information that you voluntarily provide to us when you register on the Services, express
          an interest in obtaining information about us or our products and Services, when you participate in activities
          on the Services, or otherwise when you contact us.
        </p>
        <p className="mt-3">
          <strong>Personal Information Provided by You.</strong> The personal information that we collect depends on the
          context of your interactions with us and the Services, the choices you make, and the products and features
          you use. The personal information we collect may include the following:
        </p>
        <ul className="list-disc pl-6 space-y-2 mt-3">
          <li>names</li>
          <li>email addresses</li>
          <li>usernames</li>
          <li>passwords</li>
          <li>contact preferences</li>
          <li>billing addresses</li>
        </ul>
        <p className="mt-3" id="sensitiveinfo">
          <strong>Sensitive Information.</strong> We do not process sensitive information.
        </p>
        <p className="mt-3">
          <strong>Payment Data.</strong> We may collect data necessary to process your payment if you choose to make
          purchases, such as your payment instrument number, and the security code associated with your payment
          instrument. All payment data is handled and stored by Stripe and RevenueCat. You may find their privacy notice
          link(s) here:{' '}
          <a href="https://stripe.com/privacy" className="text-brand-600 underline" target="_blank" rel="noopener noreferrer">https://stripe.com/privacy</a>{' '}
          and{' '}
          <a href="https://www.revenuecat.com/privacy/" className="text-brand-600 underline" target="_blank" rel="noopener noreferrer">https://www.revenuecat.com/privacy/</a>.
        </p>
        <p className="mt-3">
          <strong>Social Media Login Data.</strong> We may provide you with the option to register with us using your
          existing social media account details, like your Facebook, X, or other social media account. If you choose to
          register in this way, we will collect certain profile information about you from the social media provider,
          as described in the section called{' '}
          <a href="#sociallogins" className="text-brand-600 underline">&quot;HOW DO WE HANDLE YOUR SOCIAL LOGINS?&quot;</a> below.
        </p>
        <p className="mt-3">
          <strong>Application Data.</strong> If you use our application(s), we also may collect the following
          information if you choose to provide us with access or permission:
        </p>
        <ul className="list-disc pl-6 space-y-2 mt-3">
          <li>
            <em>Mobile Device Access.</em> We may request access or permission to certain features from your mobile
            device, including your mobile device&apos;s calendar, reminders, storage, and other features. If you wish to
            change our access or permissions, you may do so in your device&apos;s settings.
          </li>
          <li>
            <em>Mobile Device Data.</em> We automatically collect device information (such as your mobile device ID,
            model, and manufacturer), operating system, version information and system configuration information,
            device and application identification numbers, browser type and version, hardware model Internet service
            provider and/or mobile carrier, and Internet Protocol (IP) address (or proxy server). If you are using our
            application(s), we may also collect information about the phone network associated with your mobile device,
            your mobile device&apos;s operating system or platform, the type of mobile device you use, your mobile
            device&apos;s unique device ID, and information about the features of our application(s) you accessed.
          </li>
          <li>
            <em>Push Notifications.</em> We may request to send you push notifications regarding your account or certain
            features of the application(s). If you wish to opt out from receiving these types of communications, you may
            turn them off in your device&apos;s settings.
          </li>
        </ul>
        <p className="mt-3">
          This information is primarily needed to maintain the security and operation of our application(s), for
          troubleshooting, and for our internal analytics and reporting purposes.
        </p>
        <p className="mt-3">
          All personal information that you provide to us must be true, complete, and accurate, and you must notify us of
          any changes to such personal information.
        </p>

        <LegalSubheading>Information automatically collected</LegalSubheading>
        <p>
          <strong><em>In Short:</em></strong>{' '}
          <em>
            Some information — such as your Internet Protocol (IP) address and/or browser and device characteristics — is
            collected automatically when you visit our Services.
          </em>
        </p>
        <p className="mt-3">
          We automatically collect certain information when you visit, use, or navigate the Services. This information
          does not reveal your specific identity (like your name or contact information) but may include device and usage
          information, such as your IP address, browser and device characteristics, operating system, language
          preferences, referring URLs, device name, country, location, information about how and when you use our
          Services, and other technical information. This information is primarily needed to maintain the security and
          operation of our Services, and for our internal analytics and reporting purposes.
        </p>
        <p className="mt-3">
          Like many businesses, we also collect information through cookies and similar technologies. You can find out
          more about this in our Cookie Notice:{' '}
          <a href="https://www.planevo.co/cookies" className="text-brand-600 underline">https://www.planevo.co/cookies</a>.
        </p>
        <p className="mt-3">The information we collect includes:</p>
        <ul className="list-disc pl-6 space-y-2 mt-3">
          <li>
            <em>Log and Usage Data.</em> Log and usage data is service-related, diagnostic, usage, and performance
            information our servers automatically collect when you access or use our Services and which we record in log
            files. Depending on how you interact with us, this log data may include your IP address, device information,
            browser type, and settings and information about your activity in the Services (such as the date/time stamps
            associated with your usage, pages and files viewed, searches, and other actions you take such as which
            features you use), device event information (such as system activity, error reports (sometimes called
            &quot;crash dumps&quot;)), and hardware settings).
          </li>
          <li>
            <em>Device Data.</em> We collect device data such as information about your computer, phone, tablet, or other
            device you use to access the Services. Depending on the device used, this device data may include information
            such as your IP address (or proxy server), device and application identification numbers, location, browser
            type, hardware model, Internet service provider and/or mobile carrier, operating system, and system
            configuration information.
          </li>
        </ul>

        <LegalSubheading>Google API</LegalSubheading>
        <p>
          Our use of information received from Google APIs will adhere to the{' '}
          <a href="https://developers.google.com/terms/api-services-user-data-policy" className="text-brand-600 underline" target="_blank" rel="noopener noreferrer">Google API Services User Data Policy</a>, including the{' '}
          <a href="https://developers.google.com/terms/api-services-user-data-policy#limited-use" className="text-brand-600 underline" target="_blank" rel="noopener noreferrer">Limited Use requirements</a>.
        </p>

        <LegalSubheading id="othersources">Information collected from other sources</LegalSubheading>
        <p>
          <strong><em>In Short:</em></strong>{' '}
          <em>
            We may collect limited data from public databases, marketing partners, social media platforms, and other
            outside sources.
          </em>
        </p>
        <p className="mt-3">
          In order to enhance our ability to provide relevant marketing, offers, and services to you and update our
          records, we may obtain information about you from other sources, such as public databases, joint marketing
          partners, affiliate programs, data providers, social media platforms, and from other third parties. This
          information includes mailing addresses, job titles, email addresses, phone numbers, intent data (or user
          behavior data), Internet Protocol (IP) addresses, social media profiles, social media URLs, and custom
          profiles, for purposes of targeted advertising and event promotion.
        </p>
        <p className="mt-3">
          If you interact with us on a social media platform using your social media account (e.g., Facebook or X), we
          receive personal information about you from such platforms such as your name, email address, and gender. You
          may have the right to withdraw your consent to processing your personal information. Learn more about{' '}
          <a href="#withdrawconsent" className="text-brand-600 underline">withdrawing your consent</a>. Any personal
          information that we collect from your social media account depends on your social media account&apos;s privacy
          settings. Please note that their own use of your information is not governed by this Privacy Notice.
        </p>
      </LegalSection>

      <LegalSection id="infouse" heading="2. HOW DO WE PROCESS YOUR INFORMATION?">
        <p>
          <strong><em>In Short:</em></strong>{' '}
          <em>
            We process your information to provide, improve, and administer our Services, communicate with you, for
            security and fraud prevention, and to comply with law. We process the personal information for the following
            purposes listed below. We may also process your information for other purposes only with your prior explicit
            consent.
          </em>
        </p>
        <p className="mt-3">
          <strong>We process your personal information for a variety of reasons, depending on how you interact with our Services, including:</strong>
        </p>
        <ul className="list-disc pl-6 space-y-2 mt-3">
          <li><strong>To facilitate account creation and authentication and otherwise manage user accounts.</strong> We may process your information so you can create and log in to your account, as well as keep your account in working order.</li>
          <li><strong>To deliver and facilitate delivery of services to the user.</strong> We may process your information to provide you with the requested service.</li>
          <li><strong>To respond to user inquiries/offer support to users.</strong> We may process your information to respond to your inquiries and solve any potential issues you might have with the requested service.</li>
          <li><strong>To send administrative information to you.</strong> We may process your information to send you details about our products and services, changes to our terms and policies, and other similar information.</li>
          <li><strong>To fulfill and manage your orders.</strong> We may process your information to fulfill and manage your orders, payments, returns, and exchanges made through the Services.</li>
          <li><strong>To request feedback.</strong> We may process your information when necessary to request feedback and to contact you about your use of our Services.</li>
          <li><strong>To send you marketing and promotional communications.</strong> We may process the personal information you send to us for our marketing purposes, if this is in accordance with your marketing preferences. You can opt out of our marketing emails at any time. For more information, see <a href="#privacyrights" className="text-brand-600 underline">&quot;WHAT ARE YOUR PRIVACY RIGHTS?&quot;</a> below.</li>
          <li><strong>To protect our Services.</strong> We may process your information as part of our efforts to keep our Services safe and secure, including fraud monitoring and prevention.</li>
          <li><strong>To identify usage trends.</strong> We may process information about how you use our Services to better understand how they are being used so we can improve them.</li>
          <li><strong>To save or protect an individual&apos;s vital interest.</strong> We may process your information when necessary to save or protect an individual&apos;s vital interest, such as to prevent harm.</li>
        </ul>
      </LegalSection>

      <LegalSection id="legalbases" heading="3. WHAT LEGAL BASES DO WE RELY ON TO PROCESS YOUR PERSONAL INFORMATION?">
        <p>
          <strong><em>In Short:</em></strong>{' '}
          <em>
            We only process your personal information when we believe it is necessary and we have a valid legal reason
            (i.e., legal basis) to do so under applicable law, like with your consent, to comply with laws, to provide
            you with services to enter into or fulfill our contractual obligations, to protect your rights, or to fulfill
            our legitimate business interests.
          </em>
        </p>

        <p className="mt-3">
          <strong><u><em>If you are located in the EU or UK, this section applies to you.</em></u></strong>
        </p>
        <p className="mt-3">
          The General Data Protection Regulation (GDPR) and UK GDPR require us to explain the valid legal bases we rely
          on in order to process your personal information. As such, we may rely on the following legal bases to process
          your personal information:
        </p>
        <ul className="list-disc pl-6 space-y-2 mt-3">
          <li>
            <strong>Consent.</strong> We may process your information if you have given us permission (i.e., consent) to
            use your personal information for a specific purpose. You can withdraw your consent at any time. Learn more
            about <a href="#withdrawconsent" className="text-brand-600 underline">withdrawing your consent</a>.
          </li>
          <li>
            <strong>Performance of a Contract.</strong> We may process your personal information when we believe it is
            necessary to fulfill our contractual obligations to you, including providing our Services or at your request
            prior to entering into a contract with you.
          </li>
          <li>
            <strong>Legitimate Interests.</strong> We may process your information when we believe it is reasonably
            necessary to achieve our legitimate business interests and those interests do not outweigh your interests and
            fundamental rights and freedoms. For example, we may process your personal information for some of the
            purposes described in order to:
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Send users information about special offers and discounts on our products and services</li>
              <li>Analyze how our Services are used so we can improve them to engage and retain users</li>
              <li>Diagnose problems and/or prevent fraudulent activities</li>
              <li>Understand how our users use our products and services so we can improve user experience</li>
            </ul>
          </li>
          <li>
            <strong>Legal Obligations.</strong> We may process your information where we believe it is necessary for
            compliance with our legal obligations, such as to cooperate with a law enforcement body or regulatory agency,
            exercise or defend our legal rights, or disclose your information as evidence in litigation in which we are
            involved.
          </li>
          <li>
            <strong>Vital Interests.</strong> We may process your information where we believe it is necessary to protect
            your vital interests or the vital interests of a third party, such as situations involving potential threats
            to the safety of any person.
          </li>
        </ul>

        <p className="mt-3">
          <strong><u><em>If you are located in Canada, this section applies to you.</em></u></strong>
        </p>
        <p className="mt-3">
          We may process your information if you have given us specific permission (i.e., express consent) to use your
          personal information for a specific purpose, or in situations where your permission can be inferred (i.e.,
          implied consent). You can <a href="#withdrawconsent" className="text-brand-600 underline">withdraw your consent</a> at any time.
        </p>
        <p className="mt-3">
          In some exceptional cases, we may be legally permitted under applicable law to process your information without
          your consent, including, for example:
        </p>
        <ul className="list-disc pl-6 space-y-2 mt-3">
          <li>If collection is clearly in the interests of an individual and consent cannot be obtained in a timely way</li>
          <li>For investigations and fraud detection and prevention</li>
          <li>For business transactions provided certain conditions are met</li>
          <li>If it is contained in a witness statement and the collection is necessary to assess, process, or settle an insurance claim</li>
          <li>For identifying injured, ill, or deceased persons and communicating with next of kin</li>
          <li>If we have reasonable grounds to believe an individual has been, is, or may be victim of financial abuse</li>
          <li>If it is reasonable to expect collection and use with consent would compromise the availability or the accuracy of the information and the collection is reasonable for purposes related to investigating a breach of an agreement or a contravention of the laws of Canada or a province</li>
          <li>If disclosure is required to comply with a subpoena, warrant, court order, or rules of the court relating to the production of records</li>
          <li>If it was produced by an individual in the course of their employment, business, or profession and the collection is consistent with the purposes for which the information was produced</li>
          <li>If the collection is solely for journalistic, artistic, or literary purposes</li>
          <li>If the information is publicly available and is specified by the regulations</li>
          <li>We may disclose de-identified information for approved research or statistics projects, subject to ethics oversight and confidentiality commitments</li>
        </ul>
      </LegalSection>

      <LegalSection id="whoshare" heading="4. WHEN AND WITH WHOM DO WE SHARE YOUR PERSONAL INFORMATION?">
        <p>
          <strong><em>In Short:</em></strong>{' '}
          <em>We may share information in specific situations described in this section and/or with the following categories of third parties.</em>
        </p>
        <p className="mt-3">
          <strong>Vendors, Consultants, and Other Third-Party Service Providers.</strong> We may share your data with
          third-party vendors, service providers, contractors, or agents (&quot;third parties&quot;) who perform services
          for us or on our behalf and require access to such information to do that work. We have contracts in place with
          our third parties, which are designed to help safeguard your personal information. This means that they cannot
          do anything with your personal information unless we have instructed them to do it. They will also not share
          your personal information with any organization apart from us. They also commit to protect the data they hold on
          our behalf and to retain it for the period we instruct.
        </p>
        <p className="mt-3">The categories of third parties we may share personal information with are as follows:</p>
        <ul className="list-disc pl-6 space-y-2 mt-3">
          <li>AI Platforms</li>
          <li>Cloud Computing Services</li>
          <li>Data Analytics Services</li>
          <li>Data Storage Service Providers</li>
          <li>Payment Processors</li>
          <li>User Account Registration &amp; Authentication Services</li>
          <li>Website Hosting Service Providers</li>
        </ul>
        <p className="mt-3">We also may need to share your personal information in the following situations:</p>
        <ul className="list-disc pl-6 space-y-2 mt-3">
          <li>
            <strong>Business Transfers.</strong> We may share or transfer your information in connection with, or during
            negotiations of, any merger, sale of company assets, financing, or acquisition of all or a portion of our
            business to another company.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="cookies" heading="5. DO WE USE COOKIES AND OTHER TRACKING TECHNOLOGIES?">
        <p>
          <strong><em>In Short:</em></strong>{' '}
          <em>We may use cookies and other tracking technologies to collect and store your information.</em>
        </p>
        <p className="mt-3">
          We may use cookies and similar tracking technologies (like web beacons and pixels) to gather information when
          you interact with our Services. Some online tracking technologies help us maintain the security of our Services
          and your account, prevent crashes, fix bugs, save your preferences, and assist with basic site functions.
        </p>
        <p className="mt-3">
          We also permit third parties and service providers to use online tracking technologies on our Services for
          analytics and advertising, including to help manage and display advertisements, to tailor advertisements to
          your interests, or to send abandoned shopping cart reminders (depending on your communication preferences).
          The third parties and service providers use their technology to provide advertising about products and services
          tailored to your interests which may appear either on our Services or on other websites.
        </p>
        <p className="mt-3">
          To the extent these online tracking technologies are deemed to be a &quot;sale&quot;/&quot;sharing&quot; (which
          includes targeted advertising, as defined under the applicable laws) under applicable US state laws, you can
          opt out of these online tracking technologies by submitting a request as described below under section{' '}
          <a href="#uslaws" className="text-brand-600 underline">&quot;DO UNITED STATES RESIDENTS HAVE SPECIFIC PRIVACY RIGHTS?&quot;</a>
        </p>
        <p className="mt-3">
          Specific information about how we use such technologies and how you can refuse certain cookies is set out in
          our Cookie Notice:{' '}
          <a href="https://www.planevo.co/cookies" className="text-brand-600 underline">https://www.planevo.co/cookies</a>.
        </p>
      </LegalSection>

      <LegalSection id="ai" heading="6. DO WE OFFER ARTIFICIAL INTELLIGENCE-BASED PRODUCTS?">
        <p>
          <strong><em>In Short:</em></strong>{' '}
          <em>We offer products, features, or tools powered by artificial intelligence, machine learning, or similar technologies.</em>
        </p>
        <p className="mt-3">
          As part of our Services, we offer products, features, or tools powered by artificial intelligence, machine
          learning, or similar technologies (collectively, &quot;AI Products&quot;). These tools are designed to enhance
          your experience and provide you with innovative solutions. The terms in this Privacy Notice govern your use of
          the AI Products within our Services.
        </p>

        <LegalSubheading>Use of AI Technologies</LegalSubheading>
        <p>
          We provide the AI Products through third-party service providers (&quot;AI Service Providers&quot;), including
          OpenAI. As outlined in this Privacy Notice, your input, output, and personal information will be shared with
          and processed by these AI Service Providers to enable your use of our AI Products for purposes outlined in{' '}
          <a href="#legalbases" className="text-brand-600 underline">&quot;WHAT LEGAL BASES DO WE RELY ON TO PROCESS YOUR PERSONAL INFORMATION?&quot;</a>{' '}
          You must not use the AI Products in any way that violates the terms or policies of any AI Service Provider.
        </p>

        <LegalSubheading>Our AI Products</LegalSubheading>
        <p>Our AI Products are designed for the following functions:</p>
        <ul className="list-disc pl-6 space-y-2 mt-3">
          <li>Personalized Recommendations</li>
          <li>Content Generation</li>
          <li>Chatbot/Virtual Assistant</li>
          <li>Scheduling/Optimization</li>
        </ul>

        <LegalSubheading>How We Process Your Data Using AI</LegalSubheading>
        <p>
          All personal information processed using our AI Products is handled in line with our Privacy Notice and our
          agreement with third parties. This ensures high security and safeguards your personal information throughout
          the process, giving you peace of mind about your data&apos;s safety.
        </p>

        <LegalSubheading>How to Opt Out</LegalSubheading>
        <p>We believe in giving you the power to decide how your data is used. To opt out, you can:</p>
        <ul className="list-disc pl-6 space-y-2 mt-3">
          <li>Log in to your account settings and update your user account</li>
          <li>Contact us using the contact information provided</li>
        </ul>
      </LegalSection>

      <LegalSection id="sociallogins" heading="7. HOW DO WE HANDLE YOUR SOCIAL LOGINS?">
        <p>
          <strong><em>In Short:</em></strong>{' '}
          <em>If you choose to register or log in to our Services using a social media account, we may have access to certain information about you.</em>
        </p>
        <p className="mt-3">
          Our Services offer you the ability to register and log in using your third-party social media account details
          (like your Facebook or X logins). Where you choose to do this, we will receive certain profile information about
          you from your social media provider. The profile information we receive may vary depending on the social media
          provider concerned, but will often include your name, email address, friends list, and profile picture, as
          well as other information you choose to make public on such a social media platform.
        </p>
        <p className="mt-3">
          We will use the information we receive only for the purposes that are described in this Privacy Notice or that
          are otherwise made clear to you on the relevant Services. Please note that we do not control, and are not
          responsible for, other uses of your personal information by your third-party social media provider. We recommend
          that you review their privacy notice to understand how they collect, use, and share your personal information,
          and how you can set your privacy preferences on their sites and apps.
        </p>
      </LegalSection>

      <LegalSection id="intltransfers" heading="8. IS YOUR INFORMATION TRANSFERRED INTERNATIONALLY?">
        <p>
          <strong><em>In Short:</em></strong>{' '}
          <em>We may transfer, store, and process your information in countries other than your own.</em>
        </p>
        <p className="mt-3">
          Our servers are located in the United States. Regardless of your location, please be aware that your
          information may be transferred to, stored by, and processed by us in our facilities and in the facilities of
          the third parties with whom we may share your personal information (see{' '}
          <a href="#whoshare" className="text-brand-600 underline">&quot;WHEN AND WITH WHOM DO WE SHARE YOUR PERSONAL INFORMATION?&quot;</a> above),
          including facilities in the United States and other countries.
        </p>
        <p className="mt-3">
          If you are a resident in the European Economic Area (EEA), United Kingdom (UK), or Switzerland, then these
          countries may not necessarily have data protection laws or other similar laws as comprehensive as those in
          your country. However, we will take all necessary measures to protect your personal information in accordance
          with this Privacy Notice and applicable law.
        </p>
        <p className="mt-3">
          <strong>European Commission&apos;s Standard Contractual Clauses:</strong>
        </p>
        <p className="mt-3">
          We have implemented measures to protect your personal information, including by using the European
          Commission&apos;s Standard Contractual Clauses for transfers of personal information between our group companies
          and between us and our third-party providers. These clauses require all recipients to protect all personal
          information that they process originating from the EEA or UK in accordance with European data protection laws
          and regulations. Our Standard Contractual Clauses can be provided upon request. We have implemented similar
          appropriate safeguards with our third-party service providers and partners and further details can be provided
          upon request.
        </p>
      </LegalSection>

      <LegalSection id="inforetain" heading="9. HOW LONG DO WE KEEP YOUR INFORMATION?">
        <p>
          <strong><em>In Short:</em></strong>{' '}
          <em>We keep your information for as long as necessary to fulfill the purposes outlined in this Privacy Notice unless otherwise required by law.</em>
        </p>
        <p className="mt-3">
          We will only keep your personal information for as long as it is necessary for the purposes set out in this
          Privacy Notice, unless a longer retention period is required or permitted by law (such as tax, accounting, or
          other legal requirements). No purpose in this notice will require us keeping your personal information for
          longer than the period of time in which users have an account with us.
        </p>
        <p className="mt-3">
          When we have no ongoing legitimate business need to process your personal information, we will either delete or
          anonymize such information, or, if this is not possible (for example, because your personal information has
          been stored in backup archives), then we will securely store your personal information and isolate it from any
          further processing until deletion is possible.
        </p>
      </LegalSection>

      <LegalSection id="infosafe" heading="10. HOW DO WE KEEP YOUR INFORMATION SAFE?">
        <p>
          <strong><em>In Short:</em></strong>{' '}
          <em>We aim to protect your personal information through a system of organizational and technical security measures.</em>
        </p>
        <p className="mt-3">
          We have implemented appropriate and reasonable technical and organizational security measures designed to
          protect the security of any personal information we process. However, despite our safeguards and efforts to
          secure your information, no electronic transmission over the Internet or information storage technology can be
          guaranteed to be 100% secure, so we cannot promise or guarantee that hackers, cybercriminals, or other
          unauthorized third parties will not be able to defeat our security and improperly collect, access, steal, or
          modify your information. Although we will do our best to protect your personal information, transmission of
          personal information to and from our Services is at your own risk. You should only access the Services within
          a secure environment.
        </p>
      </LegalSection>

      <LegalSection id="privacyrights" heading="11. WHAT ARE YOUR PRIVACY RIGHTS?">
        <p>
          <strong><em>In Short:</em></strong>{' '}
          <em>
            Depending on your state of residence in the US or in some regions, such as the European Economic Area (EEA),
            United Kingdom (UK), Switzerland, and Canada, you have rights that allow you greater access to and control
            over your personal information. You may review, change, or terminate your account at any time, depending on
            your country, province, or state of residence.
          </em>
        </p>
        <p className="mt-3">
          In some regions (like the EEA, UK, Switzerland, and Canada), you have certain rights under applicable data
          protection laws. These may include the right (i) to request access and obtain a copy of your personal
          information, (ii) to request rectification or erasure; (iii) to restrict the processing of your personal
          information; (iv) if applicable, to data portability; and (v) not to be subject to automated decision-making.
          If a decision that produces legal or similarly significant effects is made solely by automated means, we will
          inform you, explain the main factors, and offer a simple way to request human review. In certain circumstances,
          you may also have the right to object to the processing of your personal information. You can make such a request
          by contacting us by using the contact details provided in the section{' '}
          <a href="#contact" className="text-brand-600 underline">&quot;HOW CAN YOU CONTACT US ABOUT THIS NOTICE?&quot;</a> below.
        </p>
        <p className="mt-3">
          We will consider and act upon any request in accordance with applicable data protection laws.
        </p>
        <p className="mt-3">
          If you are located in the EEA or UK and you believe we are unlawfully processing your personal information, you
          also have the right to complain to your{' '}
          <a href="https://ec.europa.eu/justice/data-protection/bodies/authorities/index_en.htm" className="text-brand-600 underline" target="_blank" rel="noopener noreferrer">Member State data protection authority</a>{' '}
          or{' '}
          <a href="https://ico.org.uk/make-a-complaint/data-protection-complaints/data-protection-complaints/" className="text-brand-600 underline" target="_blank" rel="noopener noreferrer">UK data protection authority</a>.
          If you are located in Switzerland, you may contact the{' '}
          <a href="https://www.edoeb.admin.ch/edoeb/en/home.html" className="text-brand-600 underline" target="_blank" rel="noopener noreferrer">Federal Data Protection and Information Commissioner</a>.
        </p>
        <p className="mt-3" id="withdrawconsent">
          <strong><u>Withdrawing your consent:</u></strong> If we are relying on your consent to process your personal
          information, which may be express and/or implied consent depending on the applicable law, you have the right to
          withdraw your consent at any time. You can withdraw your consent at any time by contacting us by using the
          contact details provided in the section{' '}
          <a href="#contact" className="text-brand-600 underline">&quot;HOW CAN YOU CONTACT US ABOUT THIS NOTICE?&quot;</a> below or updating your preferences.
        </p>
        <p className="mt-3">
          However, please note that this will not affect the lawfulness of the processing before its withdrawal nor,
          when applicable law allows, will it affect the processing of your personal information conducted in reliance
          on lawful processing grounds other than consent.
        </p>
        <p className="mt-3">
          <strong><u>Opting out of marketing and promotional communications:</u></strong> You can unsubscribe from our
          marketing and promotional communications at any time by clicking on the unsubscribe link in the emails that we
          send, or by contacting us using the details provided in the section{' '}
          <a href="#contact" className="text-brand-600 underline">&quot;HOW CAN YOU CONTACT US ABOUT THIS NOTICE?&quot;</a> below. You will then be removed from the marketing lists. However, we may still communicate with you — for example, to send you service-related messages that are necessary for the administration and use of your account, to respond to service requests, or for other non-marketing purposes.
        </p>

        <LegalSubheading>Account Information</LegalSubheading>
        <p>
          If you would at any time like to review or change the information in your account or terminate your account,
          you can:
        </p>
        <ul className="list-disc pl-6 space-y-2 mt-3">
          <li>Log in to your account settings and update your user account.</li>
          <li>Contact us using the contact information provided.</li>
        </ul>
        <p className="mt-3">
          Upon your request to terminate your account, we will deactivate or delete your account and information from our
          active databases. However, we may retain some information in our files to prevent fraud, troubleshoot problems,
          assist with any investigations, enforce our legal terms and/or comply with applicable legal requirements.
        </p>
        <p className="mt-3">
          <strong><u>Cookies and similar technologies:</u></strong> Most Web browsers are set to accept cookies by
          default. If you prefer, you can usually choose to set your browser to remove cookies and to reject cookies. If
          you choose to remove cookies or reject cookies, this could affect certain features or services of our
          Services. For further information, please see our Cookie Notice:{' '}
          <a href="https://www.planevo.co/cookies" className="text-brand-600 underline">https://www.planevo.co/cookies</a>.
        </p>
        <p className="mt-3">
          If you have questions or comments about your privacy rights, you may email us at{' '}
          <a href="mailto:support@planevo.co" className="text-brand-600 underline">support@planevo.co</a>.
        </p>
      </LegalSection>

      <LegalSection id="dnt" heading="12. CONTROLS FOR DO-NOT-TRACK FEATURES">
        <p>
          Most web browsers and some mobile operating systems and mobile applications include a Do-Not-Track
          (&quot;DNT&quot;) feature or setting you can activate to signal your privacy preference not to have data about
          your online browsing activities monitored and collected. At this stage, no uniform technology standard for
          recognizing and implementing DNT signals has been finalized. As such, we do not currently respond to DNT browser
          signals or any other mechanism that automatically communicates your choice not to be tracked online. If a
          standard for online tracking is adopted that we must follow in the future, we will inform you about that
          practice in a revised version of this Privacy Notice.
        </p>
        <p className="mt-3">
          California law requires us to let you know how we respond to web browser DNT signals. Because there currently is
          not an industry or legal standard for recognizing or honoring DNT signals, we do not respond to them at this
          time.
        </p>
      </LegalSection>

      <LegalSection id="uslaws" heading="13. DO UNITED STATES RESIDENTS HAVE SPECIFIC PRIVACY RIGHTS?">
        <p>
          <strong><em>In Short:</em></strong>{' '}
          <em>
            If you are a resident of California, Colorado, Connecticut, Delaware, Florida, Indiana, Iowa, Kentucky,
            Maryland, Minnesota, Montana, Nebraska, New Hampshire, New Jersey, Oregon, Rhode Island, Tennessee, Texas,
            Utah, or Virginia, you may have the right to request access to and receive details about the personal
            information we maintain about you and how we have processed it, correct inaccuracies, get a copy of, or
            delete your personal information. You may also have the right to withdraw your consent to our processing of
            your personal information. These rights may be limited in some circumstances by applicable law. More
            information is provided below.
          </em>
        </p>

        <LegalSubheading>Categories of Personal Information We Collect</LegalSubheading>
        <p>
          The table below shows the categories of personal information we have collected in the past twelve (12) months.
          The table includes illustrative examples of each category and does not reflect the personal information we
          collect from you. For a comprehensive inventory of all personal information we process, please refer to the
          section <a href="#infocollect" className="text-brand-600 underline">&quot;WHAT INFORMATION DO WE COLLECT?&quot;</a>
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border border-surface-300 p-3 text-left font-black uppercase tracking-tight text-surface-900">Category</th>
                <th className="border border-surface-300 p-3 text-left font-black uppercase tracking-tight text-surface-900">Examples</th>
                <th className="border border-surface-300 p-3 text-center font-black uppercase tracking-tight text-surface-900">Collected</th>
              </tr>
            </thead>
            <tbody>
              {CCPA_TABLE.map((row) => (
                <tr key={row.category}>
                  <td className="border border-surface-300 p-3 align-top">{row.category}</td>
                  <td className="border border-surface-300 p-3 align-top">{row.examples}</td>
                  <td className="border border-surface-300 p-3 text-center align-middle">{row.collected}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4">
          We may also collect other personal information outside of these categories through instances where you interact
          with us in person, online, or by phone or mail in the context of:
        </p>
        <ul className="list-disc pl-6 space-y-2 mt-3">
          <li>Receiving help through our customer support channels;</li>
          <li>Participation in customer surveys or contests; and</li>
          <li>Facilitation in the delivery of our Services and to respond to your inquiries.</li>
        </ul>
        <p className="mt-3">
          We will use and retain the collected personal information as needed to provide the Services or for:
        </p>
        <ul className="list-disc pl-6 space-y-2 mt-3">
          <li>Category A - As long as the user has an account with us</li>
          <li>Category B - As long as the user has an account with us</li>
          <li>Category D - As long as the user has an account with us</li>
          <li>Category F - As long as the user has an account with us</li>
          <li>Category J - As long as the user has an account with us</li>
        </ul>

        <LegalSubheading>Sources of Personal Information</LegalSubheading>
        <p>
          Learn more about the sources of personal information we collect in{' '}
          <a href="#infocollect" className="text-brand-600 underline">&quot;WHAT INFORMATION DO WE COLLECT?&quot;</a>
        </p>

        <LegalSubheading>How We Use and Share Personal Information</LegalSubheading>
        <p>
          Learn more about how we use your personal information in the section,{' '}
          <a href="#infouse" className="text-brand-600 underline">&quot;HOW DO WE PROCESS YOUR INFORMATION?&quot;</a>
        </p>
        <p className="mt-3"><strong>Will your information be shared with anyone else?</strong></p>
        <p className="mt-3">
          We may disclose your personal information with our service providers pursuant to a written contract between us
          and each service provider. Learn more about how we disclose personal information to in the section,{' '}
          <a href="#whoshare" className="text-brand-600 underline">&quot;WHEN AND WITH WHOM DO WE SHARE YOUR PERSONAL INFORMATION?&quot;</a>
        </p>
        <p className="mt-3">
          We may use your personal information for our own business purposes, such as for undertaking internal research
          for technological development and demonstration. This is not considered to be &quot;selling&quot; of your
          personal information.
        </p>
        <p className="mt-3">
          We have not sold or shared any personal information to third parties for a business or commercial purpose in
          the preceding twelve (12) months. We have disclosed the following categories of personal information to third
          parties for a business or commercial purpose in the preceding twelve (12) months: the categories listed in the
          table above where &quot;Collected&quot; is YES.
        </p>
        <p className="mt-3">
          The categories of third parties to whom we disclosed personal information for a business or commercial purpose
          can be found under{' '}
          <a href="#whoshare" className="text-brand-600 underline">&quot;WHEN AND WITH WHOM DO WE SHARE YOUR PERSONAL INFORMATION?&quot;</a>
        </p>

        <LegalSubheading>Your Rights</LegalSubheading>
        <p>You have rights under certain US state data protection laws. However, these rights are not absolute, and in certain cases, we may decline your request as permitted by law. These rights include:</p>
        <ul className="list-disc pl-6 space-y-2 mt-3">
          <li><strong>Right to know</strong> whether or not we are processing your personal data</li>
          <li><strong>Right to access</strong> your personal data</li>
          <li><strong>Right to correct</strong> inaccuracies in your personal data</li>
          <li><strong>Right to request</strong> the deletion of your personal data</li>
          <li><strong>Right to obtain a copy</strong> of the personal data you previously shared with us</li>
          <li><strong>Right to non-discrimination</strong> for exercising your rights</li>
          <li><strong>Right to opt out</strong> of the processing of your personal data if it is used for targeted advertising (or sharing as defined under California&apos;s privacy law), the sale of personal data, or profiling in furtherance of decisions that produce legal or similarly significant effects (&quot;profiling&quot;)</li>
        </ul>
        <p className="mt-3">Depending upon the state where you live, you may also have the following rights:</p>
        <ul className="list-disc pl-6 space-y-2 mt-3">
          <li>Right to access the categories of personal data being processed (as permitted by applicable law, including the privacy law in Minnesota)</li>
          <li>Right to obtain a list of the categories of third parties to which we have disclosed personal data (as permitted by applicable law, including the privacy law in California, Delaware, and Maryland)</li>
          <li>Right to obtain a list of specific third parties to which we have disclosed personal data (as permitted by applicable law, including the privacy law in Minnesota and Oregon)</li>
          <li>Right to obtain a list of third parties to which we have sold personal data (as permitted by applicable law, including the privacy law in Connecticut)</li>
          <li>Right to review, understand, question, and depending on where you live, correct how personal data has been profiled (as permitted by applicable law, including the privacy law in Connecticut and Minnesota)</li>
          <li>Right to limit use and disclosure of sensitive personal data (as permitted by applicable law, including the privacy law in California)</li>
          <li>Right to opt out of the collection of sensitive data and personal data collected through the operation of a voice or facial recognition feature (as permitted by applicable law, including the privacy law in Florida)</li>
        </ul>

        <LegalSubheading>How to Exercise Your Rights</LegalSubheading>
        <p>
          To exercise these rights, you can contact us by visiting{' '}
          <a href="mailto:support@planevo.co" className="text-brand-600 underline">support@planevo.co</a>, by emailing us
          at <a href="mailto:support@planevo.co" className="text-brand-600 underline">support@planevo.co</a>, by visiting{' '}
          <a href="https://www.planevo.co/contact" className="text-brand-600 underline">https://www.planevo.co/contact</a>,
          or by referring to the contact details at the bottom of this document.
        </p>
        <p className="mt-3">
          Under certain US state data protection laws, you can designate an authorized agent to make a request on your
          behalf. We may deny a request from an authorized agent that does not submit proof that they have been validly
          authorized to act on your behalf in accordance with applicable laws.
        </p>

        <LegalSubheading>Request Verification</LegalSubheading>
        <p>
          Upon receiving your request, we will need to verify your identity to determine you are the same person about
          whom we have the information in our system. We will only use personal information provided in your request to
          verify your identity or authority to make the request. However, if we cannot verify your identity from the
          information already maintained by us, we may request that you provide additional information for the purposes
          of verifying your identity and for security or fraud-prevention purposes.
        </p>
        <p className="mt-3">
          If you submit the request through an authorized agent, we may need to collect additional information to verify
          your identity before processing your request and the agent will need to provide a written and signed permission
          from you to submit such request on your behalf.
        </p>

        <LegalSubheading>Appeals</LegalSubheading>
        <p>
          Under certain US state data protection laws, if we decline to take action regarding your request, you may appeal
          our decision by emailing us at{' '}
          <a href="mailto:support@planevo.co" className="text-brand-600 underline">support@planevo.co</a>. We will inform
          you in writing of any action taken or not taken in response to the appeal, including a written explanation of
          the reasons for the decisions. If your appeal is denied, you may submit a complaint to your state attorney
          general.
        </p>

        <LegalSubheading>California &quot;Shine The Light&quot; Law</LegalSubheading>
        <p>
          California Civil Code Section 1798.83, also known as the &quot;Shine The Light&quot; law, permits our users who
          are California residents to request and obtain from us, once a year and free of charge, information about
          categories of personal information (if any) we disclosed to third parties for direct marketing purposes and the
          names and addresses of all third parties with which we shared personal information in the immediately preceding
          calendar year. If you are a California resident and would like to make such a request, please submit your
          request in writing to us by using the contact details provided in the section{' '}
          <a href="#contact" className="text-brand-600 underline">&quot;HOW CAN YOU CONTACT US ABOUT THIS NOTICE?&quot;</a>
        </p>
      </LegalSection>

      <LegalSection id="policyupdates" heading="14. DO WE MAKE UPDATES TO THIS NOTICE?">
        <p>
          <strong><em>In Short:</em></strong>{' '}
          <em>Yes, we will update this notice as necessary to stay compliant with relevant laws.</em>
        </p>
        <p className="mt-3">
          We may update this Privacy Notice from time to time. The updated version will be indicated by an updated
          &quot;Revised&quot; date at the top of this Privacy Notice. If we make material changes to this Privacy Notice,
          we may notify you either by prominently posting a notice of such changes or by directly sending you a
          notification. We encourage you to review this Privacy Notice frequently to be informed of how we are protecting
          your information.
        </p>
      </LegalSection>

      <LegalSection id="contact" heading="15. HOW CAN YOU CONTACT US ABOUT THIS NOTICE?">
        <p>
          If you have questions or comments about this notice, you may email us at{' '}
          <a href="mailto:support@planevo.co" className="text-brand-600 underline">support@planevo.co</a> or contact us
          by post at:
        </p>
        <p className="mt-3">
          Planevo<br />
          __________<br />
          United States
        </p>
      </LegalSection>

      <LegalSection id="request" heading="16. HOW CAN YOU REVIEW, UPDATE, OR DELETE THE DATA WE COLLECT FROM YOU?">
        <p>
          You have the right to request access to the personal information we collect from you, details about how we have
          processed it, correct inaccuracies, or delete your personal information. You may also have the right to
          withdraw your consent to our processing of your personal information. These rights may be limited in some
          circumstances by applicable law. To request to review, update, or delete your personal information, please
          visit: <a href="mailto:support@planevo.co" className="text-brand-600 underline">support@planevo.co</a>.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
