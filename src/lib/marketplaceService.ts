import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { dispatchPlatformEmail } from './emailService';
import { SUPER_ADMIN_EMAIL } from './emailConfig';
import {
  cleanText,
  normalizeUsername,
  SCHEMA_LIMITS,
  validateBidInput,
  validateDisplayName,
  validateRole,
  validateSubmissionInput,
  validateSupportInput,
  validateTaskInput,
  validateUsername,
} from './validation';
import type {
  AccountStatus,
  AppNotification,
  ChatMessage,
  Conversation,
  LedgerTransaction,
  MarketplaceTask,
  NotificationType,
  PublicProfile,
  SavedTaskItem,
  SupportCategory,
  SupportTicket,
  TaskAssignment,
  TaskBid,
  TaskCategory,
  TaskStatus,
  TaskVisibility,
  UserPrivate,
  UserRole,
  WalletAccount,
  WithdrawalRequest,
} from '../types/marketplace';

function sortDesc<T extends { createdAt?: Timestamp }>(items: T[]): T[] {
  return [...items].sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
}

function sortAsc<T extends { createdAt?: Timestamp }>(items: T[]): T[] {
  return [...items].sort((a, b) => (a.createdAt?.toMillis?.() ?? 0) - (b.createdAt?.toMillis?.() ?? 0));
}

function sortUpdatedDesc<T extends { updatedAt?: Timestamp }>(items: T[]): T[] {
  return [...items].sort((a, b) => (b.updatedAt?.toMillis?.() ?? 0) - (a.updatedAt?.toMillis?.() ?? 0));
}

export function generateDocId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  const ts = Date.now().toString(36);
  return `${prefix}_${ts}_${rand}`;
}

