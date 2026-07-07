import Link from 'next/link';
import { LegalPageShell, LegalSection, LegalSubheading } from '@/components/legal/LegalPageShell';

export const metadata = {
  title: 'Terms of Service — Planevo',
  description: 'The legal terms that govern your use of Planevo.',
};

const TOC = [
  { id: 'services', label: '1. Our services' },
  { id: 'ip', label: '2. Intellectual property rights' },
  { id: 'representations', label: '3. User representations' },
  { id: 'registration', label: '4. User registration and accounts' },
  { id: 'subscriptions', label: '5. Subscriptions and payment' },
  { id: 'prohibited', label: '6. Prohibited activities' },
  { id: 'ugc', label: '7. User generated contributions' },
  { id: 'license', label: '8. Contribution license' },
  { id: 'ai', label: '9. AI products and output disclaimer' },
  { id: 'management', label: '10. Services management' },
  { id: 'term', label: '11. Term and termination' },
  { id: 'modifications', label: '12. Modifications and interruptions' },
  { id: 'law', label: '13. Governing law' },
  { id: 'disputes', label: '14. Dispute resolution' },
  { id: 'corrections', label: '15. Corrections' },
  { id: 'disclaimer', label: '16. Disclaimer' },
  { id: 'liability', label: '17. Limitations of liability' },
  { id: 'indemnification', label: '18. Indemnification' },
  { id: 'userdata', label: '19. User data' },
  { id: 'electronic', label: '20. Electronic communications, transactions, and signatures' },
  { id: 'misc', label: '21. Miscellaneous' },
  { id: 'contact', label: '22. Contact us' },
];

