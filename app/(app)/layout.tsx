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
    redirect('/login');
  }

  // Fetch current user's minimal profile info for navigation
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, onboarding_completed, is_admin, is_suspended')
    .eq('id', user.id)
    .single();

  if (profile?.is_suspended) {
    redirect('/login?error=account_suspended');
  }

  if (!profile || !profile.onboarding_completed) {
    redirect('/onboarding');
  }

  // Count incoming unviewed likes
  const { count: likesCount } = await supabase
    .from('likes')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', user.id)
    .in('action_type', ['like', 'super_like']);

  // Count active matches
  const { count: matchesCount } = await supabase
    .from('matches')
    .select('id', { count: 'exact', head: true })
    .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
    .eq('status', 'active');

  return (
    <div className={styles.appContainer}>
      <AppNavigation
        isAdmin={Boolean(profile?.is_admin)}
        likesCount={likesCount || 0}
        matchesCount={matchesCount || 0}
      />
      <main className={styles.mainContent}>{children}</main>
    </div>
  );
}

