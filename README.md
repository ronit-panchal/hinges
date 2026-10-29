# Hinges — Closer Connections Start Here

> **Production-Ready Institution-Based Dating & Social Discovery Web App**  
> Built with Next.js (App Router), React 19, TypeScript, Supabase Auth (Google OAuth), Supabase PostgreSQL with Row Level Security (RLS), Supabase Storage, and custom editorial design system.

---

## 1. System Requirements & Node.js

- **Node.js:** v18.18+ or v20+ / v22+ / v24+
- **Package Manager:** `npm` (v10+ / v11+)
- **Operating System:** Cross-platform (Windows, macOS, Linux)

---

## 2. Quick Start & Local Development

### Step 1: Clone or navigate to the repository
```bash
cd Hinges
```

### Step 2: Install dependencies
```bash
npm install
```

### Step 3: Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Update `.env.local` with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-publishable-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Step 4: Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 3. Supabase Project Setup & Database Migrations

### Step 1: Create a Supabase Project
1. Log in to [Supabase Dashboard](https://supabase.com/dashboard).
2. Click **New Project**, choose an organization, set a database password, and select your preferred region.

### Step 2: Run Database Migrations
1. In the Supabase Dashboard, navigate to the **SQL Editor** tab.
2. Open the file [`supabase/migrations/001_initial_schema.sql`](file:///c:/Users/HP/OneDrive/Desktop/Hinges/supabase/migrations/001_initial_schema.sql).
3. Paste the entire contents into the SQL Editor and click **Run**.
4. This script sets up:
   - Tables: `institutions`, `profiles`, `profile_photos`, `interests`, `profile_interests`, `likes`, `matches`, `conversations`, `messages`, `blocks`, `reports`, `affiliation_verifications`.
   - Foreign key constraints, unique constraints, and performance indexes.
   - Comprehensive Row Level Security (RLS) policies on all user-facing tables.
   - Guard triggers ensuring non-admin users cannot promote themselves or bypass verification.
   - The atomic stored procedure `handle_swipe(p_recipient_id, p_action_type)`.
   - Initial reference taxonomy (colleges and interest categories).

### Step 3: Configure Supabase Storage Bucket
1. In the Supabase Dashboard, go to **Storage** -> **New Bucket**.
2. Create a bucket named: `profile-photos`.
3. Set **Public Bucket** to `true` (for public read access to uploaded profile photos).
4. Save the bucket.

---

## 4. Google OAuth Authentication Setup

Hinges uses Supabase Auth connected to Google Cloud OAuth 2.0.

### Step 1: Create OAuth Client in Google Cloud Console
1. Navigate to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project or select an existing one.
3. Configure the **OAuth Consent Screen**:
   - User Type: **External**.
   - App Name: `Hinges`.
   - User Support Email & Developer Contact Email.
   - Scopes: `openid`, `email`, `profile`.
4. Create **Credentials** -> **OAuth Client ID**:
   - Application Type: **Web Application**.
   - Name: `Hinges Web Client`.
   - Authorized JavaScript Origins:
     - `http://localhost:3000` (for local development)
     - `https://your-production-domain.com` (for production)
   - Authorized Redirect URIs:
     - `https://<YOUR-SUPABASE-PROJECT-ID>.supabase.co/auth/v1/callback`
5. Copy your **Client ID** and **Client Secret**.

### Step 2: Configure Google Provider in Supabase
1. In the Supabase Dashboard, navigate to **Authentication** -> **Providers**.
2. Expand the **Google** provider toggle.
3. Enable **Google Enabled**.
4. Paste the **Client ID** and **Client Secret** obtained from Google Cloud.
5. In **Authentication** -> **URL Configuration**, set:
   - **Site URL:** `http://localhost:3000` (or your production URL).
   - **Redirect URLs:** Add `http://localhost:3000/auth/callback` and `https://your-production-domain.com/auth/callback`.

---

## 5. Architectural Security & Business Rules

### 1. Default Discovery Isolation (Most Critical Rule)
- The default feed at `/discover` is strictly locked to the authenticated user's verified institution (`institution_id = current_user.institution_id`).
- Members of other colleges (even geographically adjacent universities) will **never** appear in the default feed.
- The Explore page (`/explore`) allows intentional browsing of partner institutions without mutating the user's permanent home institution.

### 2. Strict Real Data Guarantee
- Hinges does not employ mock users, simulated match counts, or fabricated testimonials.
- If no profiles exist in a given campus feed, an honest empty state is shown with constructive actions (e.g. adjust discovery preferences or explore partner universities).

### 3. Atomic Swiping & Match Creation
- The PostgreSQL RPC function `handle_swipe` executes in an atomic transaction:
  - If a reciprocal like or super-like exists, the match record (`matches`) and conversation (`conversations`) are created in the same database transaction.
  - Race conditions and duplicate match states are prevented by the canonical order constraint `user_a_id < user_b_id`.

### 4. Row Level Security & Privacy
- Profile updates are protected by database triggers: non-admin users cannot promote themselves to `is_admin: true` or `verification_status: 'verified'`.
- Private messages are readable only by the two participants of an active mutual match.

---

## 6. Running Automated Tests

Run the security and logic test suite:
```bash
node test/run-tests.mjs
```
The automated test suite verifies:
- 18+ age requirement and DOB verification.
- Zod schema boundary validation.
- Strict institution isolation enforcement.
- Atomic swipe and mutual match creation.
- RLS participant-only message authorization.
- Bidirectional block exclusions.
- Privilege elevation protection.

---

## 7. Account Deletion & Retention Policy

When a user deletes their account from **Settings -> Delete Account**:
- All personal records (profile, photos, swipes, active matches, conversations, and messages) are permanently removed in a cascading database delete.
- Security and moderation reports are retained in an anonymized state for legitimate safety auditing and compliance purposes.

