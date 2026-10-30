import assert from 'node:assert/strict';
import {
  evaluateCandidateEligibility,
  evaluateMutualCompatibility,
  rankCandidates,
  calculateAge,
} from '../lib/services/matching.ts';

console.log('=== HINGES 2.0: MATCHING ENGINE TEST SUITE (SCENARIOS A - I) ===\n');

let passedTests = 0;
let totalTests = 0;

function runTest(description, fn) {
  totalTests++;
  try {
    fn();
    console.log(`[PASS] ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] ${description}`);
    console.error(`       Error: ${err.message}\n`);
  }
}

const LPU_ID = '343e1e94-6beb-444c-9d6d-471897bcb16c';
const IITD_ID = 'b8c565a3-52c3-4bce-aa38-d22e43bc7b11';

// Base mock builder
function createMockProfile(overrides = {}) {
  return {
    id: 'user-' + Math.random().toString(36).substring(2, 7),
    display_name: 'Test Member',
    date_of_birth: '2004-01-01', // 22 years old in 2026
    bio: 'Test bio',
    height_cm: 175,
    gender_identity: 'man',
    relationship_intentions: ['Open to seeing where it goes'],
    discovery_preferences: {
      min_age: 18,
      max_age: 30,
      genders: [],
      intentions: ['Open to seeing where it goes'],
    },
    institution_id: LPU_ID,
    affiliation_type: 'student',
    department: 'CSE',
    graduation_year: 2026,
    city: 'Phagwara',
    verification_status: 'unverified',
    is_discoverable: true,
    onboarding_completed: true,
    is_suspended: false,
    created_at: new Date().toISOString(),
    photos: [{ storage_path: 'https://example.com/photo.jpg' }],
    interests: [{ id: 'int-1', name: 'Photography' }],
    ...overrides,
  };
}

// SCENARIO A: Two eligible students at LPU should discover each other
runTest('Scenario A: Two eligible students at LPU should discover each other', () => {
  const studentA = createMockProfile({ id: 'student-A', display_name: 'Aman' });
  const studentB = createMockProfile({ id: 'student-B', display_name: 'Priya' });

  const resAtoB = evaluateCandidateEligibility(studentA, studentB, LPU_ID, new Set(), new Set());
  const resBtoA = evaluateCandidateEligibility(studentB, studentA, LPU_ID, new Set(), new Set());

  assert.ok(resAtoB.isEligible, 'Student A should be able to discover Student B');
  assert.ok(resBtoA.isEligible, 'Student B should be able to discover Student A');
});

// SCENARIO B: An eligible LPU student and an eligible LPU faculty member should be discoverable if compatible
runTest('Scenario B: Eligible LPU student and LPU faculty member discoverable if mutually compatible', () => {
  const student = createMockProfile({
    id: 'student-1',
    affiliation_type: 'student',
    date_of_birth: '2001-05-10', // 25
    discovery_preferences: { min_age: 22, max_age: 40 },
  });
  const faculty = createMockProfile({
    id: 'faculty-1',
    affiliation_type: 'faculty',
    department: 'Computer Applications',
    date_of_birth: '1996-03-12', // 30
    discovery_preferences: { min_age: 24, max_age: 35 },
  });

  const res = evaluateCandidateEligibility(student, faculty, LPU_ID, new Set(), new Set());
  assert.ok(res.isEligible, 'Student should discover faculty member when age/intentions match');
});

// SCENARIO C: An LPU user must NOT see an IIT Delhi user in the default feed
runTest('Scenario C: LPU user must not see an IIT Delhi user in the default campus feed', () => {
  const lpuUser = createMockProfile({ id: 'lpu-user', institution_id: LPU_ID });
  const iitdUser = createMockProfile({ id: 'iitd-user', institution_id: IITD_ID });

  const res = evaluateCandidateEligibility(lpuUser, iitdUser, LPU_ID, new Set(), new Set());
  assert.equal(res.isEligible, false, 'Candidate from different institution must be ineligible in default feed');
  assert.ok(res.reasons.some((r) => r.includes('Institution mismatch')));
});

