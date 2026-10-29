import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppNavigation } from '@/components/layout/AppNavigation';
import styles from './layout.module.css';

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  // Parallel fetch: profile, likes count, matches count (eliminates waterfall)
  const [profileRes, likesRes, matchesRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, onboarding_completed, is_admin, is_suspended')
      .eq('id', user.id)
      .single(),
    supabase
      .from('likes')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', user.id)
      .in('action_type', ['like', 'super_like']),
    supabase
      .from('matches')
      .select('id', { count: 'exact', head: true })
      .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
      .eq('status', 'active'),
  ]);

  const profile = profileRes.data;

  if (profile?.is_suspended) {
    redirect('/?error=account_suspended');
  }

  if (!profile || !profile.onboarding_completed) {
    redirect('/onboarding');
  }

  const likesCount = likesRes.count || 0;
  const matchesCount = matchesRes.count || 0;

  return (
    <div className={styles.appContainer}>
      <AppNavigation
        isAdmin={Boolean(profile?.is_admin)}
        likesCount={likesCount}
        matchesCount={matchesCount}
      />
      <main className={styles.mainContent}>{children}</main>
    </div>
  );
}
