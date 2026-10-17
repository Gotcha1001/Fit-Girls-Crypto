// app/privacy/page.tsx
import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/app/components/LegalPage";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage(): React.JSX.Element {
  return (
    <LegalPage title="Privacy Policy" updated="2 October 2026">
      <p>
        This policy explains what personal information [Business name]
        (&quot;we&quot;, &quot;us&quot;) collects when you use this site, why we
        collect it, and your rights under the Protection of Personal Information
        Act, 2013 (POPIA). We are the responsible party. Our information officer
        is [Name], reachable at [contact email].
      </p>

      <LegalSection heading="1. What we collect">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Account details:</strong> your name, email address and
            sign-in information, handled through our sign-in provider.
          </li>
          <li>
            <strong>Age confirmation:</strong> you enter your date of birth so
            we can check that you are 18 or older. We keep only the fact and
            time of confirmation, not the date of birth itself.
          </li>
          <li>
            <strong>Host applications:</strong> if you apply to become a host,
            your full name as it appears on your ID, an optional contact number,
            your message, and your confirmation that you are 18 or older. An
            admin checks your ID and we record that the check was completed.
          </li>
          <li>
            <strong>Host profile:</strong> display name, bio, profile photo,
            your rate, and payout details. Bank details are handled by our
            payment provider; we keep only the last four digits of the account
            number.
          </li>
          <li>
            <strong>Bookings and payments:</strong> booking times, durations,
            amounts and fee splits, and payment status. We never see or store
            full card numbers.
          </li>
          <li>
            <strong>Video calls:</strong> calls run through a video service
            provider. We do not record calls.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="2. Why we use it">
        <p>
          To create and secure your account, confirm you are an adult, review
          host applications, run bookings and video calls, take payments and pay
          hosts, prevent fraud and abuse, and meet our legal obligations. We do
          not sell your personal information.
        </p>
      </LegalSection>

      <LegalSection heading="3. Who else handles it">
        <p>
          We use service providers (&quot;operators&quot;) to run the site:
          sign-in (Clerk), database and server functions (Convex), video calls
          (LiveKit), payments (PayFast and Paystack), and hosting (Vercel). They
          process information only on our instructions. Some of them store data
          outside South Africa; where that happens we rely on them having
          protections comparable to POPIA. We may also disclose information when
          the law requires it.
        </p>
      </LegalSection>

      <LegalSection heading="4. How long we keep it">
        <p>
          We keep your information while your account is active and for as long
          afterwards as we need it for payment records, disputes and legal
          requirements. Host application codes are single-use, expire after 7
          days, and are stored only as a hash.
        </p>
      </LegalSection>

      <LegalSection heading="5. Your rights">
        <p>
          You may ask us to confirm what we hold about you, correct it, or
          delete it, and you may object to how we use it. To make a request, or
          to have your account and data deleted, email [contact email]. We may
          need to verify who you are first, and we may keep records we are
          legally required to keep.
        </p>
        <p>
          If you are unhappy with how we handle your information you can
          complain to the Information Regulator (South Africa) at
          inforegulator.org.za.
        </p>
      </LegalSection>

      <LegalSection heading="6. Adults only">
        <p>
          This site is for people aged 18 and over. If we learn that someone
          under 18 has an account we will close it and delete their information.
        </p>
      </LegalSection>

      <LegalSection heading="7. Changes">
        <p>
          We may update this policy. The date at the top shows the latest
          version. If a change is significant we will tell you on the site.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
