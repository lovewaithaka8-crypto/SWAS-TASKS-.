import type { PolicyCategory } from '../../types/marketplace';

export const DEFAULT_POLICY_CATEGORIES: PolicyCategory[] = [
  {
    id: 'platform-general',
    code: 'A',
    slug: 'platform-general',
    title: 'Platform & General Rules',
    description:
      'Foundational terms, acceptable use, community standards, legal notices, disclaimers, and definitions governing SWAS TASKS.',
    order: 1,
    enabled: true,
  },
  {
    id: 'accounts-registration',
    code: 'B',
    slug: 'accounts-registration',
    title: 'Accounts & Registration',
    description:
      'Rules for registration, identity verification, account ownership, security hygiene, deactivation, closure, and recovery.',
    order: 2,
    enabled: true,
  },
  {
    id: 'tasks-work',
    code: 'C',
    slug: 'tasks-work',
    title: 'Tasks & Work',
    description:
      'Operational standards covering bidding, task acceptance, quality, accuracy, deadlines, submissions, revisions, and cancellations.',
    order: 3,
    enabled: true,
  },
  {
    id: 'earnings-financial',
    code: 'D',
    slug: 'earnings-financial',
    title: 'Earnings, Payments & Withdrawals',
    description:
      'Multi-currency wallet isolation, pending vs. approved earnings, payout gateways, mobile money, banking, crypto, fees, and disputes.',
    order: 4,
    enabled: true,
  },
  {
    id: 'workplaces-departments',
    code: 'E',
    slug: 'workplaces-departments',
    title: 'Workplaces & Departments',
    description:
      'Access controls, productivity expectations, confidentiality, monitoring boundaries, and department governance for active workplaces.',
    order: 5,
    enabled: true,
  },
  {
    id: 'fraud-security',
    code: 'F',
    slug: 'fraud-security',
    title: 'Fraud, Security & Protection',
    description:
      'Anti-cheating, bot prevention, multiple-account detection, VPN rules, cybersecurity controls, investigations, and enforcement penalties.',
    order: 6,
    enabled: true,
  },
  {
    id: 'suspensions-appeals',
    code: 'G',
    slug: 'suspensions-appeals',
    title: 'Suspensions, Violations & Appeals',
    description:
      'Graduated enforcement, warnings, violation points, account restrictions, permanent bans, formal appeals, and reinstatement procedures.',
    order: 7,
    enabled: true,
  },
  {
    id: 'communication-support',
    code: 'H',
    slug: 'communication-support',
    title: 'Communication & Support',
    description:
      'Official email (swastaskorg@gmail.com), SMS/WhatsApp notices, support tickets, response expectations, and respectful conduct.',
    order: 8,
    enabled: true,
  },
  {
    id: 'data-privacy',
    code: 'I',
    slug: 'data-privacy',
    title: 'Data & Privacy',
    description:
      'Personal data collection, processing, retention, deletion, third-party processors, breach response, and user privacy rights.',
    order: 9,
    enabled: true,
  },
  {
    id: 'referrals-promotions',
    code: 'J',
    slug: 'referrals-promotions',
    title: 'Referrals, Rewards & Promotions',
    description:
      'Governance for referral programs, bonus eligibility, promotional campaigns, commissions, reward cancellations, and abuse prevention.',
    order: 10,
    enabled: true,
  },
  {
    id: 'staff-administration',
    code: 'K',
    slug: 'staff-administration',
    title: 'Staff, Agents, Reviewers & Administrators',
    description:
      'Codes of conduct, access controls, internal confidentiality, conflict of interest, abuse prevention, and audit accountability.',
    order: 11,
    enabled: true,
  },
  {
    id: 'legal-disputes',
    code: 'L',
    slug: 'legal-disputes',
    title: 'Legal & Disputes',
    description:
      'Governing law, dispute resolution, mediation/arbitration, liability limits, force majeure, intellectual property, and policy amendments.',
    order: 12,
    enabled: true,
  },
];
