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

  // Verify caller is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 1. Pending affiliation verifications
  const { data: verifications } = await supabase
    .from('affiliation_verifications')
    .select(`
      id,
      user_id,
      verification_method,
      institutional_email,
      status,
      created_at,
      user:profiles!affiliation_verifications_user_id_fkey(display_name, affiliation_type),
      institution:institutions(name)
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  // 2. Pending institution directory requests
  const { data: requestedInstitutions } = await supabase
    .from('institutions')
    .select('id, name, city, country, website, created_at')
    .eq('is_active', false)
    .order('created_at', { ascending: false });

  // 3. Pending reports
  const { data: reports } = await supabase
    .from('reports')
    .select(`
      id,
      reason,
      details,
      status,
      created_at,
      reporter:profiles!reports_reporter_id_fkey(display_name),
      reported_user:profiles!reports_reported_user_id_fkey(id, display_name, is_suspended)
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  return NextResponse.json({
    verifications: verifications || [],
    requestedInstitutions: requestedInstitutions || [],
    reports: reports || [],
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { action, targetId, decision, notes } = await request.json();

    if (action === 'verify_affiliation') {
      // decision: 'approved' | 'rejected'
      const { data: verif } = await supabase
        .from('affiliation_verifications')
        .update({
          status: decision,
          reviewer_notes: notes || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', targetId)
        .select('user_id')
        .single();

      if (verif && decision === 'approved') {
        // Upgrade profile to verified
        await supabase
          .from('profiles')
          .update({ verification_status: 'verified' })
          .eq('id', verif.user_id);
      } else if (verif && decision === 'rejected') {
        await supabase
          .from('profiles')
          .update({ verification_status: 'rejected' })
          .eq('id', verif.user_id);
      }

      return NextResponse.json({ success: true, message: `Verification ${decision}` });
    }

    if (action === 'moderate_institution') {
      // decision: 'approve' | 'reject'
      if (decision === 'approve') {
        await supabase
          .from('institutions')
          .update({ is_active: true })
          .eq('id', targetId);
      } else {
        await supabase.from('institutions').delete().eq('id', targetId);
      }
      return NextResponse.json({ success: true, message: `Institution ${decision}d` });
    }

    if (action === 'moderate_report') {
      // decision: 'suspend_user' | 'dismiss'
      const { data: report } = await supabase
        .from('reports')
        .select('reported_user_id')
        .eq('id', targetId)
        .single();

      if (decision === 'suspend_user' && report) {
        await supabase
          .from('profiles')
          .update({ is_suspended: true, is_discoverable: false })
          .eq('id', report.reported_user_id);

        await supabase
          .from('reports')
          .update({ status: 'actioned' })
          .eq('id', targetId);
      } else {
        await supabase
          .from('reports')
          .update({ status: 'dismissed' })
          .eq('id', targetId);
      }

      return NextResponse.json({ success: true, message: 'Report resolved' });
    }

    return NextResponse.json({ error: 'Unknown admin action' }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Admin action failed' },
      { status: 500 }
    );
  }
}

