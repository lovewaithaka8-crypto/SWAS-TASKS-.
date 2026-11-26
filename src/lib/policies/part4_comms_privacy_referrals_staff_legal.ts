import type { PolicyDocument } from '../../types/marketplace';
import { buildPolicyDocument } from './builder';

const CAT_H = { id: 'communication-support', title: 'Communication & Support' };
const CAT_I = { id: 'data-privacy', title: 'Data & Privacy' };
const CAT_J = { id: 'referrals-promotions', title: 'Referrals, Rewards & Promotions' };
const CAT_K = { id: 'staff-administration', title: 'Staff, Agents, Reviewers & Administrators' };
const CAT_L = { id: 'legal-disputes', title: 'Legal & Disputes' };

export const PART4_POLICIES: PolicyDocument[] = [
  // =========================================================================
  // H. COMMUNICATION & SUPPORT (9 POLICIES)
  // =========================================================================
  buildPolicyDocument({
    slug: 'email-communication',
    title: 'Email Communication Policy',
    categoryId: CAT_H.id,
    categoryTitle: CAT_H.title,
    summary:
      'Establishes swastaskorg@gmail.com as the sole official SWAS TASKS email identity across the website and Central Control Centre.',
    relatedPolicySlugs: ['notifications-policy', 'support-helpdesk', 'legal-notice'],
    purpose:
      'Protects users from phishing and guarantees uniform official sender attribution across all platform email categories.',
    scope:
      'Applies to registration, verification, password reset, login security, task, bid, payment, withdrawal, support, announcement, and staff emails.',
    rules: [
      'All official SWAS TASKS emails use Platform Name "SWAS TASKS", Official Email "swastaskorg@gmail.com", and Reply-To "swastaskorg@gmail.com".',
      'Transactional email logs are recorded honestly in /emailLogs with true status (sent, failed, or not_configured); unconfigured SMTP never claims false delivery.',
    ],
    exampleScenario:
      'When a Worker submits a withdrawal request, any email confirmation is dispatched strictly from SWAS TASKS <swastaskorg@gmail.com> if SMTP credentials are active.',
    userObligations: [
      'Check sender address authenticity before trusting urgent account or payment messages.',
    ],
    platformResponsibilities: [
      'Maintain SPF/DKIM/DMARC guidance and Central Control Centre delivery audit logs.',
    ],
    prohibitedConduct: [
      'Spoofing swastaskorg@gmail.com or impersonating SWAS TASKS support via unofficial email domains.',
    ],
    procedures: [
      'Configure optional email preferences in Account Settings; report suspicious emails to swastaskorg@gmail.com.',
    ],
    consequences: [
      'Email spoofing or spam abuse results in immediate permanent ban.',
    ],
  }),

  buildPolicyDocument({
    slug: 'sms-phone-communication',
    title: 'SMS and Phone Communication Policy',
    categoryId: CAT_H.id,
    categoryTitle: CAT_H.title,
    summary:
      'Governs optional phone number collection, anti-phishing voice/SMS boundaries, and off-platform call restrictions.',
    relatedPolicySlugs: ['whatsapp-communication', 'email-communication', 'privacy'],
    pendingAdminReviewItems: [
      '[Administrator Review Required]: Confirm whether automated transactional SMS alerts will be integrated and specify opt-out/carrier consent rules.',
    ],
    purpose:
      'Clarifies when phone numbers are stored and protects users against unauthorized voice or SMS solicitation.',
    scope:
      'Applies to private phone numbers stored in /users/{uid} and any future SMS/phone outreach.',
    rules: [
      'Phone numbers stored in Account Settings remain private and are never published on public profiles or open task listings.',
      'SWAS TASKS staff never call or text asking for your password, OTP codes, or private keys.',
    ],
    exampleScenario:
      'A Worker saves their M-Pesa phone number in private Payout Accounts; Clients browsing the Worker profile never see that number.',
    userObligations: [
      'Keep private phone numbers accurate if used for mobile money payouts.',
    ],
    platformResponsibilities: [
      'Isolate phone numbers inside owner-only Firestore documents.',
    ],
    prohibitedConduct: [
      'Pressuring counterparties to move task disputes onto unrecorded phone calls.',
    ],
    procedures: [
      'Update or remove optional profile phone numbers anytime in Account Settings.',
    ],
    consequences: [
      'Unsolicited phone harassment using leaked data violates User Conduct rules.',
    ],
  }),

  buildPolicyDocument({
    slug: 'whatsapp-communication',
    title: 'WhatsApp Communication Policy',
    categoryId: CAT_H.id,
    categoryTitle: CAT_H.title,
    summary:
      'Defines boundaries for WhatsApp messaging, unofficial chat risks, and official channel verification.',
    relatedPolicySlugs: ['sms-phone-communication', 'workplace-communication', 'email-communication'],
    pendingAdminReviewItems: [
      '[Administrator Review Required]: Confirm whether an official verified SWAS TASKS WhatsApp Business support number will be published.',
    ],
    purpose:
      'Prevents impersonation scams and clarifies that official marketplace agreements remain anchored inside SWAS TASKS.',
    scope:
      'Applies to any external WhatsApp interaction referencing SWAS TASKS tasks or support.',
    rules: [
      'Task assignments, deliverable approvals, and payment confirmations must occur inside SWAS TASKS—not informal external WhatsApp chats.',
      'Unless an official WhatsApp number is explicitly published inside the Help & Support centre, no unverified WhatsApp contact speaks for SWAS TASKS.',
    ],
    exampleScenario:
      'Someone claiming to be a "SWAS TASKS agent" asks via personal WhatsApp for an activation fee to release earnings. Under this policy, that is a scam to report immediately.',
    userObligations: [
      'Keep task revisions, approvals, and support tickets inside official SWAS TASKS routes.',
    ],
    platformResponsibilities: [
      'Clearly publish any officially authorized support channels inside the Support centre.',
    ],
    prohibitedConduct: [
      'Soliciting advance fees or impersonating SWAS TASKS staff on WhatsApp.',
    ],
    procedures: [
      'Report impersonators via Help & Support or swastaskorg@gmail.com.',
    ],
    consequences: [
      'Impersonation or advance-fee scams trigger immediate permanent bans.',
    ],
  }),

  buildPolicyDocument({
    slug: 'notifications-policy',
    title: 'Notification Policy',
    categoryId: CAT_H.id,
    categoryTitle: CAT_H.title,
    summary:
      'Governs real-time in-app alerts for bids, assignments, deliverables, payments, security events, and material policy updates.',
    relatedPolicySlugs: ['announcements-policy', 'email-communication', 'account-security'],
    purpose:
      'Ensures users receive timely alerts for critical workspace and compliance events without spam.',
    scope:
      'Covers /notifications records covering bids, assignments, approvals, payments, security alerts, and policy updates.',
    rules: [
      'Security alerts and mandatory policy update notifications cannot be bypassed when affecting account compliance.',
      'Users may customize optional bid, message, and payment alert toggles inside Account Settings.',
    ],
    exampleScenario:
      'When an Administrator publishes a material change to the Withdrawal Policy, affected users receive a real policy_update notification linking directly to the revised document.',
    userObligations: [
      'Review unread notifications promptly, especially security and policy update alerts.',
    ],
    platformResponsibilities: [
      'Emit authentic Firestore notifications backed by verified user/admin triggers.',
    ],
    prohibitedConduct: [
      'Sending forged or spam notifications across user accounts.',
    ],
    procedures: [
      'Open Notifications view in Workspace -> Mark individual or all notifications read.',
    ],
    consequences: [
      'Only Super Administrators may create policy_update notifications under Firestore rules.',
    ],
  }),

  buildPolicyDocument({
    slug: 'announcements-policy',
    title: 'Announcement Policy',
    categoryId: CAT_H.id,
    categoryTitle: CAT_H.title,
    summary:
      'Governs official platform-wide announcements, policy update bulletins, and maintenance notices issued by Administrators.',
    relatedPolicySlugs: ['notifications-policy', 'changes-to-terms', 'email-communication'],
    purpose:
      'Separates authoritative SWAS TASKS announcements from unverified user rumors.',
    scope:
      'Applies to Policy Updates feed entries, Central Control Centre circulars, and system maintenance notices.',
    rules: [
      'Official announcements are authored strictly by authorized Administrators and logged with effective dates and change summaries.',
      'General announcements may be mirrored to swastaskorg@gmail.com circulars when email delivery is configured.',
    ],
    exampleScenario:
      'When a new regional bank payout rail launches or a policy version bumps from 1.0 to 1.1, the Policy Updates tab displays the official change summary and effective date.',
    userObligations: [
      'Read policy and maintenance announcements affecting active work or withdrawals.',
    ],
    platformResponsibilities: [
      'Keep announcement history transparent and dated.',
    ],
    prohibitedConduct: [
      'Publishing fake "platform shutdown" or "emergency payout migration" rumors.',
    ],
    procedures: [
      'Check the Policy Updates section inside the Legal & Policies Centre or Workspace.',
    ],
    consequences: [
      'Spreading fabricated platform announcements violates Community Standards.',
    ],
  }),

  buildPolicyDocument({
    slug: 'support-helpdesk',
    title: 'Support and Helpdesk Policy',
    categoryId: CAT_H.id,
    categoryTitle: CAT_H.title,
    summary:
      'Explains authenticated ticket submission, required details, official email fallback, and support scope boundaries.',
    relatedPolicySlugs: ['response-time', 'support-misconduct', 'complaint-resolution'],
    purpose:
      'Enables fast, traceable assistance for task, payment, account, and policy questions.',
    scope:
      'Applies to the in-app Help & Support ticket desk and official email swastaskorg@gmail.com.',
    rules: [
      'Support tickets link automatically to the user UID so staff can verify tasks, bids, and ledger references safely.',
      'Tickets cover four categories: Tasks & Bids, Payments & Wallet, Account & Security, and General.',
    ],
    exampleScenario:
      'A Worker opens a Payments & Wallet ticket referencing withdrawal WD-176042 and receives traceable support assistance.',
    userObligations: [
      'Include clear subject lines, reference IDs, and honest descriptions.',
    ],
    platformResponsibilities: [
      'Route tickets cleanly and never ask for passwords or private keys.',
    ],
    prohibitedConduct: [
      'Ticket flooding or falsifying urgent security claims.',
    ],
    procedures: [
      'Open Help & Support -> Choose category -> Describe issue with IDs -> Submit ticket.',
    ],
    consequences: [
      'Abusive or spam ticket behavior incurs support channel restrictions.',
    ],
  }),

  buildPolicyDocument({
    slug: 'response-time',
    title: 'Response Time Policy',
    categoryId: CAT_H.id,
    categoryTitle: CAT_H.title,
    summary:
      'Transparently sets expectations for support, payout verification, and appeal review handling without fabricated SLA guarantees.',
    relatedPolicySlugs: ['support-helpdesk', 'appeals', 'payment-processing'],
    pendingAdminReviewItems: [
      '[Administrator Review Required]: Confirm formal target response-time SLAs (hours/business days) per support tier and finance payout queue.',
    ],
    purpose:
      'Avoids misleading response-time promises while clarifying triage priorities.',
    scope:
      'Applies to Support tickets, compliance appeals, and manual finance payout checks.',
    rules: [
      'Account security incidents and compromised-account reports receive top triage priority.',
      'Exact SLA hour commitments are intentionally flagged for formal Administrator confirmation rather than fabricated.',
    ],
    exampleScenario:
      'A suspected account takeover ticket is prioritized ahead of a routine profile display inquiry.',
    userObligations: [
      'Avoid opening duplicate tickets for the same inquiry while awaiting triage.',
    ],
    platformResponsibilities: [
      'Communicate honestly if high volume or third-party bank delays affect review times.',
    ],
    prohibitedConduct: [
      'Repeatedly bumping tickets with empty replies to jump queues.',
    ],
    procedures: [
      'Priority order: Security Incidents -> Active Payout/Dispute Escalations -> General Inquiries.',
    ],
    consequences: [
      'Duplicate spam tickets may be merged or closed.',
    ],
  }),

  buildPolicyDocument({
    slug: 'professional-communication',
    title: 'Professional Communication Policy',
    categoryId: CAT_H.id,
    categoryTitle: CAT_H.title,
    summary:
      'Etiquette standards for clear, courteous, bias-free communication between Clients, Workers, and SWAS TASKS personnel.',
    relatedPolicySlugs: ['user-conduct', 'workplace-communication', 'support-misconduct'],
    purpose:
      'Maintains respectful dialogue even during disagreements over revisions, deadlines, or payments.',
    scope:
      'Applies to all written communications across SWAS TASKS.',
    rules: [
      'Focus feedback on deliverables, specifications, and objective timelines rather than personal remarks.',
      'Avoid all-caps shouting, profanity, passive-aggressive threats, or unsolicited off-topic promotions.',
    ],
    exampleScenario:
      'A Client writes: "Rows 14–22 in Sheet 2 are missing dates; please update and re-submit by Friday." That is clear and professional.',
    userObligations: [
      'Communicate constructively across every platform thread.',
    ],
    platformResponsibilities: [
      'Provide clear messaging tools and intervene if harassment is reported.',
    ],
    prohibitedConduct: [
      'Insults, slurs, intimidation, or manipulative guilt-tripping.',
    ],
    procedures: [
      'Report hostile messages via Help & Support under Account & Security.',
    ],
    consequences: [
      'Warnings, chat restrictions, or suspension.',
    ],
  }),

  buildPolicyDocument({
    slug: 'support-misconduct',
    title: 'Misconduct in Support Channels Policy',
    categoryId: CAT_H.id,
    categoryTitle: CAT_H.title,
    summary:
      'Protects support staff and queue integrity from verbal abuse, threats, bribery attempts, and false emergency claims.',
    relatedPolicySlugs: ['support-helpdesk', 'professional-communication', 'account-suspension'],
    purpose:
      'Ensures support agents can assist users safely and efficiently without abuse.',
    scope:
      'Applies to Support tickets, appeal threads, and emails sent to swastaskorg@gmail.com.',
    rules: [
      'Threats of violence, slurs, sexual remarks, or doxxing directed at support staff result in immediate enforcement.',
      'Attempting to bribe support agents to override verification or release unapproved funds is strictly forbidden.',
    ],
    exampleScenario:
      'Offering a support representative a "10% cut" to fast-track an unverified withdrawal results in immediate permanent ban.',
    userObligations: [
      'Treat support personnel with basic courtesy even when disputing an unfavorable ruling.',
    ],
    platformResponsibilities: [
      'Provide escalated supervisor review if a user believes a support response was unfair.',
    ],
    prohibitedConduct: [
      'Harassment, bribery, or weaponized ticket flooding.',
    ],
    procedures: [
      'Confirmed support misconduct is documented and escalated directly to Trust & Safety.',
    ],
    consequences: [
      'Support restriction, account suspension, or permanent ban.',
    ],
  }),

  // =========================================================================
  // I. DATA & PRIVACY (11 POLICIES)
  // =========================================================================
  buildPolicyDocument({
    slug: 'personal-data-collection',
    title: 'Personal Data Collection Policy',
    categoryId: CAT_I.id,
    categoryTitle: CAT_I.title,
    summary:
      'Enumerates exact categories of personal, marketplace, and financial data collected by SWAS TASKS and principles of data minimization.',
    relatedPolicySlugs: ['privacy', 'personal-data-processing', 'data-deletion'],
    purpose:
      'Provides transparent inventory of data collected at registration, profile setup, task execution, and payout configuration.',
    scope:
      'Applies to all personal information provided by users or generated by platform activity.',
    rules: [
      'SWAS TASKS collects only data necessary to operate accounts, task contracting, messaging, notifications, financial payouts, and legal compliance.',
      'Categories include: identity/contact data (name, email, optional phone), role & workspace records, masked/reference payout details, and immutable acceptance/audit logs.',
    ],
    exampleScenario:
      'Workers are never required to upload unrelated social contacts or private banking passwords to use SWAS TASKS.',
    userObligations: [
      'Submit only accurate personal data belonging to you.',
    ],
    platformResponsibilities: [
      'Enforce strict schema field allowlists (hasOnly) in Firestore rules so extraneous fields cannot be collected.',
    ],
    prohibitedConduct: [
      'Entering sensitive third-party personal data (such as someone else’s IDs) without lawful basis.',
    ],
    procedures: [
      'Review stored profile and payout fields anytime inside Profile, Account Settings, and Payout Accounts.',
    ],
    consequences: [
      'Maliciously injected or oversized fields are rejected by backend schema rules.',
    ],
  }),

  buildPolicyDocument({
    slug: 'personal-data-processing',
    title: 'Personal Data Processing Policy',
    categoryId: CAT_I.id,
    categoryTitle: CAT_I.title,
    summary:
      'Legal bases and operational purposes for processing user data across matching, settlement, security, and official mail.',
    relatedPolicySlugs: ['personal-data-collection', 'privacy-rights', 'data-sharing'],
    purpose:
      'Explains why SWAS TASKS processes collected personal data and prevents unauthorized secondary exploitation.',
    scope:
      'Covers all automated and manual processing of user data on SWAS TASKS.',
    rules: [
      'Data is processed strictly for: contractual task execution, payout settlement, fraud prevention, legal compliance, and requested support/notifications.',
      'SWAS TASKS does not sell user personal data to third-party data brokers or ad networks.',
    ],
    exampleScenario:
      'Your email address is used for authentication verification, password recovery, and official SWAS TASKS notifications—never sold to marketing lists.',
    userObligations: [
      'Configure optional notification preferences inside Account Settings.',
    ],
    platformResponsibilities: [
      'Limit internal staff processing strictly to authorized operational roles.',
    ],
    prohibitedConduct: [
      'Repurposing marketplace contact details for unauthorized mass marketing.',
    ],
    procedures: [
      'Users may object to optional communications via Account Settings toggles.',
    ],
    consequences: [
      'Unauthorized internal data processing triggers Staff Disciplinary sanctions.',
    ],
  }),

  buildPolicyDocument({
    slug: 'data-storage',
    title: 'Data Storage Policy',
    categoryId: CAT_I.id,
    categoryTitle: CAT_I.title,
    summary:
      'Explains Cloud Firestore storage architecture, collection isolation, document size bounds, and regional cloud hosting.',
    relatedPolicySlugs: ['data-security', 'data-retention', 'third-party-services'],
    purpose:
      'Details how platform records are persisted cleanly and securely.',
    scope:
      'Applies to Firebase Authentication and Cloud Firestore database storage.',
    rules: [
      'Data is stored in Google Cloud / Firebase Firestore with encrypted transport (TLS) and strict server-enforced security rules.',
      'PII fields are separated from public marketplace profile collections.',
    ],
    exampleScenario:
      'Public task cards query /tasks and /publicProfiles, leaving /users/{uid} and /payoutAccounts isolated.',
    userObligations: [
      'Use external reputable cloud links for large deliverable files rather than overloading text fields.',
    ],
    platformResponsibilities: [
      'Enforce bounded document fields and prevent unbounded array growth.',
    ],
    prohibitedConduct: [
      'Attempting storage exhaustion attacks.',
    ],
    procedures: [
      'Storage schemas remain synchronized with firebase-blueprint.json.',
    ],
    consequences: [
      'Oversized or malformed payloads are blocked at database rule level.',
    ],
  }),

  buildPolicyDocument({
    slug: 'data-retention',
    title: 'Data Retention Policy',
    categoryId: CAT_I.id,
    categoryTitle: CAT_I.title,
    summary:
      'Balances prompt deletion of unnecessary profile data with mandatory retention of financial, tax, and policy acceptance audit trails.',
    relatedPolicySlugs: ['data-deletion', 'account-closure', 'evidence-records'],
    pendingAdminReviewItems: [
      '[Administrator Review Required]: Confirm exact statutory retention durations (in years) for financial ledger transactions, withdrawal logs, and policy acceptance records.',
    ],
    purpose:
      'Explains how long different record categories remain stored and why certain audit records are immutable.',
    scope:
      'Applies to profiles, tasks, messages, financial transactions, email logs, and policy acceptances.',
    rules: [
      'Active workspace data persists while an account remains active.',
      'Financial transactions, withdrawal trails, fraud investigation records, and policy acceptances are retained for statutory compliance and dispute defense even after account closure.',
    ],
    exampleScenario:
      'If a user closes their account, public profile details are cleared while historical KES ledger entries and withdrawal references remain archived for financial auditing.',
    userObligations: [
      'Export any personal task notes needed before requesting permanent account deletion.',
    ],
    platformResponsibilities: [
      'Anonymize or purge non-mandatory personal fields once retention periods expire.',
    ],
    prohibitedConduct: [
      'Requesting erasure of immutable fraud or tax-audit records to hide misconduct.',
    ],
    procedures: [
      'Retention schedules are reviewed periodically by Super Administrators.',
    ],
    consequences: [
      'Mandatory statutory retention overrides voluntary deletion for financial audit records.',
    ],
  }),

  buildPolicyDocument({
    slug: 'data-deletion',
    title: 'Data Deletion Policy',
    categoryId: CAT_I.id,
    categoryTitle: CAT_I.title,
    summary:
      'Procedures for requesting personal data erasure, handling saved payout account deletions, and statutory exceptions.',
    relatedPolicySlugs: ['data-retention', 'account-closure', 'privacy-rights'],
    purpose:
      'Gives users clear control over deleting optional profile information, saved payout accounts, and closing accounts.',
    scope:
      'Applies to self-service removals (saved tasks, unused payout accounts) and formal erasure requests.',
    rules: [
      'Users can delete saved tasks anytime and delete saved payout accounts provided no active withdrawal currently references that payout account.',
      'Full personal data erasure requests undergo identity confirmation and settle any pending tasks/withdrawals first.',
    ],
    exampleScenario:
      'A Worker removes an old unused bank card from Payout Accounts; the system verifies no pending/processing withdrawal references it before allowing deletion.',
    userObligations: [
      'Submit formal account erasure requests from your verified email via Help & Support or swastaskorg@gmail.com.',
    ],
    platformResponsibilities: [
      'Process eligible deletion requests promptly and confirm which immutable legal ledger records remain archived.',
    ],
    prohibitedConduct: [
      'Deleting a payout destination mid-withdrawal to disrupt finance reconciliation.',
    ],
    procedures: [
      'Verify ownership -> Check active tasks/withdrawals -> Erase eligible PII -> Confirm completion.',
    ],
    consequences: [
      'Deletion of core account data permanently terminates workspace login access.',
    ],
  }),

  buildPolicyDocument({
    slug: 'user-data-access',
    title: 'User Data Access Policy',
    categoryId: CAT_I.id,
    categoryTitle: CAT_I.title,
    summary:
      'Empowers users to view and export their profile settings, ledger transactions, withdrawal records, and policy acceptance history.',
    relatedPolicySlugs: ['privacy-rights', 'my-policies', 'personal-data-collection'],
    purpose:
      'Ensures transparency and portability over your own SWAS TASKS records.',
    scope:
      'Covers self-service workspace data views and formal data export requests.',
    rules: [
      'Users have continuous self-service read access to their Profile, Transactions, Withdrawals, Payout Accounts (masked), Notifications, and My Accepted Policies.',
      'Additional formal copy requests may be submitted via Help & Support or swastaskorg@gmail.com.',
    ],
    exampleScenario:
      'A Worker preparing annual income records reviews their full itemized ledger in the Financial Centre or requests a structured summary via Support.',
    userObligations: [
      'Verify identity before receiving offline data exports.',
    ],
    platformResponsibilities: [
      'Prevent disclosure of third-party private PII inside exported multi-party threads.',
    ],
    prohibitedConduct: [
      'Requesting private data belonging to another user UID.',
    ],
    procedures: [
      'View online in Workspace -> Request offline export via Support -> Identity confirmation -> Secure delivery.',
    ],
    consequences: [
      'Unauthorized access requests for other users’ data are denied immediately.',
    ],
  }),

  buildPolicyDocument({
    slug: 'data-sharing',
    title: 'Data Sharing Policy',
    categoryId: CAT_I.id,
    categoryTitle: CAT_I.title,
    summary:
      'Defines strictly limited circumstances under which user data is shared with task counterparties, payment providers, or legal authorities.',
    relatedPolicySlugs: ['third-party-services', 'regulatory-cooperation', 'privacy'],
    purpose:
      'Reassures users that private data stays private unless required for transaction execution or lawful compliance.',
    scope:
      'Applies to all internal and external sharing of user data.',
    rules: [
      'Task counterparties see only display names, task/bid details, deliverable links, and direct workspace messages—never private emails, phone numbers, or bank details.',
      'Configured payment providers receive only the recipient details needed to disburse an authorized withdrawal.',
    ],
    exampleScenario:
      'Initiating an automated payout transmits recipient bank code and account reference solely to the configured payment gateway.',
    userObligations: [
      'Share only information needed for task delivery inside workspace chats.',
    ],
    platformResponsibilities: [
      'Never sell, rent, or trade personal data lists.',
    ],
    prohibitedConduct: [
      'Sharing counterparty private data obtained legitimately during a project with outside third parties.',
    ],
    procedures: [
      'Lawful authority disclosures follow the Regulatory Cooperation Policy.',
    ],
    consequences: [
      'Unauthorized third-party data disclosure results in permanent termination.',
    ],
  }),

  buildPolicyDocument({
    slug: 'third-party-services',
    title: 'Third-Party Services Policy',
    categoryId: CAT_I.id,
    categoryTitle: CAT_I.title,
    summary:
      'Identifies external infrastructure and payment processors (Firebase, Google Sign-In, SMTP mail, Paystack, Flutterwave, Stripe, M-Pesa, Binance Pay) and liability boundaries.',
    relatedPolicySlugs: ['payment-provider', 'data-sharing', 'cookie-policy'],
    purpose:
      'Discloses external technical providers supporting authentication, hosting, email, and payouts.',
    scope:
      'Applies to all external APIs and user-supplied external deliverable URLs.',
    rules: [
      'Core cloud authentication and database hosting operate on Google Firebase.',
      'Users clicking external deliverable links (e.g., Client cloud folders) are subject to the security and privacy practices of those external hosts.',
    ],
    exampleScenario:
      'Signing in with Google invokes Google OAuth popup authentication governed by Google’s authentication safeguards.',
    userObligations: [
      'Inspect unfamiliar external deliverable URLs cautiously and report suspicious links.',
    ],
    platformResponsibilities: [
      'Vet integrated payment/SMTP partners and keep server credentials strictly isolated.',
    ],
    prohibitedConduct: [
      'Embedding deceptive external tracking links inside task briefs or submissions.',
    ],
    procedures: [
      'Updates to core third-party payment integrations reflect transparently in Financial Control.',
    ],
    consequences: [
      'Malicious third-party links cause immediate task removal and suspension.',
    ],
  }),

  buildPolicyDocument({
    slug: 'data-breach-response',
    title: 'Data Breach Response Policy',
    categoryId: CAT_I.id,
    categoryTitle: CAT_I.title,
    summary:
      'Incident containment, forensic logging, affected-user notification, and regulatory reporting protocol in the event of a security breach.',
    relatedPolicySlugs: ['cybersecurity', 'data-security', 'regulatory-cooperation'],
    pendingAdminReviewItems: [
      '[Administrator Review Required]: Confirm mandatory statutory breach notification window (e.g., 72 hours) applicable under governing data protection laws.',
    ],
    purpose:
      'Establishes rapid, honest response procedures if unauthorized access to personal or financial data ever occurs.',
    scope:
      'Applies to suspected or confirmed unauthorized disclosure, alteration, or loss of platform data.',
    rules: [
      'Upon detecting a potential breach, Super Administrators immediately isolate affected routes, revoke compromised tokens/keys, and preserve audit logs.',
      'Affected users are notified honestly through in-app security alerts and official email (swastaskorg@gmail.com) with protective remediation steps.',
    ],
    exampleScenario:
      'If an external SMTP or provider secret were ever suspected leaked, keys are rotated immediately and affected logs audited.',
    userObligations: [
      'Report suspected account or data exposure immediately to swastaskorg@gmail.com.',
    ],
    platformResponsibilities: [
      'Investigate transparently without covering up verified security incidents.',
    ],
    prohibitedConduct: [
      'Concealing known security breaches or exploiting exposed credentials.',
    ],
    procedures: [
      'Contain -> Rotate Secrets -> Assess Scope -> Notify Affected Users & Authorities -> Post-Incident Hardening.',
    ],
    consequences: [
      'Staff or users concealing breaches face severe disciplinary or legal sanctions.',
    ],
  }),

  buildPolicyDocument({
    slug: 'privacy-rights',
    title: 'Privacy Rights & Requests Policy',
    categoryId: CAT_I.id,
    categoryTitle: CAT_I.title,
    summary:
      'Explains user rights to access, correct, restrict, object to optional processing, and request deletion of personal data.',
    relatedPolicySlugs: ['user-data-access', 'data-deletion', 'privacy'],
    purpose:
      'Operationalizes data subject rights cleanly without bureaucratic friction.',
    scope:
      'Applies to all registered SWAS TASKS users.',
    rules: [
      'Users may update display name, bio, skills, phone, country, and notification preferences directly in Account Settings.',
      'Formal rights requests (access copy, rectification of locked fields, or erasure) may be submitted via Help & Support or swastaskorg@gmail.com.',
    ],
    exampleScenario:
      'A user corrects a misspelled display name directly in Profile Settings and updates notification opt-outs in Account Settings.',
    userObligations: [
      'Submit formal requests from the verified account email so ownership is confirmed.',
    ],
    platformResponsibilities: [
      'Respond truthfully and explain any statutory retention requirement affecting partial exclusions.',
    ],
    prohibitedConduct: [
      'Abusive repetitive requests intended to disrupt operations.',
    ],
    procedures: [
      'Submit Request -> Verify Identity -> Execute Action -> Written Confirmation.',
    ],
    consequences: [
      'Unresolved privacy complaints may also be escalated to competent data protection authorities.',
    ],
  }),

  buildPolicyDocument({
    slug: 'tracking-cookies',
    title: 'Tracking and Cookies Policy',
    categoryId: CAT_I.id,
    categoryTitle: CAT_I.title,
    summary:
      'Clarifies strict limits on browser telemetry, absence of third-party ad tracking, and security logging boundaries.',
    relatedPolicySlugs: ['cookie-policy', 'workplace-monitoring', 'privacy'],
    purpose:
      'Supplements the Cookie Policy with explicit commitments regarding behavioral tracking and telemetry.',
    scope:
      'Covers client-side storage, Firebase session tokens, and operational telemetry.',
    rules: [
      'SWAS TASKS does not sell behavioral browsing profiles or run covert third-party ad-retargeting pixels.',
      'Only essential session persistence and anti-fraud diagnostics required for authentication and security operate.',
    ],
    exampleScenario:
      'Navigating the Legal & Policies Centre does not require accepting advertising cookies because none are deployed.',
    userObligations: [
      'Keep browser security extensions configured responsibly without breaking core Firebase auth domains.',
    ],
    platformResponsibilities: [
      'Update this policy and obtain appropriate consent before ever introducing optional analytics.',
    ],
    prohibitedConduct: [
      'Injecting unauthorized third-party tracking scripts.',
    ],
    procedures: [
      'Any future analytics additions require Admin Policy publication and notification.',
    ],
    consequences: [
      'Unauthorized script injection is treated as a security violation.',
    ],
  }),

  // =========================================================================
  // J. REFERRALS, REWARDS & PROMOTIONS (8 POLICIES)
  // =========================================================================
  buildPolicyDocument({
    slug: 'referral-program',
    title: 'Referral Program Policy',
    categoryId: CAT_J.id,
    categoryTitle: CAT_J.title,
    summary:
      'Framework governing official SWAS TASKS referral invitations, genuine new-user qualification, and program status.',
    relatedPolicySlugs: ['referral-fraud', 'referral-commission', 'bonus-rewards'],
    pendingAdminReviewItems: [
      '[Administrator Review Required]: Confirm whether a referral program is currently active, and specify exact qualifying task completion thresholds and reward rates.',
    ],
    purpose:
      'Establishes transparent governance for referral programs whenever enabled by SWAS TASKS.',
    scope:
      'Applies to all users participating in official referral invitations.',
    rules: [
      'Referral rewards apply ONLY during officially announced active referral campaigns.',
      'Referred accounts must represent genuinely independent, verified individuals completing real qualifying platform activity.',
    ],
    exampleScenario:
      'Inviting an independent colleague who registers, verifies email, and completes legitimate tasks qualifies only under published active campaign terms.',
    userObligations: [
      'Share accurate descriptions of SWAS TASKS without misleading earnings guarantees.',
    ],
    platformResponsibilities: [
      'Publish clear campaign start/end dates and qualification criteria whenever a referral program runs.',
    ],
    prohibitedConduct: [
      'Self-referrals, paid spam ads impersonating official SWAS TASKS branding, or bot signups.',
    ],
    procedures: [
      'Campaign announcements appear inside Announcements and Policy Updates.',
    ],
    consequences: [
      'Abusive referrals void all pending commissions and suspend involved accounts.',
    ],
  }),

  buildPolicyDocument({
    slug: 'referral-fraud',
    title: 'Referral Fraud Policy',
    categoryId: CAT_J.id,
    categoryTitle: CAT_J.title,
    summary:
      'Prohibits self-referrals, circular sham tasks, incentivized click-farming, and multi-account referral harvesting.',
    relatedPolicySlugs: ['referral-program', 'one-account-per-user', 'multiple-account-detection'],
    purpose:
      'Protects promotional budgets from manufactured signups and collusion.',
    scope:
      'Applies to all referral links, invite codes, and commission attributions.',
    rules: [
      'Referring yourself, household duplicate accounts, or colluding accounts created solely to trigger bonuses is strictly forbidden.',
      'Paying strangers purely to register and immediately abandon accounts violates Referral Fraud.',
    ],
    exampleScenario:
      'A user registers five browser profiles under their own referral link and posts sham KES 50 tasks between them. All bonuses are cancelled.',
    userObligations: [
      'Invite only genuine independent professionals or clients.',
    ],
    platformResponsibilities: [
      'Audit referral payouts against multi-account and payout-destination overlap signals.',
    ],
    prohibitedConduct: [
      'Cookie stuffing, deceptive redirects, or fake registration rings.',
    ],
    procedures: [
      'Suspected referral rings trigger immediate bonus freeze and investigation.',
    ],
    consequences: [
      'Forfeiture of referral earnings and permanent ban from promotional programs or the platform.',
    ],
  }),

  buildPolicyDocument({
    slug: 'bonus-rewards',
    title: 'Bonus and Rewards Policy',
    categoryId: CAT_J.id,
    categoryTitle: CAT_J.title,
    summary:
      'Rules governing discretionary performance bonuses, milestone rewards, and verified ledger crediting.',
    relatedPolicySlugs: ['incentive-eligibility', 'reward-cancellation', 'earnings'],
    pendingAdminReviewItems: [
      '[Administrator Review Required]: Confirm whether bonus rewards carry separate minimum task completion or withdrawal lock rules.',
    ],
    purpose:
      'Clarifies that promotional or performance bonuses are governed strictly by published campaign criteria.',
    scope:
      'Applies to any milestone bonus or platform reward issued outside standard task agreedKES.',
    rules: [
      'Bonuses have no cash value until formally credited as verified_settled in the user wallet.',
      'Bonuses require full compliance with all platform rules during the qualifying period.',
    ],
    exampleScenario:
      'An administrator-approved quality milestone bonus appears as a documented ledger adjustment entry with auditNote.',
    userObligations: [
      'Meet all stated eligibility terms honestly without metric gaming.',
    ],
    platformResponsibilities: [
      'Credit approved bonuses via auditable ledger transactions.',
    ],
    prohibitedConduct: [
      'Demanding unannounced bonuses or splitting tasks artificially to multiply milestone counts.',
    ],
    procedures: [
      'Verified achievement -> Finance audit -> Ledger credit.',
    ],
    consequences: [
      'Fraudulent qualification forfeits all campaign bonuses.',
    ],
  }),

  buildPolicyDocument({
    slug: 'promotional-campaign',
    title: 'Promotional Campaign Policy',
    categoryId: CAT_J.id,
    categoryTitle: CAT_J.title,
    summary:
      'Governs seasonal incentives, fee waivers, and category campaigns launched through official SWAS TASKS announcements.',
    relatedPolicySlugs: ['bonus-rewards', 'incentive-eligibility', 'promotional-abuse'],
    purpose:
      'Ensures promotional offers have clear eligibility dates, caps, and non-deceptive terms.',
    scope:
      'Applies to all limited-time SWAS TASKS campaigns.',
    rules: [
      'Promotional terms are valid strictly within stated start and end timestamps and may be capped or modified upon notice.',
      'Only campaigns published in official SWAS TASKS Announcements or swastaskorg@gmail.com circulars are genuine.',
    ],
    exampleScenario:
      'A weekend fee-waiver promotion applies only to withdrawals submitted between stated timestamps.',
    userObligations: [
      'Verify official campaign terms inside Announcements before relying on promotional pricing.',
    ],
    platformResponsibilities: [
      'Apply configured promotional rules consistently and clearly state expiration dates.',
    ],
    prohibitedConduct: [
      'Promoting counterfeit discount codes or fake giveaways.',
    ],
    procedures: [
      'Campaign notices include effective window, eligible roles/countries, and support link.',
    ],
    consequences: [
      'Misrepresentation of promotions incurs conduct penalties.',
    ],
  }),

  buildPolicyDocument({
    slug: 'incentive-eligibility',
    title: 'Incentive Eligibility Policy',
    categoryId: CAT_J.id,
    categoryTitle: CAT_J.title,
    summary:
      'Defines good-standing, verified-account, and active-participation criteria needed to qualify for platform incentives.',
    relatedPolicySlugs: ['bonus-rewards', 'promotional-campaign', 'warning-system'],
    purpose:
      'Ensures incentives reward authentic, compliant platform participants.',
    scope:
      'Applies to Workers and Clients participating in bonus or fee-credit programs.',
    rules: [
      'Accounts must have verified email, completed onboarding, and zero active suspensions or unresolved fraud flags to claim incentives.',
      'Cancelled, refunded, or disputed tasks do not count toward milestone incentives.',
    ],
    exampleScenario:
      'An account currently restricted for duplicate submissions is ineligible for seasonal milestone rewards until reinstated.',
    userObligations: [
      'Maintain clean compliance standing throughout campaign windows.',
    ],
    platformResponsibilities: [
      'Verify eligibility automatically or manually prior to reward disbursement.',
    ],
    prohibitedConduct: [
      'Concealing disqualifying duplicate accounts.',
    ],
    procedures: [
      'Eligibility queries may be raised via Help & Support.',
    ],
    consequences: [
      'Ineligible claims are declined with clear explanation.',
    ],
  }),

  buildPolicyDocument({
    slug: 'reward-cancellation',
    title: 'Reward Cancellation Policy',
    categoryId: CAT_J.id,
    categoryTitle: CAT_J.title,
    summary:
      'Conditions under which pending or erroneously credited promotional rewards may be cancelled or reversed.',
    relatedPolicySlugs: ['promotional-abuse', 'incorrect-payment', 'refund'],
    purpose:
      'Preserves fairness by removing rewards obtained via errors, cancelled tasks, or policy breaches.',
    scope:
      'Applies to referral commissions, bonuses, and promotional credits.',
    rules: [
      'Rewards tied to a subsequently cancelled, refunded, or fraudulent task are automatically voided.',
      'Erroneously doubled promotional credits are corrected via ledger reversal.',
    ],
    exampleScenario:
      'If a qualifying task is later reversed for non-delivery fraud, the associated referral bonus is cancelled.',
    userObligations: [
      'Report erroneous duplicate bonus credits promptly.',
    ],
    platformResponsibilities: [
      'Document every reward cancellation with clear audit notes.',
    ],
    prohibitedConduct: [
      'Attempting rapid withdrawal of known erroneous promotional credits.',
    ],
    procedures: [
      'Audit detection -> Written notice -> Reversal entry.',
    ],
    consequences: [
      'Intentional abuse escalates to Promotional Abuse enforcement.',
    ],
  }),

  buildPolicyDocument({
    slug: 'promotional-abuse',
    title: 'Promotional Abuse Policy',
    categoryId: CAT_J.id,
    categoryTitle: CAT_J.title,
    summary:
      'Prohibits exploiting sign-up bonuses, fee waivers, coupon stacking, or artificial task splitting to farm incentives.',
    relatedPolicySlugs: ['referral-fraud', 'reward-cancellation', 'anti-manipulation'],
    purpose:
      'Deters bad-faith exploitation of platform marketing and incentive programs.',
    scope:
      'Applies to all promotional mechanisms on SWAS TASKS.',
    rules: [
      'Splitting a single assignment into micro-tasks solely to multiply per-task bonus triggers is strictly prohibited.',
      'Coordinated ring farming across multiple accounts results in total exclusion.',
    ],
    exampleScenario:
      'A Client and Worker split one KES 2,000 brief into ten KES 200 briefs purely to hit a "10 completed tasks" bonus.',
    userObligations: [
      'Use promotions strictly as intended for genuine work.',
    ],
    platformResponsibilities: [
      'Monitor anomalous promotional spikes before crediting settled rewards.',
    ],
    prohibitedConduct: [
      'Task splitting, wash referrals, or technical coupon exploits.',
    ],
    procedures: [
      'Flagged abuse undergoes compliance review and reward clawback.',
    ],
    consequences: [
      'Loss of promotional eligibility, reversal of abusive rewards, and potential ban.',
    ],
  }),

  buildPolicyDocument({
    slug: 'referral-commission',
    title: 'Referral Commission Policy',
    categoryId: CAT_J.id,
    categoryTitle: CAT_J.title,
    summary:
      'Governs commission structure, holding periods, currency attribution, and payout verification for active referral programs.',
    relatedPolicySlugs: ['referral-program', 'referral-fraud', 'approved-earnings'],
    pendingAdminReviewItems: [
      '[Administrator Review Required]: Set exact referral commission percentage/flat rates, holding period, and eligible currencies prior to launching any referral campaign.',
    ],
    purpose:
      'Establishes honest accounting for referral payouts so no unconfigured commission rates are implied.',
    scope:
      'Applies whenever an official referral commission campaign is live.',
    rules: [
      'Commissions accrue ONLY after the referred user’s qualifying task reaches verified_settled status.',
      'No specific commission rate is active unless explicitly configured and announced by Super Administrators.',
    ],
    exampleScenario:
      'If a referral campaign is active, a pending referral reward remains unwithdrawable until the referred assignment clears settlement.',
    userObligations: [
      'Provide truthful program information when inviting new participants.',
    ],
    platformResponsibilities: [
      'Credit verified commissions separately and traceably in the ledger.',
    ],
    prohibitedConduct: [
      'Claiming self-referral commissions.',
    ],
    procedures: [
      'Qualifying settlement -> Holding verification -> Verified wallet credit.',
    ],
    consequences: [
      'Reversed qualifying tasks automatically cancel pending referral commissions.',
    ],
  }),

  // =========================================================================
  // K. STAFF, AGENTS, REVIEWERS & ADMINISTRATORS (12 POLICIES)
  // =========================================================================
  buildPolicyDocument({
    slug: 'staff-conduct',
    title: 'Staff Code of Conduct',
    categoryId: CAT_K.id,
    categoryTitle: CAT_K.title,
    summary:
      'Ethical standards, impartiality, data confidentiality, and anti-corruption obligations binding all SWAS TASKS employees and department personnel.',
    requiresAcceptance: true,
    acceptanceContexts: ['staff_onboarding'],
    relatedPolicySlugs: ['admin-conduct', 'internal-confidentiality', 'conflict-of-interest', 'audit-accountability'],
    purpose:
      'Upholds strict integrity, neutrality, and user trust across every internal SWAS TASKS team.',
    scope:
      'Applies to all SWAS TASKS staff, department operators, contractors, and moderators.',
    rules: [
      'Staff must act impartially, politely, and strictly within documented policies and assigned role permissions.',
      'Soliciting or accepting gifts, bribes, kickbacks, or favors from Clients or Workers is strictly prohibited.',
      'Staff must use only official swastaskorg@gmail.com and Central Control Centre tools for official duties.',
    ],
    exampleScenario:
      'A support staff member recognizes a friend’s UID in a payment dispute queue; they immediately recuse themselves under the Conflict of Interest Policy.',
    userObligations: [
      'Users must never offer bribes or personal favors to SWAS TASKS personnel.',
    ],
    platformResponsibilities: [
      'Train staff on security hygiene, impartiality, and audit logging.',
    ],
    prohibitedConduct: [
      'Favoritism, bribery, off-channel informal promises, or unauthorized data browsing.',
    ],
    procedures: [
      'Suspected staff misconduct can be reported confidentially to swastaskorg@gmail.com for Super Admin audit.',
    ],
    consequences: [
      'Immediate access revocation, Staff Disciplinary sanctions, and termination.',
    ],
  }),

  buildPolicyDocument({
    slug: 'admin-conduct',
    title: 'Admin Code of Conduct',
    categoryId: CAT_K.id,
    categoryTitle: CAT_K.title,
    summary:
      'Elevated accountability, zero-abuse rules, and mandatory audit logging governing Central Control Centre Super Administrators and Admins.',
    relatedPolicySlugs: ['staff-conduct', 'admin-abuse-prevention', 'audit-accountability'],
    purpose:
      'Ensures administrative powers over policies, finances, emails, and enforcement are exercised strictly with verifiable justification.',
    scope:
      'Applies to all Central Control Centre administrators.',
    rules: [
      'Every administrative adjustment to financial configs, payout approvals, ledger settlements, or policy documents is permanently logged with actor UID and server timestamp.',
      'Administrators must never fabricate provider confirmations, fake email logs, or alter user data without documented cause.',
    ],
    exampleScenario:
      'Marking a manual bank payout Paid in Financial Control requires entering the real bank transaction reference and review note recorded in financialAuditLogs.',
    userObligations: [
      'Report suspected administrative abuse immediately with ticket/reference evidence.',
    ],
    platformResponsibilities: [
      'Enforce append-only audit logs that even admins cannot delete via client rules.',
    ],
    prohibitedConduct: [
      'Unlogged backdoor balance edits, punitive censorship, or self-dealing.',
    ],
    procedures: [
      'All policy changes record changeReason, version, editorId, and immutable PolicyRevision snapshots.',
    ],
    consequences: [
      'Privilege revocation and internal governance review.',
    ],
  }),

  buildPolicyDocument({
    slug: 'agent-conduct',
    title: 'Agent Code of Conduct',
    categoryId: CAT_K.id,
    categoryTitle: CAT_K.title,
    summary:
      'Rules governing authorized onboarding agents, regional representatives, and field coordinators acting on behalf of SWAS TASKS.',
    relatedPolicySlugs: ['staff-conduct', 'conflict-of-interest', 'false-information'],
    purpose:
      'Protects prospective Workers and Clients from unauthorized fees or deceptive claims by field or support agents.',
    scope:
      'Applies to any officially designated SWAS TASKS onboarding or regional agent.',
    rules: [
      'Authorized agents must never charge applicants private cash fees to register, activate, or unlock SWAS TASKS accounts.',
      'Agents must never collect or retain user passwords, verification codes, or banking PINs.',
    ],
    exampleScenario:
      'An onboarding agent assisting a Client explains the public signup flow and lets the Client enter their own password privately.',
    userObligations: [
      'Verify official agent status and refuse any unofficial "activation fee" requests.',
    ],
    platformResponsibilities: [
      'Investigate reports of unauthorized fee extraction immediately.',
    ],
    prohibitedConduct: [
      'Selling "guaranteed high-paying tasks", charging registration bribes, or holding user credentials.',
    ],
    procedures: [
      'Report improper agent conduct to swastaskorg@gmail.com.',
    ],
    consequences: [
      'Immediate revocation of agent status and permanent platform ban.',
    ],
  }),

  buildPolicyDocument({
    slug: 'reviewer-conduct',
    title: 'Reviewer Code of Conduct',
    categoryId: CAT_K.id,
    categoryTitle: CAT_K.title,
    summary:
      'Standards of objectivity, confidentiality, and evidence-based evaluation for task, quality, and appeal reviewers.',
    relatedPolicySlugs: ['staff-conduct', 'investigation-review', 'task-quality-standards'],
    purpose:
      'Ensures quality and dispute reviewers apply consistent policy criteria without personal bias.',
    scope:
      'Applies to internal quality reviewers, dispute adjudicators, and verification reviewers.',
    rules: [
      'Reviewers must evaluate deliverables strictly against the original task brief, published quality standards, and conversation logs.',
      'Reviewers must protect all reviewed deliverables from unauthorized copying or reuse.',
    ],
    exampleScenario:
      'When reviewing a contested Web & Technical submission, the reviewer checks whether agreed brief deliverables load properly rather than imposing personal aesthetic tastes.',
    userObligations: [
      'Provide clear links and evidence for reviewer evaluation.',
    ],
    platformResponsibilities: [
      'Audit reviewer consistency and maintain independent escalation paths.',
    ],
    prohibitedConduct: [
      'Stealing submitted Client/Worker deliverables or favoring familiar accounts.',
    ],
    procedures: [
      'Contested reviewer rulings undergo second-level review under Investigation & Review Policy.',
    ],
    consequences: [
      'Biased or negligent reviewing results in removal from reviewer duties.',
    ],
  }),

  buildPolicyDocument({
    slug: 'workplace-manager',
    title: 'Workplace Manager & Internal Management Policy',
    categoryId: CAT_K.id,
    categoryTitle: CAT_K.title,
    summary:
      'Governance duties, capacity oversight, and fair task allocation rules for authorized workplace and department managers.',
    relatedPolicySlugs: ['department-rules', 'staff-conduct', 'workplace-access'],
    purpose:
      'Ensures internal workplace managers coordinate operations fairly and safely.',
    scope:
      'Applies to internal managers overseeing specialized departments or multi-task programs.',
    rules: [
      'Workplace managers must enforce clear deliverable briefs, honest budgets, and timely deliverable reviews.',
      'Managers may not coerce Workers into unpaid overtime or off-ledger deliverables.',
    ],
    exampleScenario:
      'A workplace manager posts clear QA batches with realistic deadlines and logs timely approvals.',
    userObligations: [
      'Escalate unfair manager demands via Complaint Resolution.',
    ],
    platformResponsibilities: [
      'Review manager performance and workplace turnover metrics.',
    ],
    prohibitedConduct: [
      'Retaliatory workplace removal against Workers who file valid appeals.',
    ],
    procedures: [
      'Manager actions affecting status or pay must reference documented policy rules.',
    ],
    consequences: [
      'Manager authority suspension for verified abuse.',
    ],
  }),

  buildPolicyDocument({
    slug: 'staff-access',
    title: 'Staff Access Policy',
    categoryId: CAT_K.id,
    categoryTitle: CAT_K.title,
    summary:
      'Least-privilege access controls, verified admin-list enforcement, and immediate offboarding revocation for SWAS TASKS personnel.',
    relatedPolicySlugs: ['internal-data-access', 'admin-conduct', 'unauthorized-access'],
    purpose:
      'Restricts administrative backend tools strictly to verified authorized personnel.',
    scope:
      'Applies to Central Control Centre, Financial Control, Email Settings, and Policy Control access.',
    rules: [
      'Access is verified server-side via Firebase ID token email verification and Firestore /admins checks—never client-side hidden flags.',
      'Departing staff lose Control Centre and Firestore privileges immediately upon role change.',
    ],
    exampleScenario:
      'An API call to /api/financial/providers/status without a verified Super Admin Bearer token returns HTTP 403.',
    userObligations: [
      'Never share staff sessions or leave Control Centre terminals unlocked.',
    ],
    platformResponsibilities: [
      'Audit privileged roles periodically and enforce least-privilege access.',
    ],
    prohibitedConduct: [
      'Sharing admin credentials or keeping unauthorized local exports.',
    ],
    procedures: [
      'Role grant -> Security verification -> Periodic review -> Immediate revocation on exit.',
    ],
    consequences: [
      'Access violation leads to immediate termination and security audit.',
    ],
  }),

  buildPolicyDocument({
    slug: 'internal-confidentiality',
    title: 'Internal Confidentiality Policy',
    categoryId: CAT_K.id,
    categoryTitle: CAT_K.title,
    summary:
      'Obligates staff, reviewers, and admins to protect user PII, financial configs, security rules, and unpublished drafts.',
    relatedPolicySlugs: ['workplace-confidentiality', 'staff-conduct', 'data-security'],
    purpose:
      'Prevents internal leaks of sensitive customer, financial, or operational records.',
    scope:
      'Applies during and after engagement with SWAS TASKS.',
    rules: [
      'Internal access to user profiles, support tickets, financial audits, or draft policy updates must never be shared outside authorized operational channels.',
    ],
    exampleScenario:
      'An administrator reviewing a user’s masked payout dispute never discusses that user’s identity or earnings on public social media.',
    userObligations: [
      'Report suspected leaks involving internal data immediately.',
    ],
    platformResponsibilities: [
      'Enforce strict confidentiality clauses in all staff engagements.',
    ],
    prohibitedConduct: [
      'Leaking screenshots of Control Centre dashboards or unpublished enforcement investigations.',
    ],
    procedures: [
      'Confidentiality breaches follow Data Breach Response and Staff Disciplinary workflows.',
    ],
    consequences: [
      'Immediate dismissal and legal remedies.',
    ],
  }),

  buildPolicyDocument({
    slug: 'conflict-of-interest',
    title: 'Conflict of Interest Policy',
    categoryId: CAT_K.id,
    categoryTitle: CAT_K.title,
    summary:
      'Requires disclosure and recusal whenever staff, reviewers, or administrators have personal, family, or financial ties to a marketplace case.',
    relatedPolicySlugs: ['staff-conduct', 'reviewer-conduct', 'admin-abuse-prevention'],
    purpose:
      'Protects impartial governance in bidding, payouts, disputes, and appeals.',
    scope:
      'Applies to all SWAS TASKS staff, agents, reviewers, and administrators.',
    rules: [
      'Personnel must immediately disclose any personal or financial relationship with a Client, Worker, or disputed task and step aside from reviewing that matter.',
      'Personnel may not use non-public insider knowledge of upcoming tasks or campaigns to gain personal marketplace advantage.',
    ],
    exampleScenario:
      'A reviewer assigned to a withdrawal hold notices the account belongs to a close relative; the reviewer reassigns the ticket immediately.',
    userObligations: [
      'Flag known conflicts respectfully when requesting independent review.',
    ],
    platformResponsibilities: [
      'Reassign conflicted cases cleanly to uninvolved reviewers.',
    ],
    prohibitedConduct: [
      'Concealing conflicts while adjudicating disputes or approving payouts.',
    ],
    procedures: [
      'Declare conflict -> Log recusal -> Reassign case -> Audit review.',
    ],
    consequences: [
      'Undisclosed self-dealing results in termination and reversal of tainted decisions.',
    ],
  }),

  buildPolicyDocument({
    slug: 'admin-abuse-prevention',
    title: 'Admin Abuse Prevention Policy',
    categoryId: CAT_K.id,
    categoryTitle: CAT_K.title,
    summary:
      'Structural safeguards, immutable audit trails, and escalation checks preventing misuse of administrative authority.',
    relatedPolicySlugs: ['admin-conduct', 'audit-accountability', 'complaint-resolution'],
    purpose:
      'Ensures no administrator operates above accountability or platform rules.',
    scope:
      'Applies to all Control Centre actions across Email, Financial Control, Policy Control, and Enforcement.',
    rules: [
      'Firestore rules forbid deleting /financialAuditLogs, /emailLogs, /policyRevisions, or /policyAcceptances—preserving permanent evidence of admin activity.',
      'Users affected by perceived unfair administrative conduct may file a formal review citing exact log or ticket references.',
    ],
    exampleScenario:
      'Every policy status change, version edit, or manual payout approval records editor UID, timestamp, and mandatory change reason.',
    userObligations: [
      'Provide factual reference IDs when reporting administrative concerns.',
    ],
    platformResponsibilities: [
      'Preserve immutable append-only audit collections across all critical admin operations.',
    ],
    prohibitedConduct: [
      'Retaliatory account targeting or unsubstantiated manual rejections.',
    ],
    procedures: [
      'Audit logs are preserved permanently for executive and regulatory review.',
    ],
    consequences: [
      'Verified admin abuse leads to immediate credential revocation.',
    ],
  }),

  buildPolicyDocument({
    slug: 'staff-disciplinary',
    title: 'Staff Disciplinary Policy',
    categoryId: CAT_K.id,
    categoryTitle: CAT_K.title,
    summary:
      'Internal escalation, investigation, suspension, and termination procedures for staff or agent policy breaches.',
    relatedPolicySlugs: ['staff-conduct', 'admin-abuse-prevention', 'internal-confidentiality'],
    purpose:
      'Holds internal operators to the same or higher accountability standard as marketplace users.',
    scope:
      'Applies to all employees, reviewers, agents, and administrators.',
    rules: [
      'Confirmed breaches of confidentiality, impartiality, security, or user respect trigger formal internal review and proportional sanctions.',
      'Immediate access suspension applies during investigations involving financial manipulation or PII leaks.',
    ],
    exampleScenario:
      'A staff member accessing private user records without an active support ticket faces immediate access revocation and disciplinary investigation.',
    userObligations: [
      'Users impacted by staff misconduct should report details to swastaskorg@gmail.com.',
    ],
    platformResponsibilities: [
      'Remediate any user harm caused by confirmed internal misconduct.',
    ],
    prohibitedConduct: [
      'Covering up colleague misconduct or falsifying internal logs.',
    ],
    procedures: [
      'Report -> Immediate Access Containment -> Audit Investigation -> Disciplinary Outcome.',
    ],
    consequences: [
      'Written reprimand, reassignment, suspension, termination, or legal referral.',
    ],
  }),

  buildPolicyDocument({
    slug: 'internal-data-access',
    title: 'Internal Data Access Policy',
    categoryId: CAT_K.id,
    categoryTitle: CAT_K.title,
    summary:
      'Need-to-know access rules governing when authorized staff may view user profiles, messages, or payout records.',
    relatedPolicySlugs: ['staff-access', 'internal-confidentiality', 'data-security'],
    purpose:
      'Prevents casual browsing of private user records by strictly tying access to active operational needs.',
    scope:
      'Applies to all internal access to Firestore collections and logs.',
    rules: [
      'Staff may inspect private user records ONLY when resolving an active support ticket, dispute, payout verification, or security alert.',
      'Plaintext server secrets (SMTP passwords, payment API keys) are strictly excluded from Control Centre UI screens.',
    ],
    exampleScenario:
      'Even in Financial Control, Super Administrators see masked payout accounts and verification states rather than plaintext server gateway secret keys.',
    userObligations: [
      'Include exact ticket or withdrawal IDs so staff look up only relevant records.',
    ],
    platformResponsibilities: [
      'Enforce strict separation between public metadata and private server environment secrets.',
    ],
    prohibitedConduct: [
      'Curiosity lookups or exporting user tables to personal devices.',
    ],
    procedures: [
      'Active Ticket / Audit Case -> Scoped Lookup -> Action Logged.',
    ],
    consequences: [
      'Unauthorized lookups trigger immediate disciplinary action.',
    ],
  }),

  buildPolicyDocument({
    slug: 'audit-accountability',
    title: 'Audit and Accountability Policy',
    categoryId: CAT_K.id,
    categoryTitle: CAT_K.title,
    summary:
      'Mandates immutable trails for financial actions, policy revisions, user consent records, and official platform emails.',
    relatedPolicySlugs: ['admin-abuse-prevention', 'evidence-records', 'changes-to-terms'],
    purpose:
      'Ensures every high-impact action on SWAS TASKS can be reconstructed accurately for users, admins, and regulators.',
    scope:
      'Covers /financialAuditLogs, /policyRevisions, /policyAcceptances, and /emailLogs.',
    rules: [
      'Financial settlements, withdrawal approvals/rejections, config updates, policy publications, and email dispatches generate permanent append-only records.',
      'No audit log collection permits client-side deletion or retroactive editing.',
    ],
    exampleScenario:
      'When an Admin updates the Withdrawal Policy from v1.0 to v1.1, a permanent PolicyRevision snapshot records the reason, date, editor UID, and full text.',
    userObligations: [
      'Retain your own transaction references for personal bookkeeping.',
    ],
    platformResponsibilities: [
      'Keep audit logging active and tamper-resistant via Firestore rules.',
    ],
    prohibitedConduct: [
      'Attempting to bypass or suppress audit trail creation.',
    ],
    procedures: [
      'Super Administrators review audit logs routinely inside Financial Control, Platform Email Settings, and Policy Control.',
    ],
    consequences: [
      'Audit discrepancies halt affected automated workflows until reconciled.',
    ],
  }),

  // =========================================================================
  // L. LEGAL & DISPUTES (11 POLICIES)
  // =========================================================================
  buildPolicyDocument({
    slug: 'governing-law',
    title: 'Governing Law Policy',
    categoryId: CAT_L.id,
    categoryTitle: CAT_L.title,
    summary:
      'Framework for determining applicable statutory law and mandatory local consumer/worker protections across SWAS TASKS.',
    relatedPolicySlugs: ['dispute-resolution', 'legal-compliance', 'terms-and-conditions'],
    pendingAdminReviewItems: [
      '[Administrator Review Required]: Specify the primary governing national law and exclusive court venue for SWAS TASKS contracts.',
    ],
    purpose:
      'Establishes legal predictability for platform agreements while respecting non-waivable statutory protections.',
    scope:
      'Applies to all SWAS TASKS Terms, Policies, and marketplace contracts.',
    rules: [
      'Platform Terms are intended to be governed by the primary operating jurisdiction designated by SWAS TASKS leadership (currently flagged for formal Administrator confirmation).',
      'Nothing in platform policies limits non-waivable statutory rights guaranteed under mandatory local law.',
    ],
    exampleScenario:
      'Regional payment rails (e.g., Kenya M-Pesa, Nigeria Paystack) remain subject to applicable local financial regulations in addition to platform rules.',
    userObligations: [
      'Ensure your use of SWAS TASKS complies with laws applicable in your residence.',
    ],
    platformResponsibilities: [
      'Publish the finalized governing jurisdiction clearly once formally designated.',
    ],
    prohibitedConduct: [
      'Using platform contracts to conduct unlawful cross-border activities.',
    ],
    procedures: [
      'Consult the finalized Legal Notice and Governing Law entry prior to formal legal claims.',
    ],
    consequences: [
      'If any clause is held unenforceable under local law, remaining provisions stay in full effect.',
    ],
  }),

  buildPolicyDocument({
    slug: 'dispute-resolution',
    title: 'Dispute Resolution Policy',
    categoryId: CAT_L.id,
    categoryTitle: CAT_L.title,
    summary:
      'Multi-step process resolving disagreements between Clients and Workers, or between users and the platform, constructively.',
    relatedPolicySlugs: ['mediation-arbitration', 'payment-disputes', 'appeals'],
    purpose:
      'Resolves disagreements promptly inside the platform before costly external proceedings become necessary.',
    scope:
      'Applies to task quality, deadline, scope, payment, and policy disputes.',
    rules: [
      'Parties should first attempt good-faith clarification inside Workspace Messages.',
      'Unresolved disputes escalate via Help & Support for evidence-based administrative review using Firestore task, assignment, and chat trails.',
    ],
    exampleScenario:
      'A Client and Worker disagree on whether a Data & Research spreadsheet matches the brief; Support reviews both the brief and final CSV URL to issue a fair resolution.',
    userObligations: [
      'Engage in Step 1 direct messaging and Step 2 Support mediation honestly before external escalation.',
    ],
    platformResponsibilities: [
      'Evaluate disputes neutrally without favoring either side automatically.',
    ],
    prohibitedConduct: [
      'Abusing chargebacks or social extortion to bypass platform dispute mediation.',
    ],
    procedures: [
      'Step 1: Direct Workspace Chat -> Step 2: Support Ticket Mediation -> Step 3: Independent Escalation / External Remedy.',
    ],
    consequences: [
      'Confirmed non-compliance in disputes informs enforcement and financial settlement rulings.',
    ],
  }),

  buildPolicyDocument({
    slug: 'mediation-arbitration',
    title: 'Mediation and Arbitration Policy',
    categoryId: CAT_L.id,
    categoryTitle: CAT_L.title,
    summary:
      'Outlines voluntary mediation and formal arbitration parameters where legally applicable and configured by SWAS TASKS.',
    relatedPolicySlugs: ['dispute-resolution', 'governing-law', 'legal-compliance'],
    pendingAdminReviewItems: [
      '[Administrator Review Required]: Confirm whether binding arbitration applies in selected jurisdictions, designate recognized arbitration institution/rules, and note small-claims/statutory carve-outs.',
    ],
    purpose:
      'Clarifies alternative dispute resolution options without imposing unverified or unlawful arbitration waivers.',
    scope:
      'Applies to unresolved disputes following internal platform review, where permitted by applicable law.',
    rules: [
      'Mediation may be offered voluntarily by agreement of both parties to settle complex commercial disputes.',
      'Mandatory arbitration terms apply ONLY where explicitly configured and permitted under the user’s mandatory local consumer/commercial laws.',
    ],
    exampleScenario:
      'Two parties on a high-value enterprise project agree to structured mediation prior to formal litigation.',
    userObligations: [
      'Submit written notice to swastaskorg@gmail.com detailing unresolved claims before initiating formal external proceedings.',
    ],
    platformResponsibilities: [
      'Participate in good faith during documented formal dispute notices.',
    ],
    prohibitedConduct: [
      'Filing vexatious duplicate proceedings simultaneously across multiple forums.',
    ],
    procedures: [
      'Written Notice of Dispute -> Good-Faith Negotiation Window -> Mediation / Applicable Forum.',
    ],
    consequences: [
      'No unconfigured arbitration forum is imposed until finalized by Administrator legal review.',
    ],
  }),

  buildPolicyDocument({
    slug: 'limitation-of-liability',
    title: 'Limitation of Liability Policy',
    categoryId: CAT_L.id,
    categoryTitle: CAT_L.title,
    summary:
      'Defines reasonable platform liability boundaries, indirect damages exclusions, and lawful non-excludable exceptions.',
    relatedPolicySlugs: ['platform-disclaimer', 'force-majeure', 'terms-and-conditions'],
    pendingAdminReviewItems: [
      '[Administrator Review Required]: Confirm exact statutory liability cap formula (if any) under designated governing law.',
    ],
    purpose:
      'Establishes transparent risk allocation appropriate for a digital task marketplace.',
    scope:
      'Applies to platform services, third-party payment integrations, and user-created task content.',
    rules: [
      'SWAS TASKS is not liable for indirect, incidental, or consequential losses resulting from third-party banking outages, user-entered wrong addresses, or external internet disruptions.',
      'Nothing in this policy excludes liability where exclusion is prohibited by applicable law (such as fraud or willful misconduct).',
    ],
    exampleScenario:
      'If a Worker supplies an incorrect crypto network despite explicit warnings, SWAS TASKS cannot reimburse third-party blockchain losses.',
    userObligations: [
      'Maintain local backups of deliverables and verify payout details carefully.',
    ],
    platformResponsibilities: [
      'Operate reasonable technical safeguards and honest status disclosures.',
    ],
    prohibitedConduct: [
      'Misrepresenting platform warranties to third-party clients.',
    ],
    procedures: [
      'Claims alleging direct platform error are reviewed via Financial Disputes and Support.',
    ],
    consequences: [
      'Liability caps remain subject to applicable statutory rules.',
    ],
  }),

  buildPolicyDocument({
    slug: 'force-majeure',
    title: 'Force Majeure Policy',
    categoryId: CAT_L.id,
    categoryTitle: CAT_L.title,
    summary:
      'Addresses excused performance delays caused by natural disasters, national telecom blackouts, war, or banking infrastructure failures.',
    relatedPolicySlugs: ['task-deadline', 'limitation-of-liability', 'platform-disclaimer'],
    purpose:
      'Protects Clients, Workers, and SWAS TASKS from unfair penalties when extraordinary events outside human control disrupt operations.',
    scope:
      'Applies to active assignments, payout timelines, and platform availability.',
    rules: [
      'Neither SWAS TASKS nor affected users are penalized for delays caused by verified extraordinary events such as major grid/ISP outages, severe natural disasters, or national payment rail shutdowns.',
      'Affected Workers or Clients should notify counterparties as soon as safely possible.',
    ],
    exampleScenario:
      'A regional fiber outage interrupts internet access for 24 hours; a Worker notifies the Client as soon as connectivity returns and avoids unfair bad-faith penalties.',
    userObligations: [
      'Communicate disruption promptly and resume or fairly cancel uncompleted work once safe.',
    ],
    platformResponsibilities: [
      'Grant reasonable deadline or penalty relief during verified force majeure events.',
    ],
    prohibitedConduct: [
      'Falsely claiming a disaster or outage to excuse routine negligence.',
    ],
    procedures: [
      'Notify Counterparty & Support -> Provide context -> Adjust deadline or reconcile partial completion.',
    ],
    consequences: [
      'Excused non-performance still requires fair reconciliation of unearned advance funds if tasks cannot proceed.',
    ],
  }),

  buildPolicyDocument({
    slug: 'intellectual-property',
    title: 'Intellectual Property Policy',
    categoryId: CAT_L.id,
    categoryTitle: CAT_L.title,
    summary:
      'Governs ownership of original deliverables upon verified settlement, Worker pre-existing tools, and SWAS TASKS brand assets.',
    relatedPolicySlugs: ['copyright-policy', 'third-party-content', 'workplace-confidentiality'],
    purpose:
      'Clarifies who owns deliverable IP before and after Client approval and protects SWAS TASKS proprietary trademarks.',
    scope:
      'Applies to all task outputs, proposals, platform UI, and brand marks.',
    rules: [
      'Unless otherwise specified in writing in the task brief, ownership/licensed rights to custom deliverables transfer to the Client upon assignment approval and verified settlement.',
      'Until a deliverable is approved and settled, Workers retain rights over unapproved drafts and pre-existing general libraries.',
      'SWAS TASKS brand marks, UI code, and original policy documents remain the intellectual property of SWAS TASKS.',
    ],
    exampleScenario:
      'A Client who rejects an assignment submission may not take and publish the rejected design commercially without paying the Worker.',
    userObligations: [
      'Deliver only original or properly licensed assets inside assignments.',
    ],
    platformResponsibilities: [
      'Enforce takedown of confirmed IP infringement across marketplace listings.',
    ],
    prohibitedConduct: [
      'Using rejected unpaid submissions, pirating paid software assets, or cloning SWAS TASKS branding.',
    ],
    procedures: [
      'IP ownership disputes may be submitted with supporting proof to swastaskorg@gmail.com.',
    ],
    consequences: [
      'IP theft triggers content removal, payment forfeiture, and account termination.',
    ],
  }),

  buildPolicyDocument({
    slug: 'copyright-policy',
    title: 'Copyright Policy',
    categoryId: CAT_L.id,
    categoryTitle: CAT_L.title,
    summary:
      'Prohibits copyright infringement in tasks and deliverables and outlines notice-and-takedown reporting procedures.',
    relatedPolicySlugs: ['intellectual-property', 'third-party-content', 'legal-notice'],
    purpose:
      'Protects creators and rights holders against unauthorized copying or distribution on SWAS TASKS.',
    scope:
      'Applies to uploaded attachments, deliverable links, profile content, and task briefs.',
    rules: [
      'Users must not post tasks requesting copyrighted piracy or submit plagiarized copyrighted materials.',
      'Rights holders may submit detailed copyright takedown notices to swastaskorg@gmail.com identifying the infringing task/profile and proof of ownership.',
    ],
    exampleScenario:
      'A Worker caught delivering stock photography downloaded without license for a commercial Design & Media task faces rejection and copyright strike review.',
    userObligations: [
      'Verify open-source or commercial licenses for any third-party assets included in deliverables.',
    ],
    platformResponsibilities: [
      'Act expeditiously on substantiated copyright notices and allow legitimate counter-notices.',
    ],
    prohibitedConduct: [
      'Submitting counterfeit claims or repeat copyright infringement.',
    ],
    procedures: [
      'Send takedown notice to swastaskorg@gmail.com -> Content disabled -> Counter-notice opportunity -> Resolution.',
    ],
    consequences: [
      'Repeat copyright infringers receive permanent termination.',
    ],
  }),

  buildPolicyDocument({
    slug: 'third-party-content',
    title: 'Third-Party Content Policy',
    categoryId: CAT_L.id,
    categoryTitle: CAT_L.title,
    summary:
      'Rules covering external links, open-source components, client-supplied brand kits, and third-party APIs used inside tasks.',
    relatedPolicySlugs: ['copyright-policy', 'third-party-services', 'acceptable-use'],
    purpose:
      'Clarifies licensing disclosures and safety duties when deliverables incorporate external libraries or links.',
    scope:
      'Applies to external links and licensed assets referenced in tasks or submissions.',
    rules: [
      'Workers incorporating open-source libraries or third-party assets into deliverables must disclose license obligations clearly in submission notes.',
      'SWAS TASKS does not endorse or control external websites linked in user-submitted attachmentUrl fields.',
    ],
    exampleScenario:
      'A Web & Technical Worker delivering a landing page lists the MIT-licensed icons included so the Client knows commercial reuse is permitted.',
    userObligations: [
      'Ensure external deliverable links are safe, malware-free, and properly licensed.',
    ],
    platformResponsibilities: [
      'Enforce safe URL validation blocking dangerous script schemes.',
    ],
    prohibitedConduct: [
      'Slipping GPL-incompatible or unlicensed proprietary assets into Client projects undisclosed.',
    ],
    procedures: [
      'Report unsafe or infringing external links via Help & Support.',
    ],
    consequences: [
      'Malicious or infringing third-party links result in immediate removal and sanctions.',
    ],
  }),

  buildPolicyDocument({
    slug: 'changes-to-terms',
    title: 'Policy Amendment & Changes to Terms Policy',
    categoryId: CAT_L.id,
    categoryTitle: CAT_L.title,
    summary:
      'Governs how SWAS TASKS updates policies, tracks version numbers, records change reasons, notifies users, and requires renewed acceptance.',
    relatedPolicySlugs: ['notifications-policy', 'announcements-policy', 'audit-accountability'],
    purpose:
      'Ensures platform rule changes are never slipped in silently without version tracking, change reasons, and renewed user consent for material updates.',
    scope:
      'Applies to every policy inside the SWAS TASKS Legal & Policies Centre.',
    rules: [
      'Every policy displays its current version number, status (Published, Updated, Draft, Archived), effective date, and last updated date.',
      'Administrators must record a clear reason for every published policy revision, preserved in immutable PolicyRevision history.',
      'Material policy changes never silently retroactively mark a user as having accepted the new version; affected users must actively accept the updated version and receive real notifications.',
    ],
    exampleScenario:
      'When Terms and Conditions updates from v1.0 to v2.0, My Accepted Policies shows v1.0 as previously accepted and highlights v2.0 under "Policies Updated Since Your Last Acceptance" requiring active review and consent.',
    userObligations: [
      'Review policy update notices and complete required re-acceptance before continuing affected workflows.',
    ],
    platformResponsibilities: [
      'Preserve old version snapshots for side-by-side comparison and notify affected users honestly.',
    ],
    prohibitedConduct: [
      'Silently backdating effective dates or forging acceptance timestamps.',
    ],
    procedures: [
      'Admin edits draft -> Previews -> Sets version, effective date & change reason -> Publishes -> Notifies users -> Tracks new acceptances.',
    ],
    consequences: [
      'Users declining material updated terms may cease new tasks and close accounts while settling legitimate existing verified balances.',
    ],
  }),

  buildPolicyDocument({
    slug: 'legal-compliance',
    title: 'Legal Compliance Policy',
    categoryId: CAT_L.id,
    categoryTitle: CAT_L.title,
    summary:
      'Requires lawful platform operation, anti-corruption adherence, sanctions awareness, and alignment with regional commercial laws.',
    relatedPolicySlugs: ['governing-law', 'regulatory-cooperation', 'financial-fraud-prevention'],
    pendingAdminReviewItems: [
      '[Administrator Review Required]: Confirm applicable national anti-money-laundering, tax reporting, and sanctions screening obligations for target operating countries.',
    ],
    purpose:
      'Commits SWAS TASKS and all platform users to lawful conduct across every operating jurisdiction.',
    scope:
      'Applies to all users, staff, transactions, and task categories.',
    rules: [
      'Users must not use SWAS TASKS in violation of export controls, financial sanctions, labor laws, tax statutes, or anti-corruption laws.',
      'Enabled regional payout gateways operate only in compliance with local regulatory permissions.',
    ],
    exampleScenario:
      'Cryptocurrency payouts remain disabled unless explicitly reviewed, legally approved, and enabled by Super Administrators in Financial Control.',
    userObligations: [
      'Comply with all laws applicable to your freelance or business operations.',
    ],
    platformResponsibilities: [
      'Review regulatory requirements before activating new countries, currencies, or automated gateways.',
    ],
    prohibitedConduct: [
      'Using the marketplace to facilitate illegal transactions or evade legal compliance.',
    ],
    procedures: [
      'Compliance issues are escalated to Super Administrators and legal advisors.',
    ],
    consequences: [
      'Accounts engaging in unlawful activity face immediate termination and asset freeze where legally mandated.',
    ],
  }),

  buildPolicyDocument({
    slug: 'regulatory-cooperation',
    title: 'Regulatory Cooperation Policy',
    categoryId: CAT_L.id,
    categoryTitle: CAT_L.title,
    summary:
      'Outlines lawful handling of valid judicial orders, subpoenas, financial intelligence inquiries, and verified regulatory requests.',
    relatedPolicySlugs: ['legal-compliance', 'data-sharing', 'privacy'],
    purpose:
      'Balances user privacy protection against mandatory compliance with valid legal process.',
    scope:
      'Applies to requests received from law enforcement, courts, tax authorities, or financial regulators.',
    rules: [
      'SWAS TASKS discloses private user or ledger records externally ONLY upon valid, legally binding process or verified urgent safety/fraud prevention necessity.',
      'All official legal requests must be verified by Super Administrators via swastaskorg@gmail.com before processing.',
    ],
    exampleScenario:
      'An informal unverified email claiming to be an officer without formal warrant or legal authority is rejected to protect user privacy.',
    userObligations: [
      'Keep truthful registration and financial records to avoid compliance disruptions.',
    ],
    platformResponsibilities: [
      'Scrutinize legal requests strictly for validity and limit disclosures to the exact scope legally required.',
    ],
    prohibitedConduct: [
      'Fabricating regulatory threats or falsifying legal subpoenas.',
    ],
    procedures: [
      'Verify authority & scope -> Log audit trail -> Produce minimally required records -> Notify user unless legally prohibited.',
    ],
    consequences: [
      'Fraudulent impersonation of regulators triggers immediate permanent ban and criminal referral.',
    ],
  }),
];
