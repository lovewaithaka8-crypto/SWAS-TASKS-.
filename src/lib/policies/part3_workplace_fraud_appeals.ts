import type { PolicyDocument } from '../../types/marketplace';
import { buildPolicyDocument } from './builder';

const CAT_E = { id: 'workplaces-departments', title: 'Workplaces & Departments' };
const CAT_F = { id: 'fraud-security', title: 'Fraud, Security & Protection' };
const CAT_G = { id: 'suspensions-appeals', title: 'Suspensions, Violations & Appeals' };

export const PART3_POLICIES: PolicyDocument[] = [
  // =========================================================================
  // E. WORKPLACES & DEPARTMENTS (11 POLICIES)
  // =========================================================================
  buildPolicyDocument({
    slug: 'workplace-access',
    title: 'Workplace Access Policy',
    categoryId: CAT_E.id,
    categoryTitle: CAT_E.title,
    summary:
      'Governs access eligibility for role-separated Client and Worker Workplaces, specialized department workspaces, and invite-only task rooms.',
    requiresAcceptance: true,
    acceptanceContexts: ['workplace'],
    relatedPolicySlugs: ['workplace-assignment', 'workplace-restriction', 'account-verification'],
    purpose:
      'Defines who may access SWAS TASKS workspace environments and enforces strict role-based boundaries.',
    scope:
      'Applies to Client Workplaces, Worker Workplaces, and invite-only project scopes.',
    rules: [
      'Workspace access requires verified email authentication, completed onboarding, and accepted active platform policies.',
      'Worker routes (Browse Tasks, My Bids, My Assignments) and Client routes (Post a Task, Manage Tasks, Active Projects) are enforced at both router and Firestore levels.',
      'Invite-only tasks restrict visibility strictly to the owning Client and explicitly invited or assigned participants.',
    ],
    exampleScenario:
      'A Client account attempting to open a Worker bidding URL is automatically redirected back to the Client Dashboard by route and Firestore role guards.',
    userObligations: [
      'Access only workspaces assigned to your verified role and authorized task invitations.',
    ],
    platformResponsibilities: [
      'Maintain strict role-guard isolation in UI routing and backend rules.',
    ],
    prohibitedConduct: [
      'Probing or attempting to access invite-only workplaces without authorization.',
    ],
    procedures: [
      'Verify email -> select permanent role -> review workplace rules -> enter workspace.',
    ],
    consequences: [
      'Unauthorized workplace access attempts trigger security alerts and access restriction.',
    ],
  }),

  buildPolicyDocument({
    slug: 'workplace-assignment',
    title: 'Workplace Assignment Policy',
    categoryId: CAT_E.id,
    categoryTitle: CAT_E.title,
    summary:
      'Rules governing how users, reviewers, and tasks are allocated across specialized workplaces and project departments.',
    relatedPolicySlugs: ['workplace-access', 'department-rules', 'task-assignment'],
    purpose:
      'Ensures transparent assignment of projects and operational roles inside structured department workplaces.',
    scope:
      'Applies to active project assignments and internal department workplace routing.',
    rules: [
      'Workplace assignments depend on verified role, active standing, skill alignment, and compliance status.',
      'Users may not transfer or reassign an active workplace slot to another account without Client and Administrator authorization.',
    ],
    exampleScenario:
      'A Client posts a Web & Technical task; only Workers with verified active standing may bid and receive assignment activation.',
    userObligations: [
      'Maintain up-to-date skills and accurate availability inside My Profile.',
    ],
    platformResponsibilities: [
      'Display clear assignment states, agreed budgets, and deadlines inside workspace lists.',
    ],
    prohibitedConduct: [
      'Manipulating skill profiles with false credentials to gain specialized workplace access.',
    ],
    procedures: [
      'Task selection -> bid evaluation -> atomic assignment creation.',
    ],
    consequences: [
      'False skill misrepresentation can result in immediate assignment removal.',
    ],
  }),

  buildPolicyDocument({
    slug: 'workplace-restriction',
    title: 'Workplace Restriction Policy',
    categoryId: CAT_E.id,
    categoryTitle: CAT_E.title,
    summary:
      'Explains temporary workspace locks, category holds, and capacity limits applied when performance or security risks emerge.',
    relatedPolicySlugs: ['account-restriction', 'workplace-performance', 'appeals'],
    purpose:
      'Protects Clients and marketplace reliability by applying targeted workplace restrictions rather than immediate total bans where appropriate.',
    scope:
      'Applies to Workers and Clients exhibiting quality drops, missed deadlines, or unresolved compliance flags.',
    rules: [
      'Workplaces may be restricted by category, concurrency cap, or invite-only eligibility during quality or security reviews.',
      'Users receive clear notice of the restriction scope and remediation path.',
    ],
    exampleScenario:
      'After three consecutive late deliveries in Field & Errands, a Worker’s concurrent active assignment limit is capped until on-time completion recovers.',
    userObligations: [
      'Complete existing obligations cleanly during any partial workplace restriction.',
    ],
    platformResponsibilities: [
      'Notify restricted users via in-app notification with specific reason and appeal pathway.',
    ],
    prohibitedConduct: [
      'Creating a new account to bypass a workplace restriction.',
    ],
    procedures: [
      'Compliance flag -> Written restriction notice -> Remediation or appeal -> Review.',
    ],
    consequences: [
      'Bypassing a workplace restriction escalates to full account suspension.',
    ],
  }),

  buildPolicyDocument({
    slug: 'workplace-performance',
    title: 'Workplace Performance Policy',
    categoryId: CAT_E.id,
    categoryTitle: CAT_E.title,
    summary:
      'Standards for evaluating deliverable quality, revision ratios, responsiveness, and fair Client evaluation behavior.',
    relatedPolicySlugs: ['productivity-standards', 'workplace-productivity', 'task-quality-standards'],
    pendingAdminReviewItems: [
      '[Administrator Review Required]: Confirm exact numerical KPI thresholds (e.g., minimum approval rate or maximum late-submission percentage) before enforcing automated performance tiers.',
    ],
    purpose:
      'Sets objective, non-arbitrary performance expectations for sustained workspace participation.',
    scope:
      'Applies to Worker delivery reliability and Client approval fairness.',
    rules: [
      'Performance evaluations rely strictly on verifiable workspace records: completed assignments, revision frequency, deadline adherence, and resolved disputes.',
      'Clients who repeatedly stall reviews or request abusive out-of-scope revisions may face Client workspace posting limits.',
    ],
    exampleScenario:
      'A Worker maintains steady approvals and clear revision turnaround across 12 assignments, keeping unrestricted access to public and invite-only briefs.',
    userObligations: [
      'Communicate proactively before deadlines if scope issues arise.',
    ],
    platformResponsibilities: [
      'Base performance actions on real ledger and assignment histories—never fabricated scores.',
    ],
    prohibitedConduct: [
      'Extorting Workers with unfair negative feedback threats.',
    ],
    procedures: [
      'Performance reviews may be contested via Appeal Policy if extraordinary circumstances caused a delay.',
    ],
    consequences: [
      'Targeted coaching warning, workplace restriction, or deactivation for sustained non-performance.',
    ],
  }),

  buildPolicyDocument({
    slug: 'workplace-productivity',
    title: 'Workplace Productivity Rules',
    categoryId: CAT_E.id,
    categoryTitle: CAT_E.title,
    summary:
      'Practical workflow norms keeping task turnaround crisp, workspace messaging concise, and deliverable handoffs organized.',
    relatedPolicySlugs: ['productivity-standards', 'workplace-operating-rules', 'task-completion'],
    purpose:
      'Encourages organized work habits that minimize avoidable back-and-forth revisions.',
    scope:
      'Applies to active assignments and workspace messaging.',
    rules: [
      'Clarify ambiguous task specifications in Messages before investing major effort.',
      'Organize deliverable submissions with clear file names, version labels, and summary notes.',
    ],
    exampleScenario:
      'Within two hours of assignment activation, a Worker confirms deliverable column headers with the Client in Messages, preventing a full rework later.',
    userObligations: [
      'Acknowledge assignment activation and critical feedback within reasonable business windows.',
    ],
    platformResponsibilities: [
      'Provide real-time unread message and notification counters inside WorkspaceShell.',
    ],
    prohibitedConduct: [
      'Leaving active assignments silent for extended periods until after deadlines expire.',
    ],
    procedures: [
      'Unresponsive parties can be nudged via Messages and escalated to Support if unreachable past deadline.',
    ],
    consequences: [
      'Chronic unresponsiveness may lead to assignment reassignment and reliability penalties.',
    ],
  }),

  buildPolicyDocument({
    slug: 'workplace-confidentiality',
    title: 'Workplace Confidentiality Policy',
    categoryId: CAT_E.id,
    categoryTitle: CAT_E.title,
    summary:
      'Protects non-public Client task briefs, datasets, brand drafts, credentials, and invite-only workspace files from disclosure.',
    relatedPolicySlugs: ['internal-confidentiality', 'data-security', 'intellectual-property'],
    purpose:
      'Gives Clients confidence to share business briefs and proprietary assets on SWAS TASKS without unauthorized leaks.',
    scope:
      'Applies to all invite-only briefs, private assignment attachments, chat messages, and non-public datasets.',
    rules: [
      'Workers must treat Client project files, customer lists, source scripts, and unpublished creative assets as strictly confidential.',
      'Confidential Client assets must never be republished, sold, shared with third parties, or displayed in public portfolios without written Client permission.',
    ],
    exampleScenario:
      'A Worker hired to clean a Client product catalog deletes working local copies upon Client approval and does not share pricing sheets with competitors.',
    userObligations: [
      'Store downloaded task files securely and remove temporary copies after assignment completion.',
    ],
    platformResponsibilities: [
      'Restrict invite-only tasks and private conversation histories strictly to authorized participants.',
    ],
    prohibitedConduct: [
      'Leaking private briefs, screenshots of confidential chats, or proprietary Client datasets.',
    ],
    procedures: [
      'Report suspected confidentiality leaks immediately to swastaskorg@gmail.com.',
    ],
    consequences: [
      'Immediate permanent ban and potential civil/statutory liability under applicable law.',
    ],
  }),

  buildPolicyDocument({
    slug: 'workplace-communication',
    title: 'Workplace Communication Policy',
    categoryId: CAT_E.id,
    categoryTitle: CAT_E.title,
    summary:
      'Rules for direct workspace messaging, attachment safety, anti-solicitation boundaries, and clear project documentation.',
    relatedPolicySlugs: ['professional-communication', 'user-conduct', 'workplace-operating-rules'],
    purpose:
      'Ensures workspace chat threads stay professional, safe, and usable as verifiable dispute evidence.',
    scope:
      'Applies to all Conversations and Messages between Clients and Workers.',
    rules: [
      'All project agreements, scope clarifications, and deadline extensions should be confirmed inside SWAS TASKS Messages.',
      'Links shared in Messages must point to safe, verifiable project materials.',
    ],
    exampleScenario:
      'When a Client and Worker agree to extend a delivery date by 48 hours due to extra sample files, both confirm the new date in the assignment’s Messages thread.',
    userObligations: [
      'Keep tone constructive and avoid spamming unrelated promotional links.',
    ],
    platformResponsibilities: [
      'Isolate conversation read/write permissions strictly to the two verified participants.',
    ],
    prohibitedConduct: [
      'Sending unsolicited bulk pitches, malicious URLs, or abusive harassment in chat.',
    ],
    procedures: [
      'Users may report abusive chat messages to Support with the conversation reference.',
    ],
    consequences: [
      'Messaging suspension, warning points, or account termination.',
    ],
  }),

  buildPolicyDocument({
    slug: 'workplace-monitoring',
    title: 'Workplace Monitoring & Activity Policy',
    categoryId: CAT_E.id,
    categoryTitle: CAT_E.title,
    summary:
      'Transparently discloses what operational timestamps, audit logs, and security signals SWAS TASKS monitors (and what it does NOT collect).',
    relatedPolicySlugs: ['privacy', 'evidence-records', 'audit-accountability'],
    purpose:
      'Provides full transparency on platform activity logging without invasive covert spyware.',
    scope:
      'Applies to marketplace events, ledger transactions, policy acceptances, and security logs.',
    rules: [
      'SWAS TASKS records verifiable operational events: task publications, bids, assignment status changes, deliverable submission URLs, ledger transactions, withdrawal stages, and policy acceptances.',
      'SWAS TASKS does NOT install hidden desktop keyloggers, covert webcam monitors, or unauthorized background screen capture.',
    ],
    exampleScenario:
      'During a payment dispute, reviewers examine assignment createdAt/updatedAt timestamps and submission notes logged in Firestore—not invasive personal device data.',
    userObligations: [
      'Ensure submitted deliverable records accurately reflect work completed.',
    ],
    platformResponsibilities: [
      'Limit monitoring strictly to legitimate platform security, anti-fraud, and marketplace audit logs.',
    ],
    prohibitedConduct: [
      'Forging timestamps or attempting to spoof activity audit trails.',
    ],
    procedures: [
      'Audit logs are accessible solely to authorized Super Administrators and compliance reviewers.',
    ],
    consequences: [
      'Attempts to falsify platform logs result in immediate suspension.',
    ],
  }),

  buildPolicyDocument({
    slug: 'workplace-termination',
    title: 'Workplace Termination Policy',
    categoryId: CAT_E.id,
    categoryTitle: CAT_E.title,
    summary:
      'Conditions under which access to a specific workplace, department project, or workspace role may be terminated.',
    relatedPolicySlugs: ['workplace-restriction', 'account-termination', 'task-cancellation'],
    purpose:
      'Clarifies how active workplace access ends cleanly while protecting earned verified balances.',
    scope:
      'Applies to Client/Worker workplace revocation and department terminations.',
    rules: [
      'Workplace access may end due to project completion, Client closure, mutual termination, or verified policy violation.',
      'Legitimate verified settled earnings remain payable unless forfeited for confirmed financial/task fraud.',
    ],
    exampleScenario:
      'A specialized department project concludes; Workers retain their main SWAS TASKS account and verified wallet balances while the closed project workspace archives.',
    userObligations: [
      'Return or delete confidential project copies upon workplace conclusion.',
    ],
    platformResponsibilities: [
      'Provide written notice and preserve legitimate ledger withdrawal access unless legally frozen.',
    ],
    prohibitedConduct: [
      'Retaliatory deletion of already-paid deliverables upon workplace termination.',
    ],
    procedures: [
      'Termination notice -> Active settlement reconciliation -> Appeal window where disciplinary.',
    ],
    consequences: [
      'Loss of access to specific workplace privileges.',
    ],
  }),

  buildPolicyDocument({
    slug: 'multi-workplace',
    title: 'Multi-Workplace Participation Policy',
    categoryId: CAT_E.id,
    categoryTitle: CAT_E.title,
    summary:
      'Rules permitting participation across multiple task categories and projects without deadline conflicts or confidentiality leaks.',
    relatedPolicySlugs: ['workplace-confidentiality', 'productivity-standards', 'one-account-per-user'],
    purpose:
      'Allows versatile Workers and active Clients to operate across multiple categories using one single verified account.',
    scope:
      'Applies to users engaging across multiple SWAS TASKS categories or simultaneous projects.',
    rules: [
      'Users may work across all six task categories from their single verified Worker account without opening separate accounts.',
      'Confidential assets from one Client project must never bleed into another Client’s deliverable.',
    ],
    exampleScenario:
      'A Worker completes a Design & Media banner for Client A while simultaneously conducting QA & Testing for Client B under one UID.',
    userObligations: [
      'Segregate client files cleanly and honor all concurrent deadlines.',
    ],
    platformResponsibilities: [
      'Track each assignment independently with isolated conversations and ledger entries.',
    ],
    prohibitedConduct: [
      'Cross-contaminating confidential client deliverables or over-committing past capacity.',
    ],
    procedures: [
      'Manage active tasks from My Assignments; Clients track separate briefs in Manage Tasks.',
    ],
    consequences: [
      'Cross-client data leaks lead to immediate suspension.',
    ],
  }),

  buildPolicyDocument({
    slug: 'department-rules',
    title: 'Department Rules and Responsibilities',
    categoryId: CAT_E.id,
    categoryTitle: CAT_E.title,
    summary:
      'Defines responsibilities for SWAS TASKS operational departments (Operations, Finance, Trust & Safety, Support, Engineering) and Central Control Centre coordination.',
    relatedPolicySlugs: ['staff-conduct', 'admin-conduct', 'audit-accountability'],
    purpose:
      'Establishes clear departmental boundaries so staff act strictly within authorized scopes and official communication channels.',
    scope:
      'Applies to internal SWAS TASKS departments and department-managed workplaces.',
    rules: [
      'Each department operates strictly within assigned duties: Operations (task workflow), Finance (settlement verification & payouts), Trust & Safety (fraud & enforcement), Support (tickets & appeals).',
      'Official department circulars use the Central Control Centre and sender swastaskorg@gmail.com.',
    ],
    exampleScenario:
      'Support staff escalate suspected payout fraud to Finance & Trust & Safety rather than unilaterally altering wallet balances.',
    userObligations: [
      'Route inquiries to the appropriate Help & Support category for fastest resolution.',
    ],
    platformResponsibilities: [
      'Enforce separation of duties and immutable logging across departmental actions.',
    ],
    prohibitedConduct: [
      'Departmental overreach or unauthorized access to non-assigned user records.',
    ],
    procedures: [
      'Cross-department escalations are logged with ticket IDs and administrator audit trails.',
    ],
    consequences: [
      'Departmental policy breaches trigger Staff Disciplinary Policy sanctions.',
    ],
  }),

  // =========================================================================
  // F. FRAUD, SECURITY & PROTECTION (13 POLICIES)
  // =========================================================================
  buildPolicyDocument({
    slug: 'fraud-prevention',
    title: 'Fraud Prevention Policy',
    categoryId: CAT_F.id,
    categoryTitle: CAT_F.title,
    summary:
      'Platform-wide defense framework detecting, halting, and investigating identity fraud, fake tasks, payment abuse, and collusion.',
    relatedPolicySlugs: ['financial-fraud-prevention', 'task-fraud', 'investigation', 'enforcement-penalties'],
    purpose:
      'Safeguards the entire SWAS TASKS ecosystem against financial, identity, and operational fraud.',
    scope:
      'Applies across registrations, tasks, bids, submissions, referrals, and withdrawals.',
    rules: [
      'SWAS TASKS combines Firestore security constraints, server-side cryptographic checks, and compliance reviews to prevent fraudulent activity.',
      'Suspicious accounts or transactions may be placed under temporary protective hold pending verification.',
    ],
    exampleScenario:
      'Repeated failed login attempts paired with a sudden withdrawal destination change trigger an automatic security alert and protective review.',
    userObligations: [
      'Report phishing attempts, fake support contacts, or suspicious task offers immediately.',
    ],
    platformResponsibilities: [
      'Act swiftly on fraud indicators while giving legitimate users a fair evidence review path.',
    ],
    prohibitedConduct: [
      'Any deceptive scheme intended to extract unearned payouts, steal data, or bypass verification.',
    ],
    procedures: [
      'Detection -> Protective Hold -> Investigation -> Written Outcome & Appeal Window.',
    ],
    consequences: [
      'Immediate payout freeze, ledger reversal of fraudulent amounts, and permanent ban.',
    ],
  }),

  buildPolicyDocument({
    slug: 'anti-cheating',
    title: 'Anti-Cheating Policy',
    categoryId: CAT_F.id,
    categoryTitle: CAT_F.title,
    summary:
      'Prohibits deliverable plagiarism, test/QA spoofing, fake field proof, and unfair competition manipulation.',
    relatedPolicySlugs: ['task-fraud', 'duplicate-submission', 'anti-manipulation'],
    purpose:
      'Ensures marketplace rewards go strictly to genuine work rather than shortcuts or deceptive proofs.',
    scope:
      'Applies to all Worker deliverables, bids, and qualification tasks.',
    rules: [
      'Plagiarizing third-party content, faking QA test screenshots, or altering timestamps on Field & Errands audits is strictly prohibited.',
      'Coordinating bid suppression or kickbacks with other users constitutes cheating.',
    ],
    exampleScenario:
      'Submitting reused GPS/store photos from last year for a current retail audit task triggers anti-cheating rejection and suspension.',
    userObligations: [
      'Deliver authentic, current, original work.',
    ],
    platformResponsibilities: [
      'Review contested deliverables fairly using submitted evidence and metadata.',
    ],
    prohibitedConduct: [
      'Copying solutions, falsifying test evidence, or sharing assessment answers.',
    ],
    procedures: [
      'Cheating reports undergo evidence verification under the Investigation Policy.',
    ],
    consequences: [
      'Zero payout for cheated deliverables, violation points, or permanent ban.',
    ],
  }),

  buildPolicyDocument({
    slug: 'anti-manipulation',
    title: 'Anti-Manipulation Policy',
    categoryId: CAT_F.id,
    categoryTitle: CAT_F.title,
    summary:
      'Bans bid-rigging, shill bidding, artificial urgency, reputation gaming, and platform workflow exploitation.',
    relatedPolicySlugs: ['anti-cheating', 'task-fraud', 'one-account-per-user'],
    purpose:
      'Protects fair price discovery and honest marketplace metrics.',
    scope:
      'Applies to task pricing, bidding competition, reviews, and payout triggers.',
    rules: [
      'Clients and Workers must not coordinate fake competing bids to distort perceived market pricing.',
      'Exploiting UI timing, duplicate submissions, or race conditions to inflate ledger numbers is strictly forbidden.',
    ],
    exampleScenario:
      'A user uses a friend’s account to place an artificially high bid so their own bid looks cheap by comparison.',
    userObligations: [
      'Participate transparently without collusive bid coordination.',
    ],
    platformResponsibilities: [
      'Enforce server-side atomic bid acceptance and balance validation.',
    ],
    prohibitedConduct: [
      'Shill bidding, collusion rings, or API payload manipulation.',
    ],
    procedures: [
      'Detected manipulation undergoes Trust & Safety audit.',
    ],
    consequences: [
      'Cancellation of manipulated bids/tasks and suspension of all participating accounts.',
    ],
  }),

  buildPolicyDocument({
    slug: 'suspicious-activity',
    title: 'Suspicious Activity Policy',
    categoryId: CAT_F.id,
    categoryTitle: CAT_F.title,
    summary:
      'Explains triggers for automated or manual security reviews, temporary protective holds, and identity re-confirmation.',
    relatedPolicySlugs: ['fraud-prevention', 'account-restriction', 'investigation'],
    purpose:
      'Balances rapid fraud containment with transparent communication when unusual patterns appear.',
    scope:
      'Applies to anomalous login, task, messaging, or withdrawal behavior.',
    rules: [
      'Triggers include sudden changes to payout destinations followed by max withdrawals, burst automated bidding, mismatched account holder details, or known compromised network signatures.',
      'Protective holds protect legitimate users from account drain as well as preventing platform fraud.',
    ],
    exampleScenario:
      'An account normally operating in Nairobi suddenly authenticates from an unfamiliar proxy and tries to attach a new crypto wallet; the payout enters pending_verification.',
    userObligations: [
      'Respond truthfully to verification inquiries and review login alerts promptly.',
    ],
    platformResponsibilities: [
      'Lift protective holds promptly once legitimate ownership and activity are confirmed.',
    ],
    prohibitedConduct: [
      'Refusing reasonable ownership verification while demanding immediate unverified payout release.',
    ],
    procedures: [
      'Trigger logged -> Protective hold & security alert -> User verification -> Release or Escalation.',
    ],
    consequences: [
      'Unresolved suspicious activity maintains hold until verified.',
    ],
  }),

  buildPolicyDocument({
    slug: 'automated-tools-bots',
    title: 'Automated Tools and Bots Policy',
    categoryId: CAT_F.id,
    categoryTitle: CAT_F.title,
    summary:
      'Prohibits scraping bots, auto-bidders, credential stuffers, and unauthorized API automation against SWAS TASKS.',
    relatedPolicySlugs: ['acceptable-use', 'prohibited-task-assistance', 'cybersecurity'],
    purpose:
      'Ensures human Workers get fair access to tasks and prevents platform overload or automated abuse.',
    scope:
      'Applies to all browser automation, scripts, extensions, and external crawlers.',
    rules: [
      'Automated bidding bots, task-scraping spiders, auto-refreshers hammering endpoints, and scripted account creators are strictly forbidden.',
      'Browser accessibility tools (screen readers, password managers) are always permitted.',
    ],
    exampleScenario:
      'Running a Puppeteer script to scrape all public tasks and auto-submit generic bids within 500ms of publication violates this policy.',
    userObligations: [
      'Interact with SWAS TASKS manually through standard supported browsers.',
    ],
    platformResponsibilities: [
      'Protect endpoints with token verification and abuse throttling.',
    ],
    prohibitedConduct: [
      'Bot bidding, credential stuffing, scraping, or DDoS tooling.',
    ],
    procedures: [
      'Automated abuse signatures result in immediate session revocation and account review.',
    ],
    consequences: [
      'Permanent ban for malicious or commercial scraping bots.',
    ],
  }),

  buildPolicyDocument({
    slug: 'multiple-account-detection',
    title: 'Multiple Account Detection Policy',
    categoryId: CAT_F.id,
    categoryTitle: CAT_F.title,
    summary:
      'Explains how SWAS TASKS detects duplicate registrations, shared payout identifiers, and ban-evasion accounts.',
    relatedPolicySlugs: ['one-account-per-user', 'permanent-ban', 'account-registration'],
    purpose:
      'Enforces the One Account Per Person Policy using verifiable account and financial linkage signals.',
    scope:
      'Applies to account registrations, Google linking, and payout destination audits.',
    rules: [
      'Payout destinations (M-Pesa numbers, bank accounts, crypto addresses) linked across multiple distinct UIDs trigger duplicate-account verification.',
      'Ban-evasion accounts created after a prior termination are immediately closed.',
    ],
    exampleScenario:
      'Two separate Worker accounts enter the exact same bank account number; both accounts are flagged for multi-account compliance review.',
    userObligations: [
      'Use one personal account and never share payout destinations across separate users.',
    ],
    platformResponsibilities: [
      'Provide clean Google/password linking so legitimate users never accidentally create duplicate accounts.',
    ],
    prohibitedConduct: [
      'Operating alt accounts or pooling payout accounts across multiple profiles.',
    ],
    procedures: [
      'Flagged duplicates receive a notice allowing explanation if a household/shared error occurred before final action.',
    ],
    consequences: [
      'Consolidation/closure of duplicates or permanent ban for intentional evasion.',
    ],
  }),

  buildPolicyDocument({
    slug: 'vpn-proxy-restrictions',
    title: 'VPN and Proxy Restrictions Policy',
    categoryId: CAT_F.id,
    categoryTitle: CAT_F.title,
    summary:
      'Rules governing anonymized VPNs, residential proxies, location spoofing, and regional payout verification.',
    relatedPolicySlugs: ['suspicious-activity', 'account-eligibility', 'fraud-prevention'],
    purpose:
      'Prevents geographic deception used to bypass regional restrictions or disguise hijacked sessions.',
    scope:
      'Applies to authentication, task qualification, and Financial Centre withdrawal sessions.',
    rules: [
      'Using VPNs or proxies specifically to spoof your country of residence, evade regional rules, or mask multi-account abuse is prohibited.',
      'Legitimate corporate or privacy VPN use must still match truthful Account Settings country selection and verified payout residency.',
    ],
    exampleScenario:
      'Using a proxy to falsify location for a local Field & Errands audit task violates this policy and invalidates the submission.',
    userObligations: [
      'Ensure Account Settings country reflects your real operating country.',
    ],
    platformResponsibilities: [
      'Consider legitimate privacy VPN usage fairly alongside corroborating account evidence during reviews.',
    ],
    prohibitedConduct: [
      'Spoofing location for geo-restricted work or hiding abusive traffic behind rotating proxies.',
    ],
    procedures: [
      'Anomalous proxy logins may require additional verification before payout approval.',
    ],
    consequences: [
      'Protective hold or restriction for deceptive location spoofing.',
    ],
  }),

  buildPolicyDocument({
    slug: 'unauthorized-access',
    title: 'Unauthorized Access Policy',
    categoryId: CAT_F.id,
    categoryTitle: CAT_F.title,
    summary:
      'Zero-tolerance prohibition on probing, bypassing Firestore rules, accessing other users’ data, or escalating privileges.',
    relatedPolicySlugs: ['cybersecurity', 'account-security', 'permanent-ban'],
    purpose:
      'Protects user privacy, platform infrastructure, and administrative controls against unauthorized intrusion.',
    scope:
      'Applies to all client sessions, API endpoints, Firestore paths, and Control Centre routes.',
    rules: [
      'Users may never attempt to read, modify, or delete documents belonging to other UIDs outside permitted public/counterparty flows.',
      'Attempting to spoof admin status, forge Bearer tokens, or bypass backend webhook signatures is strictly illegal and prohibited.',
    ],
    exampleScenario:
      'Crafting modified client requests to inject role or verified_settled status directly into Firestore is rejected by security rules and logged as an intrusion attempt.',
    userObligations: [
      'Report accidental security bugs responsibly to swastaskorg@gmail.com.',
    ],
    platformResponsibilities: [
      'Maintain strict server-side auth verification and Zero-Trust Firestore security rules.',
    ],
    prohibitedConduct: [
      'Exploitation, privilege escalation, brute-force attacks, or unauthorized penetration testing.',
    ],
    procedures: [
      'Detected intrusion attempts trigger instant account termination and IP blocking.',
    ],
    consequences: [
      'Immediate permanent ban and referral to law enforcement where applicable.',
    ],
  }),

  buildPolicyDocument({
    slug: 'cybersecurity',
    title: 'Cybersecurity Policy',
    categoryId: CAT_F.id,
    categoryTitle: CAT_F.title,
    summary:
      'Outlines technical security controls protecting SWAS TASKS credentials, webhooks, server secrets, and user deliverables.',
    relatedPolicySlugs: ['data-security', 'unauthorized-access', 'data-breach-response'],
    purpose:
      'Documents SWAS TASKS security architecture commitments and responsible vulnerability disclosure.',
    scope:
      'Covers frontend input sanitization, Express API routes, Firebase Auth, Firestore rules, and third-party webhooks.',
    rules: [
      'All API secrets (SMTP credentials, payment provider keys, webhook secrets) reside strictly in server environment variables and never in client bundles.',
      'Webhook callbacks require cryptographic HMAC signature verification over raw request bodies.',
      'Unsafe URL schemes (javascript:, data:) and raw HTML injection are blocked across user inputs.',
    ],
    exampleScenario:
      'A user attempting to paste a javascript: URL as a task attachment or deliverable link is blocked by client and schema validation.',
    userObligations: [
      'Keep devices patched and report suspected security flaws privately rather than exploiting them.',
    ],
    platformResponsibilities: [
      'Continuously audit Firestore rules, lint security constraints, and rotate server secrets if exposed.',
    ],
    prohibitedConduct: [
      'Uploading malware-laced links or exploiting security weaknesses for gain.',
    ],
    procedures: [
      'Send responsible security disclosures to swastaskorg@gmail.com.',
    ],
    consequences: [
      'Malicious cyber activity leads to immediate permanent ban and legal action.',
    ],
  }),

  buildPolicyDocument({
    slug: 'data-security',
    title: 'Data Security Policy',
    categoryId: CAT_F.id,
    categoryTitle: CAT_F.title,
    summary:
      'Controls safeguarding stored PII, masked payout accounts, support tickets, and administrative audit logs.',
    relatedPolicySlugs: ['cybersecurity', 'privacy', 'data-storage', 'internal-data-access'],
    purpose:
      'Ensures stored records remain encrypted in transit, access-controlled at rest, and minimized against unnecessary exposure.',
    scope:
      'Applies to all Firestore collections, server logs, and user attachments.',
    rules: [
      'Private user records (/users/{uid}, /wallets/{uid}, /payoutAccounts/{id}) are strictly isolated to the owner and verified Super Administrators.',
      'Payout account lists display masked last-4 digits rather than full unmasked identifiers during routine browsing.',
      'Immutable audit logs (/financialAuditLogs, /emailLogs, /policyAcceptances) cannot be altered or deleted by users.',
    ],
    exampleScenario:
      'Even an authenticated Client chatting with a Worker cannot query the Worker’s /payoutAccounts or /users document.',
    userObligations: [
      'Avoid pasting sensitive third-party personal data into public task briefs.',
    ],
    platformResponsibilities: [
      'Enforce strict field schemas, bounded lengths, and owner-only read rules.',
    ],
    prohibitedConduct: [
      'Extracting, leaking, or selling confidential platform or user datasets.',
    ],
    procedures: [
      'Security rule changes undergo automated ESLint security rule checks prior to deployment.',
    ],
    consequences: [
      'Data exfiltration triggers immediate ban and breach escalation.',
    ],
  }),

  buildPolicyDocument({
    slug: 'investigation',
    title: 'Investigation Policy',
    categoryId: CAT_F.id,
    categoryTitle: CAT_F.title,
    summary:
      'Governs fair, evidence-led compliance investigations, protective holds, user notice, and impartial findings.',
    relatedPolicySlugs: ['evidence-records', 'investigation-review', 'appeals', 'enforcement-penalties'],
    purpose:
      'Ensures compliance actions rely on documented facts rather than guesswork or bias.',
    scope:
      'Applies to fraud alerts, dispute escalations, misconduct reports, and payout holds.',
    rules: [
      'Investigators review real platform evidence: Firestore timestamps, task briefs, submissions, chat logs, ledger trails, and provider references.',
      'Accounts under active financial/fraud investigation may be placed on temporary hold to prevent asset dissipation.',
    ],
    exampleScenario:
      'When a Client reports plagiarized work, Trust & Safety reviews the original brief, submitted URL, revision history, and Worker response before ruling.',
    userObligations: [
      'Provide truthful, concise supporting evidence when requested during an investigation.',
    ],
    platformResponsibilities: [
      'Document every investigation outcome clearly and communicate decisions with appeal instructions.',
    ],
    prohibitedConduct: [
      'Destroying external deliverable evidence or fabricating counter-proof during a review.',
    ],
    procedures: [
      'Alert/Report -> Evidence Preservation -> Notice & Clarification Request -> Written Determination.',
    ],
    consequences: [
      'Non-cooperation or evidence tampering weighs against the obstructing party.',
    ],
  }),

  buildPolicyDocument({
    slug: 'evidence-records',
    title: 'Evidence and Records Policy',
    categoryId: CAT_F.id,
    categoryTitle: CAT_F.title,
    summary:
      'Defines admissible proof formats, audit trail preservation, and immutability of financial and policy acceptance records.',
    relatedPolicySlugs: ['investigation', 'workplace-monitoring', 'audit-accountability'],
    purpose:
      'Ensures disputes and compliance reviews rely on verifiable, tamper-resistant records.',
    scope:
      'Covers Firestore transaction records, policy acceptance timestamps, email delivery logs, and user-submitted evidence.',
    rules: [
      'Server-timestamped Firestore documents (createdAt == request.time, acceptedAt == request.time) serve as primary authoritative records.',
      'User-submitted screenshots must be corroborated against authentic transaction references, provider webhooks, or live URLs where possible.',
    ],
    exampleScenario:
      'A Worker claiming they accepted an earlier policy version is verified against the immutable /policyAcceptances timestamp and policyVersion record.',
    userObligations: [
      'Keep task revisions, approvals, and payment references inside official SWAS TASKS tools.',
    ],
    platformResponsibilities: [
      'Preserve immutable audit collections with update: false and delete: false.',
    ],
    prohibitedConduct: [
      'Submitting doctored screenshots or spoofed PDF bank receipts.',
    ],
    procedures: [
      'Attach verifiable task IDs, withdrawal references, and original links when filing tickets or appeals.',
    ],
    consequences: [
      'Submitting falsified evidence causes immediate appeal denial and permanent ban.',
    ],
  }),

  buildPolicyDocument({
    slug: 'enforcement-penalties',
    title: 'Enforcement and Penalties Policy',
    categoryId: CAT_F.id,
    categoryTitle: CAT_F.title,
    summary:
      'Explains graduated sanctions ranging from warnings and violation points to balance reversals, suspensions, and permanent bans.',
    relatedPolicySlugs: ['warning-system', 'violation-points', 'account-suspension', 'permanent-ban'],
    purpose:
      'Ensures enforcement penalties are proportional to severity, intent, and repeat history.',
    scope:
      'Applies to all verified compliance violations across SWAS TASKS.',
    rules: [
      'Minor first-time operational errors typically receive warnings or targeted restrictions; severe fraud, harassment, or unauthorized access incurs immediate suspension or permanent ban.',
      'Pending fraudulent earnings may be cancelled or reversed alongside account sanctions.',
    ],
    exampleScenario:
      'A first-time late delivery receives a minor warning, whereas submitting stolen work or phishing links triggers immediate suspension.',
    userObligations: [
      'Review violation notices carefully and correct underlying workflows.',
    ],
    platformResponsibilities: [
      'State the specific policy violated and available appeal pathway in every enforcement notice.',
    ],
    prohibitedConduct: [
      'Retaliating against reporters or opening alt accounts to dodge penalties.',
    ],
    procedures: [
      'Confirmed breach -> Penalty selection -> Notification & audit record -> Appeal eligibility.',
    ],
    consequences: [
      'Warnings, violation points, feature restrictions, temporary suspension, balance forfeiture (for fraud), or permanent ban.',
    ],
  }),

  // =========================================================================
  // G. SUSPENSIONS, VIOLATIONS & APPEALS (11 POLICIES)
  // =========================================================================
  buildPolicyDocument({
    slug: 'account-restriction',
    title: 'Account Restriction Policy',
    categoryId: CAT_G.id,
    categoryTitle: CAT_G.title,
    summary:
      'Governs targeted partial restrictions (e.g., pausing new bids, limiting task posting, or holding withdrawals) during reviews.',
    relatedPolicySlugs: ['workplace-restriction', 'account-suspension', 'appeals'],
    purpose:
      'Allows targeted risk containment without locking users out of viewing their records or resolving pending obligations.',
    scope:
      'Applies to accounts under partial functional limits.',
    rules: [
      'Restricted users retain read access to their ledger history, My Accepted Policies, and Support tickets so they can submit clarifications or appeals.',
      'Restrictions lift automatically or manually once conditions (e.g., payout re-verification) are satisfied.',
    ],
    exampleScenario:
      'An account undergoing payout verification has new withdrawal requests paused while retaining full dashboard and Support access.',
    userObligations: [
      'Provide requested verification details through Support.',
    ],
    platformResponsibilities: [
      'Keep restriction scopes transparent and review remediation submissions promptly.',
    ],
    prohibitedConduct: [
      'Bypassing restrictions via secondary accounts.',
    ],
    procedures: [
      'Notice issued -> User submits verification -> Compliance lifts or escalates restriction.',
    ],
    consequences: [
      'Failure to resolve critical verification holds may escalate to suspension.',
    ],
  }),

  buildPolicyDocument({
    slug: 'account-suspension',
    title: 'Account Suspension Policy',
    categoryId: CAT_G.id,
    categoryTitle: CAT_G.title,
    summary:
      'Defines temporary or indefinite account suspensions triggered by serious violations, accumulated points, or active security threats.',
    relatedPolicySlugs: ['account-restriction', 'account-termination', 'appeals', 'reinstatement'],
    purpose:
      'Halts active marketplace participation when serious rule breaches or security incidents occur.',
    scope:
      'Applies to any Client or Worker account placed in suspended status.',
    rules: [
      'Suspended accounts cannot post tasks, place bids, initiate withdrawals, or open new conversations.',
      'Users receive written notification explaining the violated policy and whether the suspension is time-bound or pending appeal review.',
    ],
    exampleScenario:
      'An account sending threatening messages in chat is suspended pending Trust & Safety review and may submit an appeal.',
    userObligations: [
      'Submit any appeal calmly through designated official channels.',
    ],
    platformResponsibilities: [
      'Protect legitimate settled funds during review rather than seizing unrelated balances arbitrarily.',
    ],
    prohibitedConduct: [
      'Registering replacement accounts during an active suspension.',
    ],
    procedures: [
      'Suspension notice -> Appeal window -> Review determination -> Reinstatement or Termination.',
    ],
    consequences: [
      'Unappealed or upheld severe suspensions convert to Account Termination or Permanent Ban.',
    ],
  }),

  buildPolicyDocument({
    slug: 'account-termination',
    title: 'Account Termination Policy',
    categoryId: CAT_G.id,
    categoryTitle: CAT_G.title,
    summary:
      'Rules governing involuntary permanent closure of accounts following severe or repeated unresolved policy breaches.',
    relatedPolicySlugs: ['account-suspension', 'permanent-ban', 'account-closure'],
    purpose:
      'Terminates ongoing contractual access where trust or compliance cannot be restored.',
    scope:
      'Applies to accounts terminated for cause.',
    rules: [
      'Termination ends workspace access permanently upon final compliance determination.',
      'Uncontested legitimate verified funds (not derived from fraud or third-party chargebacks) are handled under applicable settlement/payout review.',
    ],
    exampleScenario:
      'An account accruing repeated confirmed fraud violations after prior warnings is terminated permanently.',
    userObligations: [
      'Cease accessing platform workspaces and delete any confidential Client materials.',
    ],
    platformResponsibilities: [
      'Retain final audit and ledger documentation as legally required.',
    ],
    prohibitedConduct: [
      'Attempting unauthorized access after termination.',
    ],
    procedures: [
      'Final termination notice sent to verified email -> Final appeal window (if eligible) -> Terminal archive.',
    ],
    consequences: [
      'Loss of platform privileges.',
    ],
  }),

  buildPolicyDocument({
    slug: 'permanent-ban',
    title: 'Permanent Ban Policy',
    categoryId: CAT_G.id,
    categoryTitle: CAT_G.title,
    summary:
      'Zero-reinstatement lifetime exclusion for severe fraud, cyberattacks, harassment, money laundering, or ban evasion.',
    relatedPolicySlugs: ['account-termination', 'prohibited-activities', 'unauthorized-access'],
    purpose:
      'Protects the SWAS TASKS community permanently against high-severity bad actors.',
    scope:
      'Applies to natural persons and associated entities banned for critical offenses.',
    rules: [
      'Permanent bans apply to the individual, not merely a single email address; associated payout identifiers are permanently blocklisted.',
      'Offenses triggering immediate permanent ban include hacking attempts, AML/payment fraud, identity theft, and severe threats of violence.',
    ],
    exampleScenario:
      'An attacker attempting unauthorized token replay or SQL/NoSQL injection against platform APIs receives an immediate permanent ban without reinstatement.',
    userObligations: [
      'Respect permanent exclusion notices.',
    ],
    platformResponsibilities: [
      'Apply permanent bans only upon verified critical evidence and administrator sign-off.',
    ],
    prohibitedConduct: [
      'Ban evasion via third-party identities or proxy accounts.',
    ],
    procedures: [
      'Critical incident review -> Super Admin confirmation -> Permanent exclusion.',
    ],
    consequences: [
      'Permanent loss of all platform access and immediate closure of any linked evasion accounts.',
    ],
  }),

  buildPolicyDocument({
    slug: 'warning-system',
    title: 'Warning System Policy',
    categoryId: CAT_G.id,
    categoryTitle: CAT_G.title,
    summary:
      'Structured formal notice mechanism alerting users to minor infractions before restrictive penalties apply.',
    relatedPolicySlugs: ['violation-points', 'disciplinary-action', 'enforcement-penalties'],
    purpose:
      'Gives good-faith users fair opportunity to correct unintentional mistakes.',
    scope:
      'Applies to first-time minor conduct, formatting, deadline, or support etiquette infractions.',
    rules: [
      'Formal warnings specify the exact policy breached and expected corrective behavior.',
      'Repeating the warned behavior escalates directly to violation points or suspension.',
    ],
    exampleScenario:
      'A Worker who inadvertently submitted a draft link instead of the final URL receives a corrective warning rather than immediate suspension.',
    userObligations: [
      'Acknowledge warnings and update practices accordingly.',
    ],
    platformResponsibilities: [
      'Record warnings transparently so users understand their compliance standing.',
    ],
    prohibitedConduct: [
      'Ignoring repeated formal warnings.',
    ],
    procedures: [
      'Minor infraction -> Written warning via Notification/Email -> Logged on compliance profile.',
    ],
    consequences: [
      'Accumulated warnings trigger violation points and restrictions.',
    ],
  }),

  buildPolicyDocument({
    slug: 'violation-points',
    title: 'Violation Points Policy',
    categoryId: CAT_G.id,
    categoryTitle: CAT_G.title,
    summary:
      'Framework explaining cumulative violation point tracking, severity weighting, and escalation thresholds.',
    relatedPolicySlugs: ['warning-system', 'disciplinary-action', 'account-suspension'],
    pendingAdminReviewItems: [
      '[Administrator Review Required]: Confirm exact numeric point scale (e.g., 10-point vs 100-point scale), expiry/decay window, and exact suspension cutoffs.',
    ],
    purpose:
      'Provides consistent, predictable escalation for repeated rule infractions.',
    scope:
      'Applies across marketplace conduct, task reliability, and policy compliance.',
    rules: [
      'Verified violations carry weighted points proportional to severity (minor operational breach vs major integrity breach).',
      'Specific numeric point caps and point decay schedules remain pending final Administrator configuration in Governance settings.',
    ],
    exampleScenario:
      'Repeated minor deadline misses accumulate toward an automatic restriction review, whereas a single confirmed fraud violation triggers immediate suspension regardless of prior point score.',
    userObligations: [
      'Maintain clean compliance standing and appeal erroneous points promptly.',
    ],
    platformResponsibilities: [
      'Log clear timestamps and policy references for every assessed violation.',
    ],
    prohibitedConduct: [
      'Attempting to game threshold resets by cycling accounts.',
    ],
    procedures: [
      'Violation confirmed -> Points logged -> Threshold check -> Notice sent.',
    ],
    consequences: [
      'Crossing escalation thresholds activates restriction, suspension, or termination review.',
    ],
  }),

  buildPolicyDocument({
    slug: 'disciplinary-action',
    title: 'Disciplinary Action Policy',
    categoryId: CAT_G.id,
    categoryTitle: CAT_G.title,
    summary:
      'Consolidates corrective measures, account freezes, task removals, and proportional sanctions administered by Trust & Safety.',
    relatedPolicySlugs: ['enforcement-penalties', 'warning-system', 'appeals'],
    purpose:
      'Outlines the full spectrum of disciplinary measures and due-process safeguards.',
    scope:
      'Applies to all disciplinary determinations against Clients or Workers.',
    rules: [
      'Disciplinary measures must align with documented policy clauses and recorded evidence.',
      'No staff member may issue arbitrary or personal retaliatory discipline.',
    ],
    exampleScenario:
      'A Client repeatedly posting misleading KES 50 budgets for multi-week software builds receives task removal and a temporary posting hold.',
    userObligations: [
      'Comply with remedial actions such as removing infringing content.',
    ],
    platformResponsibilities: [
      'Maintain internal audit review over all major disciplinary actions.',
    ],
    prohibitedConduct: [
      'Harassing reviewers after a disciplinary notice.',
    ],
    procedures: [
      'Review -> Proportional sanction -> Notice with policy reference -> Appeal opportunity.',
    ],
    consequences: [
      'Ranges from task edit requirement up to permanent ban.',
    ],
  }),

  buildPolicyDocument({
    slug: 'investigation-review',
    title: 'Investigation and Review Policy',
    categoryId: CAT_G.id,
    categoryTitle: CAT_G.title,
    summary:
      'Independent second-level review standards for contested compliance holds, disputed tasks, and escalated enforcement cases.',
    relatedPolicySlugs: ['investigation', 'appeals', 'complaint-resolution'],
    purpose:
      'Guarantees a structured supervisory review whenever facts are disputed or initial penalties are appealed.',
    scope:
      'Applies to escalated investigations and formal appeal reviews.',
    rules: [
      'Appeals and contested reviews must be evaluated by a reviewer or administrator who was not the original source of bias or dispute.',
      'Decisions must cite concrete evidence from platform records.',
    ],
    exampleScenario:
      'If a Worker contests an automated suspicious-activity hold, an independent Finance/Trust reviewer inspects payout ownership docs before confirming or lifting the hold.',
    userObligations: [
      'Submit complete truthful context once rather than opening duplicate tickets.',
    ],
    platformResponsibilities: [
      'Record reasoned review outcomes in audit logs.',
    ],
    prohibitedConduct: [
      'Lobbying individual staff privately outside official review queues.',
    ],
    procedures: [
      'Case flagged -> Independent reviewer assigned -> Evidence evaluated -> Final notice delivered.',
    ],
    consequences: [
      'Original action is either upheld, modified, or overturned with record correction.',
    ],
  }),

  buildPolicyDocument({
    slug: 'appeals',
    title: 'Appeal Policy',
    categoryId: CAT_G.id,
    categoryTitle: CAT_G.title,
    summary:
      'Formal user right to challenge warnings, task rejections, payment holds, restrictions, and suspensions with supporting evidence.',
    requiresAcceptance: false,
    relatedPolicySlugs: ['investigation-review', 'reinstatement', 'complaint-resolution'],
    pendingAdminReviewItems: [
      '[Administrator Review Required]: Confirm standard appeal filing deadline (days from notice) and target appeal decision SLA.',
    ],
    purpose:
      'Provides every user a transparent, accessible procedure to correct mistakes and present context against enforcement actions.',
    scope:
      'Applies to warnings, violation points, task rejections, payout rejections, restrictions, and suspensions (excluding confirmed severe permanent bans where final review has concluded).',
    rules: [
      'Appeals must be submitted through Help & Support or official email swastaskorg@gmail.com citing the user UID, notice reference, and factual explanation.',
      'Users may attach verifiable external links, transaction references, or deliverable proofs.',
      'Filing an appeal in good faith never increases a user’s penalty.',
    ],
    exampleScenario:
      'A Worker suspended for suspected duplicate accounts submits proof that a family member accidentally entered the shared mobile number and requests reinstatement review.',
    userObligations: [
      'Be truthful, concise, and respectful in all appeal submissions.',
    ],
    platformResponsibilities: [
      'Review every eligible appeal fairly and issue a reasoned written response.',
    ],
    prohibitedConduct: [
      'Spamming dozens of identical appeal tickets or submitting forged documents.',
    ],
    procedures: [
      'Open Help & Support (or email swastaskorg@gmail.com) -> Submit Appeal & Evidence -> Independent Review -> Written Decision.',
    ],
    consequences: [
      'Successful appeals reverse erroneous penalties and restore account access.',
    ],
  }),

  buildPolicyDocument({
    slug: 'complaint-resolution',
    title: 'Complaint Resolution Policy',
    categoryId: CAT_G.id,
    categoryTitle: CAT_G.title,
    summary:
      'Handles service complaints regarding platform usability, counterparty conduct, support quality, or staff behavior.',
    relatedPolicySlugs: ['appeals', 'support-helpdesk', 'dispute-resolution'],
    purpose:
      'Ensures operational complaints are logged, escalated appropriately, and resolved constructively.',
    scope:
      'Covers general service complaints distinct from formal financial disputes or suspension appeals.',
    rules: [
      'Complaints may be logged via Help & Support or emailed to swastaskorg@gmail.com.',
      'Complaints involving staff or reviewer conduct are escalated directly to Super Administrators.',
    ],
    exampleScenario:
      'A Client dissatisfied with how a revision dispute was handled submits a formal complaint referencing the ticket ID for supervisory review.',
    userObligations: [
      'Include clear dates, reference IDs, and specific concerns.',
    ],
    platformResponsibilities: [
      'Acknowledge complaints and route staff-related complaints independently.',
    ],
    prohibitedConduct: [
      'Using complaints for abusive profanity or defamatory harassment.',
    ],
    procedures: [
      'Log Complaint -> Acknowledgement -> Supervisor Assessment -> Resolution Summary.',
    ],
    consequences: [
      'Confirmed internal service failures prompt corrective coaching or process updates.',
    ],
  }),

  buildPolicyDocument({
    slug: 'reinstatement',
    title: 'Reinstatement Policy',
    categoryId: CAT_G.id,
    categoryTitle: CAT_G.title,
    summary:
      'Criteria and verification steps for restoring suspended or deactivated accounts once compliance issues are resolved.',
    relatedPolicySlugs: ['appeals', 'account-suspension', 'account-recovery'],
    purpose:
      'Establishes clear rules for returning eligible accounts safely to active workspace standing.',
    scope:
      'Applies to approved appeals, expired temporary suspensions, and security-lock recoveries.',
    rules: [
      'Reinstatement requires resolving the root trigger (e.g., securing compromised credentials, verifying payout ownership, or completing pending obligations).',
      'Reinstated accounts may undergo a brief monitoring period with updated policy re-acceptance.',
    ],
    exampleScenario:
      'After proving identity following a protective security lock, the user resets their password, re-accepts updated Security Policy terms, and regains workspace access.',
    userObligations: [
      'Accept required compliance terms and maintain clean conduct post-reinstatement.',
    ],
    platformResponsibilities: [
      'Restore legitimate balances and workspace visibility promptly upon reinstatement approval.',
    ],
    prohibitedConduct: [
      'Claiming reinstatement through unofficial third parties or paid "unban" brokers.',
    ],
    procedures: [
      'Approved Appeal / Remediation -> Identity Re-verification -> Policy Acceptance -> Workspace Reactivation.',
    ],
    consequences: [
      'Repeat serious violations after reinstatement typically result in permanent termination.',
    ],
  }),
];
