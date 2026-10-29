import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import styles from '../legal.module.css';

export default function CommunityGuidelinesPage() {
  return (
    <>
      <Header />
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.category}>Community Standards</div>
          <h1 className={styles.title}>Community Guidelines</h1>
          <div className={styles.updated}>Building a respectful, human community</div>
        </div>

        <div className={styles.content}>
          <section>
            <h2>1. Authentic Representation</h2>
            <p>
              Be yourself. Use your own authentic, recent photos and truthful biographical information. Impersonation of students, professors, staff, or celebrities is strictly prohibited.
            </p>
          </section>

          <section>
            <h2>2. Respectful Communication</h2>
            <p>
              Treat every person with courtesy and respect. Sexual harassment, unsolicited explicit media, hate speech, body shaming, and threats of violence have no place on Hinges and result in immediate ban without appeal.
            </p>
          </section>

          <section>
            <h2>3. Zero Fake Profiles & No Commercial Promotion</h2>
            <p>
              Hinges is strictly for personal connections and social discovery. You may not advertise businesses, sell goods or services, promote adult content subscription services, or post spam links.
            </p>
          </section>

          <section>
            <h2>4. Consent is Non-Negotiable</h2>
            <p>
              Respect when someone passes or unmatches. Do not attempt to evade blocks or locate other members across other campus platforms without their clear consent.
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </>
  );
}

