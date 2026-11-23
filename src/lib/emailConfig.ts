export const OFFICIAL_EMAIL_IDENTITY = {
  platformName: 'SWAS TASKS',
  officialEmail: 'swastaskorg@gmail.com',
  senderName: 'SWAS TASKS',
  replyTo: 'swastaskorg@gmail.com',
} as const;

export const SUPER_ADMIN_EMAIL = 'lovewaithaka8@gmail.com';

export type EmailSurfaceScope = 'website' | 'control_centre';

export type EmailCategoryId =
  // 1. Public SWAS TASKS Website (11 categories)
  | 'client_registration'
  | 'worker_registration'
  | 'account_verification'
  | 'password_reset'
  | 'login_security'
  | 'task_notification'
  | 'bid_assignment_notification'
  | 'payment_notification'
  | 'withdrawal_notification'
  | 'customer_support'
  | 'general_announcement'
  // 2. SWAS TASKS Central Control Centre (10 categories)
  | 'staff_invitation'
  | 'staff_registration'
  | 'admin_notification'
  | 'security_alert'
  | 'cc_account_verification'
  | 'cc_password_reset'
  | 'cc_login_alert'
  | 'department_notification'
  | 'system_announcement'
  | 'admin_communication';

export interface EmailCategoryDefinition {
  id: EmailCategoryId;
  scope: EmailSurfaceScope;
  label: string;
  description: string;
  defaultSubject: string;
  adminOnly: boolean;
  defaultEnabled: boolean;
}