export async function createUserAccountDocs(
  user: User,
  role: UserRole,
  displayNameInput?: string,
  businessNameInput?: string,
  operational?: {
    username?: string;
    phone?: string;
    country?: string;
    accountStatus?: AccountStatus;
  }
): Promise<void> {
  if (!validateRole(role)) throw new Error('Select either Worker or Client role.');
  const rawName =
    displayNameInput?.trim() || user.displayName || user.email?.split('@')[0] || 'SWAS Member';
  const safeName = cleanText(rawName, SCHEMA_LIMITS.displayNameMax);
  const displayName = safeName.length >= 2 ? safeName : 'SWAS Member';
  const email = cleanText(user.email || '', 254);
  if (!email || email.length < 3) {
    throw new Error('A verified email address from your account provider is required.');
  }

  let cleanUsername: string | undefined;
  if (operational?.username?.trim()) {
    const uErr = validateUsername(operational.username);
    if (uErr) throw new Error(uErr);
    cleanUsername = normalizeUsername(operational.username);
  }

  const cleanPhone = operational?.phone?.trim()
    ? cleanText(operational.phone, SCHEMA_LIMITS.phoneMax)
    : undefined;
  const cleanCountry = operational?.country?.trim()
    ? cleanText(operational.country.toUpperCase(), 12)
    : 'KE';
  const isDefaultSuperAdmin = email.trim().toLowerCase() === SUPER_ADMIN_EMAIL && user.emailVerified;
  const targetStatus: AccountStatus = isDefaultSuperAdmin
    ? 'ACTIVE'
    : operational?.accountStatus ||
      (user.emailVerified ? 'PENDING_ADMIN_APPROVAL' : 'EMAIL_VERIFICATION_PENDING');

  const userRef = doc(db, 'users', user.uid);
  const pubRef = doc(db, 'publicProfiles', user.uid);
  const walletRef = doc(db, 'wallets', user.uid);

  try {
    const existing = await getDoc(userRef);
    if (existing.exists()) return;

    if (cleanUsername) {
      const unameSnap = await getDoc(doc(db, 'usernames', cleanUsername));
      if (unameSnap.exists() && unameSnap.data()?.uid !== user.uid) {
        throw new Error(`Username "@${cleanUsername}" is already taken.`);
      }
    }

    const batch = writeBatch(db);
    const userPayload: Record<string, unknown> = {
      uid: user.uid,
      email,
      displayName,
      role,
      accountStatus: targetStatus,
      statusReason:
        targetStatus === 'ACTIVE'
          ? 'Verified Super Administrator'
          : targetStatus === 'PENDING_ADMIN_APPROVAL'
          ? 'Email verified; awaiting administrator approval.'
          : 'Email verification pending.',
      emailVerified: Boolean(user.emailVerified),
      country: cleanCountry,
      preferredCurrency: cleanCountry === 'KE' ? 'KES' : 'USD',
      notifyBids: true,
      notifyMessages: true,
      notifyPayments: true,
      publicProfileVisible: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const pubPayload: Record<string, unknown> = {
      uid: user.uid,
      displayName,
      role,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (cleanUsername) {
      userPayload.username = cleanUsername;
      pubPayload.username = cleanUsername;
      batch.set(doc(db, 'usernames', cleanUsername), {
        uid: user.uid,
        username: cleanUsername,
        createdAt: serverTimestamp(),
      });
    }
    if (cleanPhone) {
      userPayload.phone = cleanPhone;
    }

    if (user.photoURL) {
      const safePhoto = cleanText(user.photoURL, 500);
      userPayload.photoUrl = safePhoto;
      pubPayload.photoUrl = safePhoto;
    }

    if (role === 'client' && businessNameInput?.trim()) {
      const cleanBiz = cleanText(businessNameInput, SCHEMA_LIMITS.businessNameMax);
      userPayload.businessName = cleanBiz;
      pubPayload.businessName = cleanBiz;
    }

    batch.set(userRef, userPayload);
    batch.set(pubRef, pubPayload);
    batch.set(walletRef, {
      userId: user.uid,
      currency: 'KES',
      availableKes: 0,
      availableBalance: 0,
      pendingEarnings: 0,
      totalEarned: 0,
      totalWithdrawn: 0,
      reservedWithdrawalFunds: 0,
      updatedAt: serverTimestamp(),
    });

    await batch.commit();
  } catch (error) {
    if (error instanceof Error && error.message.includes('already taken')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
  }
}

export async function syncGoogleProfileMetadataIfNeeded(user: User): Promise<void> {
  if (!user.photoURL) return;
  const userRef = doc(db, 'users', user.uid);
  const pubRef = doc(db, 'publicProfiles', user.uid);
  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) return;
    const data = snap.data() as UserPrivate;
    if (data.photoUrl) return;
    const safePhoto = cleanText(user.photoURL, 500);
    if (!safePhoto) return;

    const batch = writeBatch(db);
    batch.update(userRef, {
      photoUrl: safePhoto,
      updatedAt: serverTimestamp(),
    });
    batch.update(pubRef, {
      photoUrl: safePhoto,
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  } catch {
    // Non-critical metadata backfill; do not block sign-in if skipped
  }
}

export async function updateUserAccountSettings(
  uid: string,
  payload: {
    displayName: string;
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
  }
): Promise<void> {
  const err = validateDisplayName(payload.displayName);
  if (err) throw new Error(err);

  const displayName = cleanText(payload.displayName, SCHEMA_LIMITS.displayNameMax);
  const userUpdate: Record<string, unknown> = {
    displayName,
    updatedAt: serverTimestamp(),
  };
  const pubUpdate: Record<string, unknown> = {
    displayName,
    updatedAt: serverTimestamp(),
  };

  if (payload.phone !== undefined) {
    userUpdate.phone = cleanText(payload.phone, SCHEMA_LIMITS.phoneMax);
  }
  if (payload.photoUrl !== undefined) {
    const cleanUrl = cleanText(payload.photoUrl, 500);
    userUpdate.photoUrl = cleanUrl;
    pubUpdate.photoUrl = cleanUrl;
  }
  if (payload.bio !== undefined) {
    const cleanBio = cleanText(payload.bio, SCHEMA_LIMITS.bioMax);
    userUpdate.bio = cleanBio;
    pubUpdate.bio = cleanBio;
  }
  if (payload.skills !== undefined) {
    const cleanSkills = payload.skills.slice(0, SCHEMA_LIMITS.skillsMaxCount);
    userUpdate.skills = cleanSkills;
    pubUpdate.skills = cleanSkills;
  }
  if (payload.businessName !== undefined) {
    const cleanBiz = cleanText(payload.businessName, SCHEMA_LIMITS.businessNameMax);
    userUpdate.businessName = cleanBiz;
    pubUpdate.businessName = cleanBiz;
  }
  if (payload.businessIndustry !== undefined) {
    userUpdate.businessIndustry = cleanText(
      payload.businessIndustry,
      SCHEMA_LIMITS.businessIndustryMax
    );
  }
  if (typeof payload.notifyBids === 'boolean') userUpdate.notifyBids = payload.notifyBids;
  if (typeof payload.notifyMessages === 'boolean') userUpdate.notifyMessages = payload.notifyMessages;
  if (typeof payload.notifyPayments === 'boolean') userUpdate.notifyPayments = payload.notifyPayments;
  if (typeof payload.publicProfileVisible === 'boolean') {
    userUpdate.publicProfileVisible = payload.publicProfileVisible;
  }

  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'users', uid), userUpdate);
    batch.update(doc(db, 'publicProfiles', uid), pubUpdate);
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
  }
}