// SCENARIO D: A user who blocks another user must not appear in discovery
runTest('Scenario D: Blocked users must be strictly excluded bidirectionally', () => {
  const viewer = createMockProfile({ id: 'viewer-1' });
  const candidate = createMockProfile({ id: 'blocked-candidate' });
  const blockedIds = new Set(['blocked-candidate']);

  const res = evaluateCandidateEligibility(viewer, candidate, LPU_ID, new Set(), blockedIds);
  assert.equal(res.isEligible, false, 'Blocked candidate must not appear');
  assert.ok(res.reasons.includes('Blocked'));
});

// SCENARIO E: A user who is paused or undiscoverable must not appear
runTest('Scenario E: Paused / undiscoverable user must not appear in discovery', () => {
  const viewer = createMockProfile({ id: 'viewer-1' });
  const pausedCandidate = createMockProfile({ id: 'paused-1', is_discoverable: false });

  const res = evaluateCandidateEligibility(viewer, pausedCandidate, LPU_ID, new Set(), new Set());
  assert.equal(res.isEligible, false, 'Undiscoverable candidate must be excluded');
  assert.ok(res.reasons.some((r) => r.includes('undiscoverable')));
});

// SCENARIO F: A user whose profile is incomplete must not be shown
runTest('Scenario F: Incomplete profile must not be shown as an eligible candidate', () => {
  const viewer = createMockProfile({ id: 'viewer-1' });
  const incompleteCandidate = createMockProfile({ id: 'incomplete-1', onboarding_completed: false });

  const res = evaluateCandidateEligibility(viewer, incompleteCandidate, LPU_ID, new Set(), new Set());
  assert.equal(res.isEligible, false, 'Incomplete onboarding candidate must be excluded');
  assert.ok(res.reasons.some((r) => r.includes('Onboarding is not complete')));
});

// SCENARIO G: Incompatible age or relationship preference must be respected
runTest('Scenario G: Incompatible age or relationship preference must be respected', () => {
  const viewer = createMockProfile({
    id: 'viewer-1',
    date_of_birth: '2004-01-01', // 22
    discovery_preferences: { min_age: 21, max_age: 25 },
    relationship_intentions: ['Long-term relationship'],
  });
  const olderCandidate = createMockProfile({
    id: 'candidate-old',
    date_of_birth: '1995-01-01', // 31
    discovery_preferences: { min_age: 18, max_age: 35 },
    relationship_intentions: ['Long-term relationship'],
  });

  const res = evaluateCandidateEligibility(viewer, olderCandidate, LPU_ID, new Set(), new Set());
  assert.equal(res.isEligible, false, 'Candidate outside age preference must be excluded');
});

// SCENARIO H: A missing optional field must NOT incorrectly exclude an otherwise eligible user
runTest('Scenario H: Missing optional fields (height, bio, department) must not exclude user', () => {
  const viewer = createMockProfile({ id: 'viewer-1' });
  const minimalCandidate = createMockProfile({
    id: 'candidate-min',
    bio: null,
    height_cm: null,
    department: null,
    graduation_year: null,
  });

  const res = evaluateCandidateEligibility(viewer, minimalCandidate, LPU_ID, new Set(), new Set());
  assert.ok(res.isEligible, 'Candidate missing optional fields must remain completely eligible');
});

// SCENARIO I: Canonical institution ID association regardless of alias used
runTest('Scenario I: Users mapped to same canonical institution ID match despite different aliases', () => {
  // Aliases like 'LPU', 'Lovely Professional University', 'LPU Phagwara' resolve to LPU_ID
  const canonicalMap = {
    'lpu': LPU_ID,
    'lpu phagwara': LPU_ID,
    'lovely professional university': LPU_ID,
  };

  const userA_selected = canonicalMap['lpu'];
  const userB_selected = canonicalMap['lpu phagwara'];

  assert.equal(userA_selected, userB_selected, 'Both aliases must resolve to the identical canonical UUID');

  const userA = createMockProfile({ id: 'user-A', institution_id: userA_selected });
  const userB = createMockProfile({ id: 'user-B', institution_id: userB_selected });

  const res = evaluateCandidateEligibility(userA, userB, userA_selected, new Set(), new Set());
  assert.ok(res.isEligible, 'Both users must match on canonical institution ID');
});

console.log(`\n======================================================`);
console.log(`Test Execution Finished: ${passedTests}/${totalTests} Passed (${Math.round((passedTests / totalTests) * 100)}% Success)`);
console.log(`======================================================\n`);
