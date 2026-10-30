'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Building2, MapPin, ArrowRight, Compass, Users } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Institution, InstitutionType } from '@/lib/types/database';
import styles from './explore.module.css';

const TYPE_FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'All Institutions' },
  { value: 'university', label: 'Universities' },
  { value: 'college', label: 'Colleges' },
  { value: 'academy', label: 'Academies' },
  { value: 'workplace', label: 'Workplaces' },
];

export default function ExplorePage() {
  const router = useRouter();
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadInstitutions() {
      try {
        setLoading(true);
        const res = await fetch('/api/institutions');
        const data = await res.json();
        if (res.ok) {
          setInstitutions(data.institutions || []);
        }
      } catch (err) {
        console.error('Failed to load institutions:', err);
      } finally {
        setLoading(false);
      }
    }
    loadInstitutions();
  }, []);

  const filteredInstitutions = institutions.filter((inst) => {
    const matchesQuery =
      inst.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inst.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inst.country.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType =
      selectedType === 'all' || inst.institution_type === selectedType;

    return matchesQuery && matchesType;
  });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Explore Institutions</h1>
        <p className={styles.subtitle}>
          Discover compatible members across our approved collegiate and university network. Browsing another institution shows eligible members of that community intentionally without modifying your permanent affiliation.
        </p>
      </div>

      <div className={styles.searchFilters}>
        <Input
          placeholder="Search by institution name, city or country..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          icon={<Search size={18} />}
        />

        <div className={styles.typePills}>
          {TYPE_FILTERS.map((type) => (
            <button
              key={type.value}
              type="button"
              className={[
                styles.typePill,
                selectedType === type.value ? styles.active : '',
              ].join(' ')}
              onClick={() => setSelectedType(type.value)}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Loading institutions directory...
        </div>
      ) : filteredInstitutions.length > 0 ? (
        <div className={styles.institutionList}>
          {filteredInstitutions.map((inst) => (
            <div key={inst.id} className={styles.institutionCard}>
              <div className={styles.instInfo}>
                <h3 className={styles.instName}>{inst.name}</h3>
                <div className={styles.instMeta}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <MapPin size={14} />
                    <span>{inst.city}, India</span>
                  </span>
                  <Badge variant="neutral">
                    {inst.institution_type.charAt(0).toUpperCase() + inst.institution_type.slice(1)}
                  </Badge>
                  {(inst as { memberCount?: number }).memberCount !== undefined && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.78rem', color: 'var(--accent)', fontWeight: 500 }}>
                      <Users size={13} />
                      {(inst as { memberCount?: number }).memberCount! > 0
                        ? `${(inst as { memberCount?: number }).memberCount} active`
                        : 'New campus'}
                    </span>
                  )}
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                icon={<ArrowRight size={16} />}
                onClick={() => {
                  router.push(`/discover?exploreInstitutionId=${inst.id}`);
                }}
              >
                Browse Members
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <Building2 size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
          <p>No institutions match your search criteria.</p>
        </div>
      )}
    </div>
  );
}

