import type { PolicyDocument } from '../../types/marketplace';
import { buildPolicyDocument } from './builder';

const CAT_A = { id: 'platform-general', title: 'Platform & General Rules' };
const CAT_B = { id: 'accounts-registration', title: 'Accounts & Registration' };

export const PART1_POLICIES: PolicyDocument[] = [
  // =========================================================================
  // A. PLATFORM & GENERAL RULES (12 POLICIES)
  // =========================================================================
  buildPolicyDocument({
    slug: 'terms-and-conditions',
    title: 'Terms and Conditions of Service',
    categoryId: CAT_A.id,
    categoryTitle: CAT_A.title,
    summary:
      'Master contractual framework governing Client and Worker use of SWAS TASKS, marketplace tasks, assignments, ledgers, and compliance obligations.',
    requiresAcceptance: true,
    acceptanceContexts: ['registration', 'workplace', 'withdrawal'],
    relatedPolicySlugs: ['platform-rules', 'privacy', 'user-conduct', 'earnings', 'withdrawals', 'dispute-resolution'],
    pendingAdminReviewItems: [
      '[Administrator Review Required]: Designate the official legal entity name, registration number, and registered physical jurisdiction of SWAS TASKS.',
      '[Administrator Review Required]: Confirm mandatory statutory cooling-off or minimum age threshold applicable in primary operating jurisdictions.',
    ],
    purpose:
      'These Terms and Conditions of Service govern every account, workspace session, task brief, worker bid, accepted assignment, communication thread, and financial ledger record on SWAS TASKS.',
    scope:
      'These Terms apply to all public visitors, registered Clients, registered Workers, Department Staff, Reviewers, and Administrators accessing the SWAS TASKS platform.',
    definitions: [
      'Client: A verified account holder who posts structured task briefs, reviews worker bids, manages active projects, and approves completed deliverables.',
      'Worker: A verified account holder who browses open briefs, submits competitive bids, delivers assignments, and withdraws verified settled balances.',
      'Assignment: A binding work engagement created when a Client accepts a Worker bid, locking agreed remuneration and delivery timeline.',
      'Verified Settled Balance: Funds confirmed by backend payment-provider or finance verification and eligible for withdrawal under the Financial Centre rules.',
    ],
    rules: [
      'Access to marketplace actions (posting tasks, bidding, submitting work, messaging, saving payout accounts, and withdrawing funds) requires a verified Firebase-authenticated account with verified email ownership.',
      'Each account holds an immutable role (Client or Worker) assigned during onboarding; dual-role abuse or cross-role manipulation is prohibited.',
      'Accepted bids bind the Client and Worker to the agreed budget, scope, and deadline unless modified through formal revision requests or documented support mediation.',
      'Client assignment approvals log verifiable pending_confirmation ledger transactions; no earning is treated as verified_settled without confirmed backend settlement.',
      'Official platform communications originate from SWAS TASKS <swastaskorg@gmail.com> and in-app notification channels.',
    ],
    exampleScenario:
      'If a Client posts a Data & Research brief for KES 4,500 and accepts a Worker bid at KES 4,200 with a 3-day timeline, the agreedKES on the resulting assignment is locked at KES 4,200. Neither party may unilaterally alter the agreed price after acceptance.',
    userObligations: [
      'Provide truthful identity, business, and payout account information.',
      'Perform tasks and review deliverables in good faith within stated scopes.',
      'Accept updated material policy terms before continuing affected workflows.',
    ],
    platformResponsibilities: [
      'Enforce role-isolated workspaces and owner-scoped data access via backend security rules.',
      'Maintain transparent ledger status separation between pending confirmation and verified settled funds.',
      'Deliver timely policy change notifications and preserve immutable acceptance audit records.',
    ],
    prohibitedConduct: [
      'Circumventing platform workflows to solicit off-platform payments aimed at evading ledger records or compliance checks.',
      'Operating automated scripts, scrapers, or multiple accounts to manipulate task availability or bids.',
      'Submitting plagiarized, fabricated, or malicious deliverables or refusing payment approval for compliant work.',
    ],
    procedures: [
      'Users explicitly accept these Terms via an unchecked checkbox during registration and whenever material revisions are published.',
      'Violations trigger graduated enforcement under the Enforcement & Penalties Policy, with full appeal rights.',
    ],
    exceptions: [
      'Written enterprise addenda authorized by the SWAS TASKS Super Administrator may supplement task volume or invoicing workflows without waiving core security rules.',
    ],
    consequences: [
      'Written compliance warning and mandatory corrective action.',
      'Temporary restriction of bidding, task posting, or withdrawal privileges.',
      'Account suspension or permanent termination for severe or repeated breaches.',
    ],
  }),

  buildPolicyDocument({
    slug: 'platform-rules',
    title: 'Platform Rules and Regulations',
    categoryId: CAT_A.id,
    categoryTitle: CAT_A.title,
    summary:
      'Operational code governing daily interactions across SWAS TASKS workspaces, bidding boards, messaging threads, and financial submissions.',
    requiresAcceptance: false,
    relatedPolicySlugs: ['terms-and-conditions', 'user-conduct', 'acceptable-use', 'task-participation'],
    purpose:
      'Platform Rules and Regulations translate high-level contractual Terms into concrete day-to-day operational rules for both Clients and Workers.',
    scope:
      'Applies to all activity conducted on public task boards, Client Workplaces, Worker Workplaces, direct chat threads, and the Financial Centre.',
    rules: [
      'All task listings must describe verifiable deliverables, realistic timelines, and accurate compensation before publication.',
      'All bids must reflect genuine capacity, realistic delivery days, and original proposals tailored to the task brief.',
      'Task communications and deliverable links must stay free of malware, credential harvesters, or deceptive redirects.',
      'Users must keep contact and payout destination details current and accurate.',
    ],
    exampleScenario:
      'A Worker submits generic copy-pasted spam bids across twenty unrelated Web & Technical tasks within two minutes. Under Platform Rules, automated or spam bidding triggers rate limits and a warning review.',
    userObligations: [
      'Use designated platform routes for bidding, assignment delivery, revisions, and support escalation.',
      'Respect visibility restrictions on invite-only tasks.',
    ],
    platformResponsibilities: [
      'Provide clear workspace status labels across tasks, bids, assignments, and payouts.',
      'Enforce input validation bounds and safe URL rules across every form submission.',
    ],
    prohibitedConduct: [
      'Posting misleading task budgets or concealed off-platform requirements.',
      'Harassing, threatening, or pressuring counterparties to bypass revision or review stages.',
    ],
    procedures: [
      'Suspected rule breaches are logged via Support tickets or automated audit triggers and reviewed by compliance staff.',
    ],
    consequences: [
      'Task unpublishing, bid cancellation, violation point accrual, or workspace suspension.',
    ],
  }),

  buildPolicyDocument({
    slug: 'privacy',
    title: 'Privacy Policy',
    categoryId: CAT_A.id,
    categoryTitle: CAT_A.title,
    summary:
      'Explains how SWAS TASKS collects, isolates, processes, and protects private user data, public profiles, and payout records.',
    requiresAcceptance: true,
    acceptanceContexts: ['registration', 'payout_account'],
    relatedPolicySlugs: ['cookie-policy', 'personal-data-collection', 'data-retention', 'data-deletion', 'privacy-rights'],
    pendingAdminReviewItems: [
      '[Administrator Review Required]: Confirm designated Data Protection Officer (DPO) contact details and applicable data protection authority filing reference.',
    ],
    purpose:
      'This Privacy Policy explains what personal, account, task, and financial information SWAS TASKS collects and how strict collection isolation protects user privacy.',
    scope:
      'Covers all personal data processed via Firebase Authentication, Cloud Firestore user documents, Financial Centre payout accounts, support tickets, and official email logs.',
    definitions: [
      'Private User Data: Information stored in owner-isolated /users/{uid} and /payoutAccounts documents (email, phone, masked payout identifiers, notification toggles).',
      'Public Profile Data: Limited non-PII marketplace attributes stored in /publicProfiles/{uid} (display name, role, bio, optional skills, optional business name).',
    ],
    rules: [
      'Private contact numbers, email addresses, and account settings are isolated inside owner-readable Firestore documents and are never exposed on public task boards.',
      'Saved payout destinations display only masked account endings (e.g., •••• 4821) across standard UI views.',
      'SWAS TASKS never collects or stores cryptocurrency private keys, wallet seed phrases, or banking PINs.',
      'Access to administrative user lists is strictly verified against backend Super Administrator identity checks.',
    ],
    exampleScenario:
      'When a Worker views a public task card, they see the Client display name and task description, never the Client email address, phone number, or financial account details.',
    userObligations: [
      'Avoid pasting sensitive personal IDs, passwords, or private banking PINs into public task descriptions or chat attachments.',
    ],
    platformResponsibilities: [
      'Enforce split collection isolation between /users and /publicProfiles via Firestore security rules.',
      'Restrict third-party data transmission strictly to configured authentication, SMTP email, and approved payout providers.',
    ],
    prohibitedConduct: [
      'Scraping, harvesting, or redistributing other users’ names, profiles, or contact details.',
    ],
    procedures: [
      'Users can inspect and update profile preferences in Account Settings and request data export or erasure via Support or swastaskorg@gmail.com.',
    ],
    consequences: [
      'Unauthorized data scraping or doxxing results in immediate permanent ban and potential legal referral.',
    ],
  }),

  buildPolicyDocument({
    slug: 'cookie-policy',
    title: 'Cookie Policy',
    categoryId: CAT_A.id,
    categoryTitle: CAT_A.title,
    summary:
      'Details essential authentication tokens, session persistence preferences, and local browser storage used by SWAS TASKS.',
    relatedPolicySlugs: ['privacy', 'tracking-cookies', 'third-party-services'],
    pendingAdminReviewItems: [
      '[Administrator Review Required]: Confirm whether optional third-party analytics cookies will be introduced in future releases and configure regional consent banner rules accordingly.',
    ],
    purpose:
      'This Cookie Policy clarifies how SWAS TASKS uses browser storage, Firebase session persistence, and security tokens to keep user sessions safe and functional.',
    scope:
      'Applies to all browsers and devices accessing the SWAS TASKS web application.',
    rules: [
      'SWAS TASKS relies strictly on essential authentication persistence (Firebase Auth local or session storage depending on Remember Me selection) and UI state tokens.',
      'No third-party advertising trackers or cross-site behavioral ad cookies are injected by default.',
    ],
    exampleScenario:
      'Unchecking "Remember Me" on the Sign In screen switches Firebase Auth persistence to browserSessionPersistence so the session clears when the browser window closes.',
    userObligations: [
      'Keep browser storage protected on shared devices by signing out after finishing work.',
    ],
    platformResponsibilities: [
      'Respect user Remember Me persistence choices and limit storage strictly to functional session and security requirements.',
    ],
    prohibitedConduct: [
      'Attempting to extract, replay, or tamper with authentication tokens belonging to another user.',
    ],
    procedures: [
      'Users may clear cookies and IndexedDB/sessionStorage at any time via browser settings, which signs out active sessions.',
    ],
    consequences: [
      'Session hijacking attempts trigger immediate token revocation and account security lockdowns.',
    ],
  }),

  buildPolicyDocument({
    slug: 'user-conduct',
    title: 'User Conduct & Behaviour Policy',
    categoryId: CAT_A.id,
    categoryTitle: CAT_A.title,
    summary:
      'Standards of honesty, respectful collaboration, and professional conduct required of every SWAS TASKS member.',
    requiresAcceptance: true,
    acceptanceContexts: ['registration', 'workplace'],
    relatedPolicySlugs: ['community-standards', 'professional-communication', 'prohibited-activities', 'warning-system'],
    purpose:
      'To preserve a trustworthy, productive marketplace where Clients and Workers collaborate professionally without harassment, deception, or coercion.',
    scope:
      'Applies to task descriptions, bid proposals, deliverable submissions, revision feedback, direct messages, support tickets, and profile bios.',
    rules: [
      'All members must communicate honestly, respectfully, and constructively across every workspace channel.',
      'Criticism of submitted work must focus strictly on deliverable requirements and objective accuracy.',
      'Users must respect agreed boundaries and never coerce counterparties into fraudulent approvals or fake positive records.',
    ],
    exampleScenario:
      'A Client requesting a revision specifies exact missing rows in a submitted spreadsheet rather than sending abusive insults or threatening an unjustified dispute.',
    userObligations: [
      'Maintain courteous, clear communication and respond professionally during active assignments.',
    ],
    platformResponsibilities: [
      'Investigate abuse reports backed by conversation timestamps and assign proportional penalties.',
    ],
    prohibitedConduct: [
      'Hate speech, discriminatory remarks, threats, extortion, sexual harassment, or intimidation.',
      'Soliciting bribes, fake reviews, or sham task completions.',
    ],
    procedures: [
      'Report misconduct via Help & Support under "Account & Security" with conversation or task IDs.',
    ],
    consequences: [
      'Formal warning, messaging restriction, assignment cancellation, or permanent ban.',
    ],
  }),

  buildPolicyDocument({
    slug: 'community-standards',
    title: 'Community Standards',
    categoryId: CAT_A.id,
    categoryTitle: CAT_A.title,
    summary:
      'Shared marketplace values promoting fairness, inclusive participation, original effort, and mutual respect.',
    relatedPolicySlugs: ['user-conduct', 'acceptable-use', 'task-quality-standards'],
    purpose:
      'Defines the cultural and ethical standards expected throughout the SWAS TASKS community.',
    scope:
      'Applies to all public marketplace content and peer-to-peer interactions.',
    rules: [
      'Marketplace listings and profiles must be free from discriminatory exclusions unrelated to legitimate task skills or regional language requirements.',
      'Work submitted on SWAS TASKS must represent genuine human or disclosed permitted effort without deceptive misrepresentation.',
    ],
    exampleScenario:
      'Public task listings clearly define deliverables and technical skills without demeaning language or exclusionary personal attacks.',
    userObligations: [
      'Represent skills, turnaround times, and project constraints accurately.',
    ],
    platformResponsibilities: [
      'Moderate reported public listings that violate community dignity or truthfulness rules.',
    ],
    prohibitedConduct: [
      'Defamation, impersonation of SWAS TASKS staff, or coordinated harassment campaigns.',
    ],
    procedures: [
      'Reported tasks or profiles undergo Trust & Safety review before removal or warning issuance.',
    ],
    consequences: [
      'Listing removal, violation points, or account suspension.',
    ],
  }),

  buildPolicyDocument({
    slug: 'acceptable-use',
    title: 'Acceptable Use Policy',
    categoryId: CAT_A.id,
    categoryTitle: CAT_A.title,
    summary:
      'Technical and operational boundaries defining legitimate use of SWAS TASKS web routes, APIs, and Firestore workflows.',
    relatedPolicySlugs: ['prohibited-activities', 'automated-tools-bots', 'cybersecurity', 'unauthorized-access'],
    purpose:
      'Protects platform availability, data integrity, and fair access by defining permissible technical and commercial usage.',
    scope:
      'Applies to all human users, browsers, network traffic, and integrations interacting with SWAS TASKS endpoints.',
    rules: [
      'Users may access SWAS TASKS solely through official web interfaces and authorized authentication sessions.',
      'Uploaded or linked deliverable URLs must be safe, lawful, and directly relevant to the assigned task.',
    ],
    exampleScenario:
      'Sharing a Google Drive or GitHub deliverable link inside an active assignment submission is acceptable; running a headless browser script to auto-bid every 5 seconds violates this policy.',
    userObligations: [
      'Use platform features strictly for legitimate task execution, management, and payouts.',
    ],
    platformResponsibilities: [
      'Protect endpoints with verified token checks, rate controls, and schema validation.',
    ],
    prohibitedConduct: [
      'Denial-of-service attempts, vulnerability scanning without written authorization, scraping, or spam payloads.',
    ],
    procedures: [
      'Technical abuse triggers immediate rate throttling, session invalidation, and investigation.',
    ],
    consequences: [
      'Immediate IP/account block and permanent ban for malicious interference.',
    ],
  }),

  buildPolicyDocument({
    slug: 'user-responsibilities',
    title: 'User Responsibilities Policy',
    categoryId: CAT_A.id,
    categoryTitle: CAT_A.title,
    summary:
      'Clarifies personal accountability for account credentials, device security, deliverable verification, and tax or local compliance.',
    relatedPolicySlugs: ['terms-and-conditions', 'account-security', 'payout-accounts'],
    pendingAdminReviewItems: [
      '[Administrator Review Required]: Clarify any local tax reporting or withholding obligations required by relevant national revenue authorities.',
    ],
    purpose:
      'Ensures every Client and Worker understands the operational responsibilities they retain as independent marketplace participants.',
    scope:
      'Applies to all registered Client and Worker accounts.',
    rules: [
      'Account holders are responsible for maintaining accurate profile data, securing login credentials, and verifying payout destinations prior to withdrawal submission.',
      'Clients are responsible for reviewing deliverables thoroughly within agreed timelines before clicking final approval.',
      'Workers are responsible for maintaining backups of delivered work during revision windows.',
    ],
    exampleScenario:
      'Before confirming a bank payout destination, a Worker verifies their account last-4 digits and bank branch code to avoid failed transfers.',
    userObligations: [
      'Confirm recipient account ownership before submitting payout requests.',
      'Maintain independent compliance with applicable local tax and business licensing laws.',
    ],
    platformResponsibilities: [
      'Provide clear confirmation prompts, masked account summaries, and itemized transaction logs.',
    ],
    prohibitedConduct: [
      'Shifting responsibility for deliberate credential sharing or unverified third-party destination entry onto the platform.',
    ],
    procedures: [
      'Disputes over misdirected payouts are handled under the Incorrect Payment Policy and Financial Disputes Policy.',
    ],
    consequences: [
      'Delayed payouts or account review if inaccurate records repeatedly cause failed settlements.',
    ],
  }),

  buildPolicyDocument({
    slug: 'prohibited-activities',
    title: 'Prohibited Activities Policy',
    categoryId: CAT_A.id,
    categoryTitle: CAT_A.title,
    summary:
      'Explicit catalog of forbidden tasks, unlawful conduct, financial schemes, and security exploits barred from SWAS TASKS.',
    relatedPolicySlugs: ['acceptable-use', 'task-fraud', 'financial-fraud-prevention', 'permanent-ban'],
    purpose:
      'Sets clear red-line prohibitions protecting users, payment partners, and platform integrity from illegal or abusive use.',
    scope:
      'Applies to all task briefs, bids, submissions, messages, and payout activity.',
    rules: [
      'Tasks involving illegal goods, credential theft, fake identity generation, academic cheating mills, malware distribution, or spam campaigns are strictly forbidden.',
      'Money laundering, wash-trading tasks (self-hiring across colluding accounts), and stolen payment instruments are prohibited.',
    ],
    exampleScenario:
      'A Client attempts to post a task asking Workers to create 50 fake social media reviews or bypass CAPTCHAs on external banking sites. The task is rejected and the account suspended.',
    userObligations: [
      'Decline and report any task requesting unlawful, deceptive, or harmful actions.',
    ],
    platformResponsibilities: [
      'Remove prohibited listings promptly and freeze suspect financial transfers pending investigation.',
    ],
    prohibitedConduct: [
      'Posting or executing tasks involving fraud, phishing, unlicensed financial solicitation, or copyright piracy.',
      'Using task budgets to transfer funds between colluding accounts without real deliverable work.',
    ],
    procedures: [
      'Reported tasks enter immediate Trust & Safety hold and audit.',
    ],
    consequences: [
      'Immediate task closure, forfeiture/reversal of fraudulent ledger entries, permanent ban, and regulatory reporting where required.',
    ],
  }),

  buildPolicyDocument({
    slug: 'platform-disclaimer',
    title: 'Platform Disclaimer',
    categoryId: CAT_A.id,
    categoryTitle: CAT_A.title,
    summary:
      'Explains marketplace intermediary boundaries, uptime limitations, and honest non-guarantee disclosures for external providers.',
    relatedPolicySlugs: ['terms-and-conditions', 'limitation-of-liability', 'payment-provider', 'exchange-rate'],
    purpose:
      'Provides transparent disclosures regarding platform availability, independent user work quality, and external payment/rate provider dependencies.',
    scope:
      'Applies to all SWAS TASKS marketplace features, ledger estimates, and external payment rails.',
    rules: [
      'SWAS TASKS operates as a structured task marketplace platform and does not guarantee continuous uninterrupted availability during external network or third-party provider outages.',
      'Balances remain strictly isolated in their recorded currency unless an active verified exchange-rate provider is configured; no synthetic conversion rates are implied.',
      'Automated payouts depend on live external gateway readiness; manual finance review applies where automated APIs are unconfigured or unsupported.',
    ],
    exampleScenario:
      'If a regional mobile money gateway experiences scheduled maintenance, withdrawal requests enter pending_verification or processing until confirmed settlement rather than displaying false instant completion.',
    userObligations: [
      'Verify critical deadlines and external payout readiness before time-sensitive commitments.',
    ],
    platformResponsibilities: [
      'Display honest integration statuses (Connected, Automated, Manual Only, Unavailable) without misleading claims.',
    ],
    prohibitedConduct: [
      'Misrepresenting SWAS TASKS as an employer, bank, or licensed deposit-taking institution.',
    ],
    procedures: [
      'Service disruptions are communicated via in-app announcements and official email notices where configured.',
    ],
    consequences: [
      'Misrepresentation of platform status or agency may result in account suspension.',
    ],
  }),

  buildPolicyDocument({
    slug: 'legal-notice',
    title: 'Legal Notice',
    categoryId: CAT_A.id,
    categoryTitle: CAT_A.title,
    summary:
      'Official platform identification, official correspondence address (swastaskorg@gmail.com), and formal legal contact channels.',
    relatedPolicySlugs: ['terms-and-conditions', 'governing-law', 'copyright-policy'],
    pendingAdminReviewItems: [
      '[Administrator Review Required]: Insert official registered corporate entity name, company registration number, and physical service address for formal legal notices.',
    ],
    purpose:
      'Identifies the official communication channels, copyright attribution, and formal notice protocol for SWAS TASKS.',
    scope:
      'Applies to all legal notices, regulatory inquiries, intellectual property claims, and official platform correspondence.',
    rules: [
      'Official electronic communications from SWAS TASKS are issued from swastaskorg@gmail.com with sender display name "SWAS TASKS".',
      'Legal notices or compliance inquiries submitted by users or authorities should reference the relevant policy, UID, or task reference ID.',
    ],
    exampleScenario:
      'A rights holder seeking takedown of infringing task material emails swastaskorg@gmail.com with the task ID and ownership documentation.',
    userObligations: [
      'Verify that official SWAS TASKS emails originate from swastaskorg@gmail.com or authenticated in-app Control Centre dispatches.',
    ],
    platformResponsibilities: [
      'Maintain auditable outgoing email records and prompt legal correspondence routing.',
    ],
    prohibitedConduct: [
      'Spoofing SWAS TASKS branding, sender names, or legal notices.',
    ],
    procedures: [
      'Direct formal legal notices to swastaskorg@gmail.com.',
    ],
    consequences: [
      'Brand impersonation leads to permanent account termination and legal escalation.',
    ],
  }),

  buildPolicyDocument({
    slug: 'definitions-interpretation',
    title: 'Definitions and Interpretation',
    categoryId: CAT_A.id,
    categoryTitle: CAT_A.title,
    summary:
      'Standardized glossary and interpretation rules ensuring uniform meaning across all SWAS TASKS policy documents.',
    relatedPolicySlugs: ['terms-and-conditions', 'changes-to-terms'],
    purpose:
      'Eliminates ambiguity by defining recurring technical, operational, and financial terms used across the Policy Centre.',
    scope:
      'Applies to every policy published inside the SWAS TASKS Legal & Policies Centre.',
    definitions: [
      'Pending Confirmation: Ledger status logged upon Client assignment approval before backend settlement confirmation.',
      'Verified Settled: Ledger status confirmed by finance or backend payment provider verification.',
      'Material Policy Change: A revision modifying user rights, financial rules, eligibility, or mandatory obligations requiring renewed acceptance.',
      'Super Administrator: Verified central governance authority operating the SWAS TASKS Central Control Centre.',
    ],
    rules: [
      'Headings are for readability and do not limit substantive clauses.',
      'Where a specific category policy (e.g., Withdrawal Policy) conflicts with a general rule, the more specific rule governs that subject.',
      'Where an item is flagged "[Administrator Review Required]", no unapproved fee or statutory term is implied.',
    ],
    exampleScenario:
      'If a general conduct rule and the Support Channel Misconduct Policy both apply to a helpdesk interaction, the specific Helpdesk Policy rules govern support channel penalties.',
    userObligations: [
      'Review linked related policies when interpreting cross-cutting obligations.',
    ],
    platformResponsibilities: [
      'Keep policy terminology synchronized across UI labels, Firestore statuses, and policy text.',
    ],
    prohibitedConduct: [
      'Using semantic distortion or partial quotes to justify prohibited activity.',
    ],
    procedures: [
      'Clarification requests on policy interpretation may be submitted via Help & Support.',
    ],
    consequences: [
      'Policy interpretation by SWAS TASKS compliance reviewers applies consistently across all users.',
    ],
  }),

  // =========================================================================
  // B. ACCOUNTS & REGISTRATION (13 POLICIES)
  // =========================================================================
  buildPolicyDocument({
    slug: 'account-registration',
    title: 'Account Registration Policy',
    categoryId: CAT_B.id,
    categoryTitle: CAT_B.title,
    summary:
      'Requirements for creating a SWAS TASKS Client or Worker account via email/password or Google Sign-In, including mandatory policy acceptance.',
    requiresAcceptance: true,
    acceptanceContexts: ['registration'],
    relatedPolicySlugs: ['account-verification', 'one-account-per-user', 'account-eligibility', 'terms-and-conditions'],
    purpose:
      'Establishes transparent onboarding rules so every registered account begins with verified identity details and explicit consent to core governance rules.',
    scope:
      'Applies to all prospective Clients and Workers registering through Sign Up or Continue with Google onboarding.',
    rules: [
      'Registrants must select an accurate account role (Client or Worker) and provide their real full name.',
      'Active, un-prechecked acceptance of the Terms and Conditions, Privacy Policy, User Conduct Policy, and Earnings & Withdrawal Policy is required before account creation.',
      'Duplicate accounts using the same email across password and Google Sign-In are prevented via secure account linking.',
    ],
    exampleScenario:
      'A user who previously signed up with email/password later clicks Continue with Google using the same email address; SWAS TASKS prompts them to verify their existing password to link Google Sign-In rather than creating a second profile.',
    userObligations: [
      'Read linked policies before checking registration consent boxes.',
      'Choose the correct workspace role matching intended platform activity.',
    ],
    platformResponsibilities: [
      'Record timestamped acceptance entries tied to the user UID and presented policy version.',
      'Prevent duplicate profile creation via provider linking safeguards.',
    ],
    prohibitedConduct: [
      'Registering with disposable/burner identities or false personal names.',
      'Creating automated bulk registrations.',
    ],
    procedures: [
      'Complete registration -> verify email (if email/password) -> complete onboarding role confirmation -> enter workspace.',
    ],
    consequences: [
      'Incomplete or fraudulent registrations remain blocked from workspace actions and may be closed.',
    ],
  }),

  buildPolicyDocument({
    slug: 'account-verification',
    title: 'Identity & Account Verification Policy',
    categoryId: CAT_B.id,
    categoryTitle: CAT_B.title,
    summary:
      'Governs email verification gates, payout destination verification, and stepped identity checks prior to sensitive financial actions.',
    relatedPolicySlugs: ['account-registration', 'account-activation', 'withdrawal-policy', 'false-information'],
    pendingAdminReviewItems: [
      '[Administrator Review Required]: Define threshold limits or regulatory tiers requiring government-issued KYC ID document upload before high-value payouts.',
    ],
    purpose:
      'Ensures that only verified account owners access workspace operations, task contracting, and financial withdrawals.',
    scope:
      'Applies to Firebase email verification, Google-authenticated verification, and payout account verification states.',
    rules: [
      'Firestore security rules enforce email_verified == true for creating tasks, placing bids, sending messages, saving payout accounts, and requesting withdrawals.',
      'Payout accounts enter pending or requires_review status until verified by finance review or supported provider validation.',
      'Modifying or adding payout destinations requires active re-authentication.',
    ],
    exampleScenario:
      'A newly registered email/password user sees the Email Verification Required gate and cannot submit bids until clicking the verification link and refreshing their verified state.',
    userObligations: [
      'Complete email verification promptly and supply matching account-holder names on payout accounts.',
    ],
    platformResponsibilities: [
      'Enforce verification checks at both backend security rule and API levels.',
    ],
    prohibitedConduct: [
      'Submitting forged verification documents or mismatched third-party bank/mobile identities.',
    ],
    procedures: [
      'Unverified users can resend verification emails from the verification gate; payout verification reviews occur inside Financial Control.',
    ],
    consequences: [
      'Unverified accounts cannot transact; fraudulent verification attempts trigger immediate suspension.',
    ],
  }),

  buildPolicyDocument({
    slug: 'account-activation',
    title: 'Account Activation Policy',
    categoryId: CAT_B.id,
    categoryTitle: CAT_B.title,
    summary:
      'Defines the steps required to transition a newly created registration into a fully active Client or Worker workspace.',
    relatedPolicySlugs: ['account-registration', 'account-verification', 'account-deactivation'],
    purpose:
      'Clarifies the exact technical milestones between initial sign-up and active marketplace access.',
    scope:
      'Applies to all accounts in onboarding or pending email verification.',
    rules: [
      'An account becomes active only after: (1) email verification is confirmed, (2) permanent role onboarding is completed, and (3) mandatory registration policies are accepted.',
      'An initial zero-balance wallet record is initialized upon activation.',
    ],
    exampleScenario:
      'A Google user who skipped role selection lands on the Workspace Setup onboarding screen and activates their workspace once they confirm Client or Worker role and display name.',
    userObligations: [
      'Complete onboarding accurately without misrepresenting business or personal details.',
    ],
    platformResponsibilities: [
      'Initialize owner-isolated user, publicProfile, and zero-balance wallet documents cleanly.',
    ],
    prohibitedConduct: [
      'Bypassing onboarding gates or injecting unauthorized role fields.',
    ],
    procedures: [
      'Activation occurs automatically once verification and onboarding writes pass Firestore schema validation.',
    ],
    consequences: [
      'Accounts failing activation checks remain restricted to the onboarding/verification gate.',
    ],
  }),

  buildPolicyDocument({
    slug: 'account-eligibility',
    title: 'Age & Account Eligibility Policy',
    categoryId: CAT_B.id,
    categoryTitle: CAT_B.title,
    summary:
      'Sets legal capacity, minimum age principles, and regional service eligibility standards for holding a SWAS TASKS account.',
    relatedPolicySlugs: ['account-registration', 'terms-and-conditions', 'legal-compliance'],
    pendingAdminReviewItems: [
      '[Administrator Review Required]: Confirm exact minimum age requirement (e.g., 18 years or local age of majority) and any restricted jurisdictions list.',
    ],
    purpose:
      'Ensures all contracting Clients and Workers possess legal capacity to enter binding task agreements and receive payouts.',
    scope:
      'Applies to every individual or business entity applying for or maintaining an account.',
    rules: [
      'Users must meet the legal age of contractual majority in their jurisdiction of residence (pending final administrator statutory confirmation).',
      'Users must reside in a jurisdiction where SWAS TASKS services and chosen payout rails are legally permitted.',
      'Previously permanently banned individuals are ineligible to register new accounts.',
    ],
    exampleScenario:
      'A user located in a country unsupported by a specific gateway must select an approved regional or international rail configured in the Financial Centre.',
    userObligations: [
      'Confirm legal eligibility and accurate country selection in Account Settings.',
    ],
    platformResponsibilities: [
      'Filter financial payout options dynamically by configured eligible countries.',
    ],
    prohibitedConduct: [
      'Misstating age, country of residence, or eligibility after a prior ban.',
    ],
    procedures: [
      'Eligibility concerns discovered during payout review may require additional confirmation before release.',
    ],
    consequences: [
      'Account closure and payout hold pending legal compliance verification.',
    ],
  }),

  buildPolicyDocument({
    slug: 'one-account-per-user',
    title: 'One Account Per Person Policy',
    categoryId: CAT_B.id,
    categoryTitle: CAT_B.title,
    summary:
      'Prohibits duplicate, sockpuppet, or multi-account operation to preserve fair bidding, referrals, and enforcement integrity.',
    relatedPolicySlugs: ['multiple-account-detection', 'account-sharing', 'referral-fraud'],
    purpose:
      'Prevents users from manipulating bid competition, evading bans, or gaming promotional incentives through multiple profiles.',
    scope:
      'Applies to all natural persons operating on SWAS TASKS.',
    rules: [
      'Each individual is permitted one primary SWAS TASKS account.',
      'Users must not create secondary accounts to bid against themselves, inflate proposals, bypass suspension, or claim duplicate bonuses.',
    ],
    exampleScenario:
      'A suspended Worker registers a second Gmail address to keep bidding on tasks. Detection links the shared payout destination and closes both accounts.',
    userObligations: [
      'Link Google Sign-In to an existing account rather than creating a duplicate profile.',
    ],
    platformResponsibilities: [
      'Provide password-confirmed Google linking and monitor duplicate payout/account signals.',
    ],
    prohibitedConduct: [
      'Operating alt accounts, sockpuppet Client/Worker pairs, or proxy-registered profiles.',
    ],
    procedures: [
      'Legitimate business team expansions require documented administrator review rather than shared personal accounts.',
    ],
    exceptions: [
      'Explicitly authorized organizational sub-accounts if approved in writing by Central Control Centre administrators.',
    ],
    consequences: [
      'Immediate suspension of duplicate accounts, forfeiture of abusive incentives, and potential permanent ban.',
    ],
  }),

  buildPolicyDocument({
    slug: 'account-security',
    title: 'Account Security Policy',
    categoryId: CAT_B.id,
    categoryTitle: CAT_B.title,
    summary:
      'Rules protecting account authentication, re-authentication for payout changes, session safety, and unauthorized access reporting.',
    relatedPolicySlugs: ['password-security', 'account-sharing', 'cybersecurity', 'unauthorized-access'],
    purpose:
      'Safeguards user accounts, private messages, and wallet balances against credential compromise and unauthorized payout rerouting.',
    scope:
      'Covers authentication sessions, Google Sign-In linking, Security Settings, and Financial Centre re-authentication.',
    rules: [
      'Users must protect login credentials and never share active session tokens or devices left signed in.',
      'Adding or modifying saved payout accounts requires fresh password or Google popup re-authentication.',
      'Suspected account compromise must be reported immediately so security locks can be applied.',
    ],
    exampleScenario:
      'Before updating an M-Pesa or bank payout destination in the Financial Centre, SWAS TASKS requires fresh re-authentication so an unattended open browser tab cannot redirect withdrawals.',
    userObligations: [
      'Review recent notifications and sign out from unfamiliar devices.',
    ],
    platformResponsibilities: [
      'Enforce server-verified Bearer tokens, re-auth prompts on sensitive payout edits, and login security notifications.',
    ],
    prohibitedConduct: [
      'Disabling security checks, sharing one-time verification links, or probing other users’ accounts.',
    ],
    procedures: [
      'Report suspected compromise immediately via Security Settings or swastaskorg@gmail.com.',
    ],
    consequences: [
      'Temporary protective freeze during credential recovery investigations.',
    ],
  }),

  buildPolicyDocument({
    slug: 'password-security',
    title: 'Password & Login Security Rules',
    categoryId: CAT_B.id,
    categoryTitle: CAT_B.title,
    summary:
      'Minimum password hygiene, credential uniqueness, password reset procedures, and phishing prevention rules.',
    relatedPolicySlugs: ['account-security', 'account-recovery', 'email-communication'],
    purpose:
      'Reduces credential-stuffing and account-takeover risks across email/password and Google-linked logins.',
    scope:
      'Applies to all users utilizing email/password authentication or password resets.',
    rules: [
      'Passwords must never be reused from breached external websites or shared across third-party chats.',
      'Password resets must be initiated solely through the official Forgot Password flow or Firebase Security Settings.',
      'SWAS TASKS staff will never ask for your password, PIN, or Google 2FA code via email, SMS, or WhatsApp.',
    ],
    exampleScenario:
      'If a user suspects their email password was leaked elsewhere, they immediately reset their SWAS TASKS password and verify that their saved payout destinations remain unchanged.',
    userObligations: [
      'Use strong, unique passphrases and protect linked recovery email accounts.',
    ],
    platformResponsibilities: [
      'Delegate credential hashing and reset token security to Firebase Authentication.',
    ],
    prohibitedConduct: [
      'Sharing passwords or storing credentials in plain text inside task notes or messages.',
    ],
    procedures: [
      'Use Forgot Password on the Sign In screen or Security Settings inside the workspace.',
    ],
    consequences: [
      'Compromised passwords trigger forced password reset before withdrawal privileges resume.',
    ],
  }),

  buildPolicyDocument({
    slug: 'account-sharing',
    title: 'Account Sharing Prohibition Policy',
    categoryId: CAT_B.id,
    categoryTitle: CAT_B.title,
    summary:
      'Prohibits lending, renting, selling, or transferring personal SWAS TASKS Client or Worker accounts to third parties.',
    relatedPolicySlugs: ['one-account-per-user', 'account-ownership', 'workplace-confidentiality'],
    purpose:
      'Ensures accountability for every bid, deliverable, communication, and financial payout rests unambiguously with the verified account owner.',
    scope:
      'Applies to all registered accounts.',
    rules: [
      'Accounts are strictly personal to the registered verified individual and may not be shared, leased, sold, or subcontracted as whole-account access.',
      'Allowing friends, brokers, or unverified third parties to log in and submit tasks under your profile is strictly forbidden.',
    ],
    exampleScenario:
      'A verified Worker sells access to their aged account to an unverified third party for a commission split. Both access and any unpaid pending balances are frozen under investigation.',
    userObligations: [
      'Keep login access exclusively under personal control.',
    ],
    platformResponsibilities: [
      'Monitor anomalous session/location switches and payout holder mismatches.',
    ],
    prohibitedConduct: [
      'Account brokering, credential rental, or co-piloting a single login across multiple workers.',
    ],
    procedures: [
      'Detected sharing leads to protective suspension and ownership verification.',
    ],
    consequences: [
      'Suspension or permanent termination of shared accounts.',
    ],
  }),

  buildPolicyDocument({
    slug: 'false-information',
    title: 'False Information Policy',
    categoryId: CAT_B.id,
    categoryTitle: CAT_B.title,
    summary:
      'Bans fabricated names, fake business credentials, counterfeit deliverables, and falsified payout details.',
    relatedPolicySlugs: ['account-verification', 'task-fraud', 'fraud-prevention'],
    purpose:
      'Maintains factual integrity across profiles, tasks, submissions, and financial settlements.',
    scope:
      'Applies to registration fields, profiles, task budgets, bids, submissions, support tickets, and payout accounts.',
    rules: [
      'All display names, business names, skill claims, deliverable links, and payout holder names must be truthful and verifiable.',
      'Submitting fabricated references, altered payment receipts, or misleading task descriptions violates platform integrity.',
    ],
    exampleScenario:
      'Entering someone else’s name as accountHolderName on a payout destination to disguise beneficial ownership violates this policy and halts payout verification.',
    userObligations: [
      'Correct unintentional typos immediately in Account Settings or Payout Accounts.',
    ],
    platformResponsibilities: [
      'Require verifiable references and reject mismatched or fraudulent entries during reviews.',
    ],
    prohibitedConduct: [
      'Identity falsification, spoofed portfolio claims, or forged external transaction hashes.',
    ],
    procedures: [
      'Suspected false records undergo compliance verification with documented evidence.',
    ],
    consequences: [
      'Account restriction, rejected withdrawals, or permanent ban.',
    ],
  }),

  buildPolicyDocument({
    slug: 'account-ownership',
    title: 'Account Ownership Policy',
    categoryId: CAT_B.id,
    categoryTitle: CAT_B.title,
    summary:
      'Defines legal and operational ownership of an account, its historical ledger records, and non-transferability.',
    relatedPolicySlugs: ['account-sharing', 'account-recovery', 'account-closure'],
    purpose:
      'Establishes who controls an account and resolves ownership disputes cleanly without compromising ledger integrity.',
    scope:
      'Applies to all Client and Worker accounts and associated wallets.',
    rules: [
      'Account ownership belongs strictly to the verified holder of the primary authentication email and onboarding record.',
      'Accounts, earned histories, and active assignments cannot be assigned, sold, or inherited by unverified third parties.',
    ],
    exampleScenario:
      'If two colleagues dispute who owns a Client account opened under an individual’s Gmail, SWAS TASKS recognizes the verified Firebase UID owner unless a formal corporate transition is verified.',
    userObligations: [
      'Register business accounts using controlled organizational emails rather than transient personal addresses.',
    ],
    platformResponsibilities: [
      'Protect immutable UID ownership across Firestore records.',
    ],
    prohibitedConduct: [
      'Attempting social-engineering ownership claims against another user’s UID.',
    ],
    procedures: [
      'Ownership disputes require verified email confirmation and documented administrative review.',
    ],
    consequences: [
      'Disputed accounts may be locked until ownership is conclusively verified.',
    ],
  }),

  buildPolicyDocument({
    slug: 'account-deactivation',
    title: 'Account Deactivation Policy',
    categoryId: CAT_B.id,
    categoryTitle: CAT_B.title,
    summary:
      'Governs voluntary temporary deactivation or administrative dormant holds when accounts step away from active work.',
    relatedPolicySlugs: ['account-closure', 'account-suspension', 'data-retention'],
    purpose:
      'Provides clean procedures for pausing workspace visibility and activity while preserving pending obligations and financial records.',
    scope:
      'Applies to users pausing participation and inactive accounts placed under protective hold.',
    rules: [
      'Active assignments and unresolved financial disputes must be completed or resolved before voluntary deactivation.',
      'Deactivation hides public profile discovery while preserving immutable ledger and audit records as required.',
    ],
    exampleScenario:
      'A Worker going offline for three months toggles publicProfileVisible off and ensures no active assignments remain open before requesting temporary deactivation via Support.',
    userObligations: [
      'Complete or cleanly close open tasks/assignments and withdraw eligible settled funds prior to stepping away.',
    ],
    platformResponsibilities: [
      'Preserve wallet balances and financial history securely during temporary inactivity.',
    ],
    prohibitedConduct: [
      'Deactivating an account to evade an active revision request, dispute, or violation review.',
    ],
    procedures: [
      'Users may adjust public profile visibility in Account Settings or submit a deactivation request through Help & Support.',
    ],
    consequences: [
      'Unresolved active obligations block voluntary deactivation until settled.',
    ],
  }),

  buildPolicyDocument({
    slug: 'account-closure',
    title: 'Account Closure Policy',
    categoryId: CAT_B.id,
    categoryTitle: CAT_B.title,
    summary:
      'Explains permanent voluntary account closure prerequisites, residual balance settlement, and mandatory legal record retention.',
    relatedPolicySlugs: ['account-deactivation', 'data-deletion', 'wallet-policy'],
    pendingAdminReviewItems: [
      '[Administrator Review Required]: Confirm minimum statutory retention period (years) for closed-account financial ledger and tax audit records.',
    ],
    purpose:
      'Sets clear closure rules so users can permanently close accounts cleanly without abandoning active commitments or losing track of legitimate settled funds.',
    scope:
      'Applies to all permanent voluntary closure requests.',
    rules: [
      'Before permanent closure, all open tasks must be closed, active assignments completed/resolved, and eligible available balances withdrawn.',
      'Personal profile data is removed or anonymized upon closure, while immutable financial ledger and policy acceptance audit logs are retained as required by law and anti-fraud rules.',
    ],
    exampleScenario:
      'A Client finishes their last active project, confirms final settlement records, and requests permanent closure via swastaskorg@gmail.com.',
    userObligations: [
      'Submit closure requests from the verified account email and settle any outstanding balances first.',
    ],
    platformResponsibilities: [
      'Confirm zero active commitments before finalizing closure and explain retained statutory audit logs.',
    ],
    prohibitedConduct: [
      'Closing and immediately re-registering to reset violation history.',
    ],
    procedures: [
      'Submit closure request in Help & Support or via swastaskorg@gmail.com -> identity confirmation -> final balance check -> closure confirmation.',
    ],
    consequences: [
      'Closed accounts cannot be reopened; new access requires compliance review.',
    ],
  }),

  buildPolicyDocument({
    slug: 'account-recovery',
    title: 'Account Recovery Policy',
    categoryId: CAT_B.id,
    categoryTitle: CAT_B.title,
    summary:
      'Procedures for recovering locked or lost-access SWAS TASKS accounts safely without exposing user funds to social engineering.',
    relatedPolicySlugs: ['password-security', 'account-ownership', 'reinstatement'],
    purpose:
      'Helps legitimate owners regain access after forgotten passwords or security locks while blocking unauthorized takeover attempts.',
    scope:
      'Applies to password resets, Google account access recovery, and security-locked account verification.',
    rules: [
      'Primary recovery occurs via verified email password reset or Google account recovery.',
      'Manual recovery requests require verifiable proof matching historical UID ownership and recent legitimate platform activity.',
    ],
    exampleScenario:
      'A user who lost access to their device uses Forgot Password on the login screen to receive a verified Firebase recovery link.',
    userObligations: [
      'Keep recovery email access active and contact swastaskorg@gmail.com promptly if primary email access is compromised.',
    ],
    platformResponsibilities: [
      'Protect payout destinations during recovery windows by blocking immediate unverified withdrawal changes.',
    ],
    prohibitedConduct: [
      'Submitting fraudulent recovery requests for accounts owned by third parties.',
    ],
    procedures: [
      'Use Forgot Password -> if email itself is lost, contact swastaskorg@gmail.com for manual compliance verification.',
    ],
    consequences: [
      'Fraudulent recovery attempts result in permanent account and IP blocks.',
    ],
  }),
];