export async function getPublicProfile(uid: string): Promise<PublicProfile | null> {
  try {
    const snap = await getDoc(doc(db, 'publicProfiles', uid));
    return snap.exists() ? (snap.data() as PublicProfile) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `publicProfiles/${uid}`);
  }
}

// --- Notifications ---
export async function pushNotification(params: {
  userId: string;
  actorId: string;
  type: NotificationType;
  title: string;
  body: string;
  linkRoute?: string;
}): Promise<void> {
  const id = generateDocId('notif');
  try {
    const payload: Record<string, unknown> = {
      userId: params.userId,
      actorId: params.actorId,
      type: params.type,
      title: cleanText(params.title, 120),
      body: cleanText(params.body, 400),
      read: false,
      createdAt: serverTimestamp(),
    };
    if (params.linkRoute) {
      payload.linkRoute = cleanText(params.linkRoute, 64);
    }
    await setDoc(doc(db, 'notifications', id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `notifications/${id}`);
  }
}

export function subscribeNotifications(
  userId: string,
  onData: (items: AppNotification[]) => void
): Unsubscribe {
  const q = query(collection(db, 'notifications'), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snap) => {
      onData(
        sortDesc(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<AppNotification, 'id'>),
          }))
        )
      );
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'notifications')
  );
}

export async function markNotificationRead(id: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'notifications', id), { read: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `notifications/${id}`);
  }
}

export async function markAllNotificationsRead(items: AppNotification[]): Promise<void> {
  const unread = items.filter((n) => !n.read);
  if (unread.length === 0) return;
  try {
    const batch = writeBatch(db);
    unread.slice(0, 50).forEach((n) => {
      batch.update(doc(db, 'notifications', n.id), { read: true });
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'notifications');
  }
}

// --- Tasks ---
export function subscribePublicTasks(
  onData: (tasks: MarketplaceTask[]) => void,
  onError?: () => void
): Unsubscribe {
  const q = query(collection(db, 'tasks'), where('visibility', '==', 'public'));
  return onSnapshot(
    q,
    (snap) => {
      onData(
        sortDesc(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<MarketplaceTask, 'id'>),
          }))
        )
      );
    },
    (error) => {
      onError?.();
      handleFirestoreError(error, OperationType.LIST, 'tasks');
    }
  );
}

export function subscribeClientTasks(
  clientId: string,
  onData: (tasks: MarketplaceTask[]) => void
): Unsubscribe {
  const q = query(collection(db, 'tasks'), where('clientId', '==', clientId));
  return onSnapshot(
    q,
    (snap) => {
      onData(
        sortDesc(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<MarketplaceTask, 'id'>),
          }))
        )
      );
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'tasks')
  );
}

export async function createTask(
  clientId: string,
  clientName: string,
  input: {
    title: string;
    description: string;
    category: TaskCategory;
    skills: string[];
    budgetKes: number;
    deadline: string;
    attachmentUrl?: string;
    visibility: TaskVisibility;
    status: 'open' | 'paused';
  }
): Promise<string> {
  const err = validateTaskInput(input);
  if (err) throw new Error(err);

  const taskId = generateDocId('task');
  const payload: Record<string, unknown> = {
    clientId,
    clientName: cleanText(clientName || 'Client', SCHEMA_LIMITS.displayNameMax),
    title: cleanText(input.title, SCHEMA_LIMITS.taskTitleMax),
    description: cleanText(input.description, SCHEMA_LIMITS.taskDescMax),
    category: input.category,
    skills: input.skills.slice(0, SCHEMA_LIMITS.taskSkillsMaxCount),
    budgetKes: Math.round(input.budgetKes),
    deadline: cleanText(input.deadline, SCHEMA_LIMITS.deadlineMax),
    visibility: input.visibility,
    status: input.status,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const cleanAttach = cleanText(input.attachmentUrl || '', SCHEMA_LIMITS.urlMax);
  if (cleanAttach) {
    payload.attachmentUrl = cleanAttach;
  }

  try {
    await setDoc(doc(db, 'tasks', taskId), payload);
    if (auth.currentUser?.email) {
      void dispatchPlatformEmail({
        user: auth.currentUser,
        surface: 'website',
        category: 'task_notification',
        recipientEmail: auth.currentUser.email,
        subject: `[SWAS TASKS] Task Published: ${payload.title}`,
        bodyText: `Your task "${payload.title}" (${input.category}, KES ${Math.round(
          input.budgetKes
        ).toLocaleString('en-KE')}) has been published on SWAS TASKS.`,
      });
    }
    return taskId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `tasks/${taskId}`);
  }
}

