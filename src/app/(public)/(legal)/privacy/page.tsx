import type { Metadata } from "next";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  // Root template appends " | Hommy".
  title: "Privacy Policy",
  description:
    "How Hommy collects, uses, shares, and protects your information, and the choices and rights you have.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p className="lead text-muted-foreground">Effective date: {LEGAL.effectiveDate}</p>

      <p>
        This Privacy Policy describes how {LEGAL.entity} (&ldquo;{LEGAL.brand},&rdquo; &ldquo;we,&rdquo;
        &ldquo;us,&rdquo; or &ldquo;our&rdquo;) collects, uses, shares, and protects information in
        connection with the website at{" "}
        <a href={LEGAL.url}>{LEGAL.site}</a> and the related online platform that connects homeowners
        (&ldquo;Homeowners&rdquo;) with independent home-services contractors (&ldquo;Contractors&rdquo;)
        (together, the &ldquo;Platform&rdquo;). It also explains the choices and rights you have
        regarding your information. By using the Platform, you agree to this Privacy Policy. If you do
        not agree, please do not use the Platform.
      </p>

      <h2>1. Information We Collect</h2>
      <p>We collect the following categories of information:</p>
      <p>
        <strong>Information you provide to us.</strong>
      </p>
      <ul>
        <li>
          <strong>Account information:</strong> name, email address, mobile phone number, password, and
          your role (homeowner, contractor team member, or administrator).
        </li>
        <li>
          <strong>Homeowner job requests:</strong> property address and location, the type of work,
          urgency, descriptions, notes, and any photos you upload.
        </li>
        <li>
          <strong>Contractor business information:</strong> company name, service areas, years in
          business, license and insurance details, and any documents you submit for verification.
        </li>
        <li>
          <strong>Communications and content:</strong> messages, quotes, reviews, ratings, files you
          share, and the contents of support requests.
        </li>
      </ul>
      <p>
        <strong>Information we collect automatically.</strong> When you use the Platform we
        automatically collect device and usage information, including IP address, approximate location
        (derived from IP address or the address you provide), browser and device type, pages and
        features used, referring pages, and timestamps. We collect this using cookies and similar
        technologies (see &ldquo;Cookies and Similar Technologies&rdquo; below).
      </p>
      <p>
        <strong>Information from third parties.</strong> We may receive information from service
        providers that help us operate the Platform, including mapping and geocoding providers, payment
        processors, and fraud-prevention and verification services.
      </p>

      <h2>2. How We Use Information</h2>
      <ul>
        <li>Provide, operate, maintain, and improve the Platform.</li>
        <li>
          Match Homeowners with Contractors and facilitate leads, quotes, messaging, hiring, and
          reviews.
        </li>
        <li>
          Send you communications, including transactional notifications by email, SMS/text message,
          push notification, and in-app message about leads, quotes, messages, account activity, and
          important service updates.
        </li>
        <li>Process credits, subscriptions, and payments, and maintain related records.</li>
        <li>
          Protect the security and integrity of the Platform, verify accounts, and detect, prevent, and
          respond to fraud, abuse, and unlawful activity.
        </li>
        <li>Comply with legal obligations, enforce our Terms of Service, and resolve disputes.</li>
      </ul>

      <h2 id="sms">3. SMS / Text Messaging</h2>
      <p>
        With your consent, we send transactional SMS text messages (for example, new-lead alerts and
        quote-status updates) to the mobile number you provide. Message frequency varies based on your
        activity. Message and data rates may apply. You can opt out at any time by replying{" "}
        <strong>STOP</strong> to any message, or reply <strong>HELP</strong> for help. Opting out of SMS
        will not affect the other ways we contact you (such as email or in-app notifications).
      </p>
      <p>
        <strong>
          We do not sell, rent, or share your mobile phone number or your SMS opt-in consent with third
          parties or affiliates for their own marketing purposes.
        </strong>{" "}
        Mobile information is used only to deliver the messages you have asked to receive and to operate
        the Platform. Wireless carriers are not liable for delayed or undelivered messages.
      </p>

      <h2>4. How We Share Information</h2>
      <p>We share information in the following ways:</p>
      <ul>
        <li>
          <strong>With other users to provide the service.</strong> When a Homeowner posts a job, we
          share the job details with matched Contractors. When a Contractor engages a lead or a
          Homeowner hires a Contractor, we share the relevant contact information between them so they
          can communicate and complete the work. Contractor profile information (such as company name,
          ratings, reviews, and verification status) is shown to Homeowners.
        </li>
        <li>
          <strong>With service providers.</strong> We share information with vendors who process it on
          our behalf under contractual confidentiality and data-protection obligations, including
          hosting and database services (Supabase), text messaging (Twilio), email (Resend), media
          storage (Cloudinary), maps and geocoding (Google), and payment processing (Stripe).
        </li>
        <li>
          <strong>For legal and safety reasons.</strong> We may disclose information to comply with
          applicable law, regulation, legal process, or governmental request; to enforce our agreements;
          and to protect the rights, property, or safety of {LEGAL.brand}, our users, or the public.
        </li>
        <li>
          <strong>Business transfers.</strong> We may share or transfer information in connection with a
          merger, acquisition, financing, reorganization, or sale of all or part of our assets.
        </li>
        <li>
          <strong>With your direction or consent.</strong> We share information at your direction or with
          your consent.
        </li>
      </ul>
      <p>We do not sell your personal information for money.</p>

      <h2>5. Cookies and Similar Technologies</h2>
      <p>
        We use <strong>essential</strong> cookies to run the Platform — sign-in, security, and
        remembering your session and preferences. These are always active because the Platform cannot
        function without them.
      </p>
      <p>
        We also use optional <strong>analytics</strong> cookies (via PostHog) to understand how the
        Platform is used so we can improve it. These stay <strong>off until you allow them</strong>: on
        your first visit we ask for your choice, and you can change it anytime through the{" "}
        <strong>&ldquo;Cookie settings&rdquo;</strong> link in the site footer. You can also control
        cookies through your browser settings; disabling some cookies may affect how the Platform
        functions.
      </p>

      <h2>6. Data Retention</h2>
      <p>
        We retain personal information for as long as your account is active and for as long as needed
        to provide the Platform, comply with our legal obligations, resolve disputes, and enforce our
        agreements. When information is no longer needed, we delete or de-identify it.
      </p>

      <h2>7. Security</h2>
      <p>
        We use administrative, technical, and physical safeguards designed to protect your information.
        However, no method of transmission over the internet or method of electronic storage is
        completely secure, and we cannot guarantee absolute security.
      </p>

      <h2>8. Your Choices and Rights</h2>
      <ul>
        <li>
          <strong>Access and update.</strong> You can review and update your account information in your
          settings, or by contacting us.
        </li>
        <li>
          <strong>Communications.</strong> Providing a phone number and SMS consent is optional. You can
          opt out of SMS by replying STOP, and unsubscribe from marketing emails using the link in those
          emails. We may still send you transactional or service messages.
        </li>
        <li>
          <strong>Cookies &amp; analytics.</strong> You can accept or reject analytics cookies, or change
          your choice anytime, via &ldquo;Cookie settings&rdquo; in the footer. Essential cookies cannot
          be turned off, as the Platform needs them to run.
        </li>
        <li>
          <strong>State privacy rights.</strong> Depending on where you live (for example, California
          residents under the CCPA/CPRA), you may have rights to access, correct, delete, and obtain a
          copy of your personal information, to opt out of the &ldquo;sale&rdquo; or &ldquo;sharing&rdquo;
          of personal information, and not to be discriminated against for exercising these rights.
        </li>
      </ul>
      <p>
        To exercise any of these rights, contact us at{" "}
        <a href={`mailto:${LEGAL.privacyEmail}`}>{LEGAL.privacyEmail}</a>. We may need to verify your
        identity before responding.
      </p>

      <h2>9. Children&rsquo;s Privacy</h2>
      <p>
        The Platform is intended for users who are at least 18 years old. We do not knowingly collect
        personal information from children under 18. If you believe a child has provided us information,
        please contact us and we will take appropriate steps to delete it.
      </p>

      <h2>10. International Users and Data Location</h2>
      <p>
        We operate the Platform and may process and store information in the United States and other
        countries, which may have data-protection laws different from those in your jurisdiction. By
        using the Platform, you consent to processing in these locations.
      </p>

      <h2>11. Third-Party Links and Services</h2>
      <p>
        The Platform may contain links to third-party websites and services that we do not control. This
        Privacy Policy does not apply to those third parties, and we are not responsible for their
        practices. Please review their privacy policies.
      </p>

      <h2>12. Changes to This Privacy Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. When we do, we will revise the effective
        date above and, where appropriate, provide additional notice. Your continued use of the Platform
        after the changes take effect constitutes acceptance of the updated policy.
      </p>

      <h2>13. Contact Us</h2>
      <p>
        If you have questions about this Privacy Policy or our privacy practices, contact us at{" "}
        <a href={`mailto:${LEGAL.privacyEmail}`}>{LEGAL.privacyEmail}</a>
        {LEGAL.address ? <> or by mail at {LEGAL.address}</> : null}.
      </p>
    </>
  );
}
