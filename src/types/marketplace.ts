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

export interface UserPrivate {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  phone?: string;
  photoUrl?: string;
  bio?: string;
  skills?: string[];
  businessName?: string;
  businessIndustry?: string;
  notifyBids?: boolean;
  notifyMessages?: boolean;
  notifyPayments?: boolean;
  publicProfileVisible?: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface PublicProfile {
  uid: string;
  displayName: string;
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
  category: TaskCategory;
  skills?: string[];
  budgetKes: number;
  deadline: string;
  attachmentUrl?: string;
  visibility: TaskVisibility;
  status: TaskStatus;
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
  | 'security_alert';

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
  currency: 'KES';
  availableKes: number;
  updatedAt?: Timestamp;
}

export interface LedgerTransaction {
  id: string;
  userId: string;
  counterpartyId: string;
  assignmentId: string;
  taskTitle: string;
  kind: 'earning' | 'payment';
  amountKes: number;
  status: TransactionStatus;
  reference: string;
  createdAt?: Timestamp;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  amountKes: number;
  method: 'M-Pesa' | 'Bank Transfer';
  destination: string;
  status: 'requested';
  createdAt?: Timestamp;
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
  | 'refund';

export type WorkspaceRoute =
  | 'dashboard'
  // Worker routes
  | 'browse-tasks'
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
  | 'transactions'
  | 'withdrawals'
  | 'payment-history'
  // Communication
  | 'messages'
  | 'notifications'
  | 'support'
  // Account
  | 'profile'
  | 'settings'
  | 'security';

export type AppRoute = PublicRoute | WorkspaceRoute;

export const WORKER_ONLY_ROUTES: WorkspaceRoute[] = [
  'browse-tasks',
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
  'transactions',
  'withdrawals',
  'payment-history',
  'messages',
  'notifications',
  'support',
  'profile',
  'settings',
  'security',
];

export const ALL_WORKSPACE_ROUTES: WorkspaceRoute[] = [
  ...WORKER_ONLY_ROUTES,
  ...CLIENT_ONLY_ROUTES,
  ...SHARED_WORKSPACE_ROUTES,
];
