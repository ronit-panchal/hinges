import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/profile';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Check profile state
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed, is_suspended')
          .eq('id', user.id)
          .single();

        if (profile?.is_suspended) {
          return NextResponse.redirect(
            new URL('/?error=account_suspended', requestUrl.origin)
          );
        }

        if (profile?.onboarding_completed) {
          // Existing user — go to profile
          return NextResponse.redirect(new URL('/profile', requestUrl.origin));
        } else {
          // New user — go to onboarding (or the ?next= param if explicitly set)
          return NextResponse.redirect(
            new URL(next === '/profile' ? '/onboarding' : next, requestUrl.origin)
          );
        }
      }
    }
  }

  // Return to home with error if OAuth failed
  return NextResponse.redirect(
    new URL('/?error=auth_callback_error', requestUrl.origin)
  );
}
