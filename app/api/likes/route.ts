import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch incoming likes where recipient is current user
  // and user hasn't swiped back yet
  const { data: incomingLikes, error } = await supabase
    .from('likes')
    .select(`
      id,
      action_type,
      created_at,
      actor:profiles!likes_actor_id_fkey(
        id,
        display_name,
        date_of_birth,
        bio,
        height_cm,
        gender_identity,
        relationship_intentions,
        affiliation_type,
        department,
        graduation_year,
        city,
        verification_status,
        institution:institutions(id, name, city),
        photos:profile_photos(id, storage_path, display_order),
        interests:profile_interests(interest:interests(id, name, category))
      )
    `)
    .eq('recipient_id', user.id)
    .in('action_type', ['like', 'super_like'])
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Filter out any where user already matched or passed
  const { data: mySwipes } = await supabase
    .from('likes')
    .select('recipient_id')
    .eq('actor_id', user.id);

  const swipedIds = new Set(mySwipes?.map((s) => s.recipient_id) || []);

  const pendingLikes = (incomingLikes || [])
    .filter((l: any) => l.actor && !swipedIds.has(l.actor.id))
    .map((l: any) => ({
      ...l,
      actor: {
        ...l.actor,
        photos: (l.actor.photos || []).sort((a: any, b: any) => a.display_order - b.display_order),
        interests: (l.actor.interests || []).map((i: any) => i.interest).filter(Boolean),
      },
    }));

  return NextResponse.json({ likes: pendingLikes });
}

