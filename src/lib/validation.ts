import { TASK_CATEGORIES, type TaskCategory, type UserRole } from '../types/marketplace';

export const SCHEMA_LIMITS = {
  idMaxLength: 128,
  displayNameMin: 2,
  displayNameMax: 80,
  phoneMax: 24,
  bioMax: 500,
  skillsMaxCount: 10,
  taskSkillsMaxCount: 8,
  businessNameMax: 100,
  businessIndustryMax: 80,
  taskTitleMin: 5,
  taskTitleMax: 120,
  taskDescMin: 15,
  taskDescMax: 2000,
  budgetMinKes: 50,
  budgetMaxKes: 5000000,
  deadlineMin: 4,
  deadlineMax: 32,
  urlMax: 400,
  proposalMin: 10,
  proposalMax: 1500,
  submissionNotesMin: 10,
  submissionNotesMax: 2000,
  feedbackMax: 800,
  messageMax: 1500,
  supportSubjectMin: 3,
  supportSubjectMax: 120,
  supportMessageMin: 10,
  supportMessageMax: 1500,
} as const;

export function formatKes(amount: number): string {
  return `KES ${Number(amount || 0).toLocaleString('en-KE')}`;
}

export function formatCurrency(amount: number, currency = 'KES'): string {
  const code = (currency || 'KES').toUpperCase();
  const numeric = Number(amount || 0);
  const decimals = code === 'USD' || code === 'USDT' || code === 'NGN' ? 2 : 0;
  return `${code} ${numeric.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function maskAccountIdentifier(raw: string): { masked: string; last4: string } {
  const cleaned = raw.trim().replace(/\s+/g, '');
  if (cleaned.length <= 4) {
    return { masked: `•••• ${cleaned}`, last4: cleaned };
  }
  const last4 = cleaned.slice(-4);
  return { masked: `•••• ${last4}`, last4 };
}

export function detectPrivateKeyOrSeedPhrase(raw: string): boolean {
  const trimmed = raw.trim();
  const words = trimmed.split(/\s+/).filter(Boolean);
  // Reject 12-word or 24-word mnemonic recovery phrases
  if (words.length === 12 || words.length === 15 || words.length === 18 || words.length === 24) {
    return true;
  }
  // Reject 64-char raw hex private keys (no 0x prefix or explicitly private key formatted)
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return true;
  }
  const lower = trimmed.toLowerCase();
  if (lower.includes('seed phrase') || lower.includes('private key') || lower.includes('mnemonic')) {
    return true;
  }
  return false;
}

export function validateCryptoAddress(address: string, network: string): string | null {
  const trimmed = address.trim();
  if (detectPrivateKeyOrSeedPhrase(trimmed)) {
    return 'Never enter private keys or recovery seed phrases. Provide only a public deposit address.';
  }
  if (network === 'TRC20') {
    if (!/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(trimmed)) {
      return 'Invalid TRC20 wallet address. TRC20 addresses start with "T" and are 34 characters.';
    }
    return null;
  }
  if (network === 'ERC20' || network === 'BEP20') {
    if (!/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
      return `Invalid ${network} wallet address. Must start with "0x" followed by 40 hex characters.`;
    }
    return null;
  }
  if (network === 'Binance Pay ID') {
    if (trimmed.length < 4 || trimmed.length > 100) {
      return 'Provide a valid Binance Pay ID or registered Binance email.';
    }
    return null;
  }
  if (trimmed.length < 10 || trimmed.length > 120) {
    return 'Enter a valid public cryptocurrency receiving address.';
  }
  return null;
}

export function cleanText(value: string, maxLength: number): string {
  return value.trim().slice(0, maxLength);
}

export function parseSkillsInput(raw: string, maxItems: number): string[] {
  return raw
    .split(',')
    .map((s) => s.trim().slice(0, 60))
    .filter(Boolean)
    .slice(0, maxItems);
}

export function validateRole(role: string): role is UserRole {
  return role === 'worker' || role === 'client';
}

export function validateDisplayName(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length < SCHEMA_LIMITS.displayNameMin) {
    return `Name must be at least ${SCHEMA_LIMITS.displayNameMin} characters.`;
  }
  if (trimmed.length > SCHEMA_LIMITS.displayNameMax) {
    return `Name cannot exceed ${SCHEMA_LIMITS.displayNameMax} characters.`;
  }
  return null;
}

export function validateTaskInput(input: {
  title: string;
  description: string;
  category: string;
  budgetKes: number;
  deadline: string;
  attachmentUrl?: string;
}): string | null {
  const title = input.title.trim();
  const desc = input.description.trim();
  const deadline = input.deadline.trim();
  const url = (input.attachmentUrl || '').trim();

  if (title.length < SCHEMA_LIMITS.taskTitleMin || title.length > SCHEMA_LIMITS.taskTitleMax) {
    return `Task title must be between ${SCHEMA_LIMITS.taskTitleMin} and ${SCHEMA_LIMITS.taskTitleMax} characters.`;
  }
  if (!TASK_CATEGORIES.includes(input.category as TaskCategory)) {
    return 'Select a valid task category.';
  }
  if (desc.length < SCHEMA_LIMITS.taskDescMin || desc.length > SCHEMA_LIMITS.taskDescMax) {
    return `Task description must be between ${SCHEMA_LIMITS.taskDescMin} and ${SCHEMA_LIMITS.taskDescMax} characters.`;
  }
  if (
    !Number.isFinite(input.budgetKes) ||
    input.budgetKes < SCHEMA_LIMITS.budgetMinKes ||
    input.budgetKes > SCHEMA_LIMITS.budgetMaxKes
  ) {
    return `Budget must be between ${formatKes(SCHEMA_LIMITS.budgetMinKes)} and ${formatKes(SCHEMA_LIMITS.budgetMaxKes)}.`;
  }
  if (deadline.length < SCHEMA_LIMITS.deadlineMin || deadline.length > SCHEMA_LIMITS.deadlineMax) {
    return 'Provide a valid deadline date.';
  }
  if (url && !/^https?:\/\/.+/i.test(url)) {
    return 'Attachment link must start with http:// or https://.';
  }
  if (url.length > SCHEMA_LIMITS.urlMax) {
    return `Attachment URL cannot exceed ${SCHEMA_LIMITS.urlMax} characters.`;
  }
  return null;
}

export function validateBidInput(input: {
  amountKes: number;
  deliveryDays: number;
  proposal: string;
}): string | null {
  const proposal = input.proposal.trim();
  if (
    !Number.isFinite(input.amountKes) ||
    input.amountKes < SCHEMA_LIMITS.budgetMinKes ||
    input.amountKes > SCHEMA_LIMITS.budgetMaxKes
  ) {
    return `Bid amount must be between ${formatKes(SCHEMA_LIMITS.budgetMinKes)} and ${formatKes(SCHEMA_LIMITS.budgetMaxKes)}.`;
  }
  if (!Number.isInteger(input.deliveryDays) || input.deliveryDays < 1 || input.deliveryDays > 365) {
    return 'Delivery timeline must be between 1 and 365 days.';
  }
  if (proposal.length < SCHEMA_LIMITS.proposalMin || proposal.length > SCHEMA_LIMITS.proposalMax) {
    return `Proposal must be between ${SCHEMA_LIMITS.proposalMin} and ${SCHEMA_LIMITS.proposalMax} characters.`;
  }
  return null;
}

export function validateSubmissionInput(input: {
  submissionNotes: string;
  submissionUrl?: string;
}): string | null {
  const notes = input.submissionNotes.trim();
  const url = (input.submissionUrl || '').trim();
  if (
    notes.length < SCHEMA_LIMITS.submissionNotesMin ||
    notes.length > SCHEMA_LIMITS.submissionNotesMax
  ) {
    return `Work summary must be between ${SCHEMA_LIMITS.submissionNotesMin} and ${SCHEMA_LIMITS.submissionNotesMax} characters.`;
  }
  if (url && !/^https?:\/\/.+/i.test(url)) {
    return 'Deliverable link must start with http:// or https://.';
  }
  if (url.length > SCHEMA_LIMITS.urlMax) {
    return `Deliverable URL cannot exceed ${SCHEMA_LIMITS.urlMax} characters.`;
  }
  return null;
}

export function validateSupportInput(subject: string, message: string): string | null {
  const sub = subject.trim();
  const msg = message.trim();
  if (sub.length < SCHEMA_LIMITS.supportSubjectMin || sub.length > SCHEMA_LIMITS.supportSubjectMax) {
    return `Subject must be between ${SCHEMA_LIMITS.supportSubjectMin} and ${SCHEMA_LIMITS.supportSubjectMax} characters.`;
  }
  if (msg.length < SCHEMA_LIMITS.supportMessageMin || msg.length > SCHEMA_LIMITS.supportMessageMax) {
    return `Message must be between ${SCHEMA_LIMITS.supportMessageMin} and ${SCHEMA_LIMITS.supportMessageMax} characters.`;
  }
  return null;
}

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/^@+/, '');
}

export function validateUsername(raw: string): string | null {
  const clean = normalizeUsername(raw);
  if (!/^[a-z0-9_]{3,30}$/.test(clean)) {
    return 'Username must be 3–30 characters using lowercase letters, numbers, or underscores.';
  }
  const reserved = ['admin', 'administrator', 'root', 'system', 'swas', 'swastasks', 'support'];
  if (reserved.includes(clean)) {
    return 'This username is reserved. Choose a different username.';
  }
  return null;
}

export function validatePhoneNumber(raw: string): string | null {
  const cleaned = raw.trim();
  if (!cleaned) return 'Phone number is required.';
  if (!/^\+?[0-9\s\-()]{7,20}$/.test(cleaned)) {
    return 'Enter a valid international or local phone number (7–20 digits).';
  }
  return null;
}

export const ALLOWED_SUBMISSION_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
  'image/webp',
]);

export const MAX_SUBMISSION_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

export function validateSubmissionFile(file: File): string | null {
  if (!ALLOWED_SUBMISSION_MIME_TYPES.has(file.type)) {
    return 'Unsupported file type. Allowed formats: PDF, DOC, DOCX, PNG, JPG, or WEBP.';
  }
  if (file.size <= 0 || file.size > MAX_SUBMISSION_FILE_BYTES) {
    return 'File size must be greater than 0 and no more than 10 MB.';
  }
  return null;
}

