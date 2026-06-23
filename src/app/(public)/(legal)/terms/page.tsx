import type { Metadata } from "next";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms of Service | Hommy",
  description:
    "The terms that govern your use of the Hommy platform, including our role as a marketplace, fees, disclaimers, and dispute resolution.",
};

export default function TermsOfServicePage() {
  return (
    <>
      <h1>Terms of Service</h1>
      <p className="lead text-muted-foreground">Effective date: {LEGAL.effectiveDate}</p>

      <p>
        These Terms of Service (&ldquo;Terms&rdquo;) are a binding agreement between you and{" "}
        {LEGAL.entity} (&ldquo;{LEGAL.brand},&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or
        &ldquo;our&rdquo;) and govern your access to and use of the website at{" "}
        <a href={LEGAL.url}>{LEGAL.site}</a> and the related online platform that connects homeowners
        (&ldquo;Homeowners&rdquo;) with independent home-services contractors (&ldquo;Contractors&rdquo;)
        (together, the &ldquo;Platform&rdquo;). By accessing or using the Platform, you agree to these
        Terms and to our{" "}
        <a href="/privacy">Privacy Policy</a>. If you do not agree, do not use the Platform.
      </p>
      <p>
        <strong>
          These Terms contain disclaimers of warranties, a limitation of liability, and (in Section 15)
          provisions governing how disputes are resolved. Please read them carefully.
        </strong>
      </p>

      <h2>1. The Platform and Our Role</h2>
      <p>
        {LEGAL.brand} operates an online marketplace that helps Homeowners find, communicate with, and
        hire independent third-party Contractors.{" "}
        <strong>
          {LEGAL.brand} is not a contractor or home-services provider and is not a party to any
          agreement between a Homeowner and a Contractor.
        </strong>{" "}
        We do not perform, manage, supervise, inspect, guarantee, or warrant any work, and we do not
        employ Contractors &mdash; they are independent businesses solely responsible for the services
        they offer and provide. Any contract for services is solely between the Homeowner and the
        Contractor. Information we provide (such as ratings, reviews, or verification badges) is offered
        to help you make decisions but is not a guarantee or endorsement.
      </p>

      <h2>2. Eligibility and Accounts</h2>
      <p>
        You must be at least 18 years old and able to form a legally binding contract to use the
        Platform. You agree to provide accurate, current, and complete information and to keep it
        updated. You are responsible for safeguarding your account credentials and for all activity that
        occurs under your account. Notify us promptly of any unauthorized use.
      </p>

      <h2>3. Homeowners</h2>
      <p>
        When you submit a job request, you authorize us to share your request with matched Contractors
        and, when a Contractor engages your lead or you hire a Contractor, to share your contact
        information with that Contractor. You are responsible for evaluating Contractors, independently
        verifying their licensing and insurance, agreeing on scope, price, and schedule directly with
        them, and using reasonable care for your own safety and property. {LEGAL.brand} does not
        guarantee the availability, quality, timing, legality, or outcome of any Contractor&rsquo;s
        services.
      </p>

      <h2>4. Contractors</h2>
      <p>
        If you use the Platform as a Contractor, you represent and warrant that you and your business
        hold all licenses, registrations, permits, bonds, and insurance required to offer and perform
        the services you list, and that you will comply with all applicable laws, including licensing,
        consumer-protection, and home-improvement contractor laws. You are an independent business;
        nothing in these Terms creates an employment, agency, partnership, joint-venture, or franchise
        relationship with {LEGAL.brand}. You are solely responsible for your quotes, pricing, the work
        you perform, and your dealings with Homeowners, and for all applicable taxes.
      </p>

      <h2>5. Credits, Fees, and Payments</h2>
      <p>
        The Platform operates on a credit-based model. Receiving leads is generally free; Contractors
        spend credits to engage a lead and when a Homeowner accepts their quote, and subscription plans
        may grant monthly credits and features. The applicable credit costs, plan terms, and fees are
        described within the Platform and may change from time to time. Except where required by law or
        expressly stated otherwise at the time of a transaction,{" "}
        <strong>credits and fees are non-refundable.</strong> Plan-granted credits may expire at the end
        of a billing cycle; purchased credits are subject to the terms presented at the time of
        purchase. You are responsible for any taxes associated with your use of the Platform.
      </p>

      <h2>6. Reviews and User Content</h2>
      <p>
        You retain ownership of the content you submit, including job details, photos, messages, quotes,
        and reviews (&ldquo;User Content&rdquo;). You grant {LEGAL.brand} a worldwide, non-exclusive,
        royalty-free, transferable, and sublicensable license to host, store, reproduce, display,
        adapt, and use your User Content to operate, provide, promote, and improve the Platform. You
        represent and warrant that you own or have the necessary rights to your User Content and that it
        is accurate, lawful, and does not infringe any third-party rights or contain defamatory,
        deceptive, or unlawful material. Reviews must reflect a genuine experience. We may review,
        moderate, edit, refuse, or remove content at our discretion, but we are not obligated to.
      </p>

      <h2>7. Messaging and SMS</h2>
      <p>
        The Platform includes in-app messaging and may send transactional notifications by email, SMS
        text message, and push notification. By providing your mobile number and opting in, you consent
        to receive automated transactional text messages from {LEGAL.brand}. Message and data rates may
        apply; message frequency varies. Reply STOP to opt out or HELP for help. See our{" "}
        <a href="/privacy#sms">Privacy Policy</a> for details on how we handle messaging information.
      </p>

      <h2>8. Acceptable Use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>use the Platform for any unlawful, fraudulent, or deceptive purpose;</li>
        <li>misrepresent your identity, qualifications, licensing, or insurance;</li>
        <li>harass, threaten, or harm other users;</li>
        <li>post content that is unlawful, infringing, defamatory, or misleading;</li>
        <li>
          scrape, copy, reverse engineer, or interfere with the Platform, its security, or its
          infrastructure; or
        </li>
        <li>send spam or unsolicited communications through the Platform.</li>
      </ul>

      <h2>9. Off-Platform Transactions</h2>
      <p>
        Using the Platform to find a Homeowner or Contractor and then arranging payment or transacting
        off the Platform in order to avoid applicable fees is a breach of these Terms and may result in
        suspension or termination of your account.
      </p>

      <h2>10. Third-Party Services</h2>
      <p>
        The Platform relies on third-party services, including Twilio, Stripe, Google, Cloudinary,
        Supabase, and Resend. Your use of features powered by these services may be subject to their
        respective terms, and we are not responsible for third-party services or their availability.
      </p>

      <h2>11. Intellectual Property</h2>
      <p>
        The Platform, including its software, design, text, graphics, logos, and trademarks (excluding
        User Content), is owned by {LEGAL.brand} or its licensors and is protected by intellectual
        property laws. Subject to these Terms, we grant you a limited, revocable, non-exclusive,
        non-transferable license to access and use the Platform for its intended purpose. You may not
        use our trademarks without our prior written permission.
      </p>

      <h2>12. Disclaimers</h2>
      <p>
        THE PLATFORM IS PROVIDED ON AN &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; BASIS WITHOUT
        WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING THE IMPLIED WARRANTIES
        OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. {LEGAL.brand}{" "}
        DOES NOT WARRANT THE QUALITY, SAFETY, LICENSING, INSURANCE, OR LEGALITY OF ANY CONTRACTOR OR
        THEIR WORK, THE TRUTH OR ACCURACY OF ANY LISTING, REVIEW, OR USER CONTENT, OR THAT THE PLATFORM
        WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE. ANY DEALINGS BETWEEN A HOMEOWNER AND A CONTRACTOR
        ARE SOLELY AT THEIR OWN RISK.
      </p>

      <h2>13. Limitation of Liability</h2>
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, {LEGAL.brand.toUpperCase()} AND ITS OFFICERS, DIRECTORS,
        EMPLOYEES, AND AGENTS WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL,
        EXEMPLARY, OR PUNITIVE DAMAGES, OR FOR ANY LOSS OF PROFITS, REVENUE, DATA, OR GOODWILL, ARISING
        OUT OF OR RELATING TO YOUR USE OF (OR INABILITY TO USE) THE PLATFORM OR ANY DEALINGS WITH A
        HOMEOWNER OR CONTRACTOR, WHETHER BASED IN CONTRACT, TORT, OR ANY OTHER THEORY, EVEN IF ADVISED OF
        THE POSSIBILITY OF SUCH DAMAGES. TO THE MAXIMUM EXTENT PERMITTED BY LAW, OUR TOTAL AGGREGATE
        LIABILITY FOR ALL CLAIMS RELATING TO THE PLATFORM WILL NOT EXCEED THE GREATER OF (A) THE TOTAL
        AMOUNTS YOU PAID TO {LEGAL.brand.toUpperCase()} IN THE TWELVE (12) MONTHS BEFORE THE EVENT GIVING
        RISE TO THE CLAIM, OR (B) ONE HUNDRED U.S. DOLLARS (US $100). SOME JURISDICTIONS DO NOT ALLOW
        CERTAIN LIMITATIONS, SO SOME OF THE ABOVE MAY NOT APPLY TO YOU.
      </p>

      <h2>14. Indemnification</h2>
      <p>
        You agree to defend, indemnify, and hold harmless {LEGAL.brand} and its officers, directors,
        employees, and agents from and against any claims, liabilities, damages, losses, and expenses
        (including reasonable attorneys&rsquo; fees) arising out of or related to your use of the
        Platform, your User Content, your violation of these Terms or applicable law, or your dealings
        with any Homeowner or Contractor.
      </p>

      <h2>15. Governing Law and Dispute Resolution</h2>
      <p>
        These Terms are governed by the laws of the State of {LEGAL.governingState}, without regard to
        its conflict-of-law rules.
      </p>
      <p>
        <strong>Informal resolution.</strong> Before filing a claim, you agree to try to resolve the
        dispute informally by contacting us at{" "}
        <a href={`mailto:${LEGAL.legalEmail}`}>{LEGAL.legalEmail}</a>; we will try to do the same. If a
        dispute is not resolved within 30 days, either party may pursue the remedies below.
      </p>
      <p>
        <strong>Binding arbitration; class-action waiver.</strong> Except for disputes that qualify for
        small-claims court and claims for injunctive relief relating to intellectual property, any
        dispute arising out of or relating to these Terms or the Platform will be resolved by final and
        binding individual arbitration administered under the rules of a recognized arbitration provider,
        rather than in court.{" "}
        <strong>
          You and {LEGAL.brand} waive any right to a jury trial and to participate in a class action or
          representative proceeding.
        </strong>{" "}
        If this class-action waiver is found unenforceable, the remainder of this Section 15 will be
        void. Nothing here prevents either party from seeking relief in small-claims court for qualifying
        claims.
      </p>

      <h2>16. Termination</h2>
      <p>
        We may suspend or terminate your access to the Platform at any time, with or without notice, if
        you violate these Terms or to protect the Platform or its users. You may stop using the Platform
        at any time. Sections that by their nature should survive termination (including Sections 5, 6,
        and 11&ndash;15) will survive.
      </p>

      <h2>17. Changes to These Terms</h2>
      <p>
        We may modify these Terms from time to time. When we do, we will update the effective date above
        and, where appropriate, provide additional notice. Your continued use of the Platform after the
        changes take effect constitutes acceptance of the revised Terms.
      </p>

      <h2>18. Miscellaneous</h2>
      <p>
        These Terms and the Privacy Policy are the entire agreement between you and {LEGAL.brand}{" "}
        regarding the Platform. If any provision is found unenforceable, the remaining provisions will
        remain in effect. Our failure to enforce any right is not a waiver. You may not assign these
        Terms without our consent; we may assign them in connection with a merger, acquisition, or sale
        of assets. We are not liable for failures or delays caused by events beyond our reasonable
        control.
      </p>

      <h2>19. Contact Us</h2>
      <p>
        Questions about these Terms? Contact us at{" "}
        <a href={`mailto:${LEGAL.legalEmail}`}>{LEGAL.legalEmail}</a>
        {LEGAL.address ? <> or by mail at {LEGAL.address}</> : null}.
      </p>
    </>
  );
}