export const EMAIL_CATEGORIES: EmailCategoryDefinition[] = [
  // Public SWAS TASKS Website
  {
    id: 'client_registration',
    scope: 'website',
    label: 'Client Registration Notifications',
    description: 'Welcome and onboarding confirmation emails for newly registered Client accounts.',
    defaultSubject: '[SWAS TASKS] Welcome to your SWAS TASKS Client Workspace',
    adminOnly: false,
    defaultEnabled: true,
  },
  {
    id: 'worker_registration',
    scope: 'website',
    label: 'Worker Registration Notifications',
    description: 'Welcome and onboarding confirmation emails for newly registered Worker accounts.',
    defaultSubject: '[SWAS TASKS] Welcome to your SWAS TASKS Worker Workspace',
    adminOnly: false,
    defaultEnabled: true,
  },
  {
    id: 'account_verification',
    scope: 'website',
    label: 'Account Verification Emails',
    description: 'Email verification status and account activation confirmations.',
    defaultSubject: '[SWAS TASKS] Account Verification Notice',
    adminOnly: false,
    defaultEnabled: true,
  },
  {
    id: 'password_reset',
    scope: 'website',
    label: 'Password Reset Emails',
    description: 'Password recovery instructions and confirmation alerts.',
    defaultSubject: '[SWAS TASKS] Password Reset & Account Recovery',
    adminOnly: false,
    defaultEnabled: true,
  },
  {
    id: 'login_security',
    scope: 'website',
    label: 'Login Security Notifications',
    description: 'Sign-in notifications and provider linking alerts for client & worker accounts.',
    defaultSubject: '[SWAS TASKS] New Sign-In Security Notification',
    adminOnly: false,
    defaultEnabled: true,
  },
  {
    id: 'task_notification',
    scope: 'website',
    label: 'Task Notifications',
    description: 'Task publication, status updates, and deadline reminders.',
    defaultSubject: '[SWAS TASKS] Task Update Notification',
    adminOnly: false,
    defaultEnabled: true,
  },
  {
    id: 'bid_assignment_notification',
    scope: 'website',
    label: 'Bid & Assignment Notifications',
    description: 'Submitted bids, bid acceptances/rejections, deliverable submissions, and revision alerts.',
    defaultSubject: '[SWAS TASKS] Bid & Assignment Activity Update',
    adminOnly: false,
    defaultEnabled: true,
  },
  {
    id: 'payment_notification',
    scope: 'website',
    label: 'Payment Notifications',
    description: 'Assignment approval KES ledger entries and payment confirmation updates.',
    defaultSubject: '[SWAS TASKS] Payment & Ledger Update (KES)',
    adminOnly: false,
    defaultEnabled: true,
  },
  {
    id: 'withdrawal_notification',
    scope: 'website',
    label: 'Withdrawal Notifications',
    description: 'Worker payout request acknowledgements and settlement status notices.',
    defaultSubject: '[SWAS TASKS] Withdrawal Request Logged',
    adminOnly: false,
    defaultEnabled: true,
  },
  {
    id: 'customer_support',
    scope: 'website',
    label: 'Customer Support Communications',
    description: 'Support ticket confirmations and direct support team communications.',
    defaultSubject: '[SWAS TASKS] Support Ticket Received',
    adminOnly: false,
    defaultEnabled: true,
  },
  {
    id: 'general_announcement',
    scope: 'website',
    label: 'General Platform Announcements',
    description: 'Marketplace updates, scheduled maintenance, and platform announcements.',
    defaultSubject: '[SWAS TASKS] Platform Announcement',
    adminOnly: true,
    defaultEnabled: true,
  },

  // Private SWAS TASKS CENTRAL CONTROL CENTRE
  {
    id: 'staff_invitation',
    scope: 'control_centre',
    label: 'Department Staff Invitations',
    description: 'Official invitations for internal department staff onboarding into Central Control Centre.',
    defaultSubject: '[SWAS TASKS CENTRAL CONTROL CENTRE] Department Staff Invitation',
    adminOnly: true,
    defaultEnabled: true,
  },
  {
    id: 'staff_registration',
    scope: 'control_centre',
    label: 'Staff Registration Notifications',
    description: 'Confirmation alerts when new department staff complete Central Control Centre registration.',
    defaultSubject: '[SWAS TASKS CENTRAL CONTROL CENTRE] Staff Registration Confirmation',
    adminOnly: true,
    defaultEnabled: true,
  },
  {
    id: 'admin_notification',
    scope: 'control_centre',
    label: 'Administrator Notifications',
    description: 'High-priority operational alerts directed to platform administrators.',
    defaultSubject: '[SWAS TASKS CENTRAL CONTROL CENTRE] Administrator Notice',
    adminOnly: true,
    defaultEnabled: true,
  },
  {
    id: 'security_alert',
    scope: 'control_centre',
    label: 'Security Alerts',
    description: 'Critical security incidents, unauthorized access attempts, and policy alerts.',
    defaultSubject: '[SWAS TASKS CENTRAL CONTROL CENTRE] Security Alert',
    adminOnly: true,
    defaultEnabled: true,
  },
  {
    id: 'cc_account_verification',
    scope: 'control_centre',
    label: 'Control Centre Account Verification',
    description: 'Staff and administrator verification notices within the Control Centre.',
    defaultSubject: '[SWAS TASKS CENTRAL CONTROL CENTRE] Staff Account Verification',
    adminOnly: true,
    defaultEnabled: true,
  },
  {
    id: 'cc_password_reset',
    scope: 'control_centre',
    label: 'Control Centre Password Reset',
    description: 'Password recovery notices for internal administrators and staff.',
    defaultSubject: '[SWAS TASKS CENTRAL CONTROL CENTRE] Password Reset Notice',
    adminOnly: true,
    defaultEnabled: true,
  },
  {
    id: 'cc_login_alert',
    scope: 'control_centre',
    label: 'Control Centre Login Alerts',
    description: 'Sign-in audit notifications for Central Control Centre sessions.',
    defaultSubject: '[SWAS TASKS CENTRAL CONTROL CENTRE] Administrator Login Alert',
    adminOnly: true,
    defaultEnabled: true,
  },
  {
    id: 'department_notification',
    scope: 'control_centre',
    label: 'Department Notifications',
    description: 'Operational circulars sent to internal Operations, Finance, Trust & Safety, or Support teams.',
    defaultSubject: '[SWAS TASKS CENTRAL CONTROL CENTRE] Department Bulletin',
    adminOnly: true,
    defaultEnabled: true,
  },
  {
    id: 'system_announcement',
    scope: 'control_centre',
    label: 'Important System Announcements',
    description: 'Critical system changes, security policy updates, and downtime notices.',
    defaultSubject: '[SWAS TASKS CENTRAL CONTROL CENTRE] Important System Announcement',
    adminOnly: true,
    defaultEnabled: true,
  },
  {
    id: 'admin_communication',
    scope: 'control_centre',
    label: 'Administrative Communications',
    description: 'Official executive and administrative correspondence from SWAS TASKS.',
    defaultSubject: '[SWAS TASKS CENTRAL CONTROL CENTRE] Administrative Communication',
    adminOnly: true,
    defaultEnabled: true,
  },
];

export const EMAIL_CATEGORY_MAP: Record<EmailCategoryId, EmailCategoryDefinition> = Object.fromEntries(
  EMAIL_CATEGORIES.map((c) => [c.id, c])
) as Record<EmailCategoryId, EmailCategoryDefinition>;

export function buildDefaultCategoryStates(): Record<EmailCategoryId, boolean> {
  const result = {} as Record<EmailCategoryId, boolean>;
  for (const cat of EMAIL_CATEGORIES) {
    result[cat.id] = cat.defaultEnabled;
  }
  return result;
}

export function buildDefaultSubjectTemplates(): Record<EmailCategoryId, string> {
  const result = {} as Record<EmailCategoryId, string>;
  for (const cat of EMAIL_CATEGORIES) {
    result[cat.id] = cat.defaultSubject;
  }
  return result;
}
