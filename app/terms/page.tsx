import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import styles from '../legal.module.css';

export default function TermsPage() {
  return (
    <>
      <Header />
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.category}>Legal Agreement</div>
          <h1 className={styles.title}>Terms of Service</h1>
          <div className={styles.updated}>Effective Date: October 2026</div>
        </div>

        <div className={styles.content}>
          <section>
            <h2>1. Eligibility & Adults-Only Requirement</h2>
            <p>
              Hinges is exclusively available to individuals who are at least 18 years of age. By creating an account or accessing the platform, you represent and warrant that you are at least 18 years old and legally capable of entering into this binding agreement. Any account found to belong to a minor will be terminated immediately.
            </p>
          </section>

          <section>
            <h2>2. Institution Affiliation & Community Integrity</h2>
            <p>
              Hinges operates on an institution-first discovery model. Users represent their affiliation with an educational or professional institution. You agree to provide truthful, accurate, and current information regarding your affiliation and identity. Falsifying institutional membership or attempting to access restricted communities using deceptive credentials constitutes a material breach of these terms.
            </p>
          </section>

          <section>
            <h2>3. Member Conduct & Anti-Harassment</h2>
            <p>
              We maintain zero tolerance for harassment, hate speech, non-consensual sharing of intimate material, stalking, scamming, commercial solicitation, or abusive behavior. Hinges provides reporting and blocking tools; accounts violating community safety guidelines will face immediate suspension or permanent bans.
            </p>
          </section>

          <section>
            <h2>4. Mutual Consent & Matching</h2>
            <p>
              Interactions, mutual matching, and direct messaging are governed by mutual consent. Hinges does not guarantee any specific match outcomes, dating success, or continuous uninterrupted service availability.
            </p>
          </section>

          <section>
            <h2>5. Account Termination & Data Deletion</h2>
            <p>
              You may terminate your account at any time through Account Settings. Upon termination, your profile will be immediately removed from discovery, and your data will be handled in accordance with our Privacy Policy.
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </>
  );
}

