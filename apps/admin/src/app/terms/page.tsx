import Link from 'next/link';
import type { Metadata } from 'next';
import s from '../legal.module.css';

export const metadata: Metadata = { title: 'Terms of Service | Styl' };

export default function TermsPage() {
  return (
    <div className={s.page}>
      <div className={s.header}>
        <Link href="/" className={s.logoLink}>
          <img src="/logo.svg" alt="STYL" className={s.logoImg} />
        </Link>
        <Link href="/" className={s.backLink}>Back to Home</Link>
      </div>

      <div className={s.container}>
        <h1 className={s.title}>Terms of Service</h1>
        <p className={s.updated}>Last updated: April 10, 2026</p>

        <p className={s.intro}>
          Welcome to Styl. These Terms of Service (&quot;Terms&quot;) govern your access to and use of the Styl mobile application,
          website, and related services (collectively, the &quot;Platform&quot;). By creating an account or using the Platform, you agree
          to be bound by these Terms. If you do not agree, do not use the Platform.
        </p>

        <div className={s.section}>
          <div className={s.sectionNumber}>Section 1</div>
          <h2 className={s.sectionTitle}>Description of Service</h2>
          <p className={s.text}>
            Styl is a technology platform that connects riders seeking transportation with independent drivers who provide
            rides using their own vehicles. Styl does not provide transportation services directly. Styl operates on a
            zero-commission model where drivers pay a flat weekly subscription fee and retain 100% of ride fares earned
            through the Platform.
          </p>
          <p className={s.text}>
            The Platform facilitates ride booking, real-time GPS tracking, driver-rider matching, in-app payments,
            tipping, multi-stop routing, and a favorite driver system for priority matching.
          </p>
        </div>

        <div className={s.section}>
          <div className={s.sectionNumber}>Section 2</div>
          <h2 className={s.sectionTitle}>Eligibility and Accounts</h2>
          <p className={s.text}>
            You must be at least 18 years old to create a Styl account. By registering, you represent that all information
            you provide is accurate, current, and complete. You are responsible for maintaining the confidentiality of your
            account credentials and for all activity that occurs under your account.
          </p>
          <p className={s.text}>
            We reserve the right to suspend or terminate accounts that violate these Terms, contain fraudulent information,
            or engage in activity that threatens the safety or integrity of the Platform.
          </p>
        </div>

        <div className={s.section}>
          <div className={s.sectionNumber}>Section 3</div>
          <h2 className={s.sectionTitle}>Rider Terms</h2>
          <p className={s.text}>As a rider on Styl, you agree to the following:</p>
          <ul className={s.list}>
            <li className={s.listItem}>You will provide an accurate pickup location and destination before booking a ride.</li>
            <li className={s.listItem}>You will be present at the pickup location within a reasonable time after your driver arrives.</li>
            <li className={s.listItem}>You will treat drivers with respect and refrain from any abusive, threatening, or discriminatory behavior.</li>
            <li className={s.listItem}>You are responsible for the conduct of any passengers you add to your ride.</li>
            <li className={s.listItem}>You agree to pay the fare displayed at the time of booking, plus any applicable fees, tolls, or wait-time charges.</li>
            <li className={s.listItem}>You will not ask drivers to violate traffic laws, exceed speed limits, or engage in unsafe driving practices.</li>
            <li className={s.listItem}>Cancellations are subject to the cancellation policy described in Section 6.</li>
          </ul>
        </div>

        <div className={s.section}>
          <div className={s.sectionNumber}>Section 4</div>
          <h2 className={s.sectionTitle}>Driver Terms</h2>
          <p className={s.text}>
            Drivers on Styl are independent contractors, not employees. The Driver Agreement, available separately,
            governs the full terms of the driver relationship. Key provisions include:
          </p>
          <ul className={s.list}>
            <li className={s.listItem}>Drivers must maintain a valid driver&apos;s license, vehicle registration, and insurance as required by local law.</li>
            <li className={s.listItem}>Drivers must pass a background check before being approved to drive on the Platform.</li>
            <li className={s.listItem}>Drivers pay a weekly subscription fee to access the Platform. The subscription amount is disclosed during onboarding and may be adjusted with 30 days notice.</li>
            <li className={s.listItem}>Drivers retain 100% of all ride fares and 100% of all tips received through the Platform.</li>
            <li className={s.listItem}>Drivers must comply with all anti-abuse policies including GPS verification at pickup and dropoff locations.</li>
          </ul>
        </div>

        <div className={s.section}>
          <div className={s.sectionNumber}>Section 5</div>
          <h2 className={s.sectionTitle}>Payments and Fees</h2>
          <p className={s.text}>
            All payments are processed through Stripe, our third-party payment processor. By using the Platform, you
            authorize Styl and Stripe to charge your saved payment method for ride fares, tips, fees, and any other
            charges incurred through your use of the Platform.
          </p>
          <div className={s.highlight}>
            <p>
              Styl does not take a commission or percentage from ride fares. Riders pay the fare shown at booking.
              Drivers receive 100% of the fare. Styl&apos;s revenue comes exclusively from driver subscription fees.
            </p>
          </div>
          <p className={s.text}>
            Fares are calculated based on base rate, distance, duration, ride type, number of stops, and any applicable
            surge pricing. Estimated fares are shown before booking. Final fares may differ if the route, duration,
            or stops change during the ride.
          </p>
          <p className={s.text}>
            Tips are optional, 100% voluntary, and go entirely to the driver. Styl does not take any portion of tips.
          </p>
        </div>

        <div className={s.section}>
          <div className={s.sectionNumber}>Section 6</div>
          <h2 className={s.sectionTitle}>Cancellation Policy</h2>
          <p className={s.text}>
            Riders may cancel a ride at any time. Cancellation fees may apply depending on when the cancellation occurs:
          </p>
          <ul className={s.list}>
            <li className={s.listItem}>Cancellations within 2 minutes of booking: no charge.</li>
            <li className={s.listItem}>Cancellations after the driver has been en route for more than 2 minutes: a cancellation fee may be charged to compensate the driver for their time and fuel.</li>
            <li className={s.listItem}>No-shows (rider is not at pickup after a reasonable wait): full cancellation fee applies.</li>
          </ul>
          <p className={s.text}>
            Drivers may also cancel rides under certain circumstances. Excessive cancellations by either party may result
            in account review or restriction.
          </p>
        </div>

        <div className={s.section}>
          <div className={s.sectionNumber}>Section 7</div>
          <h2 className={s.sectionTitle}>Safety and Conduct</h2>
          <p className={s.text}>
            Styl employs GPS verification technology to confirm that drivers are physically present at pickup and dropoff
            locations. This system is designed to prevent fare manipulation, fake rides, and other forms of abuse.
          </p>
          <p className={s.text}>Users of the Platform agree not to:</p>
          <ul className={s.list}>
            <li className={s.listItem}>Engage in any form of harassment, discrimination, violence, or threats.</li>
            <li className={s.listItem}>Use the Platform for any illegal purpose or to transport illegal substances.</li>
            <li className={s.listItem}>Attempt to manipulate fares, ratings, or the matching system.</li>
            <li className={s.listItem}>Create multiple accounts or use another person&apos;s account.</li>
            <li className={s.listItem}>Interfere with or disrupt the Platform or its underlying technology.</li>
            <li className={s.listItem}>Use automated systems, bots, or scripts to interact with the Platform.</li>
          </ul>
          <p className={s.text}>
            Violations of safety and conduct policies may result in immediate account suspension or permanent deactivation.
          </p>
        </div>

        <div className={s.section}>
          <div className={s.sectionNumber}>Section 8</div>
          <h2 className={s.sectionTitle}>Intellectual Property</h2>
          <p className={s.text}>
            The Styl name, logo, app design, and all associated content are the intellectual property of Styl and its
            licensors. You may not copy, modify, distribute, or create derivative works from any part of the Platform
            without prior written consent.
          </p>
          <p className={s.text}>
            By submitting content to the Platform (such as reviews, ratings, or feedback), you grant Styl a non-exclusive,
            royalty-free, worldwide license to use, display, and distribute that content in connection with the Platform.
          </p>
        </div>

        <div className={s.section}>
          <div className={s.sectionNumber}>Section 9</div>
          <h2 className={s.sectionTitle}>Limitation of Liability</h2>
          <p className={s.text}>
            Styl provides a technology platform that connects riders with drivers. Styl is not a transportation provider
            and does not guarantee the availability, quality, or safety of any ride.
          </p>
          <p className={s.text}>
            To the maximum extent permitted by law, Styl shall not be liable for any indirect, incidental, special,
            consequential, or punitive damages arising from your use of the Platform. This includes, without limitation,
            damages for lost profits, data loss, personal injury, or property damage.
          </p>
          <p className={s.text}>
            Styl&apos;s total liability for any claim arising from your use of the Platform shall not exceed the amount you
            paid to Styl in the 12 months preceding the event giving rise to the claim.
          </p>
        </div>

        <div className={s.section}>
          <div className={s.sectionNumber}>Section 10</div>
          <h2 className={s.sectionTitle}>Dispute Resolution</h2>
          <p className={s.text}>
            Any dispute arising from or relating to these Terms or your use of the Platform shall first be attempted to
            be resolved through informal negotiation. If the dispute cannot be resolved informally within 30 days, either
            party may initiate binding arbitration in accordance with the rules of the American Arbitration Association.
          </p>
          <p className={s.text}>
            You agree to resolve disputes on an individual basis and waive any right to participate in a class action
            lawsuit or class-wide arbitration.
          </p>
        </div>

        <div className={s.section}>
          <div className={s.sectionNumber}>Section 11</div>
          <h2 className={s.sectionTitle}>Termination</h2>
          <p className={s.text}>
            You may deactivate your account at any time through the app settings. Styl may suspend or terminate your
            account at any time for violation of these Terms or for any other reason with reasonable notice, except in
            cases involving safety concerns or fraud, where immediate action may be taken.
          </p>
          <p className={s.text}>
            Upon termination, your right to use the Platform ceases immediately. Any outstanding payment obligations
            survive termination.
          </p>
        </div>

        <div className={s.section}>
          <div className={s.sectionNumber}>Section 12</div>
          <h2 className={s.sectionTitle}>Changes to These Terms</h2>
          <p className={s.text}>
            We may update these Terms from time to time. When we make material changes, we will notify you through the
            app or by email at least 14 days before the changes take effect. Your continued use of the Platform after
            the effective date constitutes acceptance of the updated Terms.
          </p>
        </div>

        <div className={s.section}>
          <div className={s.sectionNumber}>Section 13</div>
          <h2 className={s.sectionTitle}>Governing Law</h2>
          <p className={s.text}>
            These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, United States,
            without regard to its conflict of law provisions.
          </p>
        </div>

        <div className={s.contactBox}>
          <h3>Questions about these terms?</h3>
          <p>
            If you have any questions or concerns about these Terms of Service, please contact us at{' '}
            <a href="mailto:legal@ridestyl.com">legal@ridestyl.com</a> or through the contact form on our website.
          </p>
        </div>
      </div>

      <div className={s.footer}>
        <p className={s.footerText}>2026 Styl. All rights reserved.</p>
      </div>
    </div>
  );
}
