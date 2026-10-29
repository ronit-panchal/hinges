export type InstitutionType = 'university' | 'college' | 'academy' | 'workplace' | 'other';

export type AffiliationType = 'student' | 'faculty' | 'staff' | 'alumni' | 'other';

export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export type SwipeAction = 'like' | 'pass' | 'super_like';

export type MatchStatus = 'active' | 'unmatched' | 'blocked';

export type ReportReason = 
  | 'harassment'
  | 'impersonation'
  | 'inappropriate_content'
  | 'spam'
  | 'underage'
  | 'other';

export interface Institution {
  id: string;
  name: string;
  domain: string | null;
  institution_type: InstitutionType;
  city: string;
  country: string;
  website: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ProfilePhoto {
  id: string;
  user_id: string;
  storage_path: string;
  display_order: number;
  created_at: string;
}

export interface Interest {
  id: string;
  name: string;
  category: string;
}

export interface DiscoveryPreferences {
  min_age: number;
  max_age: number;
  genders: string[];
  intentions: string[];
}

export interface Profile {
  id: string;
  display_name: string;
  date_of_birth: string; // YYYY-MM-DD
  bio: string | null;
  height_cm: number | null;
  gender_identity: string | null;
  relationship_intentions: string[];
  discovery_preferences: DiscoveryPreferences;
  institution_id: string | null;
  affiliation_type: AffiliationType | null;
  department: string | null;
  graduation_year: number | null;
  city: string | null;
  verification_status: VerificationStatus;
  is_discoverable: boolean;
  onboarding_completed: boolean;
  is_admin: boolean;
  is_suspended: boolean;
  created_at: string;
  updated_at: string;
  
  // Relations when joined
  institution?: Institution;
  photos?: ProfilePhoto[];
  interests?: Interest[];
}

export interface Like {
  id: string;
  actor_id: string;
  recipient_id: string;
  action_type: SwipeAction;
  created_at: string;
}

export interface Match {
  id: string;
  user_a_id: string;
  user_b_id: string;
  status: MatchStatus;
  created_at: string;
  other_user?: Profile;
  conversation?: Conversation;
}

export interface Conversation {
  id: string;
  match_id: string;
  created_at: string;
  updated_at: string;
  last_message?: Message;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

export interface Block {
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  reason: ReportReason;
  details: string | null;
  status: 'pending' | 'reviewed' | 'actioned' | 'dismissed';
  created_at: string;
}

export interface AffiliationVerification {
  id: string;
  user_id: string;
  institution_id: string;
  verification_method: 'institutional_email' | 'document_upload' | 'manual';
  institutional_email: string | null;
  document_storage_path: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewer_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
}