export async function updateClientTask(
  taskId: string,
  updates: Partial<{
    title: string;
    description: string;
    category: TaskCategory;
    skills: string[];
    budgetKes: number;
    deadline: string;
    attachmentUrl: string;
    visibility: TaskVisibility;
    status: TaskStatus;
  }>
): Promise<void> {
  try {
    const cleanUpdates: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };
    if (updates.title !== undefined) cleanUpdates.title = cleanText(updates.title, SCHEMA_LIMITS.taskTitleMax);
    if (updates.description !== undefined) {
      cleanUpdates.description = cleanText(updates.description, SCHEMA_LIMITS.taskDescMax);
    }
    if (updates.category !== undefined) cleanUpdates.category = updates.category;
    if (updates.skills !== undefined) {
      cleanUpdates.skills = updates.skills.slice(0, SCHEMA_LIMITS.taskSkillsMaxCount);
    }
    if (updates.budgetKes !== undefined) cleanUpdates.budgetKes = Math.round(updates.budgetKes);
    if (updates.deadline !== undefined) {
      cleanUpdates.deadline = cleanText(updates.deadline, SCHEMA_LIMITS.deadlineMax);
    }
    if (updates.attachmentUrl !== undefined) {
      cleanUpdates.attachmentUrl = cleanText(updates.attachmentUrl, SCHEMA_LIMITS.urlMax);
    }
    if (updates.visibility !== undefined) cleanUpdates.visibility = updates.visibility;
    if (updates.status !== undefined) cleanUpdates.status = updates.status;

    await updateDoc(doc(db, 'tasks', taskId), cleanUpdates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `tasks/${taskId}`);
  }
}

// --- Bids ---
export function subscribeWorkerBids(
  workerId: string,
  onData: (bids: TaskBid[]) => void
): Unsubscribe {
  const q = query(collection(db, 'bids'), where('workerId', '==', workerId));
  return onSnapshot(
    q,
    (snap) => {
      onData(
        sortDesc(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<TaskBid, 'id'>),
          }))
        )
      );
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'bids')
  );
}

export function subscribeClientBids(
  clientId: string,
  onData: (bids: TaskBid[]) => void
): Unsubscribe {
  const q = query(collection(db, 'bids'), where('clientId', '==', clientId));
  return onSnapshot(
    q,
    (snap) => {
      onData(
        sortDesc(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<TaskBid, 'id'>),
          }))
        )
      );
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'bids')
  );
}

export async function submitBid(
  task: MarketplaceTask,
  workerId: string,
  workerName: string,
  existingWorkerBids: TaskBid[],
  input: {
    amountKes: number;
    deliveryDays: number;
    proposal: string;
  }
): Promise<string> {
  if (task.clientId === workerId) {
    throw new Error('Clients cannot bid on their own tasks.');
  }
  if (task.status !== 'open') {
    throw new Error('This task is not accepting bids.');
  }
  const hasActiveBid = existingWorkerBids.some(
    (b) => b.taskId === task.id && (b.status === 'pending' || b.status === 'accepted')
  );
  if (hasActiveBid) {
    throw new Error('You already have an active bid on this task.');
  }

  const err = validateBidInput({
    amountKes: input.amountKes,
    deliveryDays: Math.trunc(input.deliveryDays),
    proposal: input.proposal,
  });
  if (err) throw new Error(err);

  const bidId = generateDocId('bid');
  try {
    await setDoc(doc(db, 'bids', bidId), {
      taskId: task.id,
      taskTitle: cleanText(task.title, SCHEMA_LIMITS.taskTitleMax),
      clientId: task.clientId,
      clientName: cleanText(task.clientName, SCHEMA_LIMITS.displayNameMax),
      workerId,
      workerName: cleanText(workerName || 'Worker', SCHEMA_LIMITS.displayNameMax),
      amountKes: Math.round(input.amountKes),
      deliveryDays: Math.trunc(input.deliveryDays),
      proposal: cleanText(input.proposal, SCHEMA_LIMITS.proposalMax),
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await pushNotification({
      userId: task.clientId,
      actorId: workerId,
      type: 'bid_received',
      title: 'New Bid Received',
      body: `${workerName} submitted a bid of KES ${Math.round(input.amountKes).toLocaleString('en-KE')} on "${task.title}".`,
      linkRoute: 'received-bids',
    });

    if (auth.currentUser?.email) {
      void dispatchPlatformEmail({
        user: auth.currentUser,
        surface: 'website',
        category: 'bid_assignment_notification',
        recipientEmail: auth.currentUser.email,
        subject: `[SWAS TASKS] Bid Submitted: ${task.title}`,
        bodyText: `Your bid of KES ${Math.round(input.amountKes).toLocaleString(
          'en-KE'
        )} (${Math.trunc(input.deliveryDays)} days) for "${task.title}" has been submitted.`,
      });
    }

    return bidId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `bids/${bidId}`);
  }
}

export async function withdrawBid(bidId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'bids', bidId), {
      status: 'withdrawn',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `bids/${bidId}`);
  }
}

