import type { PolicyDocument } from '../../types/marketplace';
import { buildPolicyDocument } from './builder';

const CAT_C = { id: 'tasks-work', title: 'Tasks & Work' };
const CAT_D = { id: 'earnings-financial', title: 'Earnings, Payments & Withdrawals' };

export const PART2_POLICIES: PolicyDocument[] = [
  // =========================================================================
  // C. TASKS & WORK (16 POLICIES)
  // =========================================================================
  buildPolicyDocument({
    slug: 'task-participation',
    title: 'Task Participation Policy',
    categoryId: CAT_C.id,
    categoryTitle: CAT_C.title,
    summary:
      'Core eligibility and operational rules for Clients publishing tasks and Workers bidding on or executing marketplace assignments.',
    requiresAcceptance: false,
    relatedPolicySlugs: ['task-assignment', 'task-submission', 'workplace-operating-rules'],
    purpose:
      'Establishes fair participation requirements across public and invite-only SWAS TASKS marketplaces.',
    scope:
      'Applies to all Workers browsing or bidding and Clients publishing briefs.',
    rules: [
      'Only verified Client accounts may create or manage tasks; only verified Worker accounts may bid on or deliver tasks.',
      'Clients cannot bid on their own tasks; Firestore security rules enforce clientId != workerId.',
      'Workers may bid only on open tasks where they possess the required skills and availability.',
    ],
    exampleScenario:
      'A Client switches visibility from Public to Invite Only while refining requirements; Workers can only bid once the task status is Open.',
    userObligations: [
      'Read full task instructions, budget, and deadline before submitting any bid.',
    ],
    platformResponsibilities: [
      'Enforce strict Client/Worker role separation and task status checks on every bid.',
    ],
    prohibitedConduct: [
      'Self-bidding via colluding accounts or bidding with placeholder spam text to reserve slots.',
    ],
    procedures: [
      'Inspect task brief -> submit realistic bid in KES & delivery days -> await Client acceptance.',
    ],
    consequences: [
      'Invalid bids are rejected; abusive participation incurs violation points.',
    ],
  }),

  buildPolicyDocument({
    slug: 'task-assignment',
    title: 'Task Assignment Policy',
    categoryId: CAT_C.id,
    categoryTitle: CAT_C.title,
    summary:
      'Rules governing bid acceptance, atomic assignment creation, locked agreedKES amounts, and competing bid handling.',
    relatedPolicySlugs: ['task-participation', 'task-acceptance', 'task-cancellation'],
    purpose:
      'Ensures transparent conversion of accepted Worker bids into formal, auditable assignments.',
    scope:
      'Applies to all bid acceptances and resulting assignments.',
    rules: [
      'Accepting a Worker bid atomically transitions the bid to Accepted, binds agreedKES to the bid amount, sets task status to In Progress, and creates an Active assignment.',
      'Competing pending bids on the same single-slot assignment are notified cleanly when rejected or closed.',
    ],
    exampleScenario:
      'A Client reviews three bids on a QA & Testing brief and accepts a KES 3,000 / 2-day bid, immediately locking the assignment between both UIDs.',
    userObligations: [
      'Clients must review bid proposals carefully before clicking Accept.',
    ],
    platformResponsibilities: [
      'Lock agreedKES and party UIDs immutably on the assignment record via Firestore rules.',
    ],
    prohibitedConduct: [
      'Pressuring Workers after acceptance to perform double the scope without a separate task or adjustment.',
    ],
    procedures: [
      'Client clicks Accept Bid -> Worker receives real-time notification -> Assignment opens in My Assignments.',
    ],
    consequences: [
      'Scope abuse or abandonment triggers mediation and performance penalties.',
    ],
  }),

  buildPolicyDocument({
    slug: 'task-acceptance',
    title: 'Task Acceptance Policy',
    categoryId: CAT_C.id,
    categoryTitle: CAT_C.title,
    summary:
      'Defines Worker commitment upon assignment activation and Client commitment to honour accepted bids.',
    relatedPolicySlugs: ['task-assignment', 'task-deadline', 'task-cancellation'],
    purpose:
      'Confirms mutual obligation once an assignment becomes active.',
    scope:
      'Applies from the moment a bid is accepted through delivery or lawful cancellation.',
    rules: [
      'Submitting a bid constitutes an offer to perform the stated task within the proposed deliveryDays and budget.',
      'Workers must immediately notify the Client in Messages if unforeseen blockers threaten the agreed timeline.',
    ],
    exampleScenario:
      'A Worker who submitted a 3-day proposal begins work promptly upon receiving the Bid Accepted notification and confirms deliverable format in chat.',
    userObligations: [
      'Honor accepted terms and communicate proactively.',
    ],
    platformResponsibilities: [
      'Timestamp acceptance and provide real-time messaging between matched parties.',
    ],
    prohibitedConduct: [
      'Accepting assignments with no intention of delivering work or ghosting active Clients.',
    ],
    procedures: [
      'Pending bids may be withdrawn by the Worker BEFORE acceptance; after acceptance, changes require Client consent or Support review.',
    ],
    consequences: [
      'Repeated abandonment of accepted assignments lowers workplace eligibility and triggers suspension.',
    ],
  }),

  buildPolicyDocument({
    slug: 'task-completion',
    title: 'Task Completion Guidelines',
    categoryId: CAT_C.id,
    categoryTitle: CAT_C.title,
    summary:
      'Checklist and operational standards for verifying that deliverables meet every requirement prior to final submission.',
    relatedPolicySlugs: ['task-submission', 'task-quality-standards', 'approved-earnings'],
    purpose:
      'Helps Workers deliver complete, review-ready work on the first submission and helps Clients evaluate completion objectively.',
    scope:
      'Applies to all active and revision-requested assignments.',
    rules: [
      'Deliverables must address every requirement listed in the original task brief and any agreed clarifications in conversation logs.',
      'External deliverable links (documents, repositories, media folders) must have accessible view permissions for the Client.',
    ],
    exampleScenario:
      'Before marking an assignment submitted, a Design & Media Worker verifies that both PNG and editable source links open without access-denied errors.',
    userObligations: [
      'Verify completeness, file integrity, and readable formatting prior to submission.',
    ],
    platformResponsibilities: [
      'Preserve clear submission notes, deliverable URLs, and approval history.',
    ],
    prohibitedConduct: [
      'Marking assignments submitted with empty notes or broken placeholder URLs to stall deadlines.',
    ],
    procedures: [
      'Complete deliverable -> verify links -> submit notes and URL in My Assignments -> await Client review.',
    ],
    consequences: [
      'Incomplete submissions receive revision requests or rejection.',
    ],
  }),

  buildPolicyDocument({
    slug: 'task-submission',
    title: 'Task Submission Policy',
    categoryId: CAT_C.id,
    categoryTitle: CAT_C.title,
    summary:
      'Binding rules governing deliverable submission forms, attachment URLs, originality attestations, and audit trails.',
    requiresAcceptance: true,
    acceptanceContexts: ['task_submission'],
    relatedPolicySlugs: ['task-completion', 'duplicate-submission', 'task-accuracy', 'task-fraud'],
    purpose:
      'Ensures every submitted assignment contains authentic, traceable work delivered securely through official assignment controls.',
    scope:
      'Applies whenever a Worker transitions an assignment from Active or Revision Requested to Submitted.',
    rules: [
      'All submissions must be logged through the My Assignments submission panel with clear summary notes and valid deliverable links where applicable.',
      'Submitted work must be original and compliant with intellectual property rules.',
      'Re-submissions after revision requests must clearly document what corrections were made.',
    ],
    exampleScenario:
      'A Worker completes a Content & Copywriting task, pastes the verified document URL and concise delivery notes, and reviews the submission policy notice before submitting.',
    userObligations: [
      'Provide honest, verifiable submission notes and working deliverable links.',
    ],
    platformResponsibilities: [
      'Validate submission fields, timestamp state transitions, and notify Clients immediately.',
    ],
    prohibitedConduct: [
      'Submitting empty files, malware links, stolen third-party content, or fabricated proof.',
    ],
    procedures: [
      'Worker submits -> Status becomes Submitted -> Client inspects -> Client approves or requests revision.',
    ],
    consequences: [
      'Fraudulent or empty submissions result in rejection, zero payout, and violation points.',
    ],
  }),

  buildPolicyDocument({
    slug: 'task-quality-standards',
    title: 'Task Quality Standards',
    categoryId: CAT_C.id,
    categoryTitle: CAT_C.title,
    summary:
      'Quality expectations across research, copywriting, design, QA testing, field audits, and technical deliverables.',
    relatedPolicySlugs: ['task-accuracy', 'task-revision', 'task-rejection'],
    purpose:
      'Establishes baseline quality criteria so marketplace outputs remain reliable and professionally usable.',
    scope:
      'Applies to all six SWAS TASKS categories.',
    rules: [
      'Deliverables must be coherent, formatted cleanly, free from blatant machine-generated gibberish, and aligned with the brief.',
      'Field & Errands audits must provide genuine timestamps and authentic on-site verification as specified.',
    ],
    exampleScenario:
      'A QA & Testing submission includes reproduction steps, expected vs. actual behavior, and environment details rather than a one-line "looks okay" note.',
    userObligations: [
      'Proofread and quality-check deliverables before submission.',
    ],
    platformResponsibilities: [
      'Support structured revision loops before any rejection or dispute.',
    ],
    prohibitedConduct: [
      'Submitting unedited low-quality filler or fabricated testing results.',
    ],
    procedures: [
      'Clients evaluate submissions against published task quality criteria and provide actionable feedback if revisions are needed.',
    ],
    consequences: [
      'Consistent sub-standard work may restrict access to specialized tasks or workplaces.',
    ],
  }),

  buildPolicyDocument({
    slug: 'task-accuracy',
    title: 'Task Accuracy Policy',
    categoryId: CAT_C.id,
    categoryTitle: CAT_C.title,
    summary:
      'Rules requiring factual precision, verified datasets, authentic measurements, and truthful reporting in deliverables.',
    relatedPolicySlugs: ['task-quality-standards', 'task-submission', 'task-fraud'],
    purpose:
      'Protects Clients relying on SWAS TASKS outputs for business decisions, catalogs, and technical operations.',
    scope:
      'Applies especially to Data & Research, QA & Testing, Field & Errands, and Web & Technical assignments.',
    rules: [
      'Workers must never invent missing records, guess unverified contact fields, or fabricate survey/audit observations.',
      'Where data cannot be verified from permitted sources, the Worker must clearly flag the gap rather than filling rows with guesses.',
    ],
    exampleScenario:
      'In a 100-row store verification task, a Worker leaves 4 closed shops flagged as "Closed / Unverified" with photos instead of copying outdated hours.',
    userObligations: [
      'Verify sources and report uncertainty transparently.',
    ],
    platformResponsibilities: [
      'Treat deliberate data fabrication as severe Task Fraud during compliance reviews.',
    ],
    prohibitedConduct: [
      'Falsifying metrics, copying sample outputs, or hallucinating non-existent citations.',
    ],
    procedures: [
      'Accuracy disputes are audited against the Client brief and raw submission artifacts.',
    ],
    consequences: [
      'Payment reversal/non-approval for fabricated outputs and suspension for intentional falsification.',
    ],
  }),

  buildPolicyDocument({
    slug: 'task-deadline',
    title: 'Task Deadline Policy',
    categoryId: CAT_C.id,
    categoryTitle: CAT_C.title,
    summary:
      'Governs delivery timelines, late-delivery communication, Client review timeframes, and missed-deadline handling.',
    relatedPolicySlugs: ['task-acceptance', 'task-cancellation', 'task-revision'],
    pendingAdminReviewItems: [
      '[Administrator Review Required]: Confirm default automatic Client review timeout (days) after deliverable submission if a Client becomes unresponsive.',
    ],
    purpose:
      'Keeps marketplace projects predictable for both Clients and Workers.',
    scope:
      'Applies to task deadline dates and bid deliveryDays commitments.',
    rules: [
      'Workers must submit completed work on or before the agreed deadline unless an extension is explicitly documented in conversation.',
      'Clients must review submitted work promptly and not withhold approval indefinitely after receiving compliant deliverables.',
    ],
    exampleScenario:
      'Facing an unexpected power outage 12 hours before deadline, a Worker messages the Client immediately with partial progress and requests a 24-hour extension.',
    userObligations: [
      'Respect agreed schedules and communicate delays early.',
    ],
    platformResponsibilities: [
      'Display deadlines visibly on task cards, bids, and assignments.',
    ],
    prohibitedConduct: [
      'Deliberately stalling submissions or withholding review approval to extract free extra work.',
    ],
    procedures: [
      'If a Client fails to review a compliant submission within a reasonable window, the Worker may escalate to Help & Support for administrative review.',
    ],
    consequences: [
      'Unexcused missed deadlines may allow Client cancellation and affect Worker reliability standing.',
    ],
  }),

  buildPolicyDocument({
    slug: 'task-revision',
    title: 'Task Revision & Correction Policy',
    categoryId: CAT_C.id,
    categoryTitle: CAT_C.title,
    summary:
      'Defines fair revision requests, scope boundaries during revisions, and Worker turnaround obligations.',
    relatedPolicySlugs: ['task-quality-standards', 'task-rejection', 'dispute-resolution'],
    purpose:
      'Provides a structured correction path so minor defects are fixed fairly without unfair rejections or endless unpaid scope creep.',
    scope:
      'Applies whenever a Client sets an assignment status to Revision Requested.',
    rules: [
      'Clients must provide clear, actionable feedback explaining specifically which original task criteria were unmet.',
      'Revisions may only cover requirements within the original brief; new unrelated features require a separate paid task.',
    ],
    exampleScenario:
      'A Client asks to fix broken table alignment in a submitted report (valid revision), rather than asking the Worker to translate the entire report into two new languages for free (out-of-scope).',
    userObligations: [
      'Workers address valid revision notes promptly; Clients state all defects clearly.',
    ],
    platformResponsibilities: [
      'Track revision feedback strings and state transitions on the assignment record.',
    ],
    prohibitedConduct: [
      'Abusing endless revision loops to avoid approving compliant deliverables.',
    ],
    procedures: [
      'Client selects Request Revision with feedback -> Worker corrects & re-submits -> Client reviews.',
    ],
    consequences: [
      'Abusive revision behavior may be overridden by administrative dispute review.',
    ],
  }),

  buildPolicyDocument({
    slug: 'task-rejection',
    title: 'Task Rejection Policy',
    categoryId: CAT_C.id,
    categoryTitle: CAT_C.title,
    summary:
      'Explains strict grounds under which submitted work may be rejected and how Workers can appeal unfair rejections.',
    relatedPolicySlugs: ['task-revision', 'appeals', 'payment-disputes'],
    purpose:
      'Protects Clients from paying for unusable, off-brief, or fraudulent work while protecting Workers from arbitrary unpaid rejections.',
    scope:
      'Applies to disputed or rejected assignment submissions.',
    rules: [
      'Work that fulfills the agreed brief and quality standards may not be arbitrarily rejected.',
      'Legitimate rejection requires documented non-compliance after revision opportunity, missed critical deadlines rendering work unusable, or confirmed fraud/plagiarism.',
    ],
    exampleScenario:
      'A Worker submits copied Wikipedia text for an original market research brief; after verification, the submission is rejected without payout.',
    userObligations: [
      'Keep all work feedback and delivery proof inside official assignment and conversation logs.',
    ],
    platformResponsibilities: [
      'Require verifiable evidence before confirming non-payment on contested submissions.',
    ],
    prohibitedConduct: [
      'Rejecting work while secretly using the submitted deliverable commercially.',
    ],
    procedures: [
      'Workers contesting a rejection may file a formal appeal with delivery links and chat records via Support.',
    ],
    consequences: [
      'Clients caught using rejected deliverables face immediate balance recovery and suspension.',
    ],
  }),

  buildPolicyDocument({
    slug: 'task-cancellation',
    title: 'Task Cancellation Policy',
    categoryId: CAT_C.id,
    categoryTitle: CAT_C.title,
    summary:
      'Governs pausing/closing open tasks, bid withdrawals, and mid-assignment cancellations by Clients, Workers, or Administrators.',
    relatedPolicySlugs: ['task-assignment', 'refund', 'task-deadline'],
    purpose:
      'Defines fair exits when project priorities change or an active engagement cannot proceed.',
    scope:
      'Applies to open tasks, pending bids, and active assignments.',
    rules: [
      'Clients may pause or close open tasks freely before accepting a bid.',
      'Workers may withdraw pending bids anytime prior to Client acceptance.',
      'Cancelling an active assignment after work has commenced requires mutual agreement or Support mediation to assess partial earned value.',
    ],
    exampleScenario:
      'A Client pauses an open task because internal specs changed before accepting any bid; pending bidders are unaffected.',
    userObligations: [
      'Notify counterparties immediately if circumstances prevent completion.',
    ],
    platformResponsibilities: [
      'Enforce valid bid withdrawal and task status rules in Firestore.',
    ],
    prohibitedConduct: [
      'Cancelling active assignments right after previewing completed work.',
    ],
    procedures: [
      'Open tasks: Client updates status -> Active assignments: escalate to Support for fair closure/refund calculation.',
    ],
    consequences: [
      'Bad-faith cancellations trigger financial recovery and violation points.',
    ],
  }),

  buildPolicyDocument({
    slug: 'duplicate-submission',
    title: 'Duplicate Submission Policy',
    categoryId: CAT_C.id,
    categoryTitle: CAT_C.title,
    summary:
      'Prohibits resubmitting identical unchanged work or recycling one deliverable across multiple paid assignments.',
    relatedPolicySlugs: ['task-submission', 'task-fraud', 'anti-cheating'],
    purpose:
      'Prevents payment inflation from duplicate deliverable recycling or unchanged spam resubmissions.',
    scope:
      'Applies to all assignment submissions and multi-task deliverables.',
    rules: [
      'Workers must not resubmit the exact same unedited deliverable after receiving specific revision feedback.',
      'Workers must not recycle the same bespoke deliverable across separate Client tasks unless explicitly permitted as non-exclusive material.',
    ],
    exampleScenario:
      'Resubmitting the exact same broken link three times without applying the requested fix violates this policy.',
    userObligations: [
      'Apply requested changes genuinely before clicking Submit Work again.',
    ],
    platformResponsibilities: [
      'Review submission history and URL timestamps during revision disputes.',
    ],
    prohibitedConduct: [
      'Repeated identical submissions or double-selling exclusive Client work.',
    ],
    procedures: [
      'Clients may report unchanged duplicate resubmissions via Help & Support.',
    ],
    consequences: [
      'Warning, assignment forfeiture, or suspension for repeated evasion.',
    ],
  }),

  buildPolicyDocument({
    slug: 'task-fraud',
    title: 'Task Fraud & Manipulation Policy',
    categoryId: CAT_C.id,
    categoryTitle: CAT_C.title,
    summary:
      'Zero-tolerance ban on wash-tasking, fake submissions, collusion between Clients and Workers, and metric spoofing.',
    relatedPolicySlugs: ['fraud-prevention', 'anti-manipulation', 'prohibited-activities'],
    purpose:
      'Protects the marketplace ledger and client budgets against coordinated or individual task manipulation.',
    scope:
      'Applies to all tasks, bids, assignments, and approval events.',
    rules: [
      'Creating sham tasks solely to launder funds, transfer balances, farm completed task counts, or game promotional metrics is strictly prohibited.',
      'Colluding with another user to approve empty or worthless submissions violates Task Fraud rules.',
    ],
    exampleScenario:
      'Two linked accounts post and immediately approve a KES 10,000 task within 60 seconds with a dummy link. Automated audit flags freeze settlement.',
    userObligations: [
      'Engage solely in genuine commercial tasks with real deliverables.',
    ],
    platformResponsibilities: [
      'Hold suspicious rapid-approval ledger entries in pending_confirmation pending compliance audit.',
    ],
    prohibitedConduct: [
      'Sham hiring, collusion, falsified deliverable evidence, or fake field check-ins.',
    ],
    procedures: [
      'Suspected task fraud triggers immediate freeze of related transactions and compliance investigation.',
    ],
    consequences: [
      'Reversal of fraudulent pending earnings, permanent ban of all colluding accounts.',
    ],
  }),

  buildPolicyDocument({
    slug: 'prohibited-task-assistance',
    title: 'Prohibited Task Assistance Policy',
    categoryId: CAT_C.id,
    categoryTitle: CAT_C.title,
    summary:
      'Rules on unauthorized subcontracting, unapproved AI-spam generation, and undisclosed third-party outsourcing of assignments.',
    relatedPolicySlugs: ['account-sharing', 'automated-tools-bots', 'task-quality-standards'],
    purpose:
      'Ensures Clients receive work produced by the verified Worker they vetted and hired, with transparent tool usage.',
    scope:
      'Applies to all accepted assignments.',
    rules: [
      'Workers may not secretly subcontract sensitive or confidential Client tasks to unverified external individuals outside SWAS TASKS.',
      'Using automated bots or raw unedited AI output where human research, authentic copy, or real-world QA testing was contracted violates this policy.',
    ],
    exampleScenario:
      'A Worker hired for manual mobile checkout QA testing cannot run an automated placeholder script that fabricates pass results.',
    userObligations: [
      'Perform contracted tasks personally and disclose authorized tool usage where required by the brief.',
    ],
    platformResponsibilities: [
      'Protect Client confidentiality by forbidding unauthorized external exposure of task files.',
    ],
    prohibitedConduct: [
      'Subcontracting NDA/confidential tasks or delivering unverified automated slop.',
    ],
    procedures: [
      'Clients may specify strict no-AI or strict human-only criteria in task briefs; breaches are reviewable under Task Quality & Fraud rules.',
    ],
    consequences: [
      'Rejection of non-compliant deliverables and workplace access revocation.',
    ],
  }),

  buildPolicyDocument({
    slug: 'workplace-operating-rules',
    title: 'Workplace Operating Rules',
    categoryId: CAT_C.id,
    categoryTitle: CAT_C.title,
    summary:
      'Daily workflow discipline inside Client and Worker Workplaces, including communication etiquette, status tracking, and file hygiene.',
    relatedPolicySlugs: ['workplace-access', 'workplace-productivity', 'task-participation'],
    purpose:
      'Keeps active SWAS TASKS workspaces orderly, predictable, and secure for both Clients and Workers.',
    scope:
      'Applies across all Workspace navigation views (Browse Tasks, Post a Task, Bids, Assignments, Projects, Messages).',
    rules: [
      'All assignment status updates, deliverable links, and revision notes must be recorded inside the workspace so an auditable trail exists.',
      'Users must keep workspace conversations strictly relevant to active tasks and deliverables.',
    ],
    exampleScenario:
      'Instead of sending unrecorded revision requests via private social apps, a Client uses the Request Revision button so timestamps and feedback remain visible.',
    userObligations: [
      'Keep task agreements and deliverables anchored inside the workspace.',
    ],
    platformResponsibilities: [
      'Provide clean role-tailored navigation and real-time assignment status updates.',
    ],
    prohibitedConduct: [
      'Soliciting off-platform workarounds designed to hide deliverable history or bypass ledger records.',
    ],
    procedures: [
      'Compliance reviews inspect official workspace logs first when resolving disputes.',
    ],
    consequences: [
      'Off-platform agreements forfeit platform dispute protection and may incur warnings.',
    ],
  }),

  buildPolicyDocument({
    slug: 'productivity-standards',
    title: 'Productivity Standards Policy',
    categoryId: CAT_C.id,
    categoryTitle: CAT_C.title,
    summary:
      'Benchmarks for timely responsiveness, completion consistency, and reliable project execution across workplaces.',
    relatedPolicySlugs: ['workplace-performance', 'workplace-productivity', 'task-deadline'],
    pendingAdminReviewItems: [
      '[Administrator Review Required]: Confirm exact minimum completion-rate percentage or inactivity thresholds used for specialized workplace qualification.',
    ],
    purpose:
      'Encourages dependable execution habits so high-performing Workers and responsive Clients build sustained trust.',
    scope:
      'Applies to active Workers and Clients managing assignments.',
    rules: [
      'Workers should accept only workloads they can reliably finish on schedule.',
      'Clients should respond to Worker clarification questions and review submissions promptly.',
    ],
    exampleScenario:
      'A Worker limits concurrent active assignments to three manageable projects to maintain 100% on-time submission.',
    userObligations: [
      'Manage active queue capacity responsibly.',
    ],
    platformResponsibilities: [
      'Display clear counts of active assignments, pending bids, and revision requests on workspace dashboards.',
    ],
    prohibitedConduct: [
      'Hoarding assignments with chronic missed deadlines.',
    ],
    procedures: [
      'Chronic missed deadlines are evaluated alongside Worker explanations before restriction.',
    ],
    consequences: [
      'Temporary limit on concurrent active assignments or removal from specialized workplaces.',
    ],
  }),

  // =========================================================================
  // D. EARNINGS, PAYMENTS & WITHDRAWALS (21 POLICIES)
  // =========================================================================
  buildPolicyDocument({
    slug: 'earnings',
    title: 'Earnings Policy',
    categoryId: CAT_D.id,
    categoryTitle: CAT_D.title,
    summary:
      'Explains how Workers earn remuneration from completed assignments, currency isolation, and verification before payout eligibility.',
    requiresAcceptance: true,
    acceptanceContexts: ['registration', 'withdrawal'],
    relatedPolicySlugs: ['task-reward', 'pending-earnings', 'approved-earnings', 'withdrawals', 'wallet-policy'],
    purpose:
      'Provides full clarity on how Worker earnings are calculated, recorded, verified, and made available in the SWAS Financial Centre.',
    scope:
      'Applies to all Worker earnings generated from marketplace assignments and approved incentives.',
    rules: [
      'Earnings arise strictly from Client-approved assignments or officially documented platform incentives.',
      'Client assignment approval logs a pending_confirmation earning entry; funds become withdrawable only after transition to verified_settled.',
      'Earnings are recorded in their designated currency without fabricating conversions across currencies.',
    ],
    exampleScenario:
      'A Worker completes a KES 2,500 assignment. Upon Client approval, KES 2,500 appears under Pending Earnings until backend confirmation moves it into Verified Available Balance.',
    userObligations: [
      'Verify payout destinations and monitor ledger statuses in the Financial Centre.',
    ],
    platformResponsibilities: [
      'Separate Available Balance from Pending Earnings clearly in every currency wallet.',
    ],
    prohibitedConduct: [
      'Generating artificial earnings via sham tasks or exploiting ledger bugs.',
    ],
    procedures: [
      'Earn via assignment completion -> pending_confirmation audit -> verified_settled wallet credit -> eligible withdrawal.',
    ],
    consequences: [
      'Disputed or fraudulent earnings may be held, reversed, or forfeited upon confirmed violation.',
    ],
  }),

  buildPolicyDocument({
    slug: 'task-reward',
    title: 'Task Reward Policy',
    categoryId: CAT_D.id,
    categoryTitle: CAT_D.title,
    summary:
      'Governs agreed task budgets, bid pricing transparency, and reward adjustments across assignments.',
    relatedPolicySlugs: ['earnings', 'task-assignment', 'bonus-rewards'],
    purpose:
      'Ensures task compensation matches agreed assignment terms without hidden deductions.',
    scope:
      'Applies to all task budgets and accepted bid amounts.',
    rules: [
      'The agreed reward is fixed at bid acceptance (agreedKES) unless adjusted via a documented platform dispute resolution or supplemental task.',
      'Any applicable withdrawal fee is shown transparently prior to payout submission.',
    ],
    exampleScenario:
      'If a task lists a budget range of KES 5,000 and a Worker bids KES 4,800, the binding task reward upon acceptance is KES 4,800.',
    userObligations: [
      'Factor effort, tools, and potential payout fees into bid pricing.',
    ],
    platformResponsibilities: [
      'Display gross amount, any configured provider fee, and net payout before withdrawal confirmation.',
    ],
    prohibitedConduct: [
      'Promising off-platform tips to bypass assignment reporting.',
    ],
    procedures: [
      'Reward discrepancies must be reported immediately before assignment completion.',
    ],
    consequences: [
      'Side-deal fee promises are unenforceable on SWAS TASKS.',
    ],
  }),

  buildPolicyDocument({
    slug: 'wallet-policy',
    title: 'Wallet Policy',
    categoryId: CAT_D.id,
    categoryTitle: CAT_D.title,
    summary:
      'Defines multi-currency isolated wallet operation, non-banking status, owner isolation, and withdrawal lock protections.',
    relatedPolicySlugs: ['earnings', 'pending-earnings', 'approved-earnings', 'currency-policy'],
    purpose:
      'Governs how SWAS TASKS maintains user wallet balances securely inside owner-isolated Firestore records.',
    scope:
      'Applies to all user wallets initialized on SWAS TASKS.',
    rules: [
      'SWAS TASKS wallets track platform earnings and settlement records; SWAS TASKS is not a licensed bank or interest-bearing savings institution.',
      'Balances are strictly isolated per currency (e.g., KES, UGX, TZS, RWF, NGN, USD, USDT) without unauthorized blending.',
      'Users cannot directly edit wallet balances; only verified backend/administrator settlement actions credit or debit verified wallet totals.',
    ],
    exampleScenario:
      'A Worker with KES 4,000 available and USD 0 cannot withdraw USD directly from their KES wallet unless an approved verified conversion rail is configured.',
    userObligations: [
      'Monitor wallet statements regularly and report unrecognized ledger entries immediately.',
    ],
    platformResponsibilities: [
      'Protect wallet writes strictly via Firestore security rules (allow update: if isAdmin()).',
    ],
    prohibitedConduct: [
      'Attempting to tamper with client-side balance values or overdraw pending funds.',
    ],
    procedures: [
      'Access Wallet Overview in the Financial Centre to inspect available and pending balances by currency.',
    ],
    consequences: [
      'Suspected wallet tampering locks payouts immediately pending forensic review.',
    ],
  }),

  buildPolicyDocument({
    slug: 'pending-earnings',
    title: 'Pending Earnings Policy',
    categoryId: CAT_D.id,
    categoryTitle: CAT_D.title,
    summary:
      'Clarifies why newly approved tasks remain Pending Confirmation prior to becoming withdrawable Available Balance.',
    relatedPolicySlugs: ['approved-earnings', 'earnings', 'payment-processing'],
    pendingAdminReviewItems: [
      '[Administrator Review Required]: Confirm standard clearance hold window (if any) between Client approval and finance settlement release.',
    ],
    purpose:
      'Prevents premature payouts before payment confirmation, anti-fraud checks, and chargeback/dispute clearance.',
    scope:
      'Applies to all transactions marked pending_confirmation.',
    rules: [
      'Every newly approved task earning begins as pending_confirmation.',
      'Pending earnings cannot be withdrawn until verified and settled into Available Balance.',
      'Pending entries remain subject to reversal if fraud, chargeback, or confirmed non-delivery occurs.',
    ],
    exampleScenario:
      'Immediately after a Client clicks Approve Deliverable, the Worker sees the sum under Pending Settlement while finance verification confirms settlement.',
    userObligations: [
      'Wait for verified_settled confirmation before scheduling withdrawals relying on recent tasks.',
    ],
    platformResponsibilities: [
      'Clearly label Pending Earnings separately from Verified Available Balance across all views.',
    ],
    prohibitedConduct: [
      'Claiming or attempting to force payout release prior to settlement confirmation.',
    ],
    procedures: [
      'Admin/backend settlement transitions pending_confirmation -> verified_settled and logs a corresponding audit entry.',
    ],
    consequences: [
      'Fraudulent pending entries are cancelled before reaching available balances.',
    ],
  }),

  buildPolicyDocument({
    slug: 'approved-earnings',
    title: 'Approved Earnings Policy',
    categoryId: CAT_D.id,
    categoryTitle: CAT_D.title,
    summary:
      'Governs funds verified as settled in Available Balance, withdrawal eligibility, and post-settlement audit protections.',
    relatedPolicySlugs: ['pending-earnings', 'withdrawals', 'wallet-policy'],
    purpose:
      'Defines the rights and protections attached to verified settled funds ready for payout.',
    scope:
      'Applies to all transactions marked verified_settled.',
    rules: [
      'Verified settled funds populate the user’s Available Balance in the corresponding currency.',
      'Available funds may be withdrawn via any enabled payout institution supporting that currency and country, subject to configured minimums, maximums, and verification status.',
    ],
    exampleScenario:
      'Once KES 3,500 is confirmed as verified_settled, the Worker opens the guided withdrawal wizard in the Financial Centre and requests payout to their saved verified M-Pesa number.',
    userObligations: [
      'Maintain a verified default payout destination matching their selected withdrawal currency.',
    ],
    platformResponsibilities: [
      'Validate available balance sufficiency in Firestore security rules before accepting any withdrawal request.',
    ],
    prohibitedConduct: [
      'Submitting duplicate concurrent withdrawals exceeding available balance.',
    ],
    procedures: [
      'Select currency -> select payout institution & saved destination -> review fees -> submit withdrawal.',
    ],
    consequences: [
      'Over-balance or unverified withdrawal attempts are automatically rejected by backend rules.',
    ],
  }),

  buildPolicyDocument({
    slug: 'payment-processing',
    title: 'Payment Processing Policy',
    categoryId: CAT_D.id,
    categoryTitle: CAT_D.title,
    summary:
      'Explains how SWAS TASKS processes Client payments, provider webhooks, manual finance settlements, and idempotency protections.',
    relatedPolicySlugs: ['payment-provider', 'withdrawals', 'pending-earnings'],
    purpose:
      'Ensures every payment and payout transition is backed by verifiable server-side references, cryptographic webhooks, or documented finance review.',
    scope:
      'Covers Paystack, Flutterwave, Stripe Connect, M-Pesa Daraja, Binance Pay, and manual banking/mobile settlements.',
    rules: [
      'Automated payouts execute ONLY when the selected provider has live verified credentials configured on the server; otherwise, payouts route transparently through documented Manual Payout review.',
      'All payout dispatches enforce idempotency keys to prevent duplicate payouts.',
      'Webhook callbacks are verified cryptographically before updating withdrawal states.',
    ],
    exampleScenario:
      'If Paystack Transfers credentials are not configured on the server, the Financial Control Centre clearly reports PROVIDER_NOT_CONFIGURED and requires manual settlement with a real bank/transaction reference.',
    userObligations: [
      'Allow normal banking or gateway settlement windows before escalating delays.',
    ],
    platformResponsibilities: [
      'Never fabricate successful provider confirmations or fake webhook statuses.',
    ],
    prohibitedConduct: [
      'Replaying webhook payloads or submitting fake transaction reference numbers.',
    ],
    procedures: [
      'Requested -> Pending Verification -> Approved -> Processing -> Paid (or Failed/Rejected/Cancelled).',
    ],
    consequences: [
      'Failed payouts trigger clear failure notes and balance restoration where applicable.',
    ],
  }),

  buildPolicyDocument({
    slug: 'withdrawals',
    title: 'Withdrawal Policy',
    categoryId: CAT_D.id,
    categoryTitle: CAT_D.title,
    summary:
      'Complete rules governing eligible payout requests, guided verification stages, cancellation rights, and final settlement.',
    requiresAcceptance: true,
    acceptanceContexts: ['registration', 'withdrawal', 'payout_account'],
    relatedPolicySlugs: ['withdrawal-fees', 'withdrawal-limits', 'payment-processing', 'payout-accounts'],
    purpose:
      'Governs how verified Workers withdraw available earnings cleanly through supported mobile money, bank, digital wallet, gateway, or approved crypto rails.',
    scope:
      'Applies to every withdrawal request submitted in the SWAS Financial Centre.',
    rules: [
      'Only Workers with sufficient Verified Available Balance in the selected currency may submit a withdrawal request.',
      'Users must choose an enabled institution for their selected country/currency and supply a verified or valid saved payout destination.',
      'Users may cancel a withdrawal ONLY while it remains in Requested or Pending Verification state; once Approved or Processing, cancellation requires finance intervention.',
      'Finance administrators record real provider references or transaction hashes before marking any withdrawal Paid.',
    ],
    exampleScenario:
      'A Worker in Kenya requests KES 2,000 via M-Pesa. The request enters Pending Verification, can be cancelled by the Worker before approval, and turns Paid only after confirmed disbursement reference entry.',
    userObligations: [
      'Double-check currency, institution, fee breakdown, and masked account details before clicking Submit.',
    ],
    platformResponsibilities: [
      'Display live 8-stage status tracking (Requested, Pending Verification, Approved, Processing, Paid, Failed, Rejected, Cancelled).',
    ],
    prohibitedConduct: [
      'Attempting to withdraw into unowned third-party accounts or deleting a payout account tied to an active withdrawal.',
    ],
    procedures: [
      'Step 1: Select Country & Currency -> Step 2: Pick Institution -> Step 3: Pick/Verify Destination -> Step 4: Enter Amount & Review Net Payout -> Submit.',
    ],
    consequences: [
      'Requests failing verification checks are rejected with clear review notes.',
    ],
  }),

  buildPolicyDocument({
    slug: 'withdrawal-fees',
    title: 'Withdrawal Fees Policy',
    categoryId: CAT_D.id,
    categoryTitle: CAT_D.title,
    summary:
      'Transparency rules governing flat fees, percentage gateway charges, network gas fees, and net payout calculation.',
    relatedPolicySlugs: ['withdrawals', 'withdrawal-limits', 'payment-provider'],
    pendingAdminReviewItems: [
      '[Administrator Review Required]: Finalize exact production flat and percentage fee schedules per bank, mobile money rail, and international SWIFT wire in Financial Control.',
    ],
    purpose:
      'Guarantees no hidden withdrawal fees are deducted without clear pre-submission disclosure.',
    scope:
      'Applies to all configured institutions in the SWAS Financial Centre.',
    rules: [
      'Each enabled institution displays its exact configured flat fee and percentage fee inside the Financial Centre before a user submits a withdrawal.',
      'Where production gateway charges have not been finalized by an administrator, the fee configuration must be reviewed in Admin Financial Control before live automated disbursement.',
    ],
    exampleScenario:
      'If an institution carries a flat fee of KES 30 and 0% variable fee, withdrawing KES 1,000 clearly previews Fee: KES 30 and Net Payout: KES 970 prior to confirmation.',
    userObligations: [
      'Review the net payout preview line before confirming withdrawal submission.',
    ],
    platformResponsibilities: [
      'Store feeAmount and netAmount explicitly on every withdrawal record.',
    ],
    prohibitedConduct: [
      'Imposing undisclosed post-submission deductions not reflected in the confirmed summary.',
    ],
    procedures: [
      'Super Administrators configure institution fees inside Central Control Centre -> Financial Control.',
    ],
    consequences: [
      'Fee calculation mismatches halt automated payout and require manual finance adjustment.',
    ],
  }),

  buildPolicyDocument({
    slug: 'withdrawal-limits',
    title: 'Minimum and Maximum Withdrawal Policy',
    categoryId: CAT_D.id,
    categoryTitle: CAT_D.title,
    summary:
      'Defines per-institution minimum and maximum withdrawal thresholds, daily velocity controls, and exception procedures.',
    relatedPolicySlugs: ['withdrawals', 'withdrawal-fees', 'financial-fraud-prevention'],
    pendingAdminReviewItems: [
      '[Administrator Review Required]: Confirm daily/monthly cumulative withdrawal velocity caps per KYC verification tier.',
    ],
    purpose:
      'Prevents micro-payout gateway failures and caps single-transaction risk exposure in alignment with provider limits.',
    scope:
      'Applies to all withdrawal amounts across KES, UGX, TZS, RWF, NGN, USD, and USDT.',
    rules: [
      'Each institution enforces its configured minimum and maximum single-withdrawal limits (e.g., KES 50 minimum for M-Pesa; higher minimums for SWIFT wire transfers).',
      'Withdrawal amounts exceeding verified available balance or institution caps are blocked.',
    ],
    exampleScenario:
      'Attempting to withdraw KES 20 via M-Pesa or USD 10 via International SWIFT Wire is blocked with clear notice of the configured minimum.',
    userObligations: [
      'Accumulate at least the minimum threshold for the chosen rail before initiating a request.',
    ],
    platformResponsibilities: [
      'Display minimum and maximum limits directly on each institution card and withdrawal input.',
    ],
    prohibitedConduct: [
      'Structuring split micro-withdrawals specifically to evade risk thresholds.',
    ],
    procedures: [
      'Large enterprise or agency payouts exceeding standard caps may request scheduled settlement verification via Support.',
    ],
    consequences: [
      'Out-of-bounds submissions fail client and backend validation.',
    ],
  }),

  buildPolicyDocument({
    slug: 'currency-policy',
    title: 'Currency Policy',
    categoryId: CAT_D.id,
    categoryTitle: CAT_D.title,
    summary:
      'Establishes KES as the primary marketplace settlement currency alongside isolated multi-currency support across East & West Africa and USD/USDT.',
    relatedPolicySlugs: ['currency-conversion', 'exchange-rate', 'wallet-policy'],
    purpose:
      'Ensures complete accounting clarity across supported regional and global currencies.',
    scope:
      'Covers KES, UGX, TZS, RWF, NGN, USD, and USDT (where crypto payouts are enabled).',
    rules: [
      'Marketplace task budgets and bids operate primarily in Kenyan Shillings (KES) unless otherwise enabled.',
      'Each currency balance in a user wallet is tracked strictly in its own unit and formatted with appropriate decimal precision.',
    ],
    exampleScenario:
      'A user in Nigeria switching their Financial Centre view to NGN sees Nigerian banks and Paystack NGN rails without inflating their KES balance into fake NGN numbers.',
    userObligations: [
      'Ensure your selected payout destination supports the exact currency of the wallet balance you are withdrawing.',
    ],
    platformResponsibilities: [
      'Prevent cross-currency accounting errors by storing isolated balancesByCurrency maps.',
    ],
    prohibitedConduct: [
      'Submitting cross-currency account details incompatible with the selected rail.',
    ],
    procedures: [
      'Users can switch preferred currency display in Account Settings or Financial Centre headers.',
    ],
    consequences: [
      'Mismatched currency/bank submissions may be rejected by receiving banks and incur reversal delays.',
    ],
  }),

  buildPolicyDocument({
    slug: 'currency-conversion',
    title: 'Currency Conversion Policy',
    categoryId: CAT_D.id,
    categoryTitle: CAT_D.title,
    summary:
      'Prohibits fabricated currency conversions and governs how conversions operate strictly when verified live FX providers are configured.',
    relatedPolicySlugs: ['currency-policy', 'exchange-rate', 'wallet-policy'],
    pendingAdminReviewItems: [
      '[Administrator Review Required]: Confirm whether SWAS TASKS will enable cross-currency wallet conversion spreads and specify approved FX API provider agreements.',
    ],
    purpose:
      'Protects users against arbitrary or deceptive exchange conversions.',
    scope:
      'Applies to any cross-currency display or settlement conversion request.',
    rules: [
      'SWAS TASKS never invents or hardcodes exchange rates.',
      'When no live verified exchange rate API is configured, wallet balances remain strictly isolated in their original currency without conversion.',
    ],
    exampleScenario:
      'If EXCHANGE_RATE_API_KEY is not configured, the /api/financial/exchange-rates endpoint honestly returns available: false and keeps KES and USD balances separate.',
    userObligations: [
      'Choose a payout rail matching your earned currency whenever no live FX conversion service is active.',
    ],
    platformResponsibilities: [
      'Record any future verified currency conversion as an explicit currency_conversion ledger transaction.',
    ],
    prohibitedConduct: [
      'Exploiting stale rate displays or third-party FX arbitrage loops.',
    ],
    procedures: [
      'Live FX availability is checked directly via server-side integration before any conversion option is enabled.',
    ],
    consequences: [
      'Conversions attempted outside configured backend verification are invalid.',
    ],
  }),

  buildPolicyDocument({
    slug: 'exchange-rate',
    title: 'Exchange Rate Policy',
    categoryId: CAT_D.id,
    categoryTitle: CAT_D.title,
    summary:
      'Rules requiring live verified market sources, timestamped rate locks, and explicit disclosure when FX feeds are unavailable.',
    relatedPolicySlugs: ['currency-conversion', 'currency-policy', 'platform-disclaimer'],
    purpose:
      'Guarantees full transparency whenever exchange rates are displayed or referenced.',
    scope:
      'Applies to server exchange-rate endpoints and international payout previews.',
    rules: [
      'Displayed FX rates must come strictly from an authenticated live exchange-rate feed configured on the server.',
      'Receiving banks or payment gateways applying their own settlement conversion rates at payout time govern final credited amounts in local accounts.',
    ],
    exampleScenario:
      'An international USD SWIFT wire into a local-currency bank account may be converted by the recipient bank at its prevailing spot rate; SWAS TASKS only guarantees the USD amount dispatched.',
    userObligations: [
      'Check recipient bank FX policies before requesting cross-border settlements.',
    ],
    platformResponsibilities: [
      'State honestly when live FX feeds are unconfigured instead of displaying stale guesses.',
    ],
    prohibitedConduct: [
      'Filing disputes for third-party receiving-bank conversion spreads outside platform control.',
    ],
    procedures: [
      'Admins configure EXCHANGE_RATE_API_KEY in server secrets to activate live reference rate queries.',
    ],
    consequences: [
      'Unconfigured FX APIs result in strict currency isolation.',
    ],
  }),

  buildPolicyDocument({
    slug: 'payment-provider',
    title: 'Payment Provider Policy',
    categoryId: CAT_D.id,
    categoryTitle: CAT_D.title,
    summary:
      'Governs integration standards, honest readiness indicators, KYC compliance, and third-party terms for Paystack, Flutterwave, Stripe, M-Pesa, and crypto rails.',
    relatedPolicySlugs: ['payment-processing', 'bank-account', 'mobile-money', 'digital-wallet', 'cryptocurrency'],
    purpose:
      'Clarifies the boundary between SWAS TASKS and third-party regulated payment gateways and financial institutions.',
    scope:
      'Applies to all providers listed in the SWAS Financial Centre.',
    rules: [
      'Every provider displays its true operational state: Connected, Automated, Manual Only, Listed, or Unavailable.',
      'Users selecting a provider must comply with that provider’s own eligibility, KYC, and acceptable-use rules.',
      'No provider secret keys are ever stored in browser code or Firestore documents.',
    ],
    exampleScenario:
      'Apple Pay is honestly marked Unavailable for Worker payout disbursements because Apple Pay is not a standard outbound worker payout rail.',
    userObligations: [
      'Ensure your external provider account is active and permitted to receive marketplace payouts.',
    ],
    platformResponsibilities: [
      'Verify live server credentials and webhook signatures before trusting automated provider callbacks.',
    ],
    prohibitedConduct: [
      'Using stolen provider accounts or triggering abusive gateway chargebacks.',
    ],
    procedures: [
      'Super Administrators inspect live provider health inside Financial Control.',
    ],
    consequences: [
      'Provider rejections mark the withdrawal Failed and surface the provider error note.',
    ],
  }),

  buildPolicyDocument({
    slug: 'bank-account',
    title: 'Bank Account Policy',
    categoryId: CAT_D.id,
    categoryTitle: CAT_D.title,
    summary:
      'Requirements for saving and withdrawing to regional banks across Kenya, Uganda, Tanzania, Rwanda, Nigeria, and international accounts.',
    relatedPolicySlugs: ['withdrawals', 'payment-provider', 'account-verification'],
    purpose:
      'Ensures accurate bank routing details, account-holder name matching, and masked storage protection.',
    scope:
      'Applies to all institutions in the Banks & Regional Banking category (e.g., Equity, KCB, Co-op, NCBA, Absa, Stanbic, Access, GTBank, Zenith, First Bank, and custom admin-added banks).',
    rules: [
      'Saved bank accounts must belong to the verified SWAS TASKS account holder.',
      'Users must provide accurate bank branch, routing/SWIFT, or bank code details where required.',
      'Standard views display masked account identifiers (•••• last4); active withdrawals prevent deleting the linked bank record.',
    ],
    exampleScenario:
      'A Worker in Kenya adds KCB Bank Kenya with their matching full name, account number, and branch code after confirming re-authentication.',
    userObligations: [
      'Double-check account numbers and bank/SWIFT codes before saving.',
    ],
    platformResponsibilities: [
      'Mask account numbers in UI listings and require re-authentication for additions or edits.',
    ],
    prohibitedConduct: [
      'Saving banking PINs, CVVs, or third-party unverified bank accounts.',
    ],
    procedures: [
      'Add bank in Payout Accounts -> complete re-authentication -> pass verification -> select in withdrawal wizard.',
    ],
    consequences: [
      'Mismatched bank names or wrong account numbers cause rejection or manual finance hold.',
    ],
  }),

  buildPolicyDocument({
    slug: 'mobile-money',
    title: 'Mobile Money Policy',
    categoryId: CAT_D.id,
    categoryTitle: CAT_D.title,
    summary:
      'Rules for M-Pesa, Airtel Money, MTN MoMo, Tigo Pesa, and regional mobile wallets regarding SIM ownership and transaction limits.',
    relatedPolicySlugs: ['withdrawals', 'bank-account', 'payment-provider'],
    purpose:
      'Governs fast, accurate mobile-money disbursements across East and regional African networks.',
    scope:
      'Applies to Safaricom M-Pesa, Airtel Money, MTN Mobile Money, Tigo Pesa, and related regional mobile money rails.',
    rules: [
      'Mobile money numbers must be actively registered under the Worker’s verified identity and capable of receiving the selected currency.',
      'Users must supply full international dialing prefixes (e.g., +254...) matching the selected country.',
    ],
    exampleScenario:
      'A Worker in Uganda selects MTN Mobile Money Uganda (UGX) and enters their registered +256 mobile number.',
    userObligations: [
      'Ensure your mobile wallet is not dormant, locked, or above carrier daily holding limits.',
    ],
    platformResponsibilities: [
      'Validate phone formatting and provider compatibility prior to dispatch.',
    ],
    prohibitedConduct: [
      'Routing payouts to unregistered SIMs or third-party merchant till numbers without authorization.',
    ],
    procedures: [
      'Verify mobile money destination in Payout Accounts -> submit withdrawal -> track M-Pesa/MoMo reference.',
    ],
    consequences: [
      'Carrier-rejected numbers return to Failed status and require correction before retry.',
    ],
  }),

  buildPolicyDocument({
    slug: 'digital-wallet',
    title: 'Digital Wallet Policy',
    categoryId: CAT_D.id,
    categoryTitle: CAT_D.title,
    summary:
      'Standards for PayPal, Wise, Skrill, and similar digital wallet rails, including regional availability and account verification.',
    relatedPolicySlugs: ['payment-provider', 'withdrawals', 'currency-policy'],
    purpose:
      'Ensures cross-border digital wallet disbursements comply with provider email matching and regional rules.',
    scope:
      'Applies to digital wallets configured inside the Financial Centre.',
    rules: [
      'Digital wallet destinations (such as PayPal or Wise emails/tags) must be fully verified on the external wallet platform to receive commercial payouts.',
      'Unavailable rails (such as Apple Pay for outbound payouts) remain disabled and cannot be selected.',
    ],
    exampleScenario:
      'A Worker receiving USD via Wise enters their verified Wise email/account identifier and confirms currency compatibility.',
    userObligations: [
      'Confirm your external wallet supports incoming transfers in your country before withdrawing.',
    ],
    platformResponsibilities: [
      'Display clear verification notes and regional availability per wallet option.',
    ],
    prohibitedConduct: [
      'Using unverified disposable wallet emails or triggering abusive chargebacks.',
    ],
    procedures: [
      'Add verified wallet email -> pass re-auth -> request payout.',
    ],
    consequences: [
      'Unclaimed or bounced wallet transfers incur reversal handling under Refund & Reversal rules.',
    ],
  }),

  buildPolicyDocument({
    slug: 'cryptocurrency',
    title: 'Cryptocurrency Payment Policy',
    categoryId: CAT_D.id,
    categoryTitle: CAT_D.title,
    summary:
      'Strict compliance, network validation, private-key prohibition, and admin kill-switch rules for Binance Pay and USDT payouts.',
    relatedPolicySlugs: ['payment-provider', 'withdrawals', 'financial-fraud-prevention'],
    pendingAdminReviewItems: [
      '[Administrator Review Required]: Confirm jurisdictional legality and regulatory approval before enabling live automated or manual USDT / Binance Pay payouts.',
    ],
    purpose:
      'Establishes strict safeguards for supported digital asset rails so users never lose funds to wrong networks or unsafe key collection.',
    scope:
      'Applies to Binance Pay and USDT (TRC20, ERC20, BEP20) when enabled by Super Administrators.',
    rules: [
      'Crypto payouts operate ONLY when enabled by Super Administrators in Financial Control and permitted by law.',
      'SWAS TASKS NEVER asks for, accepts, or stores private keys, mnemonic seed phrases, or wallet passwords.',
      'Public wallet addresses are validated strictly against network format rules (e.g., TRC20 T-prefix base58, ERC20/BEP20 0x hex).',
      'Users bear full responsibility for selecting the exact matching blockchain network; wrong-network transfers are typically irreversible.',
    ],
    exampleScenario:
      'If a user accidentally pastes a 12-word recovery phrase into the wallet address field, client validation blocks submission immediately with a security warning.',
    userObligations: [
      'Confirm network match (TRC20 vs ERC20 vs BEP20) and never enter private keys.',
    ],
    platformResponsibilities: [
      'Enforce seed-phrase rejection, network format validation, and real transaction hash (txHash) logging on paid crypto withdrawals.',
    ],
    prohibitedConduct: [
      'Submitting sanctioned addresses, mixers, private keys, or unsupported token networks.',
    ],
    procedures: [
      'Admin may toggle global cryptoPayoutsEnabled off anytime in Financial Control; paid crypto withdrawals require a verified txHash.',
    ],
    consequences: [
      'Irreversible loss from user-supplied wrong network addresses cannot be recovered by SWAS TASKS.',
    ],
  }),

  buildPolicyDocument({
    slug: 'refund',
    title: 'Refund and Reversal Policy',
    categoryId: CAT_D.id,
    categoryTitle: CAT_D.title,
    summary:
      'Governs Client refunds on cancelled/unfulfilled tasks, Worker ledger reversals for fraud, and failed-payout balance restoration.',
    requiresAcceptance: false,
    relatedPolicySlugs: ['task-cancellation', 'payment-disputes', 'incorrect-payment'],
    purpose:
      'Defines fair, auditable accounting reversals when assignments fail, payouts bounce, or fraudulent credits are detected.',
    scope:
      'Applies to Client task payments, Worker ledger credits, and failed withdrawal restorations.',
    rules: [
      'When a verified withdrawal fails or is rejected before disbursement, the withdrawal status moves to Failed/Rejected and any reserved balance is restored or reconciled cleanly in the ledger.',
      'Client refund claims for unfulfilled or materially non-compliant assignments require verified evidence from assignment and chat records.',
      'Confirmed fraudulent or duplicated ledger credits are subject to immediate administrative reversal logged as a reversal transaction.',
    ],
    exampleScenario:
      'A bank transfer withdrawal fails due to an expired bank branch code. Finance marks the withdrawal Failed with the bank error code so the Worker can fix their account details and resubmit.',
    userObligations: [
      'Submit refund or reversal requests promptly with full task/withdrawal references.',
    ],
    platformResponsibilities: [
      'Record every reversal or refund transparently in ledger transactions and financialAuditLogs.',
    ],
    prohibitedConduct: [
      'Filing false bank chargebacks after receiving approved deliverables.',
    ],
    procedures: [
      'Open Help & Support ticket -> Finance & Compliance review -> Auditable ledger entry recorded.',
    ],
    consequences: [
      'Abusive chargebacks trigger immediate account suspension and debt recovery action.',
    ],
  }),

  buildPolicyDocument({
    slug: 'payment-disputes',
    title: 'Payment & Financial Disputes Policy',
    categoryId: CAT_D.id,
    categoryTitle: CAT_D.title,
    summary:
      'Step-by-step investigation framework for contested task approvals, delayed settlements, and fee or payout discrepancies.',
    relatedPolicySlugs: ['dispute-resolution', 'refund', 'task-rejection', 'appeals'],
    purpose:
      'Resolves financial disagreements using objective Firestore assignment records, timestamps, and provider references.',
    scope:
      'Applies to disputes between Clients and Workers over task payments, as well as user-to-platform payout disputes.',
    rules: [
      'Disputes must cite specific assignmentId, transaction reference, or withdrawalId records.',
      'Contested funds may be placed in pending hold while compliance reviewers inspect deliverables and chat histories.',
    ],
    exampleScenario:
      'A Client claims an approved deliverable was later deleted by the Worker from an external drive; reviewers inspect submission logs and hold pending settlement pending restoration.',
    userObligations: [
      'Preserve deliverable access and respond within review deadlines.',
    ],
    platformResponsibilities: [
      'Deliver impartial, evidence-based rulings logged in financialAuditLogs.',
    ],
    prohibitedConduct: [
      'Fabricating payment screenshots or harassing counterparties during an open dispute.',
    ],
    procedures: [
      'Log ticket in Support under Payments & Wallet -> Freeze contested settlement -> Evidence inspection -> Written determination.',
    ],
    consequences: [
      'Binding allocation of contested pending balances and penalties for bad-faith claims.',
    ],
  }),

  buildPolicyDocument({
    slug: 'incorrect-payment',
    title: 'Incorrect Payment Policy',
    categoryId: CAT_D.id,
    categoryTitle: CAT_D.title,
    summary:
      'Addresses erroneous duplicate credits, overpayments, and user-entered incorrect payout destination mistakes.',
    relatedPolicySlugs: ['refund', 'payment-disputes', 'user-responsibilities'],
    purpose:
      'Establishes honest remediation steps when technical, administrative, or user-input errors result in wrong payment amounts or destinations.',
    scope:
      'Applies to miscredited ledger balances and mistyped payout destinations.',
    rules: [
      'Users have no legal entitlement to retain funds credited in error due to duplicate webhooks, calculation bugs, or clerical mistakes.',
      'SWAS TASKS may adjust or reverse erroneous credits upon notifying the account holder with audit details.',
      'Where a user entered an incorrect active destination and funds settled externally, SWAS TASKS will assist with provider recall requests where feasible but cannot guarantee external bank recovery.',
    ],
    exampleScenario:
      'If a clerical duplicate entry credits KES 5,000 twice for one KES 5,000 assignment, Finance posts an adjustment/reversal entry restoring accurate ledger balance.',
    userObligations: [
      'Report unexpected overpayments immediately via Support rather than attempting rapid withdrawal.',
    ],
    platformResponsibilities: [
      'Maintain immutable audit logs for every corrective adjustment.',
    ],
    prohibitedConduct: [
      'Knowingly withdrawing funds credited in error.',
    ],
    procedures: [
      'Report error -> Audit verification -> Ledger adjustment & official notice sent.',
    ],
    consequences: [
      'Attempting to cash out known erroneous credits constitutes Financial Fraud.',
    ],
  }),

  buildPolicyDocument({
    slug: 'financial-fraud-prevention',
    title: 'Financial Fraud Prevention Policy',
    categoryId: CAT_D.id,
    categoryTitle: CAT_D.title,
    summary:
      'Anti-money-laundering (AML), velocity screening, payout destination lockouts, and suspicious ledger monitoring rules.',
    relatedPolicySlugs: ['fraud-prevention', 'task-fraud', 'withdrawals', 'regulatory-cooperation'],
    purpose:
      'Protects SWAS TASKS, its users, and partner payment institutions from laundering, account-takeover drains, and payment abuse.',
    scope:
      'Applies to all wallet credits, payout account modifications, and withdrawal requests.',
    rules: [
      'Rapid cycles of task posting, instant self-approval, and immediate withdrawal trigger automated or manual financial compliance holds.',
      'Adding or modifying payout destinations enforces re-authentication and may trigger additional manual verification prior to payout approval.',
      'Payout destinations linked to banned or fraudulent accounts are blocked across the platform.',
    ],
    exampleScenario:
      'A compromised account attempts to change its saved bank account and immediately drain KES 45,000. Re-authentication plus verification review intercepts the drain.',
    userObligations: [
      'Cooperate promptly with source-of-work or payout ownership verification checks.',
    ],
    platformResponsibilities: [
      'Audit all financial config, settlement, and payout state changes inside financialAuditLogs.',
    ],
    prohibitedConduct: [
      'Structuring transactions, using stolen cards/accounts, or laundering external funds through fake tasks.',
    ],
    procedures: [
      'Flagged requests enter pending_verification -> Finance compliance check -> Approve or Reject with audit note.',
    ],
    consequences: [
      'Immediate freeze of suspicious balances, permanent ban, and lawful regulatory reporting.',
    ],
  }),
];