export default function TermsPage() {
  return (
    <LegalPageShell title="Terms of Service" lastUpdated="July 6, 2026" backLinkTestId="terms-back-home-link">
      <section>
        <LegalSubheading>Agreement to our legal terms</LegalSubheading>
        <p>
          We are Planevo (&quot;<strong>Company</strong>,&quot; &quot;<strong>we</strong>,&quot; &quot;<strong>us</strong>,&quot;
          &quot;<strong>our</strong>&quot;). We operate the website{' '}
          <a href="https://www.planevo.co" className="text-brand-600 underline">https://www.planevo.co</a> (the
          &quot;<strong>Site</strong>&quot;), the Planevo mobile application (the &quot;<strong>App</strong>&quot;), as
          well as any other related products and services that refer or link to these legal terms (the
          &quot;<strong>Legal Terms</strong>&quot;) (collectively, the &quot;<strong>Services</strong>&quot;).
        </p>
        <p className="mt-3">
          Planevo is an AI-powered personal productivity, calendar, and task management application that helps you
          manage your schedule, plan your time, sync external calendars (such as Google Calendar), integrate educational
          platforms (such as Canvas), and manage tasks with the help of a personalized scheduling assistant
          (&quot;Bruno&quot;).
        </p>
        <p className="mt-3">
          You can contact us at{' '}
          <a href="mailto:support@planevo.co" className="text-brand-600 underline">support@planevo.co</a>.
        </p>
        <p className="mt-3">
          These Legal Terms constitute a legally binding agreement made between you, whether personally or on behalf of
          an entity (&quot;<strong>you</strong>&quot;), and Planevo, concerning your access to and use of the Services.
          You agree that by accessing the Services, you have read, understood, and agreed to be bound by all of these
          Legal Terms. <strong>IF YOU DO NOT AGREE WITH ALL OF THESE LEGAL TERMS, THEN YOU ARE EXPRESSLY PROHIBITED FROM
          USING THE SERVICES AND YOU MUST DISCONTINUE USE IMMEDIATELY.</strong>
        </p>
        <p className="mt-3">
          We will provide you with prior notice of any scheduled material changes to the Services you are using. The
          &quot;Last updated&quot; date of these Legal Terms will be updated when changes are made. You waive any right
          to receive specific notice of each such change. It is your responsibility to periodically review these Legal
          Terms to stay informed of updates. You will be subject to, and will be deemed to have been made aware of and
          to have accepted, the changes in any revised Legal Terms by your continued use of the Services after the date
          such revised Legal Terms are posted.
        </p>
        <p className="mt-3">
          We recommend that you print a copy of these Legal Terms for your records. You must be at least 13 years old to
          use the Services.
        </p>
      </section>

      <LegalSection id="toc" heading="Table of contents">
        <ul className="list-none pl-0 space-y-1">
          {TOC.map((item) => (
            <li key={item.id}>
              <a href={`#${item.id}`} className="text-brand-600 underline">{item.label}</a>
            </li>
          ))}
        </ul>
      </LegalSection>

      <LegalSection id="services" heading="1. Our services">
        <p>
          The information provided when using the Services is not intended for distribution to or use by any person or
          entity in any jurisdiction or country where such distribution or use would be contrary to law or regulation or
          which would subject us to any registration requirement within such jurisdiction or country. Accordingly, those
          persons who choose to access the Services from other locations do so on their own initiative and are solely
          responsible for compliance with local laws, if and to the extent local laws are applicable.
        </p>
      </LegalSection>

      <LegalSection id="ip" heading="2. Intellectual property rights">
        <LegalSubheading>Our intellectual property</LegalSubheading>
        <p>
          We are the owner or the licensee of all intellectual property rights in our Services, including all source
          code, databases, functionality, software, website designs, audio, video, text, photographs, and graphics in
          the Services (collectively, the &quot;Content&quot;), as well as the trademarks, service marks, and logos
          contained therein (the &quot;Marks&quot;). The Content and Marks are provided in or through the Services
          &quot;AS IS&quot; for your personal, non-commercial use only.
        </p>
        <LegalSubheading>Your use of our Services</LegalSubheading>
        <p>
          Subject to your compliance with these Legal Terms, including the &quot;Prohibited activities&quot; section
          below, we grant you a non-exclusive, non-transferable, revocable license to access the Services and to
          download or print a copy of any portion of the Content to which you have properly gained access, solely for
          your personal, non-commercial use. Any breach of these intellectual property rights will constitute a material
          breach of our Legal Terms and your right to use our Services will terminate immediately.
        </p>
        <LegalSubheading>Your submissions</LegalSubheading>
        <p>
          Please review this section and the &quot;Prohibited activities&quot; section carefully before using our
          Services to understand the rights you give us and the obligations you have when you post or upload any content
          through the Services. By directly sending us any question, comment, suggestion, idea, feedback, or other
          information about the Services (&quot;Submissions&quot;), you agree to assign to us all intellectual property
          rights in such Submission. We shall own this Submission and be entitled to its unrestricted use and
          dissemination for any lawful purpose, commercial or otherwise, without acknowledgment or compensation to you.
        </p>
      </LegalSection>

      <LegalSection id="representations" heading="3. User representations">
        <p>By using the Services, you represent and warrant that:</p>
        <ul className="list-disc pl-6 space-y-2 mt-3">
          <li>all registration information you submit will be true, accurate, current, and complete;</li>
          <li>you will maintain the accuracy of such information and promptly update it as necessary;</li>
          <li>you have the legal capacity and you agree to comply with these Legal Terms;</li>
          <li>you are not a minor in the jurisdiction in which you reside, or if a minor, you have received parental permission to use the Services;</li>
          <li>you will not access the Services through automated or non-human means, whether through a bot, script, or otherwise;</li>
          <li>you will not use the Services for any illegal or unauthorized purpose; and</li>
          <li>your use of the Services will not violate any applicable law or regulation.</li>
        </ul>
      </LegalSection>

      <LegalSection id="registration" heading="4. User registration and accounts">
        <p>
          You may be required to register to use the Services. You agree to keep your password confidential and will be
          responsible for all use of your account and password, as well as any connected integration tokens (such as
          Google or Canvas). You must notify us immediately if you suspect any unauthorized access to or use of your
          account. We reserve the right to remove, reclaim, or change a username you select if we determine, in our sole
          discretion, that such username is inappropriate, obscene, or otherwise objectionable.
        </p>
      </LegalSection>

      <LegalSection id="subscriptions" heading="5. Subscriptions and payment">
        <ul className="list-disc pl-6 space-y-2">
          <li>Planevo offers a free tier and paid subscription plans. Paid plans may include a free trial. After any trial, your payment method is charged the monthly or annual rate you selected.</li>
          <li>You can cancel anytime from <Link href="/dashboard/settings" className="text-brand-600 underline">Settings</Link>. Cancellation takes effect at the end of your current billing period.</li>
          <li>We do not refund partial months. Annual plans are refundable within 30 days of purchase if you have not meaningfully engaged with the product.</li>
          <li>Prices are in US dollars. Applicable taxes may apply based on your location.</li>
          <li>Payments are processed by third-party payment processors (such as Stripe and RevenueCat). By subscribing, you agree to their applicable terms.</li>
          <li>We reserve the right to change our subscription plans or adjust pricing at any time; price changes will take effect at the start of the next billing cycle following the date of the price change, and we will provide advance notice as required by applicable law.</li>
        </ul>
      </LegalSection>

      <LegalSection id="prohibited" heading="6. Prohibited activities">
        <p>
          You may not access or use the Services for any purpose other than that for which we make the Services
          available. As a user of the Services, you agree not to:
        </p>
        <ul className="list-disc pl-6 space-y-2 mt-3">
          <li>Systematically retrieve data or other content from the Services to create or compile, directly or indirectly, a collection, compilation, database, or directory without written permission from us.</li>
          <li>Trick, defraud, or mislead us and other users, especially in any attempt to learn sensitive account information such as user passwords.</li>
          <li>Circumvent, disable, or otherwise interfere with security-related features of the Services.</li>
          <li>Use any information obtained from the Services to harass, abuse, or harm another person.</li>
          <li>Make improper use of our support services or submit false reports of abuse or misconduct.</li>
          <li>Use the Services in a manner inconsistent with any applicable laws or regulations.</li>
          <li>Upload or transmit (or attempt to upload or transmit) viruses, Trojan horses, or other material that interferes with any party&apos;s uninterrupted use and enjoyment of the Services, or that modifies, impairs, or interferes with the operation of the Services.</li>
          <li>Engage in any automated use of the system, such as using scripts to send comments or messages, or using any data mining, robots, or similar data gathering and extraction tools.</li>
          <li>Attempt to access another user&apos;s account or any non-public areas of the Services.</li>
          <li>Reverse engineer, decompile, disassemble, scrape, or rebrand any of the software comprising or making up the Services.</li>
          <li>Use Bruno or any AI feature to generate content that is harmful, defamatory, infringing, or that violates the policies of our AI service providers.</li>
          <li>Use the Services as part of any effort to compete with us or otherwise use the Services and/or the Content for any revenue-generating endeavor or commercial enterprise.</li>
        </ul>
      </LegalSection>

      <LegalSection id="ugc" heading="7. User generated contributions">
        <p>
          The Services may invite you to chat, contribute to, or participate in features, and may provide you with the
          opportunity to create, submit, post, display, transmit, or store content and materials (&quot;Contributions&quot;),
          including tasks, notes, calendar entries, and messages to Bruno. Any Contributions you transmit may be treated
          in accordance with our{' '}
          <Link href="/privacy" className="text-brand-600 underline">Privacy Policy</Link>. When you create or make
          available any Contributions, you represent and warrant that your Contributions do not infringe the proprietary
          rights of any third party, are not false or misleading, and do not violate any applicable law or regulation.
        </p>
      </LegalSection>

      <LegalSection id="license" heading="8. Contribution license">
        <p>
          You and the Services agree that we may access, store, process, and use any information and personal data that
          you provide in accordance with the terms of the Privacy Policy and your choices (including settings). You
          retain full ownership of your Contributions and any intellectual property rights associated with your
          Contributions. We do not claim any ownership over your Contributions. We are not liable for any statements or
          representations in your Contributions provided by you in any area of the Services.
        </p>
      </LegalSection>

      <LegalSection id="ai" heading="9. AI products and output disclaimer">
        <p>
          Planevo offers products, features, or tools powered by artificial intelligence, machine learning, or similar
          technologies — most visibly our assistant, Bruno. Bruno generates suggestions and plans using large language
          models provided by third-party AI service providers. <strong>AI output may be inaccurate, incomplete, or
          inappropriate.</strong> Planevo is not a replacement for academic advising, medical advice, legal advice, or
          professional coaching. You are responsible for reviewing and for the work you do based on Bruno&apos;s
          suggestions. You must not use the AI features in any way that violates these Legal Terms or the terms and
          policies of any AI service provider.
        </p>
      </LegalSection>

      <LegalSection id="management" heading="10. Services management">
        <p>
          We reserve the right, but not the obligation, to: (1) monitor the Services for violations of these Legal Terms;
          (2) take appropriate legal action against anyone who, in our sole discretion, violates the law or these Legal
          Terms; (3) in our sole discretion and without limitation, notice, or liability, remove from the Services or
          otherwise disable all files and content that are excessive in size or are in any way burdensome to our systems;
          and (4) otherwise manage the Services in a manner designed to protect our rights and property and to facilitate
          the proper functioning of the Services.
        </p>
      </LegalSection>

      <LegalSection id="term" heading="11. Term and termination">
        <p>
          These Legal Terms shall remain in full force and effect while you use the Services. <strong>WITHOUT LIMITING
          ANY OTHER PROVISION OF THESE LEGAL TERMS, WE RESERVE THE RIGHT TO, IN OUR SOLE DISCRETION AND WITHOUT NOTICE OR
          LIABILITY, DENY ACCESS TO AND USE OF THE SERVICES TO ANY PERSON FOR ANY REASON,</strong> including for breach
          of any representation, warranty, or covenant contained in these Legal Terms or of any applicable law or
          regulation. You may delete your account at any time. Upon termination, we delete your data within 30 days,
          subject to any information we are required or permitted by law to retain.
        </p>
      </LegalSection>

      <LegalSection id="modifications" heading="12. Modifications and interruptions">
        <p>
          We reserve the right to change, modify, or remove the contents of the Services at any time or for any reason at
          our sole discretion without notice. We also reserve the right to modify or discontinue all or part of the
          Services without notice at any time. We will not be liable to you or any third party for any modification,
          price change, suspension, or discontinuance of the Services. We cannot guarantee the Services will be available
          at all times. We may experience hardware, software, or other problems, or need to perform maintenance related
          to the Services, resulting in interruptions, delays, or errors.
        </p>
      </LegalSection>

      <LegalSection id="law" heading="13. Governing law">
        <p>
          These Legal Terms are governed by and interpreted following the laws of the State of Delaware, United States,
          without regard to its conflict of law principles. Planevo and you irrevocably consent that the courts of the
          State of Delaware shall have exclusive jurisdiction to resolve any dispute that may arise in connection with
          these Legal Terms, subject to the dispute resolution provisions below.
        </p>
      </LegalSection>

      <LegalSection id="disputes" heading="14. Dispute resolution">
        <LegalSubheading>Informal negotiations</LegalSubheading>
        <p>
          To expedite resolution and control the cost of any dispute, controversy, or claim related to these Legal Terms
          (each a &quot;Dispute&quot;), you and we agree to first attempt to negotiate any Dispute informally for at
          least thirty (30) days before initiating arbitration. Such informal negotiations commence upon written notice
          from one party to the other.
        </p>
        <LegalSubheading>Binding arbitration</LegalSubheading>
        <p>
          If we are unable to resolve a Dispute through informal negotiations, the Dispute will be finally and
          exclusively resolved by binding arbitration administered by the American Arbitration Association (AAA) in
          accordance with its applicable rules. The seat of arbitration shall be Delaware, United States, and the
          language of the proceedings shall be English. Nothing in these Legal Terms prevents either party from seeking
          injunctive or equitable relief from a court of competent jurisdiction where appropriate, or from bringing a
          claim in small-claims court.
        </p>
      </LegalSection>

      <LegalSection id="corrections" heading="15. Corrections">
        <p>
          There may be information on the Services that contains typographical errors, inaccuracies, or omissions,
          including descriptions, pricing, availability, and various other information. We reserve the right to correct
          any errors, inaccuracies, or omissions and to change or update the information on the Services at any time,
          without prior notice.
        </p>
      </LegalSection>

      <LegalSection id="disclaimer" heading="16. Disclaimer">
        <p>
          THE SERVICES ARE PROVIDED ON AN AS-IS AND AS-AVAILABLE BASIS. YOU AGREE THAT YOUR USE OF THE SERVICES WILL BE
          AT YOUR SOLE RISK. TO THE FULLEST EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, IN
          CONNECTION WITH THE SERVICES AND YOUR USE THEREOF, INCLUDING, WITHOUT LIMITATION, THE IMPLIED WARRANTIES OF
          MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE MAKE NO WARRANTIES OR
          REPRESENTATIONS ABOUT THE ACCURACY OR COMPLETENESS OF THE SERVICES&apos; CONTENT OR THE CONTENT OF ANY
          WEBSITES OR APPLICATIONS LINKED TO THE SERVICES, AND WE WILL ASSUME NO LIABILITY OR RESPONSIBILITY FOR ANY
          ERRORS, MISTAKES, OR INACCURACIES OF CONTENT AND MATERIALS.
        </p>
      </LegalSection>

      <LegalSection id="liability" heading="17. Limitations of liability">
        <p>
          IN NO EVENT WILL WE OR OUR DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE TO YOU OR ANY THIRD PARTY FOR ANY DIRECT,
          INDIRECT, CONSEQUENTIAL, EXEMPLARY, INCIDENTAL, SPECIAL, OR PUNITIVE DAMAGES, INCLUDING LOST PROFIT, LOST
          REVENUE, LOSS OF DATA, OR OTHER DAMAGES ARISING FROM YOUR USE OF THE SERVICES, EVEN IF WE HAVE BEEN ADVISED OF
          THE POSSIBILITY OF SUCH DAMAGES. NOTWITHSTANDING ANYTHING TO THE CONTRARY CONTAINED HEREIN, OUR LIABILITY TO
          YOU FOR ANY CAUSE WHATSOEVER AND REGARDLESS OF THE FORM OF THE ACTION WILL AT ALL TIMES BE LIMITED TO THE
          AMOUNT PAID, IF ANY, BY YOU TO US DURING THE TWELVE (12) MONTH PERIOD PRIOR TO ANY CAUSE OF ACTION ARISING.
        </p>
      </LegalSection>

      <LegalSection id="indemnification" heading="18. Indemnification">
        <p>
          You agree to defend, indemnify, and hold us harmless, including our subsidiaries, affiliates, and all of our
          respective officers, agents, partners, and employees, from and against any loss, damage, liability, claim, or
          demand, including reasonable attorneys&apos; fees and expenses, made by any third party due to or arising out
          of: (1) your use of the Services; (2) breach of these Legal Terms; (3) any breach of your representations and
          warranties set forth in these Legal Terms; or (4) your violation of the rights of a third party, including but
          not limited to intellectual property rights.
        </p>
      </LegalSection>

      <LegalSection id="userdata" heading="19. User data">
        <p>
          We will maintain certain data that you transmit to the Services for the purpose of managing the performance of
          the Services, as well as data relating to your use of the Services. Although we perform regular routine backups
          of data, you are solely responsible for all data that you transmit or that relates to any activity you have
          undertaken using the Services. You agree that we will have no liability to you for any loss or corruption of
          any such data, and you hereby waive any right of action against us arising from any such loss or corruption of
          such data.
        </p>
      </LegalSection>

      <LegalSection id="electronic" heading="20. Electronic communications, transactions, and signatures">
        <p>
          Visiting the Services, sending us emails, and completing online forms constitute electronic communications. You
          consent to receive electronic communications, and you agree that all agreements, notices, disclosures, and
          other communications we provide to you electronically, via email, and on the Services, satisfy any legal
          requirement that such communication be in writing. YOU HEREBY AGREE TO THE USE OF ELECTRONIC SIGNATURES,
          CONTRACTS, ORDERS, AND OTHER RECORDS, AND TO ELECTRONIC DELIVERY OF NOTICES, POLICIES, AND RECORDS OF
          TRANSACTIONS INITIATED OR COMPLETED BY US OR VIA THE SERVICES.
        </p>
      </LegalSection>

      <LegalSection id="misc" heading="21. Miscellaneous">
        <p>
          These Legal Terms and any policies or operating rules posted by us on the Services or in respect to the
          Services constitute the entire agreement and understanding between you and us. Our failure to exercise or
          enforce any right or provision of these Legal Terms shall not operate as a waiver of such right or provision.
          If any provision or part of a provision of these Legal Terms is determined to be unlawful, void, or
          unenforceable, that provision or part of the provision is deemed severable from these Legal Terms and does not
          affect the validity and enforceability of any remaining provisions.
        </p>
      </LegalSection>

      <LegalSection id="contact" heading="22. Contact us">
        <p>
          In order to resolve a complaint regarding the Services or to receive further information regarding use of the
          Services, please contact us at{' '}
          <a href="mailto:support@planevo.co" className="text-brand-600 underline">support@planevo.co</a>.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