export async function rejectBid(bid: TaskBid, clientId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'bids', bid.id), {
      status: 'rejected',
      updatedAt: serverTimestamp(),
    });
    await pushNotification({
      userId: bid.workerId,
      actorId: clientId,
      type: 'bid_rejected',
      title: 'Bid Not Selected',
      body: `Your bid on "${bid.taskTitle}" was declined by the client.`,
      linkRoute: 'my-bids',
    });
    if (auth.currentUser?.email) {
      void dispatchPlatformEmail({
        user: auth.currentUser,
        surface: 'website',
        category: 'bid_assignment_notification',
        recipientEmail: auth.currentUser.email,
        subject: `[SWAS TASKS] Bid Declined: ${bid.taskTitle}`,
        bodyText: `You declined ${bid.workerName}'s bid on "${bid.taskTitle}".`,
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `bids/${bid.id}`);
  }
}

export async function acceptBidAndCreateAssignment(
  bid: TaskBid,
  clientId: string
): Promise<string> {
  const assignmentId = `asn_${bid.id}`;
  try {
    await runTransaction(db, async (tx) => {
      const bidRef = doc(db, 'bids', bid.id);
      const taskRef = doc(db, 'tasks', bid.taskId);
      const asnRef = doc(db, 'assignments', assignmentId);

      const bidSnap = await tx.get(bidRef);
      const taskSnap = await tx.get(taskRef);

      if (!bidSnap.exists()) throw new Error('Bid no longer exists.');
      if (!taskSnap.exists()) throw new Error('Task no longer exists.');

      const bidData = bidSnap.data() as Omit<TaskBid, 'id'>;
      const taskData = taskSnap.data() as Omit<MarketplaceTask, 'id'>;

      if (bidData.status !== 'pending') {
        throw new Error('Only pending bids can be accepted.');
      }

      tx.update(bidRef, {
        status: 'accepted',
        updatedAt: serverTimestamp(),
      });

      tx.update(taskRef, {
        status: 'in_progress',
        updatedAt: serverTimestamp(),
      });

      tx.set(asnRef, {
        taskId: bid.taskId,
        taskTitle: bidData.taskTitle,
        bidId: bid.id,
        clientId,
        clientName: bidData.clientName,
        workerId: bidData.workerId,
        workerName: bidData.workerName,
        agreedKes: bidData.amountKes,
        deadline: taskData.deadline,
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    await pushNotification({
      userId: bid.workerId,
      actorId: clientId,
      type: 'bid_accepted',
      title: 'Bid Accepted — New Assignment',
      body: `Your bid on "${bid.taskTitle}" (${bid.amountKes.toLocaleString('en-KE')} KES) was accepted.`,
      linkRoute: 'my-assignments',
    });

    if (auth.currentUser?.email) {
      void dispatchPlatformEmail({
        user: auth.currentUser,
        surface: 'website',
        category: 'bid_assignment_notification',
        recipientEmail: auth.currentUser.email,
        subject: `[SWAS TASKS] Assignment Confirmed: ${bid.taskTitle}`,
        bodyText: `You accepted ${bid.workerName}'s bid of KES ${bid.amountKes.toLocaleString(
          'en-KE'
        )} for "${bid.taskTitle}". Assignment ID: ${assignmentId}.`,
      });
    }

    return assignmentId;
  } catch (error) {
    if (error instanceof Error && (error.message.includes('Only pending') || error.message.includes('no longer'))) {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, `assignments/${assignmentId}`);
  }
}

// --- Assignments ---
export function subscribeWorkerAssignments(
  workerId: string,
  onData: (items: TaskAssignment[]) => void
): Unsubscribe {
  const q = query(collection(db, 'assignments'), where('workerId', '==', workerId));
  return onSnapshot(
    q,
    (snap) => {
      onData(
        sortDesc(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<TaskAssignment, 'id'>),
          }))
        )
      );
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'assignments')
  );
}

export function subscribeClientAssignments(
  clientId: string,
  onData: (items: TaskAssignment[]) => void
): Unsubscribe {
  const q = query(collection(db, 'assignments'), where('clientId', '==', clientId));
  return onSnapshot(
    q,
    (snap) => {
      onData(
        sortDesc(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<TaskAssignment, 'id'>),
          }))
        )
      );
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'assignments')
  );
}

