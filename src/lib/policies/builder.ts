import type { PolicyDocument, PolicySection, PolicyStatus } from '../../types/marketplace';

export interface PolicySeedInput {
  slug: string;
  title: string;
  categoryId: string;
  categoryTitle: string;
  summary: string;
  version?: string;
  status?: PolicyStatus;
  effectiveDate?: string;
  lastUpdatedDate?: string;
  requiresAcceptance?: boolean;
  acceptanceContexts?: string[];
  changeSummary?: string;
  relatedPolicySlugs: string[];
  pendingAdminReviewItems?: string[];
  purpose: string;
  scope: string;
  definitions?: string[];
  rules: string[];
  exampleScenario: string;
  userObligations: string[];
  platformResponsibilities: string[];
  prohibitedConduct: string[];
  procedures: string[];
  exceptions?: string[];
  consequences: string[];
  reportingAndAppeals?: string;
  extraSections?: PolicySection[];
}

export const POLICY_BASELINE_DATE = '2026-11-01';

export function buildPolicyDocument(input: PolicySeedInput): PolicyDocument {
  const sections: PolicySection[] = [
    {
      id: 'purpose-and-scope',
      heading: '1. Purpose & Scope',
      paragraphs: [input.purpose, input.scope],
    },
  ];

  if (input.definitions && input.definitions.length > 0) {
    sections.push({
      id: 'definitions',
      heading: '2. Key Definitions',
      paragraphs: [
        'Unless the context requires otherwise, the following terms carry the meanings below across SWAS TASKS:',
      ],
      bullets: input.definitions,
    });
  }

  sections.push({
    id: 'detailed-rules',
    heading: input.definitions?.length ? '3. Detailed Rules & Operational Standards' : '2. Detailed Rules & Operational Standards',
    paragraphs: [
      `This document establishes binding operational rules for ${input.title} on SWAS TASKS. Where a specific commercial threshold or statutory parameter is marked for administrator confirmation, SWAS TASKS enforces the currently published platform configuration until formally updated.`,
    ],
    bullets: input.rules,
  });

  sections.push({
    id: 'practical-example',
    heading: input.definitions?.length ? '4. Practical Application Example' : '3. Practical Application Example',
    paragraphs: [input.exampleScenario],
  });

  sections.push({
    id: 'rights-and-obligations',
    heading: input.definitions?.length ? '5. User Obligations & Platform Responsibilities' : '4. User Obligations & Platform Responsibilities',
    paragraphs: [
      'Account holders and platform operators share clearly separated responsibilities so work, payments, and records remain verifiable:',
    ],
    bullets: [
      ...input.userObligations.map((item) => `User Obligation: ${item}`),
      ...input.platformResponsibilities.map((item) => `Platform Responsibility: ${item}`),
    ],
  });

  sections.push({
    id: 'prohibited-conduct',
    heading: input.definitions?.length ? '6. Prohibited Conduct' : '5. Prohibited Conduct',
    paragraphs: [
      'The following actions strictly violate this policy and may trigger automated security flags, manual compliance review, or account restrictions:',
    ],
    bullets: input.prohibitedConduct,
  });

  sections.push({
    id: 'procedures-and-exceptions',
    heading: input.definitions?.length ? '7. Operational Procedures & Exceptions' : '6. Operational Procedures & Exceptions',
    paragraphs: [
      'SWAS TASKS applies structured, auditable workflows when executing or granting exceptions under this policy:',
    ],
    bullets: [
      ...input.procedures.map((item) => `Procedure: ${item}`),
      ...(input.exceptions || []).map((item) => `Exception: ${item}`),
    ],
  });

  sections.push({
    id: 'consequences-and-appeals',
    heading: input.definitions?.length ? '8. Enforcement, Reporting & Appeals' : '7. Enforcement, Reporting & Appeals',
    paragraphs: [
      input.reportingAndAppeals ||
        'Users may report suspected breaches or request a formal review of any compliance action through the in-app Help & Support centre or by emailing swastaskorg@gmail.com with their account UID and relevant task, ledger, or withdrawal reference.',
    ],
    bullets: input.consequences,
  });

  if (input.extraSections && input.extraSections.length > 0) {
    sections.push(...input.extraSections);
  }

  if (input.pendingAdminReviewItems && input.pendingAdminReviewItems.length > 0) {
    sections.push({
      id: 'administrator-review-items',
      heading: 'Items Marked for Administrator Review',
      paragraphs: [
        'The following items depend on final SWAS TASKS business, legal, or regulatory configuration and are intentionally left unfabricated until finalized in the Admin Policy Manager:',
      ],
      bullets: input.pendingAdminReviewItems,
    });
  }

  return {
    id: input.slug,
    slug: input.slug,
    title: input.title,
    categoryId: input.categoryId,
    categoryTitle: input.categoryTitle,
    summary: input.summary,
    status: input.status || 'published',
    version: input.version || '1.0',
    effectiveDate: input.effectiveDate || POLICY_BASELINE_DATE,
    lastUpdatedDate: input.lastUpdatedDate || POLICY_BASELINE_DATE,
    requiresAcceptance: input.requiresAcceptance ?? false,
    acceptanceContexts: input.acceptanceContexts || [],
    changeSummary: input.changeSummary || 'Initial published SWAS TASKS governance baseline.',
    sections,
    relatedPolicySlugs: input.relatedPolicySlugs,
    pendingAdminReviewItems: input.pendingAdminReviewItems || [],
  };
}
