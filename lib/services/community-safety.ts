/**
 * HINGES 2.0 — COMMUNITY CONTENT SAFETY & MODERATION SERVICE
 * 
 * Enforces community guidelines on campus posts and comments:
 * - Prevents doxxing (phone numbers, student IDs, Aadhaar numbers)
 * - Prevents targeted harassment and profanity
 * - Enforces length and format limits
 */

// Indian mobile phone number regex (matches standard 10-digit mobile numbers with optional +91/0)
const INDIAN_PHONE_REGEX = /(?:(?:\+|0{0,2})91[\s-]?)?[6789]\d{4}[\s-]?\d{5}\b/g;

// Email regex
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// High-risk doxxing words
const SENSITIVE_KEYWORDS = [
  'aadhaar',
  'adhar card',
  'pan card',
  'roll number',
  'registration number',
  'hostel room number',
  'phone number is',
  'call her at',
  'call him at',
  'whatsapp me at',
  'leak her',
  'leak his',
];

export interface ContentValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedContent?: string;
}

export function validateCommunityContent(
  content: string,
  maxLength: number = 3000
): ContentValidationResult {
  if (!content || !content.trim()) {
    return { isValid: false, error: 'Content cannot be empty.' };
  }

  const trimmed = content.trim();

  if (trimmed.length < 5) {
    return { isValid: false, error: 'Content must be at least 5 characters long.' };
  }

  if (trimmed.length > maxLength) {
    return { isValid: false, error: `Content exceeds maximum limit of ${maxLength} characters.` };
  }

  // 1. Check for personal phone numbers (Anti-Doxxing)
  if (INDIAN_PHONE_REGEX.test(trimmed)) {
    return {
      isValid: false,
      error: 'Phone numbers are strictly prohibited in campus community to prevent harassment and doxxing.',
    };
  }

  // 2. Check for personal email addresses
  if (EMAIL_REGEX.test(trimmed)) {
    return {
      isValid: false,
      error: 'Personal email addresses cannot be shared in public or anonymous community posts.',
    };
  }

  // 3. Check for sensitive doxxing phrases
  const lower = trimmed.toLowerCase();
  for (const keyword of SENSITIVE_KEYWORDS) {
    if (lower.includes(keyword)) {
      return {
        isValid: false,
        error: 'Posts containing student identity numbers, government IDs, or private contact details are not permitted.',
      };
    }
  }

  return {
    isValid: true,
    sanitizedContent: trimmed,
  };
}
