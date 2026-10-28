import LegalPage from "@/components/LegalPage";
import { SITE } from "@/config/site";

const Terms = () => (
  <LegalPage title="Terms of Service" updated="22 October 2026">
    <p>
      These terms govern your use of Hustle ({SITE.url}), a marketplace operated by {SITE.company} (“we”, “us”) that
      connects people who need services (“customers”) with independent service providers (“hustlers”). By creating an
      account or making a booking you agree to these terms.
    </p>

    <h2>1. What Hustle is</h2>
    <p>
      Hustle is a platform, not a service provider. Hustlers are independent and are not our employees or agents. The
      agreement for a service is between the customer and the hustler; we facilitate discovery, booking, messaging and
      payment.
    </p>

    <h2>2. Accounts</h2>
    <ul>
      <li>You must be 18 or older and give accurate information.</li>
      <li>You are responsible for activity on your account and for keeping your password secure.</li>
      <li>We may suspend accounts that break these terms or put other users at risk.</li>
    </ul>

    <h2>3. Hustler verification</h2>
    <p>
      Hustlers must submit an SA ID number, a police affidavit and a criminal record clearance before approval. We
      review these documents but cannot guarantee the conduct or quality of any hustler. Use your judgement and follow
      our safety guidance.
    </p>

    <h2>4. Bookings and payments</h2>
    <ul>
      <li>Prices are set by hustlers and shown in South African Rand (ZAR), including any applicable fees.</li>
      <li>Payments are processed by Stripe. We retain a {SITE.platformFeePercent}% platform fee from the service price; tips go in full to the hustler.</li>
      <li>All payments for bookings made through Hustle must stay on Hustle.</li>
    </ul>

    <h2>5. Cancellations and refunds</h2>
    <p>
      Customers may cancel pending bookings in the app. Where a service was not delivered as agreed, contact us within 7
      days at <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a> and we will help resolve it in line with
      the Consumer Protection Act, 68 of 2008.
    </p>

    <h2>6. Reviews and content</h2>
    <p>
      Reviews must be honest and based on a real booking. You keep ownership of content you upload, and grant us a
      licence to display it on Hustle. We may remove content that is unlawful, misleading or abusive.
    </p>

    <h2>7. Prohibited use</h2>
    <ul>
      <li>Offering illegal, unsafe or adult services.</li>
      <li>Harassment, discrimination or fraud.</li>
      <li>Circumventing fees by taking payment outside Hustle.</li>
    </ul>

    <h2>8. Liability</h2>
    <p>
      To the extent permitted by law, we are not liable for loss arising from services performed by hustlers, or for
      indirect or consequential loss. Nothing in these terms limits rights you have under South African law.
    </p>

    <h2>9. Changes and contact</h2>
    <p>
      We may update these terms and will notify you of material changes in the app. These terms are governed by the
      laws of the Republic of South Africa. Questions? Email{" "}
      <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>.
    </p>
  </LegalPage>
);

export default Terms;