export async function submitAssignmentWork(
  assignment: TaskAssignment,
  input: {
    submissionNotes: string;
    submissionUrl?: string;
  }
): Promise<void> {
  const err = validateSubmissionInput(input);
  if (err) throw new Error(err);

  try {
    const payload: Record<string, unknown> = {
      status: 'submitted',
      submissionNotes: cleanText(input.submissionNotes, SCHEMA_LIMITS.submissionNotesMax),
      updatedAt: serverTimestamp(),
    };
    const cleanUrl = cleanText(input.submissionUrl || '', SCHEMA_LIMITS.urlMax);
    if (cleanUrl) {
      payload.submissionUrl = cleanUrl;
    }

    await updateDoc(doc(db, 'assignments', assignment.id), payload);

    await pushNotification({
      userId: assignment.clientId,
      actorId: assignment.workerId,
      type: 'assignment_submitted',
      title: 'Work Submitted for Review',
      body: `${assignment.workerName} submitted work for "${assignment.taskTitle}".`,
      linkRoute: 'active-projects',
    });
    if (auth.currentUser?.email) {
      void dispatchPlatformEmail({
        user: auth.currentUser,
        surface: 'website',
        category: 'bid_assignment_notification',
        recipientEmail: auth.currentUser.email,
        subject: `[SWAS TASKS] Deliverable Submitted: ${assignment.taskTitle}`,
        bodyText: `Your deliverable for "${assignment.taskTitle}" has been submitted for client review.`,
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `assignments/${assignment.id}`);
  }
}

export async function requestAssignmentRevision(
  assignment: TaskAssignment,
  feedback: string
): Promise<void> {
  const cleanFeedback = cleanText(feedback, SCHEMA_LIMITS.feedbackMax);
  if (cleanFeedback.length < 5) {
    throw new Error('Provide clear revision instructions (at least 5 characters).');
  }
  try {
    await updateDoc(doc(db, 'assignments', assignment.id), {
      status: 'revision_requested',
      clientFeedback: cleanFeedback,
      updatedAt: serverTimestamp(),
    });

    await pushNotification({
      userId: assignment.workerId,
      actorId: assignment.clientId,
      type: 'revision_requested',
      title: 'Revision Requested',
      body: `Client requested changes on "${assignment.taskTitle}": ${cleanFeedback}`,
      linkRoute: 'my-assignments',
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `assignments/${assignment.id}`);
  }
}

export async function approveAssignmentWork(
  assignment: TaskAssignment,
  feedback?: string
): Promise<void> {
  const cleanFeedback = cleanText(feedback || 'Approved and verified.', SCHEMA_LIMITS.feedbackMax);
  try {
    await runTransaction(db, async (tx) => {
      const asnRef = doc(db, 'assignments', assignment.id);
      const taskRef = doc(db, 'tasks', assignment.taskId);
      const payTxRef = doc(db, 'transactions', `pay_${assignment.id}`);
      const earnTxRef = doc(db, 'transactions', `earn_${assignment.id}`);

      const asnSnap = await tx.get(asnRef);
      if (!asnSnap.exists()) throw new Error('Assignment not found.');
      const asnData = asnSnap.data() as Omit<TaskAssignment, 'id'>;
      if (asnData.status !== 'submitted') {
        throw new Error('Only submitted assignments can be approved.');
      }

      tx.update(asnRef, {
        status: 'completed',
        clientFeedback: cleanFeedback,
        updatedAt: serverTimestamp(),
      });

      tx.update(taskRef, {
        status: 'completed',
        updatedAt: serverTimestamp(),
      });

      tx.set(payTxRef, {
        userId: assignment.clientId,
        counterpartyId: assignment.workerId,
        assignmentId: assignment.id,
        taskTitle: assignment.taskTitle,
        kind: 'payment',
        amountKes: assignment.agreedKes,
        status: 'pending_confirmation',
        reference: `ASN-${assignment.id.slice(-8).toUpperCase()}`,
        createdAt: serverTimestamp(),
      });

      tx.set(earnTxRef, {
        userId: assignment.workerId,
        counterpartyId: assignment.clientId,
        assignmentId: assignment.id,
        taskTitle: assignment.taskTitle,
        kind: 'earning',
        amountKes: assignment.agreedKes,
        status: 'pending_confirmation',
        reference: `ASN-${assignment.id.slice(-8).toUpperCase()}`,
        createdAt: serverTimestamp(),
      });
    });

    await pushNotification({
      userId: assignment.workerId,
      actorId: assignment.clientId,
      type: 'work_approved',
      title: 'Work Approved — Pending Settlement',
      body: `"${assignment.taskTitle}" was approved. KES ${assignment.agreedKes.toLocaleString('en-KE')} added to pending balance awaiting provider confirmation.`,
      linkRoute: 'wallet',
    });
    if (auth.currentUser?.email) {
      void dispatchPlatformEmail({
        user: auth.currentUser,
        surface: 'website',
        category: 'payment_notification',
        recipientEmail: auth.currentUser.email,
        subject: `[SWAS TASKS] Work Approved & Payment Logged: ${assignment.taskTitle}`,
        bodyText: `You approved deliverable work for "${assignment.taskTitle}". KES ${assignment.agreedKes.toLocaleString(
          'en-KE'
        )} has been logged in the ledger as pending settlement confirmation.`,
      });
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('Only submitted')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.UPDATE, `assignments/${assignment.id}`);
  }
}

// --- Saved Tasks ---
export function subscribeSavedTasks(
  workerId: string,
  onData: (items: SavedTaskItem[]) => void
): Unsubscribe {
  const q = query(collection(db, 'savedTasks'), where('workerId', '==', workerId));
  return onSnapshot(
    q,
    (snap) => {
      onData(
        sortDesc(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<SavedTaskItem, 'id'>),
          }))
        )
      );
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'savedTasks')
  );
}

