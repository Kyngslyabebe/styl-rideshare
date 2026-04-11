import Link from 'next/link';
import type { Metadata } from 'next';
import s from '../legal.module.css';

export const metadata: Metadata = { title: 'Driver Agreement | Styl' };

export default function DriverAgreementPage() {
  return (
    <div className={s.page}>
      <div className={s.header}>
        <Link href="/" className={s.logoLink}>
          <img src="/logo.svg" alt="STYL" className={s.logoImg} />
        </Link>
        <Link href="/" className={s.backLink}>Back to Home</Link>
      </div>

      <div className={s.container}>
        <h1 className={s.title}>Driver Agreement</h1>
        <p className={s.updated}>Last updated: April 10, 2026</p>

        <p className={s.intro}>
          This Driver Agreement (&quot;Agreement&quot;) is entered into between you (&quot;Driver&quot;) and Styl (&quot;Company&quot;, &quot;we&quot;, &quot;us&quot;).
          This Agreement governs your use of the Styl platform as a driver and your relationship with the Company.
          By activating your driver account, you acknowledge that you have read, understood, and agree to be bound by
          this Agreement.
        </p>

        <div className={s.section}>
          <div className={s.sectionNumber}>Section 1</div>
          <h2 className={s.sectionTitle}>Independent Contractor Relationship</h2>
          <p className={s.text}>
            You are an independent contractor, not an employee, partner, agent, or franchisee of Styl. Nothing in this
            Agreement creates an employment relationship. You are free to determine when, where, and how long you use
            the Platform to provide rides.
          </p>
          <p className={s.text}>
            As an independent contractor, you are responsible for your own taxes, including self-employment tax, income
            tax, and any other applicable taxes. Styl will provide you with a 1099 form at the end of each tax year if
            your earnings exceed the IRS reporting threshold.
          </p>
          <p className={s.text}>
            You may engage with other rideshare or delivery platforms simultaneously. Styl does not require exclusivity.
          </p>
        </div>

        <div className={s.section}>
          <div className={s.sectionNumber}>Section 2</div>
          <h2 className={s.sectionTitle}>Eligibility Requirements</h2>
          <p className={s.text}>To drive on the Styl platform, you must:</p>
          <ul className={s.list}>
            <li className={s.listItem}>Be at least 21 years of age.</li>
            <li className={s.listItem}>Hold a valid driver&apos;s license issued in your state of residence for at least 1 year.</li>
            <li className={s.listItem}>Pass a background check conducted by our third-party screening partner. This includes a review of your driving record and criminal history.</li>
            <li className={s.listItem}>Maintain a clean driving record with no major violations (DUI, reckless driving, hit-and-run) within the past 7 years.</li>
            <li className={s.listItem}>Have no felony convictions within the past 7 years.</li>
            <li className={s.listItem}>Provide proof of legal authorization to work in the United States.</li>
          </ul>
          <p className={s.text}>
            Eligibility is verified during onboarding and may be re-verified periodically. Failure to maintain eligibility
            requirements at any time may result in suspension or deactivation.
          </p>
        </div>

        <div className={s.section}>
          <div className={s.sectionNumber}>Section 3</div>
          <h2 className={s.sectionTitle}>Vehicle Requirements</h2>
          <p className={s.text}>Your vehicle must meet the following standards:</p>
          <ul className={s.list}>
            <li className={s.listItem}>Model year 2012 or newer (10 years old or less at time of approval).</li>
            <li className={s.listItem}>Four doors with seating for at least 4 passengers.</li>
            <li className={s.listItem}>Valid vehicle registration in your name or authorized for your use.</li>
            <li className={s.listItem}>Pass a vehicle inspection confirming safe operating condition.</li>
            <li className={s.listItem}>Clean interior and exterior maintained to a professional standard.</li>
            <li className={s.listItem}>Functioning air conditioning, seat belts for all passengers, and no cosmetic damage that would concern a rider.</li>
          </ul>
          <p className={s.text}>
            Styl reserves the right to require periodic vehicle re-inspections. You are solely responsible for all vehicle
            maintenance, fuel, repairs, and operating costs.
          </p>
        </div>

        <div className={s.section}>
          <div className={s.sectionNumber}>Section 4</div>
          <h2 className={s.sectionTitle}>Subscription and Payment Terms</h2>
          <div className={s.highlight}>
            <p>
              Styl operates on a zero-commission model. Instead of taking a percentage of each ride, drivers pay a flat
              weekly subscription fee. This means you keep 100% of every fare and 100% of every tip.
            </p>
          </div>
          <p className={s.text}>Key payment terms:</p>
          <ul className={s.list}>
            <li className={s.listItem}>The weekly subscription fee is disclosed during onboarding and on the subscription management page in the app. The current rate is communicated before your first subscription charge.</li>
            <li className={s.listItem}>Subscription fees are collected weekly. If your subscription payment fails, Styl will apply a skim model where a percentage of ride earnings is withheld until the outstanding subscription balance is collected. You will be notified of this process in advance.</li>
            <li className={s.listItem}>Ride fares are deposited to your linked bank account through Stripe Connect. Payouts are processed daily for completed rides.</li>
            <li className={s.listItem}>Tips are processed and deposited alongside ride fare payouts.</li>
            <li className={s.listItem}>Styl may adjust subscription pricing with at least 30 days written notice. You may cancel your subscription at any time if you do not agree with a price change.</li>
          </ul>
        </div>

        <div className={s.section}>
          <div className={s.sectionNumber}>Section 5</div>
          <h2 className={s.sectionTitle}>Earnings and Payouts</h2>
          <p className={s.text}>
            You retain 100% of the fare for every completed ride. Fares are calculated based on the base rate, per-mile
            rate, per-minute rate, ride type multiplier, number of stops, and any applicable surge pricing. The fare
            breakdown is visible in the app after each ride.
          </p>
          <p className={s.text}>
            You also retain 100% of all tips. Tips are optional for riders and can be given in-app during or after a ride.
            Styl does not take any portion of tips under any circumstances.
          </p>
          <p className={s.text}>
            Payouts are processed through Stripe Connect to your linked bank account. Standard payout timing is 1-2
            business days. You are responsible for providing accurate banking information. Styl is not liable for delays
            caused by incorrect banking details.
          </p>
        </div>

        <div className={s.section}>
          <div className={s.sectionNumber}>Section 6</div>
          <h2 className={s.sectionTitle}>Service Standards</h2>
          <p className={s.text}>While using the Platform, you agree to:</p>
          <ul className={s.list}>
            <li className={s.listItem}>Provide safe, professional, and courteous service to all riders.</li>
            <li className={s.listItem}>Follow all applicable traffic laws and regulations.</li>
            <li className={s.listItem}>Arrive at the pickup location promptly and follow the GPS-provided route unless the rider requests otherwise.</li>
            <li className={s.listItem}>Maintain a rating of 4.5 or above. Drivers whose ratings fall below this threshold may receive a warning, coaching, or temporary suspension to allow for improvement.</li>
            <li className={s.listItem}>Accept rides fairly and not discriminate against riders based on race, gender, religion, national origin, disability, sexual orientation, or any other protected characteristic.</li>
            <li className={s.listItem}>Not drive under the influence of alcohol, drugs, or any substance that impairs your ability to drive safely.</li>
            <li className={s.listItem}>Not use your phone while driving except through hands-free, voice-activated navigation.</li>
          </ul>
        </div>

        <div className={s.section}>
          <div className={s.sectionNumber}>Section 7</div>
          <h2 className={s.sectionTitle}>Insurance Requirements</h2>
          <p className={s.text}>
            You must maintain personal auto insurance that meets or exceeds the minimum requirements in your state.
            Your insurance policy must be active at all times while you are using the Platform.
          </p>
          <p className={s.text}>
            You are responsible for understanding whether your personal insurance policy covers rideshare activity.
            Many personal auto policies exclude commercial use. You may need to purchase a rideshare endorsement or
            commercial policy. Styl is not responsible for gaps in your insurance coverage.
          </p>
          <p className={s.text}>
            Styl maintains contingent liability coverage that may provide additional protection during active rides.
            Details of this coverage are available in the app and upon request.
          </p>
        </div>

        <div className={s.section}>
          <div className={s.sectionNumber}>Section 8</div>
          <h2 className={s.sectionTitle}>Anti-Abuse Policy and GPS Verification</h2>
          <p className={s.text}>
            Styl employs automated systems to detect and prevent abuse. These systems include GPS proximity verification,
            ride pattern analysis, and behavior monitoring. Specifically:
          </p>
          <ul className={s.list}>
            <li className={s.listItem}><strong style={{ color: '#ddd' }}>Arrival Verification:</strong> You must be within 200 meters of the pickup location before marking yourself as arrived. Attempts to mark arrival from outside this radius will be flagged.</li>
            <li className={s.listItem}><strong style={{ color: '#ddd' }}>Pickup Verification:</strong> You must be within 200 meters of the pickup point before confirming passenger pickup. False pickup confirmations are flagged and may result in immediate suspension.</li>
            <li className={s.listItem}><strong style={{ color: '#ddd' }}>Dropoff Verification:</strong> You must be within 200 meters of the dropoff location before completing the ride. GPS mismatches are flagged for review.</li>
            <li className={s.listItem}><strong style={{ color: '#ddd' }}>Short Ride Detection:</strong> Rides under 2 minutes or 0.5 kilometers are automatically flagged for review to detect potential fare manipulation.</li>
            <li className={s.listItem}><strong style={{ color: '#ddd' }}>Consecutive Decline Monitoring:</strong> Declining 4 or more consecutive ride requests will automatically set your status to offline and generate a review flag. Excessive declines may indicate account sharing or system manipulation.</li>
          </ul>
          <p className={s.text}>
            Flagged events are reviewed by the Styl safety team. First-time minor flags may result in a warning.
            Repeated flags or serious violations (fake pickups, fare manipulation) may result in immediate deactivation.
          </p>
        </div>

        <div className={s.section}>
          <div className={s.sectionNumber}>Section 9</div>
          <h2 className={s.sectionTitle}>Deactivation Policy</h2>
          <p className={s.text}>Styl may temporarily suspend or permanently deactivate your driver account for:</p>
          <ul className={s.list}>
            <li className={s.listItem}>Violation of this Agreement or the Terms of Service.</li>
            <li className={s.listItem}>Sustained rating below 4.5 after a coaching period.</li>
            <li className={s.listItem}>Multiple unresolved ride flags or abuse reports.</li>
            <li className={s.listItem}>Failure to maintain eligibility, vehicle, or insurance requirements.</li>
            <li className={s.listItem}>Safety incidents, including driving under the influence or reckless behavior.</li>
            <li className={s.listItem}>Fraudulent activity, including fake rides, GPS spoofing, or account sharing.</li>
            <li className={s.listItem}>Non-payment of subscription fees after the grace period and skim collection attempts.</li>
            <li className={s.listItem}>Harassment, discrimination, or threatening behavior toward riders, other drivers, or Styl staff.</li>
          </ul>
          <p className={s.text}>
            For non-safety-related deactivations, we will provide at least 7 days notice and an opportunity to respond
            before final deactivation. Safety-related deactivations may be immediate and without prior notice.
          </p>
          <p className={s.text}>
            You may appeal a deactivation decision by contacting our support team within 30 days. Appeals are reviewed
            by a senior member of the safety team.
          </p>
        </div>

        <div className={s.section}>
          <div className={s.sectionNumber}>Section 10</div>
          <h2 className={s.sectionTitle}>Data and Privacy</h2>
          <p className={s.text}>
            Your use of the Platform is also governed by our Privacy Policy. As a driver, you acknowledge that Styl
            collects and processes your location data while you are online or on an active ride. This data is used for
            ride matching, navigation, fare calculation, and GPS verification.
          </p>
          <p className={s.text}>
            Ride data, including routes, times, and earnings, is stored and used for payment processing, dispute
            resolution, and platform improvement. You may request a copy of your data at any time.
          </p>
        </div>

        <div className={s.section}>
          <div className={s.sectionNumber}>Section 11</div>
          <h2 className={s.sectionTitle}>Limitation of Liability</h2>
          <p className={s.text}>
            Styl provides a technology platform and is not a transportation company. Styl does not direct, control,
            or supervise how you perform rides. You assume all risks associated with operating a motor vehicle and
            providing transportation services.
          </p>
          <p className={s.text}>
            To the maximum extent permitted by law, Styl shall not be liable for any damages arising from accidents,
            injuries, vehicle damage, theft, or any other incident that occurs while you are providing rides through
            the Platform.
          </p>
        </div>

        <div className={s.section}>
          <div className={s.sectionNumber}>Section 12</div>
          <h2 className={s.sectionTitle}>Termination</h2>
          <p className={s.text}>
            You may terminate this Agreement at any time by deactivating your driver account through the app or by
            contacting support. Upon termination, any pending ride earnings will be paid out according to the standard
            payout schedule. Any outstanding subscription balance remains payable.
          </p>
          <p className={s.text}>
            Styl may terminate this Agreement with 30 days written notice for any reason, or immediately in cases
            involving safety concerns, fraud, or material breach.
          </p>
        </div>

        <div className={s.section}>
          <div className={s.sectionNumber}>Section 13</div>
          <h2 className={s.sectionTitle}>Changes to This Agreement</h2>
          <p className={s.text}>
            We may update this Agreement from time to time. Material changes will be communicated through the app or
            email at least 30 days before taking effect. Continued use of the Platform after the effective date constitutes
            acceptance. If you do not agree to updated terms, you may terminate this Agreement before the changes take effect.
          </p>
        </div>

        <div className={s.section}>
          <div className={s.sectionNumber}>Section 14</div>
          <h2 className={s.sectionTitle}>Governing Law</h2>
          <p className={s.text}>
            This Agreement shall be governed by the laws of the State of Delaware, United States, without regard to
            conflict of law provisions. Disputes arising under this Agreement are subject to the dispute resolution
            procedures described in the Terms of Service.
          </p>
        </div>

        <div className={s.contactBox}>
          <h3>Questions about this agreement?</h3>
          <p>
            If you have any questions about this Driver Agreement or need clarification on any terms, contact our driver
            support team at <a href="mailto:drivers@ridestyl.com">drivers@ridestyl.com</a> or through the in-app support channel.
          </p>
        </div>
      </div>

      <div className={s.footer}>
        <p className={s.footerText}>2026 Styl. All rights reserved.</p>
      </div>
    </div>
  );
}
