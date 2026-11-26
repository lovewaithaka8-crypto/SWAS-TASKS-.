import type { Timestamp } from 'firebase/firestore';

export type UserRole = 'worker' | 'client';

export const TASK_CATEGORIES = [
  'Data & Research',
  'Content & Copywriting',
  'Design & Media',
  'QA & Testing',
  'Field & Errands',
  'Web & Technical',
] as const;

export type TaskCategory = (typeof TASK_CATEGORIES)[number];

export type TaskVisibility = 'public' | 'invite_only';
export type TaskStatus = 'open' | 'paused' | 'in_progress' | 'completed' | 'closed';
export type BidStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn';
export type AssignmentStatus = 'active' | 'submitted' | 'revision_requested' | 'completed';
export type TransactionStatus = 'pending_confirmation' | 'verified_settled';

export type FinancialCategory =
  | 'mobile_money'
  | 'banks'
  | 'digital_wallets'
  | 'payment_gateways'
  | 'cryptocurrency'
  | 'international_transfers';

export type InstitutionAvailabilityStatus =
  | 'listed'
  | 'manual_payout'
  | 'connected'
  | 'automated'
  | 'unavailable';

export type AccountStatus =
  | 'REGISTERED'
  | 'EMAIL_VERIFICATION_PENDING'
  | 'PENDING_ADMIN_APPROVAL'
  | 'ACTIVE'
  | 'RESTRICTED'
  | 'SUSPENDED'
  | 'REJECTED'
  | 'CLOSED';

export type TaskSourceType = 'SWAS_ORIGINAL' | 'GWENO_HUB' | 'AUTHORIZED_PARTNER';

export type TaskImportMethod =
  | 'native'
  | 'authorized_api'
  | 'authorized_feed'
  | 'permitted_manual_entry'
  | 'document_import';

export type OperationalLifecycleStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'PUBLISHED'
  | 'PAUSED'
  | 'FULL'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'ARCHIVED';

export type SubmissionWorkflowStatus =
  | 'RESERVED'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'CORRECTION_REQUESTED'
  | 'RESUBMITTED'
  | 'APPROVED'
  | 'AUTO_APPROVED'
  | 'REJECTED'
  | 'ON_HOLD'
  | 'EXPIRED';

export type WalletLedgerType =
  | 'TASK_EARNING'
  | 'PENDING_EARNING'
  | 'EARNING_APPROVAL'
  | 'WITHDRAWAL_REQUEST'
  | 'WITHDRAWAL_RESERVATION'
  | 'WITHDRAWAL_APPROVAL'
  | 'WITHDRAWAL_PAID'
  | 'WITHDRAWAL_REJECTION'
  | 'WITHDRAWAL_RELEASE'
  | 'FEE'
  | 'REFUND'
  | 'REVERSAL'
  | 'ADMIN_ADJUSTMENT';

export const OPERATIONAL_TASK_CATEGORIES = [
  'Writing',
  'Research',
  'Email Responses',
  'Data Entry',
  'Surveys and Questionnaires',
  'Information Analysis',
  'Content Review',
  'Transcription',
  'Digital Assistance',
  'Online Research',
  'Document Preparation',
  'Product Research',
  'Classification',
  'Evaluation',
  'Translation',
  'Other Digital Assignments',
] as const;

export type WithdrawalStatus =
  | 'requested'
  | 'pending_verification'
  | 'approved'
  | 'processing'
  | 'paid'
  | 'failed'
  | 'rejected'
  | 'cancelled'
  | 'PENDING_ADMIN_APPROVAL'
  | 'APPROVED_FOR_PAYMENT'
  | 'PROCESSING'
  | 'PAID'
  | 'REJECTED'
  | 'ON_HOLD'
  | 'CANCELLED';

