import LegalPage from "@/components/LegalPage";
import { SITE } from "@/config/site";

const Privacy = () => (
  <LegalPage title="Privacy Policy" updated="22 October 2026">
    <p>
      {SITE.company} (“we”) is the responsible party for personal information processed through Hustle. We process
      personal information in line with the Protection of Personal Information Act, 4 of 2013 (POPIA).
    </p>

    <h2>Information we collect</h2>
    <ul>
      <li><strong>Account details</strong> — name, email address, phone number and profile photo.</li>
      <li><strong>Hustler verification</strong> — SA ID number, police affidavit and criminal record clearance, stored in private, access-controlled storage.</li>
      <li><strong>Location</strong> — your approximate location, only if you allow it, to show nearby hustlers.</li>
      <li><strong>Bookings, messages and reviews</strong> you create on Hustle.</li>
      <li><strong>Payment information</strong> — handled by Stripe. We never see or store full card numbers.</li>
    </ul>

    <h2>How we use it</h2>
    <ul>
      <li>To run the marketplace: matching, bookings, messaging and payments.</li>
      <li>To verify hustlers and keep the community safe.</li>
      <li>To provide support and send important service messages.</li>
      <li>To improve Hustle, using aggregated and de-identified data where possible.</li>
    </ul>

    <h2>Who we share it with</h2>
    <p>
      We share only what's needed: the hustler or customer you book with, our payment processor (Stripe), and our
      hosting and database providers. We do not sell personal information.
    </p>

    <h2 id="popia">Your rights under POPIA</h2>
    <ul>
      <li>Ask what personal information we hold about you and request a copy.</li>
      <li>Ask us to correct or delete your information.</li>
      <li>Object to processing, including direct marketing.</li>
      <li>Lodge a complaint with the Information Regulator (inforegulator.org.za).</li>
    </ul>
    <p>
      To exercise these rights, email <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>.
    </p>

    <h2>Retention and security</h2>
    <p>
      We keep information only as long as needed for the purposes above or as required by law, and protect it with
      access controls, encryption in transit and row-level security on our database.
    </p>

    <h2>Cookies and local storage</h2>
    <p>
      We use essential browser storage to keep you signed in and remember preferences such as theme and saved hustlers.
      We don't use advertising cookies.
    </p>
  </LegalPage>
);

export default Privacy;
