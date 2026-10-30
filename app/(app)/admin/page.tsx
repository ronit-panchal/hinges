'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Building2,
  AlertTriangle,
  Check,
  X,
  UserX,
  Activity,
  Users,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import styles from './admin.module.css';

interface DiagnosticsData {
  totalRegisteredUsers: number;
  completedProfiles: number;
  eligibleAdultProfiles: number;
  profilesWithInstitution: number;
  verifiedProfiles: number;
  discoverableProfiles: number;
  sameInstitutionCandidates: number;
  excludedByPreferences: number;
  excludedByBlocks: number;
  excludedAlreadySwiped: number;
  finalEligibleCandidates: number;
  exclusionReasonsBreakdown: Record<string, number>;
}

export default function AdminPage() {
  const [data, setData] = useState<{
    verifications: any[];
    requestedInstitutions: any[];
    reports: any[];
  }>({
    verifications: [],
    requestedInstitutions: [],
    reports: [],
  });

  const [diagnostics, setDiagnostics] = useState<DiagnosticsData | null>(null);
  const [diagnosticsViewer, setDiagnosticsViewer] = useState<{ display_name: string; institution_name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshingDiagnostics, setRefreshingDiagnostics] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadDiagnostics = async () => {
    try {
      setRefreshingDiagnostics(true);
      const res = await fetch('/api/admin/diagnostics');
      if (res.ok) {
        const json = await res.json();
        setDiagnostics(json.diagnostics);
        setDiagnosticsViewer(json.viewer);
      }
    } catch (err) {
      console.error('Failed to load diagnostics:', err);
    } finally {
      setRefreshingDiagnostics(false);
    }
  };

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const [adminRes] = await Promise.all([
        fetch('/api/admin'),
        loadDiagnostics(),
      ]);
      if (adminRes.ok) {
        const json = await adminRes.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleVerification = async (targetId: string, decision: 'approved' | 'rejected') => {
    try {
      setActionLoadingId(targetId);
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_affiliation',
          targetId,
          decision,
        }),
      });
      if (res.ok) {
        setData((prev) => ({
          ...prev,
          verifications: prev.verifications.filter((v) => v.id !== targetId),
        }));
      }
    } catch (err) {
      console.error('Failed to update verification:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleInstitution = async (targetId: string, decision: 'approve' | 'reject') => {
    try {
      setActionLoadingId(targetId);
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'moderate_institution',
          targetId,
          decision,
        }),
      });
      if (res.ok) {
        setData((prev) => ({
          ...prev,
          requestedInstitutions: prev.requestedInstitutions.filter((i) => i.id !== targetId),
        }));
      }
    } catch (err) {
      console.error('Failed to moderate institution:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReport = async (targetId: string, decision: 'suspend_user' | 'dismiss') => {
    try {
      setActionLoadingId(targetId);
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'moderate_report',
          targetId,
          decision,
        }),
      });
      if (res.ok) {
        setData((prev) => ({
          ...prev,
          reports: prev.reports.filter((r) => r.id !== targetId),
        }));
      }
    } catch (err) {
      console.error('Failed to moderate report:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
        Loading administrative console...
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Administration & Trust</h1>
        <p className={styles.subtitle}>
          Restricted workflow for monitoring matching engine health, reviewing affiliation verifications, directory requests, and safety reports.
        </p>
      </div>

      {/* 0. Matching Engine Diagnostics */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>
            <Activity size={20} color="var(--accent)" />
            <span>Matching Engine &amp; Discovery Diagnostics</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadDiagnostics}
            disabled={refreshingDiagnostics}
            icon={<RefreshCw size={14} className={refreshingDiagnostics ? 'animate-spin' : ''} />}
          >
            {refreshingDiagnostics ? 'Refreshing...' : 'Refresh Health'}
          </Button>
        </div>

        {diagnostics && (
          <>
            {diagnosticsViewer && (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Viewing perspective of: <strong>{diagnosticsViewer.display_name}</strong> ({diagnosticsViewer.institution_name})
              </div>
            )}

            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Registered Users</span>
                <span className={styles.statValue}>{diagnostics.totalRegisteredUsers}</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Completed Profiles</span>
                <span className={styles.statValue}>{diagnostics.completedProfiles}</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Eligible Adults (18+)</span>
                <span className={styles.statValue}>{diagnostics.eligibleAdultProfiles}</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>With Institution</span>
                <span className={styles.statValue}>{diagnostics.profilesWithInstitution}</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Same Campus Candidates</span>
                <span className={styles.statValue}>{diagnostics.sameInstitutionCandidates}</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Final Feed Candidates</span>
                <span className={[styles.statValue, styles.statHighlight].join(' ')}>
                  {diagnostics.finalEligibleCandidates}
                </span>
              </div>
            </div>

            {Object.keys(diagnostics.exclusionReasonsBreakdown).length > 0 && (
              <div className={styles.breakdownBox}>
                <strong>Exclusion Reasons Breakdown:</strong>
                <ul className={styles.breakdownList}>
                  {Object.entries(diagnostics.exclusionReasonsBreakdown).map(([reason, count]) => (
                    <li key={reason}>
                      {reason}: <strong>{count}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </section>

      {/* 1. Affiliation Verifications */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>
            <ShieldCheck size={20} color="var(--accent)" />
            <span>Pending Affiliation Verifications</span>
          </div>
          <Badge variant="neutral">{data.verifications.length} pending</Badge>
        </div>

        {data.verifications.length > 0 ? (
          <div className={styles.itemList}>
            {data.verifications.map((item) => (
              <div key={item.id} className={styles.itemCard}>
                <div className={styles.itemInfo}>
                  <span className={styles.itemName}>{item.user?.display_name || 'Member'}</span>
                  <span className={styles.itemMeta}>
                    Institution: <strong>{item.institution?.name}</strong> • Method: {item.verification_method}
                  </span>
                  {item.institutional_email && (
                    <span className={styles.itemMeta}>Email: {item.institutional_email}</span>
                  )}
                </div>

                <div className={styles.itemActions}>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={actionLoadingId === item.id}
                    onClick={() => handleVerification(item.id, 'approved')}
                    icon={<Check size={14} />}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={actionLoadingId === item.id}
                    onClick={() => handleVerification(item.id, 'rejected')}
                    icon={<X size={14} />}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            No pending affiliation requests to review.
          </p>
        )}
      </section>

      {/* 2. Institution Directory Requests */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>
            <Building2 size={20} color="var(--accent)" />
            <span>Requested Institutions</span>
          </div>
          <Badge variant="neutral">{data.requestedInstitutions.length} pending</Badge>
        </div>

        {data.requestedInstitutions.length > 0 ? (
          <div className={styles.itemList}>
            {data.requestedInstitutions.map((inst) => (
              <div key={inst.id} className={styles.itemCard}>
                <div className={styles.itemInfo}>
                  <span className={styles.itemName}>{inst.name}</span>
                  <span className={styles.itemMeta}>
                    Location: {inst.city}, {inst.country}
                  </span>
                </div>

                <div className={styles.itemActions}>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={actionLoadingId === inst.id}
                    onClick={() => handleInstitution(inst.id, 'approve')}
                    icon={<Check size={14} />}
                  >
                    Add to Directory
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={actionLoadingId === inst.id}
                    onClick={() => handleInstitution(inst.id, 'reject')}
                    icon={<X size={14} />}
                  >
                    Decline
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            No pending institution requests.
          </p>
        )}
      </section>

      {/* 3. Safety Reports */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>
            <AlertTriangle size={20} color="var(--danger)" />
            <span>Member Safety Reports</span>
          </div>
          <Badge variant="neutral">{data.reports.length} pending</Badge>
        </div>

        {data.reports.length > 0 ? (
          <div className={styles.itemList}>
            {data.reports.map((rep) => (
              <div key={rep.id} className={styles.itemCard}>
                <div className={styles.itemInfo}>
                  <span className={styles.itemName}>
                    Reported: {rep.reported_user?.display_name || 'User'}
                  </span>
                  <span className={styles.itemMeta}>
                    Reason: <strong>{rep.reason}</strong> • Reported by: {rep.reporter?.display_name || 'Member'}
                  </span>
                  {rep.details && <span className={styles.itemMeta}>Notes: &ldquo;{rep.details}&rdquo;</span>}
                </div>

                <div className={styles.itemActions}>
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={actionLoadingId === rep.id}
                    onClick={() => handleReport(rep.id, 'suspend_user')}
                    icon={<UserX size={14} />}
                  >
                    Suspend User
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={actionLoadingId === rep.id}
                    onClick={() => handleReport(rep.id, 'dismiss')}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            No outstanding reports. The community is clean!
          </p>
        )}
      </section>
    </div>
  );
}
