// app/terms/page.tsx
import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/app/components/LegalPage";

export const metadata: Metadata = { title: "Terms of Use" };

export default function TermsPage(): React.JSX.Element {
  return (
    <LegalPage title="Terms of Use" updated="2 October 2026">
      <p>
        These terms apply when you use this site, operated by [Business name]
        (&quot;we&quot;, &quot;us&quot;). By creating an account you agree to
        them. If you do not agree, please do not use the site.
      </p>

      <LegalSection heading="1. Who can use the site">
        <p>
          You must be 18 or older. We may ask you to confirm your age and, for
          hosts, to have your ID checked before your account is activated. You
          must give accurate information and keep your sign-in details safe.
        </p>
      </LegalSection>

      <LegalSection heading="2. Account types">
        <p>
          <strong>Clients</strong> browse hosts and book paid video calls.{" "}
          <strong>Hosts</strong> offer video calls. A host account is opened by
          applying, passing an admin review, and entering a single-use
          activation code. Hosts are independent and are not our employees.
          Admins manage the site and cannot book calls.
        </p>
      </LegalSection>

      <LegalSection heading="3. Bookings, payments and fees">
        <p>
          The price of a booking is set by the host&apos;s per-minute rate and
          shown before you pay. A booking is confirmed once payment succeeds. We
          keep a platform fee of 20% of each paid booking and the host receives
          the rest. Payments are processed by third-party providers.
        </p>
        <p>
          Cancellations, no-shows and refunds: [describe your policy here, for
          example how late a client can cancel for a full refund, and what
          happens if a host does not show up].
        </p>
      </LegalSection>

      <LegalSection heading="4. Prohibited content">
        <p>You may not upload, show or share anything that:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>is illegal, or involves or depicts anyone under 18;</li>
          <li>is non-consensual, exploitative, or shows violence or abuse;</li>
          <li>infringes someone else&apos;s rights or privacy;</li>
          <li>[add your rules on nudity and sexual content here].</li>
        </ul>
      </LegalSection>

      <LegalSection heading="5. Prohibited conduct">
        <ul className="list-disc space-y-1 pl-5">
          <li>Harassing, threatening, or pressuring another person.</li>
          <li>
            Recording, screenshotting or sharing a call without everyone&apos;s
            consent.
          </li>
          <li>
            Arranging payment or meetings outside the site to avoid fees, or
            asking anyone to meet in person through the site.
          </li>
          <li>Impersonating someone, or using a false identity or age.</li>
          <li>Trying to break, probe or misuse the site or other accounts.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="6. Suspension and removal">
        <p>
          We may suspend or close an account, cancel bookings and withhold
          payouts where these terms are broken, where we suspect fraud or abuse,
          or where the law requires it. You can ask us to close your account at
          any time.
        </p>
      </LegalSection>

      <LegalSection heading="7. Liability">
        <p>
          The site is provided as is. To the extent the law allows, we are not
          liable for indirect or consequential loss, or for what users say or
          do. Nothing in these terms limits rights you have under the Consumer
          Protection Act that cannot be limited.
        </p>
      </LegalSection>

      <LegalSection heading="8. General">
        <p>
          These terms are governed by the laws of South Africa. We may update
          them, and the date above shows the latest version. Continuing to use
          the site after a change means you accept it. Questions: [contact
          email]. How we handle personal information is explained in our{" "}
          <a href="/privacy" className="underline">
            Privacy Policy
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
