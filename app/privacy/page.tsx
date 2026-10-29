import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import styles from '../legal.module.css';

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.category}>Your Privacy</div>
          <h1 className={styles.title}>Privacy Policy</h1>
          <div className={styles.updated}>Effective Date: October 2026</div>
        </div>

        <div className={styles.content}>
          <section>
            <h2>1. Information We Collect</h2>
            <p>
              To provide a safe, authentic dating and discovery platform, we collect:
            </p>
            <ul>
              <li><strong>Account Credentials:</strong> Google OAuth identifier, email address, and authentication tokens handled securely via Supabase Auth.</li>
              <li><strong>Profile Information:</strong> Display name, date of birth (for age verification), gender identity, relationship intentions, bio, interests, and profile photographs.</li>
              <li><strong>Institutional Affiliation:</strong> Selected institution, affiliation type (student, faculty, staff), department, and graduation year.</li>
              <li><strong>Interactions:</strong> Swipes (likes, passes, super likes), mutual match records, and encrypted in-app messages exchanged with mutual matches.</li>
            </ul>
          </section>

          <section>
            <h2>2. No Live GPS Tracking & Privacy by Design</h2>
            <p>
              Hinges does <strong>not</strong> track or broadcast your live GPS coordinates or exact home address. Community discovery is keyed primarily to your institutional affiliation and optional general metropolitan area.
            </p>
          </section>

          <section>
            <h2>3. Database Security & Row Level Security (RLS)</h2>
            <p>
              All profile and conversation records are protected by database-level Row Level Security policies. Messages are only accessible to the two verified participants of an active match. Third parties and unmatched users cannot query your private data.
            </p>
          </section>

          <section>
            <h2>4. Your Rights & Data Deletion</h2>
            <p>
              You maintain full control of your profile. You may edit, pause discoverability, or permanently delete your account at any time through Settings. Deleting your account purges your profile, photos, matches, and messages.
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </>
  );
}

