import LegalPageLayout from "../components/LegalPageLayout";
import { siteLegal } from "../config/siteLegal";

export default function PrivacyPolicyPage() {
  return (
    <LegalPageLayout
      eyebrow="Privacy Policy"
      title="Privacy Policy"
      intro={`This Privacy Policy explains how ${siteLegal.brandName} collects, uses, stores, and discloses personal information in connection with the website, calculator tools, accounts, and subscription services.`}
    >
      <p>
        <strong>Effective date:</strong> {siteLegal.effectiveDate}
        <br />
        <strong>Last updated:</strong> {siteLegal.lastUpdated}
      </p>

      <p>
        This policy applies to {siteLegal.brandName} and its related website, calculator
        tools, account features, support communications, and subscription services.
      </p>

      <h2>1. Contact details</h2>
      <p>
        For privacy questions, access requests, or complaints, contact us at{" "}
        <strong>{siteLegal.contactEmail}</strong>.
      </p>

      <h2>2. What this policy covers</h2>
      <p>
        This policy applies to personal information collected through our website,
        calculator and modelling tools, contact forms, account features, subscription
        features, customer support communications, and related services.
      </p>

      <h2>3. What information we may collect</h2>
      <p>Depending on how you use the site, we may collect information such as:</p>
      <ul>
        <li>name, business name, and contact details you provide to us;</li>
        <li>email address and account login details;</li>
        <li>information submitted through contact forms or support requests;</li>
        <li>saved setups, preferences, calculator inputs, and related usage data;</li>
        <li>subscription status, plan type, billing events, and transaction references;</li>
        <li>
          technical and usage information such as device type, browser type, pages
          viewed, approximate location, referral source, and site interactions;
        </li>
        <li>
          cookies and similar technologies used for analytics, authentication, or site
          performance.
        </li>
      </ul>

      <h2>4. Billing and payment data</h2>
      <p>
        If you subscribe to {siteLegal.brandName} Pro or purchase paid services, payment
        processing may be handled by <strong>{siteLegal.billingProvider}</strong> or another
        third-party billing provider. We generally do not store full payment card numbers
        on our own systems. We may receive limited billing information such as customer ID,
        subscription status, transaction references, billing country, renewal status, and
        similar payment-related metadata needed to operate the service.
      </p>

      <h2>5. How we collect information</h2>
      <p>We may collect information when you:</p>
      <ul>
        <li>visit or browse the website;</li>
        <li>use calculator or modelling features;</li>
        <li>create an account or sign in;</li>
        <li>save setups or preferences;</li>
        <li>join a waitlist, newsletter, or promotional list;</li>
        <li>contact us for support or business enquiries;</li>
        <li>start, manage, upgrade, downgrade, renew, or cancel a subscription.</li>
      </ul>

      <h2>6. Why we collect and use information</h2>
      <p>We may use personal information to:</p>
      <ul>
        <li>operate, maintain, and improve the site and its features;</li>
        <li>provide calculator outputs, saved setups, user accounts, and subscription access;</li>
        <li>respond to support requests and general enquiries;</li>
        <li>monitor performance, diagnose issues, and improve user experience;</li>
        <li>understand how users engage with the platform through analytics;</li>
        <li>administer billing, renewals, cancellations, and account changes;</li>
        <li>send service-related notices, legal notices, and important account communications;</li>
        <li>
          send marketing communications where permitted by law or where you have
          consented, and allow you to opt out where required.
        </li>
      </ul>

      <h2>7. Analytics, cookies, and similar tools</h2>
      <p>
        We may use analytics and similar tools to understand traffic, usage patterns,
        feature engagement, and general site performance. These tools may use cookies or
        similar technologies. You can usually control cookies through your browser
        settings, although disabling them may affect functionality.
      </p>

      <h2>8. Disclosure to third parties</h2>
      <p>
        We may disclose information to trusted service providers that help us operate the
        platform, such as hosting providers, analytics providers, authentication providers,
        database providers, email delivery providers, customer support tools, and payment
        processors. We may also disclose information:
      </p>
      <ul>
        <li>where reasonably necessary to enforce our terms or protect our rights;</li>
        <li>where required or authorised by law;</li>
        <li>
          as part of a business restructure, sale, merger, or asset transfer, subject to
          appropriate safeguards where practical.
        </li>
      </ul>

      <h2>9. Overseas disclosure</h2>
      <p>
        Some third-party service providers may store or process data outside Australia.
        By using the service, you acknowledge that your information may be transferred to
        other jurisdictions where those providers operate. We aim to use reputable
        providers and take reasonable steps to protect data handled on our behalf.
      </p>

      <h2>10. Data storage and security</h2>
      <p>
        We take reasonable steps to protect personal information from misuse,
        interference, loss, unauthorised access, modification, or disclosure. No internet
        transmission or electronic storage system is completely secure, so we cannot
        guarantee absolute security.
      </p>

      <h2>11. Data retention</h2>
      <p>
        We retain personal information for as long as reasonably necessary for the
        purposes described in this policy, including providing services, maintaining
        records, resolving disputes, meeting legal obligations, and enforcing agreements.
        We may delete or de-identify information when it is no longer reasonably required.
      </p>

      <h2>12. Access and correction</h2>
      <p>
        You may request access to personal information we hold about you and ask us to
        correct information that is inaccurate, incomplete, or out of date. We may need
        to verify your identity before processing a request.
      </p>

      <h2>13. Marketing communications</h2>
      <p>
        If you receive marketing messages from us, you can opt out using the unsubscribe
        link or by contacting us. Service-related messages about your account,
        subscription, security, or legal updates may still be sent where necessary.
      </p>

      <h2>14. Children</h2>
      <p>
        {siteLegal.brandName} is not directed to children, and we do not intentionally
        collect personal information from children through the service.
      </p>

      <h2>15. Third-party links and services</h2>
      <p>
        Our site may contain links to third-party websites or services. We are not
        responsible for the privacy practices of those third parties, and you should
        review their own policies where relevant.
      </p>

      <h2>16. Australian privacy law</h2>
      <p>
        If the Privacy Act 1988 (Cth) and the Australian Privacy Principles apply to our
        handling of personal information, we aim to manage personal information in a way
        that is consistent with those obligations.
      </p>

      <h2>17. Complaints</h2>
      <p>
        If you have a privacy concern or complaint, please contact us first at{" "}
        <strong>{siteLegal.contactEmail}</strong>. We will review the matter and respond
        within a reasonable time. If the issue cannot be resolved directly, you may have
        the right to contact the Office of the Australian Information Commissioner.
      </p>

      <h2>18. Changes to this policy</h2>
      <p>
        We may update this Privacy Policy from time to time. The latest version will be
        published on this page, and the updated date will be changed above.
      </p>
    </LegalPageLayout>
  );
}