export interface UserPrivate {
  uid: string;
  email: string;
  displayName: string;
  username?: string;
  role: UserRole;
  accountStatus?: AccountStatus;
  statusReason?: string;
  approvedAt?: Timestamp;
  approvedBy?: string;
  rejectedAt?: Timestamp;
  rejectedBy?: string;
  suspendedAt?: Timestamp;
  suspendedBy?: string;
  suspendedReason?: string;
  emailVerified?: boolean;
  phone?: string;
  phoneVerified?: boolean;
  photoUrl?: string;
  bio?: string;
  skills?: string[];
  businessName?: string;
  businessIndustry?: string;
  country?: string;
  preferredCurrency?: string;
  referralCode?: string;
  referredBy?: string;
  notifyBids?: boolean;
  notifyMessages?: boolean;
  notifyPayments?: boolean;
  publicProfileVisible?: boolean;
  lastLoginAt?: Timestamp;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface PublicProfile {
  uid: string;
  displayName: string;
  username?: string;
  role: UserRole;
  bio?: string;
  skills?: string[];
  businessName?: string;
  photoUrl?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface MarketplaceTask {
  id: string;
  clientId: string;
  clientName: string;
  title: string;
  description: string;
  category: TaskCategory | string;
  categoryId?: string;
  skills?: string[];
  budgetKes: number;
  deadline: string;
  attachmentUrl?: string;
  visibility: TaskVisibility;
  status: TaskStatus;
  // Operational dual-source & slot-claim extensions
  executionMode?: 'bid_marketplace' | 'direct_claim';
  sourceType?: TaskSourceType;
  sourceName?: string;
  sourceWebsite?: string;
  sourceTaskId?: string;
  importMethod?: TaskImportMethod;
  sourceAttribution?: string;
  sourceRewardOriginal?: number;
  sourceCurrency?: string;
  permissionConfirmed?: boolean;
  redistributionRightsConfirmed?: boolean;
  lifecycleStatus?: OperationalLifecycleStatus;
  maxSlots?: number;
  claimedCount?: number;
  availableSlots?: number;
  perUserLimit?: number;
  instructions?: string;
  requiredDeliverables?: string[];
  completionDeclarationRequired?: boolean;
  autoApprovalEligible?: boolean;
  manualReviewOnly?: boolean;
  reviewWindowMinutes?: number;
  scheduledPublishAt?: string;
  expiresAt?: string;
  version?: number;
  recurringSchedule?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface TaskBid {
  id: string;
  taskId: string;
  taskTitle: string;
  clientId: string;
  clientName: string;
  workerId: string;
  workerName: string;
  amountKes: number;
  deliveryDays: number;
  proposal: string;
  status: BidStatus;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface TaskAssignment {
  id: string;
  taskId: string;
  taskTitle: string;
  bidId: string;
  clientId: string;
  clientName: string;
  workerId: string;
  workerName: string;
  agreedKes: number;
  deadline: string;
  status: AssignmentStatus;
  submissionNotes?: string;
  submissionUrl?: string;
  clientFeedback?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface SavedTaskItem {
  id: string;
  workerId: string;
  taskId: string;
  taskTitle: string;
  category: string;
  budgetKes: number;
  deadline: string;
  clientName: string;
  createdAt?: Timestamp;
}

export interface Conversation {
  id: string;
  participants: string[];
  participantNames: Record<string, string>;
  taskId?: string;
  taskTitle?: string;
  lastMessage: string;
  lastSenderId: string;
  unreadBy: string[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  participants: string[];
  senderId: string;
  senderName: string;
  text: string;
  attachmentUrl?: string;
  createdAt?: Timestamp;
}

export type NotificationType =
  | 'bid_received'
  | 'bid_accepted'
  | 'bid_rejected'
  | 'assignment_submitted'
  | 'revision_requested'
  | 'work_approved'
  | 'payment_update'
  | 'security_alert'
  | 'policy_update'
  | 'account_status'
  | 'auto_approval'
  | 'withdrawal_update'
  | 'announcement';

export interface AppNotification {
  id: string;
  userId: string;
  actorId: string;
  type: NotificationType;
  title: string;
  body: string;
  linkRoute?: string;
  read: boolean;
  createdAt?: Timestamp;
}

export interface WalletAccount {
  userId: string;
  currency: string;
  availableKes: number;
  availableBalance?: number;
  pendingEarnings?: number;
  totalEarned?: number;
  totalWithdrawn?: number;
  reservedWithdrawalFunds?: number;
  balancesByCurrency?: Record<string, number>;
  updatedAt?: Timestamp;
}

export type LedgerTransactionKind =
  | 'earning'
  | 'payment'
  | 'withdrawal_request'
  | 'withdrawal_fee'
  | 'payment_confirmation'
  | 'refund'
  | 'reversal'
  | 'adjustment'
  | 'currency_conversion';

export interface LedgerTransaction {
  id: string;
  userId: string;
  counterpartyId: string;
  assignmentId: string;
  taskTitle: string;
  kind: LedgerTransactionKind;
  amountKes: number;
  currency?: string;
  status: TransactionStatus;
  reference: string;
  provider?: string;
  providerReference?: string;
  withdrawalId?: string;
  auditNote?: string;
  createdAt?: Timestamp;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  amountKes: number;
  currency?: string;
  feeAmount?: number;
  netAmount?: number;
  method: string;
  destination: string;
  country?: string;
  institutionId?: string;
  institutionName?: string;
  category?: FinancialCategory;
  payoutAccountId?: string;
  maskedDestination?: string;
  reference?: string;
  providerStatus?: string;
  providerReference?: string;
  txHash?: string;
  idempotencyKey?: string;
  reviewNotes?: string;
  rejectionReason?: string;
  approvedBy?: string;
  paidBy?: string;
  cryptoAsset?: string;
  cryptoNetwork?: string;
  status: WithdrawalStatus;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface PayoutAccount {
  id: string;
  userId: string;
  institutionId: string;
  institutionName: string;
  category: FinancialCategory;
  country: string;
  currency: string;
  accountHolderName: string;
  maskedAccount: string;
  accountLast4: string;
  accountReference: string;
  bankBranchOrCode?: string;
  cryptoAsset?: string;
  cryptoNetwork?: string;
  verificationStatus: 'pending' | 'verified' | 'requires_review';
  isDefault: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface FinancialInstitutionConfig {
  id: string;
  name: string;
  shortCode: string;
  category: FinancialCategory;
  providerKey: string;
  countries: string[];
  currencies: string[];
  methodTypeLabel: string;
  brandBg: string;
  brandFg: string;
  availabilityStatus: InstitutionAvailabilityStatus;
  enabled: boolean;
  automatedSupported: boolean;
  feeFlat: number;
  feePercent: number;
  minWithdrawal: number;
  maxWithdrawal: number;
  processingSpeedLabel: string;
  verificationRequirement: string;
  processingInstructions: string;
  cryptoAssets?: string[];
  cryptoNetworks?: string[];
}

export interface CountryFinancialConfig {
  code: string;
  name: string;
  defaultCurrency: string;
  enabled: boolean;
}

export interface CurrencyConfig {
  code: string;
  name: string;
  symbol: string;
  decimals: number;
  enabled: boolean;
}

export interface FinancialPlatformConfig {
  id: string;
  countries: CountryFinancialConfig[];
  currencies: CurrencyConfig[];
  institutions: FinancialInstitutionConfig[];
  cryptoPayoutsEnabled: boolean;
  requireReauthForPayoutAccountChanges: boolean;
  updatedBy: string;
  updatedAt?: Timestamp;
}

export interface FinancialAuditLog {
  id: string;
  actorId: string;
  actorEmail?: string;
  action: string;
  targetType: 'withdrawal' | 'payout_account' | 'financial_config' | 'wallet' | 'provider';
  targetId: string;
  currency?: string;
  amount?: number;
  details: string;
  createdAt?: Timestamp;
}

export interface ProviderIntegrationStatus {
  id: string;
  name: string;
  category: FinancialCategory;
  configured: boolean;
  connected: boolean;
  automatedPayoutSupported: boolean;
  statusLabel: 'CONNECTED' | 'AUTOMATED' | 'MANUAL ONLY' | 'NOT CONFIGURED' | 'CONNECTION ERROR';
  detail: string;
  supportedCountries: string[];
  supportedCurrencies: string[];
  setupRequirements: string[];
  lastCheckedAt: string;
}

export type SupportCategory =
  | 'Tasks & Bids'
  | 'Payments & Wallet'
  | 'Account & Security'
  | 'General';

export interface SupportTicket {
  id: string;
  userId: string;
  senderName: string;
  category: SupportCategory;
  subject: string;
  message: string;
  status: 'open';
  createdAt?: Timestamp;
}

export type PublicRoute =
  | 'home'
  | 'about'
  | 'how'
  | 'tasks'
  | 'contact'
  | 'login'
  | 'signup'
  | 'forgot-password'
  | 'terms'
  | 'privacy'
  | 'refund'
  | 'policies';

export type PolicyStatus = 'published' | 'updated' | 'draft' | 'archived';

export interface PolicySection {
  id: string;
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface PolicyCategory {
  id: string;
  code: string;
  slug: string;
  title: string;
  description: string;
  order: number;
  enabled: boolean;
  updatedBy?: string;
  updatedAt?: Timestamp;
}

export interface PolicyDocument {
  id: string;
  slug: string;
  title: string;
  categoryId: string;
  categoryTitle: string;
  summary: string;
  status: PolicyStatus;
  version: string;
  effectiveDate: string;
  lastUpdatedDate: string;
  requiresAcceptance: boolean;
  acceptanceContexts: string[];
  changeSummary: string;
  sections: PolicySection[];
  relatedPolicySlugs: string[];
  pendingAdminReviewItems: string[];
  updatedBy?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface PolicyRevision {
  id: string;
  policyId: string;
  policyTitle: string;
  categoryTitle: string;
  version: string;
  previousVersion?: string;
  status: PolicyStatus;
  effectiveDate: string;
  changeReason: string;
  materialChange: boolean;
  requiresReacceptance: boolean;
  summarySnapshot: string;
  sectionsSnapshot: PolicySection[];
  editorId: string;
  editorEmail?: string;
  createdAt?: Timestamp;
}

export interface PolicyAcceptanceRecord {
  id: string;
  userId: string;
  policyId: string;
  policySlug: string;
  policyTitle: string;
  policyVersion: string;
  presentedEffectiveDate: string;
  acceptanceContext: string;
  consentStatement: string;
  acceptedAt?: Timestamp;
}

export interface PolicyRegistryManifest {
  id: string;
  public: boolean;
  draftPolicyIds: string[];
  archivedPolicyIds: string[];
  updatedBy: string;
  updatedAt?: Timestamp;
}

export type EmailDeliveryStatus = 'sent' | 'failed' | 'not_configured';

export interface CentralEmailSettings {
  id: string;
  platformName: string;
  senderEmail: string;
  senderName: string;
  replyToEmail: string;
  spfStatusLabel: string;
  dkimStatusLabel: string;
  dmarcStatusLabel: string;
  enabledCategories: Record<string, boolean>;
  subjectTemplates: Record<string, string>;
  updatedBy: string;
  updatedAt?: Timestamp;
}

export interface EmailDeliveryLog {
  id: string;
  actorId: string;
  surface: 'website' | 'control_centre';
  category: string;
  recipientEmail: string;
  senderEmail: string;
  senderName: string;
  replyToEmail: string;
  subject: string;
  status: EmailDeliveryStatus;
  providerMessageId?: string;
  errorMessage?: string;
  createdAt?: Timestamp;
}

export interface EmailServiceStatusResponse {
  configured: boolean;
  statusLabel: 'CONNECTED' | 'EMAIL SERVICE NOT CONFIGURED';
  officialEmail: string;
  senderName: string;
  replyTo: string;
  smtpHostLabel: string;
  verificationStatus: 'verified' | 'unverified' | 'not_configured';
  verificationDetail: string;
  dnsGuidance: {
    spf: string;
    dkim: string;
    dmarc: string;
  };
}

// --- Operational Platform Models (90-Min Engine, Dual Source Tasks, Ledger, Governance) ---

export interface AccountApplicationRecord {
  id: string;
  userId: string;
  email: string;
  displayName: string;
  username: string;
  phone: string;
  country: string;
  role: UserRole;
  accountStatus: AccountStatus;
  statusReason?: string;
  reviewedBy?: string;
  reviewedAtMs?: number;
  createdAtMs: number;
  updatedAtMs: number;
}

export interface TaskCategoryConfig {
  id: string;
  name: string;
  slug: string;
  description: string;
  order: number;
  enabled: boolean;
  autoApprovalAllowed: boolean;
  updatedBy: string;
  createdAtMs?: number;
  updatedAtMs?: number;
}

export interface TaskSourceConfig {
  id: string;
  name: string;
  websiteUrl: string;
  sourceType: TaskSourceType;
  importMethod: TaskImportMethod;
  enabled: boolean;
  permissionConfirmed: boolean;
  redistributionRightsConfirmed: boolean;
  attributionRequired: boolean;
  attributionTemplate: string;
  notes: string;
  updatedBy: string;
  createdAtMs?: number;
  updatedAtMs?: number;
}

export interface TaskSourceImport {
  id: string;
  sourceId: string;
  sourceName: string;
  sourceWebsite: string;
  sourceTaskId: string;
  importMethod: TaskImportMethod;
  importedTaskId: string;
  taskTitle: string;
  sourceRewardOriginal: number;
  sourceCurrency: string;
  swasRewardKes: number;
  permissionConfirmed: boolean;
  redistributionRightsConfirmed: boolean;
  importedBy: string;
  createdAtMs: number;
}

export interface TaskVersion {
  id: string;
  taskId: string;
  version: number;
  title: string;
  budgetKes: number;
  maxSlots: number;
  deadline: string;
  lifecycleStatus: OperationalLifecycleStatus;
  changeNote: string;
  editedBy: string;
  createdAtMs: number;
}

export interface TaskReservation {
  id: string;
  taskId: string;
  taskTitle: string;
  userId: string;
  userName: string;
  sourceType: TaskSourceType;
  rewardKes: number;
  status: 'RESERVED' | 'STARTED' | 'SUBMITTED' | 'EXPIRED' | 'CANCELLED' | 'COMPLETED';
  reservedAtMs: number;
  expiresAtMs: number;
  startedAtMs?: number;
  submissionId?: string;
}

export interface SubmissionAttachment {
  id: string;
  submissionId: string;
  userId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  downloadUrl: string;
  uploadedAtMs: number;
}

export interface TaskSubmission {
  id: string;
  reservationId?: string;
  taskId: string;
  taskTitle: string;
  category: string;
  sourceType: TaskSourceType;
  sourceName: string;
  userId: string;
  userName: string;
  userEmail: string;
  rewardKes: number;
  currency: string;
  status: SubmissionWorkflowStatus;
  version: number;
  notes: string;
  deliverableUrl?: string;
  customFields?: Record<string, string>;
  attachments?: SubmissionAttachment[];
  completionDeclared: boolean;
  submittedAtMs?: number;
  reviewDeadlineAtMs?: number;
  reviewWindowMinutes: number;
  autoApprovalEligible: boolean;
  manualReviewOnly: boolean;
  onHold: boolean;
  holdReason?: string;
  internalNotes?: string;
  correctionReason?: string;
  rejectionReason?: string;
  decisionReason?: string;
  decidedBy?: string;
  decidedAtMs?: number;
  resubmittedAtMs?: number;
  createdAtMs: number;
  updatedAtMs: number;
}

export interface TaskReview {
  id: string;
  submissionId: string;
  taskId: string;
  userId: string;
  decision: 'APPROVED' | 'AUTO_APPROVED' | 'REJECTED' | 'CORRECTION_REQUESTED' | 'ON_HOLD' | 'HOLD_RELEASED';
  reason: string;
  internalNote?: string;
  reviewerId: string;
  reviewerEmail?: string;
  createdAtMs: number;
}

export interface TaskCorrection {
  id: string;
  submissionId: string;
  taskId: string;
  userId: string;
  versionRequested: number;
  reason: string;
  requestedBy: string;
  resolvedAtMs?: number;
  createdAtMs: number;
}

export interface TaskApprovalTimer {
  id: string;
  submissionId: string;
  taskId: string;
  userId: string;
  version: number;
  status: 'ARMED' | 'CANCELLED_SUPERSEDED' | 'CANCELLED_ADMIN_DECISION' | 'PAUSED_ON_HOLD' | 'AUTO_APPROVED_EXECUTED' | 'BLOCKED_USER_STATUS';
  armedAtMs: number;
  dueAtMs: number;
  executedAtMs?: number;
  note?: string;
}

export interface WalletLedgerEntry {
  id: string;
  idempotencyKey: string;
  userId: string;
  type: WalletLedgerType;
  amount: number;
  currency: string;
  balanceBefore: number;
  balanceAfter: number;
  pendingBefore: number;
  pendingAfter: number;
  reservedBefore: number;
  reservedAfter: number;
  referenceId: string;
  referenceType: 'submission' | 'withdrawal' | 'admin_adjustment' | 'task';
  actorId: string;
  note: string;
  createdAtMs: number;
}

export interface AdminAutoApprovalSettings {
  id: string;
  enabled: boolean;
  reviewWindowMinutes: number;
  excludedCategoryIds: string[];
  excludedSourceTypes: TaskSourceType[];
  maxAutoApproveAmountKes: number;
  minAccountAgeDays: number;
  updatedBy: string;
  updatedAtMs: number;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  audience: 'all' | 'workers' | 'clients';
  priority: 'normal' | 'important' | 'critical';
  published: boolean;
  publishedBy: string;
  createdAtMs: number;
  updatedAtMs: number;
}

export interface ReferralRecord {
  id: string;
  referrerUid: string;
  referredUid: string;
  referredEmail: string;
  code: string;
  status: 'pending' | 'qualified' | 'rewarded';
  rewardKes: number;
  createdAtMs: number;
}

export interface OperationalAuditLog {
  id: string;
  actorId: string;
  actorEmail?: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  metadata?: Record<string, unknown>;
  createdAtMs: number;
}

export interface SecurityEvent {
  id: string;
  userId: string;
  eventType: string;
  severity: 'info' | 'warning' | 'critical';
  description: string;
  createdAtMs: number;
}

export type WorkspaceRoute =
  | 'dashboard'
  // Worker routes
  | 'browse-tasks'
  | 'operational-tasks'
  | 'my-bids'
  | 'my-assignments'
  | 'completed-work'
  | 'saved-tasks'
  // Client routes
  | 'post-task'
  | 'manage-tasks'
  | 'received-bids'
  | 'active-projects'
  | 'completed-projects'
  // Finance
  | 'wallet'
  | 'payout-accounts'
  | 'transactions'
  | 'withdrawals'
  | 'payment-history'
  // Communication
  | 'messages'
  | 'notifications'
  | 'announcements'
  | 'support'
  // Account & Policies
  | 'profile'
  | 'settings'
  | 'security'
  | 'my-policies'
  | 'policy-updates'
  // Super Admin Control Centre
  | 'control-centre'
  | 'admin-operations'
  | 'financial-control'
  | 'policy-control'
  | 'platform-settings';

export type AppRoute = PublicRoute | WorkspaceRoute;

export const WORKER_ONLY_ROUTES: WorkspaceRoute[] = [
  'browse-tasks',
  'operational-tasks',
  'my-bids',
  'my-assignments',
  'completed-work',
  'saved-tasks',
];

export const CLIENT_ONLY_ROUTES: WorkspaceRoute[] = [
  'post-task',
  'manage-tasks',
  'received-bids',
  'active-projects',
  'completed-projects',
];

export const SHARED_WORKSPACE_ROUTES: WorkspaceRoute[] = [
  'dashboard',
  'wallet',
  'payout-accounts',
  'transactions',
  'withdrawals',
  'payment-history',
  'messages',
  'notifications',
  'announcements',
  'support',
  'profile',
  'settings',
  'security',
  'my-policies',
  'policy-updates',
];

export const ADMIN_ONLY_ROUTES: WorkspaceRoute[] = [
  'control-centre',
  'admin-operations',
  'financial-control',
  'policy-control',
  'platform-settings',
];

export const ALL_WORKSPACE_ROUTES: WorkspaceRoute[] = [
  ...WORKER_ONLY_ROUTES,
  ...CLIENT_ONLY_ROUTES,
  ...SHARED_WORKSPACE_ROUTES,
  ...ADMIN_ONLY_ROUTES,
];


