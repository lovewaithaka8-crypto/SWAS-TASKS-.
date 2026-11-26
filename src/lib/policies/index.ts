import type { PolicyDocument } from '../../types/marketplace';
import { DEFAULT_POLICY_CATEGORIES } from './categories';
import { PART1_POLICIES } from './part1_general_accounts';
import { PART2_POLICIES } from './part2_tasks_financial';
import { PART3_POLICIES } from './part3_workplace_fraud_appeals';
import { PART4_POLICIES } from './part4_comms_privacy_referrals_staff_legal';

export { DEFAULT_POLICY_CATEGORIES };

export const DEFAULT_POLICY_DOCUMENTS: PolicyDocument[] = [
  ...PART1_POLICIES,
  ...PART2_POLICIES,
  ...PART3_POLICIES,
  ...PART4_POLICIES,
];

export const POLICY_SLUG_ALIASES: Record<string, string> = {
  terms: 'terms-and-conditions',
  'terms-of-service': 'terms-and-conditions',
  'privacy-policy': 'privacy',
  'refund-policy': 'refund',
  security: 'account-security',
  'security-policy': 'account-security',
  'user-conduct-policy': 'user-conduct',
  'task-submission-policy': 'task-submission',
  'earnings-policy': 'earnings',
  'withdrawal-policy': 'withdrawals',
  'appeals-policy': 'appeals',
  'staff-conduct-policy': 'staff-conduct',
  'cookie-policy-notice': 'cookie-policy',
  cookies: 'cookie-policy',
};

export const SIGNUP_REQUIRED_POLICY_SLUGS: string[] = [
  'terms-and-conditions',
  'privacy',
  'user-conduct',
  'earnings',
];

export function normalizePolicySlug(rawSlug: string): string {
  const cleaned = rawSlug.trim().toLowerCase().replace(/^\/+|\/+$/g, '');
  return POLICY_SLUG_ALIASES[cleaned] || cleaned;
}

export function resolvePolicyBySlug(
  policies: PolicyDocument[],
  rawSlug: string | null | undefined
): PolicyDocument | null {
  if (!rawSlug) return null;
  const normalized = normalizePolicySlug(rawSlug);
  return (
    policies.find((p) => p.slug.toLowerCase() === normalized || p.id.toLowerCase() === normalized) ||
    null
  );
}