export async function toggleSavedTask(
  workerId: string,
  task: MarketplaceTask,
  currentlySaved: boolean
): Promise<void> {
  const savedId = `${workerId}_${task.id}`;
  try {
    if (currentlySaved) {
      await deleteDoc(doc(db, 'savedTasks', savedId));
    } else {
      await setDoc(doc(db, 'savedTasks', savedId), {
        workerId,
        taskId: task.id,
        taskTitle: cleanText(task.title, SCHEMA_LIMITS.taskTitleMax),
        category: task.category,
        budgetKes: task.budgetKes,
        deadline: task.deadline,
        clientName: cleanText(task.clientName, SCHEMA_LIMITS.displayNameMax),
        createdAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `savedTasks/${savedId}`);
  }
}

// --- Conversations & Messages ---
export function buildConversationId(uidA: string, uidB: string): string {
  const sorted = [uidA, uidB].sort();
  return `conv_${sorted[0]}_${sorted[1]}`;
}

export function subscribeConversations(
  uid: string,
  onData: (items: Conversation[]) => void
): Unsubscribe {
  const q = query(collection(db, 'conversations'), where('participants', 'array-contains', uid));
  return onSnapshot(
    q,
    (snap) => {
      onData(
        sortUpdatedDesc(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<Conversation, 'id'>),
          }))
        )
      );
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'conversations')
  );
}

export function subscribeMessages(
  conversationId: string,
  uid: string,
  onData: (items: ChatMessage[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'conversations', conversationId, 'messages'),
    where('participants', 'array-contains', uid)
  );
  return onSnapshot(
    q,
    (snap) => {
      onData(
        sortAsc(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<ChatMessage, 'id'>),
          }))
        )
      );
    },
    (error) =>
      handleFirestoreError(error, OperationType.LIST, `conversations/${conversationId}/messages`)
  );
}

export async function openOrCreateConversation(params: {
  senderId: string;
  senderName: string;
  recipientId: string;
  recipientName: string;
  taskId?: string;
  taskTitle?: string;
}): Promise<string> {
  const convId = buildConversationId(params.senderId, params.recipientId);
  const convRef = doc(db, 'conversations', convId);
  const participants = [params.senderId, params.recipientId].sort();

  try {
    const snap = await getDoc(convRef);
    if (!snap.exists()) {
      const payload: Record<string, unknown> = {
        participants,
        participantNames: {
          [params.senderId]: cleanText(params.senderName, SCHEMA_LIMITS.displayNameMax),
          [params.recipientId]: cleanText(params.recipientName, SCHEMA_LIMITS.displayNameMax),
        },
        lastMessage: 'Conversation started',
        lastSenderId: params.senderId,
        unreadBy: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (params.taskId) payload.taskId = params.taskId;
      if (params.taskTitle) payload.taskTitle = cleanText(params.taskTitle, SCHEMA_LIMITS.taskTitleMax);
      await setDoc(convRef, payload);
    }
    return convId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `conversations/${convId}`);
  }
}

