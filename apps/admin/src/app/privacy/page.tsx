import Link from 'next/link';
import type { Metadata } from 'next';
import s from '../legal.module.css';

export const metadata: Metadata = { title: 'Privacy Policy | Styl' };

export default function PrivacyPage() {
  return (
    <div className={s.page}>
      <div className={s.header}>
        <Link href="/" className={s.logoLink}>
          <img src="/logo.svg" alt="STYL" className={s.logoImg} />
        </Link>
        <Link href="/" className={s.backLink}>Back to Home</Link>
      </div>

      <div className={s.container}>
        <h1 className={s.title}>Privacy Policy</h1>
        <p className={s.updated}>Last updated: April 10, 2026</p>

        <p className={s.intro}>
          At Styl, your privacy matters. This Privacy Policy describes how we collect, use, share, and protect your
          personal information when you use the Styl mobile application, website, and related services. We are committed
          to transparency about our data practices and to giving you control over your information.
        </p>

        <div className={s.section}>
          <div className={s.sectionNumber}>Section 1</div>
          <h2 className={s.sectionTitle}>Information We Collect</h2>
          <p className={s.text}>We collect information in the following categories:</p>

          <p className={s.text}><strong style={{ color: '#fff' }}>Account Information:</strong> When you create an account, we collect your name,
            email address, phone number, and profile photo. Drivers additionally provide their driver&apos;s license, vehicle
            registration, insurance documents, and banking information for payouts.</p>

          <p className={s.text}><strong style={{ color: '#fff' }}>Payment Information:</strong> We collect payment card details through
            Stripe, our PCI-compliant payment processor. Styl does not store your full card number on our servers.
            Stripe handles all payment data in accordance with PCI DSS Level 1 compliance standards.</p>

          <p className={s.text}><strong style={{ color: '#fff' }}>Location Data:</strong> We collect precise GPS location data from your device
            when the app is in use. For riders, this includes pickup and dropoff locations. For drivers, this includes
            real-time location during active rides and when the driver is online and available. Location data is used
            for ride matching, navigation, fare calculation, GPS proximity verification, and safety features.</p>

          <p className={s.text}><strong style={{ color: '#fff' }}>Ride Data:</strong> We collect details about each ride including route,
            distance, duration, fare amount, tip amount, ride type, number of stops, and any flags or reports filed.</p>

          <p className={s.text}><strong style={{ color: '#fff' }}>Device Information:</strong> We collect device type, operating system,
            app version, unique device identifiers, and push notification tokens to deliver notifications and
            maintain the service.</p>

          <p className={s.text}><strong style={{ color: '#fff' }}>Communications:</strong> When you contact our support team, we collect
            the content of your messages, support tickets, and any attachments you provide.</p>
        </div>

        <div className={s.section}>
          <div className={s.sectionNumber}>Section 2</div>
          <h2 className={s.sectionTitle}>How We Use Your Information</h2>
          <p className={s.text}>We use the information we collect to:</p>
          <ul className={s.list}>
            <li className={s.listItem}>Provide, maintain, and improve the Styl platform and its features.</li>
            <li className={s.listItem}>Match riders with nearby available drivers using our matching algorithm.</li>
            <li className={s.listItem}>Process payments, calculate fares, and handle driver payouts through Stripe Connect.</li>
            <li className={s.listItem}>Enable the favorite driver feature for priority matching on future rides.</li>
            <li className={s.listItem}>Verify GPS proximity at pickup and dropoff locations to prevent abuse and ensure ride integrity.</li>
            <li className={s.listItem}>Detect and prevent fraud, fake rides, fare manipulation, and other misuse of the Platform.</li>
            <li className={s.listItem}>Send ride updates, receipts, promotional offers, and service announcements.</li>
            <li className={s.listItem}>Respond to support requests and resolve disputes.</li>
            <li className={s.listItem}>Comply with legal obligations and enforce our Terms of Service.</li>
            <li className={s.listItem}>Generate aggregated, anonymized analytics to improve our service.</li>
          </ul>
        </div>

        <div className={s.section}>
          <div className={s.sectionNumber}>Section 3</div>
          <h2 className={s.sectionTitle}>Information Sharing</h2>
          <p className={s.text}>We share your information only in the following circumstances:</p>

          <p className={s.text}><strong style={{ color: '#fff' }}>Between Riders and Drivers:</strong> When a ride is booked, riders see
            the driver&apos;s first name, vehicle details, photo, and rating. Drivers see the rider&apos;s first name, pickup
            location, and rating. Phone numbers may be masked through our communication relay.</p>

          <p className={s.text}><strong style={{ color: '#fff' }}>Payment Processors:</strong> We share necessary payment information with
            Stripe to process ride fares, tips, subscription payments, and driver payouts.</p>

          <p className={s.text}><strong style={{ color: '#fff' }}>Service Providers:</strong> We work with third-party services for
            hosting (Supabase), push notifications (Expo), mapping (Google Maps), and background checks. These providers
            only access information necessary to perform their services and are bound by contractual obligations to
            protect your data.</p>

          <p className={s.text}><strong style={{ color: '#fff' }}>Legal Requirements:</strong> We may disclose information when required by
            law, in response to legal process, or to protect the rights, safety, or property of Styl, our users, or
            the public.</p>

          <p className={s.text}><strong style={{ color: '#fff' }}>Safety Incidents:</strong> In cases involving safety concerns, accidents,
            or disputes, we may share relevant ride data and location information with law enforcement, insurance
            companies, or other parties as necessary.</p>

          <div className={s.highlight}>
            <p>
              We do not sell your personal information to third parties. We do not share your data with advertisers.
              We do not use your data for targeted advertising.
            </p>
          </div>
        </div>

        <div className={s.section}>
          <div className={s.sectionNumber}>Section 4</div>
          <h2 className={s.sectionTitle}>Location Data</h2>
          <p className={s.text}>
            Location data is central to how Styl works. We use it to connect you with nearby drivers, navigate routes,
            calculate distance-based fares, and verify GPS proximity at pickup and dropoff points.
          </p>
          <p className={s.text}>
            For riders, we collect location data only while the app is actively in use. For drivers, we collect location
            data while the driver is online (available for rides) and during active rides. We do not track your location
            when the app is closed or when a driver is offline.
          </p>
          <p className={s.text}>
            You can revoke location permissions through your device settings at any time, but this will prevent the app
            from functioning as intended.
          </p>
        </div>

        <div className={s.section}>
          <div className={s.sectionNumber}>Section 5</div>
          <h2 className={s.sectionTitle}>Data Security</h2>
          <p className={s.text}>
            We implement industry-standard security measures to protect your information:
          </p>
          <ul className={s.list}>
            <li className={s.listItem}>All data in transit is encrypted using TLS 1.2+.</li>
            <li className={s.listItem}>Data at rest is encrypted in our Supabase-hosted database with AES-256.</li>
            <li className={s.listItem}>Payment data is handled exclusively by Stripe under PCI DSS Level 1 compliance.</li>
            <li className={s.listItem}>Row Level Security (RLS) policies ensure users can only access their own data.</li>
            <li className={s.listItem}>API endpoints are authenticated and rate-limited to prevent abuse.</li>
            <li className={s.listItem}>Admin access is restricted by role-based access controls.</li>
          </ul>
          <p className={s.text}>
            No system is 100% secure. While we take reasonable measures to protect your data, we cannot guarantee absolute
            security. If we become aware of a security breach affecting your personal information, we will notify you in
            accordance with applicable law.
          </p>
        </div>

        <div className={s.section}>
          <div className={s.sectionNumber}>Section 6</div>
          <h2 className={s.sectionTitle}>Data Retention</h2>
          <p className={s.text}>
            We retain your account information for as long as your account is active. Ride history and transaction records
            are retained for 7 years to comply with financial record-keeping requirements. Support ticket data is
            retained for 3 years after resolution.
          </p>
          <p className={s.text}>
            When you deactivate your account, we will delete or anonymize your personal information within 90 days, except
            where retention is required by law or necessary for legitimate business purposes (such as resolving disputes
            or preventing fraud).
          </p>
        </div>

        <div className={s.section}>
          <div className={s.sectionNumber}>Section 7</div>
          <h2 className={s.sectionTitle}>Your Rights</h2>
          <p className={s.text}>Depending on your location, you may have the following rights:</p>
          <ul className={s.list}>
            <li className={s.listItem}><strong style={{ color: '#ddd' }}>Access:</strong> Request a copy of the personal data we hold about you.</li>
            <li className={s.listItem}><strong style={{ color: '#ddd' }}>Correction:</strong> Request correction of inaccurate personal data.</li>
            <li className={s.listItem}><strong style={{ color: '#ddd' }}>Deletion:</strong> Request deletion of your personal data, subject to legal retention requirements.</li>
            <li className={s.listItem}><strong style={{ color: '#ddd' }}>Portability:</strong> Request a machine-readable export of your data.</li>
            <li className={s.listItem}><strong style={{ color: '#ddd' }}>Opt-out:</strong> Opt out of promotional communications at any time through app settings or email unsubscribe links.</li>
            <li className={s.listItem}><strong style={{ color: '#ddd' }}>Restriction:</strong> Request that we restrict processing of your data in certain circumstances.</li>
          </ul>
          <p className={s.text}>
            To exercise any of these rights, contact us at privacy@ridestyl.com. We will respond to your request within
            30 days.
          </p>
        </div>

        <div className={s.section}>
          <div className={s.sectionNumber}>Section 8</div>
          <h2 className={s.sectionTitle}>Children&apos;s Privacy</h2>
          <p className={s.text}>
            Styl is not intended for use by individuals under 18 years of age. We do not knowingly collect personal
            information from children. If we learn that we have collected information from a child under 18, we will
            take steps to delete that information promptly.
          </p>
        </div>

        <div className={s.section}>
          <div className={s.sectionNumber}>Section 9</div>
          <h2 className={s.sectionTitle}>Cookies and Tracking</h2>
          <p className={s.text}>
            Our website uses essential cookies to maintain your session and preferences. We do not use tracking cookies,
            third-party analytics, or advertising pixels. We use Supabase authentication tokens stored in local browser
            storage for the admin panel.
          </p>
        </div>

        <div className={s.section}>
          <div className={s.sectionNumber}>Section 10</div>
          <h2 className={s.sectionTitle}>Changes to This Policy</h2>
          <p className={s.text}>
            We may update this Privacy Policy from time to time. When we make material changes, we will notify you through
            the app or by email at least 14 days before the changes take effect. The &quot;Last updated&quot; date at the top of
            this page indicates when the policy was last revised.
          </p>
        </div>

        <div className={s.contactBox}>
          <h3>Privacy questions?</h3>
          <p>
            If you have questions about this Privacy Policy or want to exercise your data rights, contact our privacy
            team at <a href="mailto:privacy@ridestyl.com">privacy@ridestyl.com</a>.
          </p>
        </div>
      </div>

      <div className={s.footer}>
        <p className={s.footerText}>2026 Styl. All rights reserved.</p>
      </div>
    </div>
  );
}
