import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import styles from '../legal.module.css';

export default function SafetyPage() {
  return (
    <>
      <Header />
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.category}>Trust & Well-Being</div>
          <h1 className={styles.title}>Safety First at Hinges</h1>
          <div className={styles.updated}>Committed to campus and community safety</div>
        </div>

        <div className={styles.content}>
          <section>
            <h2>1. Meeting in Person on Campus</h2>
            <p>
              When meeting a match in person for the first time:
            </p>
            <ul>
              <li>Always choose a familiar, populated public location (e.g., student center, campus coffee shop, library commons).</li>
              <li>Inform a roommate or friend where you are going and who you are meeting.</li>
              <li>Arrange your own independent transportation.</li>
              <li>Keep your personal belongings and beverages in sight at all times.</li>
            </ul>
          </section>

          <section>
            <h2>2. Financial Safety & Scams</h2>
            <p>
              Never send money, share financial details, bank accounts, or cryptocurrency with anyone you meet on Hinges. Report any user who requests financial assistance or proposes investment opportunities immediately.
            </p>
          </section>

          <section>
            <h2>3. Protecting Personal Boundaries</h2>
            <p>
              Keep initial conversations on the platform until you feel completely comfortable. Avoid sharing your dorm room number, private home address, or daily routine early in conversations.
            </p>
          </section>

          <section>
            <h2>4. Reporting & Immediate Blocking</h2>
            <p>
              Every profile and chat screen provides immediate access to <strong>Block</strong> and <strong>Report</strong> tools. Blocking a user instantly breaks the match, removes access to conversations, and permanently excludes both accounts from future discovery.
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </>
  );
}