export async function sendChatMessage(params: {
  conversation: Conversation;
  senderId: string;
  senderName: string;
  text: string;
  attachmentUrl?: string;
}): Promise<void> {
  const cleanMsg = cleanText(params.text, SCHEMA_LIMITS.messageMax);
  const cleanUrl = cleanText(params.attachmentUrl || '', SCHEMA_LIMITS.urlMax);
  if (!cleanMsg) throw new Error('Message cannot be empty.');
  if (cleanUrl && !/^https?:\/\/.+/i.test(cleanUrl)) {
    throw new Error('Attachment link must start with http:// or https://.');
  }

  const msgId = generateDocId('msg');
  const convRef = doc(db, 'conversations', params.conversation.id);
  const msgRef = doc(db, 'conversations', params.conversation.id, 'messages', msgId);
  const otherId = params.conversation.participants.find((id) => id !== params.senderId);

  try {
    const batch = writeBatch(db);
    const msgPayload: Record<string, unknown> = {
      conversationId: params.conversation.id,
      participants: params.conversation.participants,
      senderId: params.senderId,
      senderName: cleanText(params.senderName, SCHEMA_LIMITS.displayNameMax),
      text: cleanMsg,
      createdAt: serverTimestamp(),
    };
    if (cleanUrl) msgPayload.attachmentUrl = cleanUrl;

    batch.set(msgRef, msgPayload);
    batch.update(convRef, {
      lastMessage: cleanMsg.slice(0, 280),
      lastSenderId: params.senderId,
      unreadBy: otherId ? [otherId] : [],
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.WRITE,
      `conversations/${params.conversation.id}/messages/${msgId}`
    );
  }
}

export async function markConversationRead(
  conversation: Conversation,
  uid: string
): Promise<void> {
  if (!conversation.unreadBy.includes(uid)) return;
  try {
    await updateDoc(doc(db, 'conversations', conversation.id), {
      lastMessage: conversation.lastMessage,
      lastSenderId: conversation.lastSenderId,
      unreadBy: conversation.unreadBy.filter((id) => id !== uid),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `conversations/${conversation.id}`);
  }
}

// --- Finance: Wallet, Transactions, Withdrawals ---
export function subscribeWallet(
  userId: string,
  onData: (wallet: WalletAccount | null) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, 'wallets', userId),
    (snap) => onData(snap.exists() ? (snap.data() as WalletAccount) : null),
    (error) => handleFirestoreError(error, OperationType.GET, `wallets/${userId}`)
  );
}

export function subscribeTransactions(
  userId: string,
  onData: (items: LedgerTransaction[]) => void
): Unsubscribe {
  const q = query(collection(db, 'transactions'), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snap) => {
      onData(
        sortDesc(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<LedgerTransaction, 'id'>),
          }))
        )
      );
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'transactions')
  );
}

export function subscribeWithdrawals(
  userId: string,
  onData: (items: WithdrawalRequest[]) => void
): Unsubscribe {
  const q = query(collection(db, 'withdrawals'), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snap) => {
      onData(
        sortDesc(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<WithdrawalRequest, 'id'>),
          }))
        )
      );
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'withdrawals')
  );
}

export async function submitWithdrawalRequest(params: {
  userId: string;
  availableKes: number;
  amountKes: number;
  method: 'M-Pesa' | 'Bank Transfer';
  destination: string;
}): Promise<string> {
  const amt = Math.round(params.amountKes);
  const dest = cleanText(params.destination, 120);
  if (!Number.isFinite(amt) || amt < 50) {
    throw new Error('Minimum withdrawal amount is KES 50.');
  }
  if (amt > params.availableKes) {
    throw new Error(
      'Insufficient verified available balance. Funds require backend payment-provider settlement before withdrawal.'
    );
  }
  if (dest.length < 4) {
    throw new Error('Enter a valid M-Pesa number or bank account reference.');
  }

  const id = generateDocId('wd');
  try {
    await setDoc(doc(db, 'withdrawals', id), {
      userId: params.userId,
      amountKes: amt,
      method: params.method,
      destination: dest,
      status: 'requested',
      createdAt: serverTimestamp(),
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `withdrawals/${id}`);
  }
}

// --- Support Tickets ---
export function subscribeSupportTickets(
  userId: string,
  onData: (items: SupportTicket[]) => void
): Unsubscribe {
  const q = query(collection(db, 'supportTickets'), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snap) => {
      onData(
        sortDesc(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<SupportTicket, 'id'>),
          }))
        )
      );
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'supportTickets')
  );
}

export async function createSupportTicket(params: {
  userId: string;
  senderName: string;
  category: SupportCategory;
  subject: string;
  message: string;
}): Promise<string> {
  const err = validateSupportInput(params.subject, params.message);
  if (err) throw new Error(err);

  const id = generateDocId('tkt');
  try {
    await setDoc(doc(db, 'supportTickets', id), {
      userId: params.userId,
      senderName: cleanText(params.senderName, SCHEMA_LIMITS.displayNameMax),
      category: params.category,
      subject: cleanText(params.subject, SCHEMA_LIMITS.supportSubjectMax),
      message: cleanText(params.message, SCHEMA_LIMITS.supportMessageMax),
      status: 'open',
      createdAt: serverTimestamp(),
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `supportTickets/${id}`);
  }
}

export type { UserPrivate };
