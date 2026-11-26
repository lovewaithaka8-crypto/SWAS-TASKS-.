import type { Express, NextFunction, Request, Response } from 'express';
import { type DecodedIdToken } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';
import {
  adminAuth,
  adminDb,
  checkAdminFirestoreHealth,
  isPermissionDeniedError,
} from '../lib/firebaseAdmin';
import { sendOperationalEmailBestEffort } from '../lib/emailDispatch';
import { getAutoApprovalConfig, runScheduledMaintenanceSweep } from '../cron/reviewEngine';

const DEFAULT_SUPER_ADMIN_EMAIL = 'lovewaithaka8@gmail.com';

interface OpRequest extends Request {
  authToken?: DecodedIdToken;
  userDoc?: Record<string, unknown>;
}

function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function isTokenSuperAdmin(decoded?: DecodedIdToken): boolean {
  if (!decoded || decoded.email_verified !== true || !decoded.email) return false;
  const emailLower = decoded.email.trim().toLowerCase();
  const extraAdmins = (process.env.SUPER_ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return emailLower === DEFAULT_SUPER_ADMIN_EMAIL || extraAdmins.includes(emailLower);
}

async function isTrustedAdmin(decoded?: DecodedIdToken): Promise<boolean> {
  if (isTokenSuperAdmin(decoded)) return true;
  if (!decoded?.uid || decoded.email_verified !== true) return false;
  try {
    const adminSnap = await adminDb.collection('admins').doc(decoded.uid).get();
    return adminSnap.exists;
  } catch {
    return false;
  }
}

function handleRouteError(res: Response, err: unknown, fallbackMessage: string) {
  if (isPermissionDeniedError(err)) {
    res.status(503).json({
      ok: false,
      code: 'FIREBASE_ADMIN_IAM_REQUIRED',
      error:
        'Backend Firebase Admin SDK lacks Firestore permissions on the target project (swas-tasks-control-centre). Grant Cloud Datastore User (roles/datastore.user) to the runtime service account.',
      detail: err instanceof Error ? err.message : String(err),
    });
    return;
  }
  const msg = err instanceof Error ? err.message : fallbackMessage;
  res.status(400).json({ ok: false, error: msg });
}

async function requireAuth(req: OpRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing Authorization Bearer token.' });
    return;
  }
  const token = authHeader.slice(7).trim();
  if (!token) {
    res.status(401).json({ error: 'Empty Authorization token.' });
    return;
  }
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    req.authToken = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired Firebase ID token.' });
  }
}

async function requireVerified(req: OpRequest, res: Response, next: NextFunction) {
  await requireAuth(req, res, () => {
    if (req.authToken?.email_verified !== true) {
      res.status(403).json({ error: 'Verified email address is required.' });
      return;
    }
    next();
  });
}

async function requireAdmin(req: OpRequest, res: Response, next: NextFunction) {
  await requireVerified(req, res, async () => {
    const allowed = await isTrustedAdmin(req.authToken);
    if (!allowed) {
      res.status(403).json({ error: 'Administrator privileges required.' });
      return;
    }
    next();
  });
}

async function requireActiveUser(req: OpRequest, res: Response, next: NextFunction) {
  await requireVerified(req, res, async () => {
    try {
      const uid = req.authToken!.uid;
      const snap = await adminDb.collection('users').doc(uid).get();
      if (!snap.exists) {
        res.status(403).json({ error: 'Complete registration profile before accessing workspace operations.' });
        return;
      }
      const userData = snap.data()!;
      const adminUser = await isTrustedAdmin(req.authToken);
      const status = String(userData.accountStatus || 'ACTIVE');
      if (!adminUser && status !== 'ACTIVE') {
        res.status(403).json({
          code: 'ACCOUNT_NOT_ACTIVE',
          accountStatus: status,
          error: `Account status "${status}" cannot perform this action until approved and activated by an administrator.`,
        });
        return;
      }
      req.userDoc = userData;
      next();
    } catch (err) {
      handleRouteError(res, err, 'Unable to verify account status.');
    }
  });
}

function csvEscape(value: unknown): string {
  const str = String(value ?? '');
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(headers: string[], rows: Record<string, unknown>[]): string {
  const lines = [headers.map(csvEscape).join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(','));
  }
  return lines.join('\n');
}

export function registerOperationalRoutes(app: Express) {
  // 1. Firebase Health & Diagnostics
  app.get('/api/admin/firebase/health', requireAdmin, async (_req: OpRequest, res: Response) => {
    const health = await checkAdminFirestoreHealth();
    res.json(health);
  });

  // 2. Registration Profile + Atomic Username Reservation + Application Queue
  app.post('/api/auth/register-profile', requireAuth, async (req: OpRequest, res: Response) => {
    try {
      const uid = req.authToken!.uid;
      const email = String(req.authToken!.email || '').trim();
      const emailVerified = req.authToken!.email_verified === true;
      const body = (req.body || {}) as {
        role?: string;
        displayName?: string;
        username?: string;
        phone?: string;
        country?: string;
        businessName?: string;
        referralCode?: string;
      };

      const role = body.role === 'client' ? 'client' : 'worker';
      const displayName = String(body.displayName || req.authToken!.name || email.split('@')[0] || 'SWAS Member')
        .trim()
        .slice(0, 80);
      const username = String(body.username || '')
        .trim()
        .toLowerCase()
        .replace(/^@+/, '');
      const phone = String(body.phone || '').trim().slice(0, 24);
      const country = String(body.country || 'KE').trim().toUpperCase().slice(0, 12);
      const businessName = String(body.businessName || '').trim().slice(0, 100);
      const referralCodeInput = String(body.referralCode || '').trim().slice(0, 32);

      if (displayName.length < 2) {
        res.status(400).json({ error: 'Full name must be at least 2 characters.' });
        return;
      }
      if (!/^[a-z0-9_]{3,30}$/.test(username)) {
        res.status(400).json({ error: 'Username must be 3–30 lowercase letters, numbers, or underscores.' });
        return;
      }

      const nowMs = Date.now();
      const adminUser = await isTrustedAdmin(req.authToken);
      const initialStatus = adminUser
        ? 'ACTIVE'
        : emailVerified
          ? 'PENDING_ADMIN_APPROVAL'
          : 'EMAIL_VERIFICATION_PENDING';

      const myRefCode = `SWAS${uid.slice(0, 6).toUpperCase()}`;

      await adminDb.runTransaction(async (tx) => {
        const userRef = adminDb.collection('users').doc(uid);
        const existingUser = await tx.get(userRef);
        if (existingUser.exists) return;

        const unameRef = adminDb.collection('usernames').doc(username);
        const unameSnap = await tx.get(unameRef);
        if (unameSnap.exists && unameSnap.data()?.uid !== uid) {
          throw new Error(`Username "@${username}" is already taken.`);
        }

        tx.set(unameRef, {
          uid,
          username,
          createdAt: FieldValue.serverTimestamp(),
        });

        const userPayload: Record<string, unknown> = {
          uid,
          email,
          displayName,
          username,
          role,
          accountStatus: initialStatus,
          statusReason: adminUser
            ? 'Super Administrator'
            : emailVerified
              ? 'Email verified; awaiting administrator approval.'
              : 'Email verification required before administrator review.',
          emailVerified,
          phone,
          phoneVerified: false,
          country,
          preferredCurrency: country === 'KE' ? 'KES' : 'USD',
          referralCode: myRefCode,
          notifyBids: true,
          notifyMessages: true,
          notifyPayments: true,
          publicProfileVisible: true,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        };
        if (role === 'client' && businessName) {
          userPayload.businessName = businessName;
        }
        if (referralCodeInput) {
          userPayload.referredBy = referralCodeInput;
        }

        tx.set(userRef, userPayload);
        tx.set(adminDb.collection('publicProfiles').doc(uid), {
          uid,
          displayName,
          username,
          role,
          ...(role === 'client' && businessName ? { businessName } : {}),
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        tx.set(adminDb.collection('wallets').doc(uid), {
          userId: uid,
          currency: 'KES',
          availableKes: 0,
          availableBalance: 0,
          pendingEarnings: 0,
          totalEarned: 0,
          totalWithdrawn: 0,
          reservedWithdrawalFunds: 0,
          balancesByCurrency: { KES: 0 },
          updatedAt: FieldValue.serverTimestamp(),
        });
        tx.set(adminDb.collection('accountApplications').doc(uid), {
          userId: uid,
          email,
          displayName,
          username,
          phone,
          country,
          role,
          accountStatus: initialStatus,
          statusReason: userPayload.statusReason,
          createdAtMs: nowMs,
          updatedAtMs: nowMs,
        });
        tx.set(adminDb.collection('securityEvents').doc(makeId('sec')), {
          userId: uid,
          eventType: 'USER_REGISTERED',
          severity: 'info',
          description: `Account registered as ${role} (${initialStatus}).`,
          createdAtMs: nowMs,
        });
      });

      res.json({ ok: true, accountStatus: initialStatus });
    } catch (err) {
      handleRouteError(res, err, 'Failed to register profile.');
    }
  });

  app.post('/api/auth/sync-verification', requireVerified, async (req: OpRequest, res: Response) => {
    try {
      const uid = req.authToken!.uid;
      const nowMs = Date.now();
      const userRef = adminDb.collection('users').doc(uid);
      const snap = await userRef.get();
      if (!snap.exists) {
        res.json({ ok: true, synced: false });
        return;
      }
      const data = snap.data()!;
      const curStatus = String(data.accountStatus || '');
      const updates: Record<string, unknown> = {
        emailVerified: true,
        lastLoginAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      let nextStatus = curStatus;
      if (curStatus === 'REGISTERED' || curStatus === 'EMAIL_VERIFICATION_PENDING') {
        nextStatus = (await isTrustedAdmin(req.authToken)) ? 'ACTIVE' : 'PENDING_ADMIN_APPROVAL';
        updates.accountStatus = nextStatus;
        updates.statusReason =
          nextStatus === 'ACTIVE'
            ? 'Verified Administrator'
            : 'Email verified; queued for administrator approval.';
      }
      await userRef.update(updates);
      await adminDb
        .collection('accountApplications')
        .doc(uid)
        .set(
          {
            accountStatus: nextStatus,
            statusReason: updates.statusReason || data.statusReason || '',
            updatedAtMs: nowMs,
          },
          { merge: true }
        );
      res.json({ ok: true, accountStatus: nextStatus });
    } catch (err) {
      handleRouteError(res, err, 'Failed to sync verification state.');
    }
  });

  // 3. Admin Users & Account Approval Workflow
  app.get('/api/admin/users', requireAdmin, async (_req: OpRequest, res: Response) => {
    try {
      const [usersSnap, appsSnap, walletsSnap] = await Promise.all([
        adminDb.collection('users').get(),
        adminDb.collection('accountApplications').get(),
        adminDb.collection('wallets').get(),
      ]);
      const users = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const applications = appsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const wallets = walletsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      res.json({ ok: true, users, applications, wallets });
    } catch (err) {
      handleRouteError(res, err, 'Failed to load user records.');
    }
  });

  app.post('/api/admin/users/:uid/status', requireAdmin, async (req: OpRequest, res: Response) => {
    try {
      const targetUid = String(req.params.uid || '').trim();
      const body = (req.body || {}) as {
        status?: string;
        reason?: string;
      };
      const nextStatus = String(body.status || '').trim().toUpperCase();
      const reason = String(body.reason || '').trim().slice(0, 400);
      const allowed = new Set([
        'ACTIVE',
        'REJECTED',
        'SUSPENDED',
        'RESTRICTED',
        'PENDING_ADMIN_APPROVAL',
        'CLOSED',
      ]);
      if (!targetUid || !allowed.has(nextStatus)) {
        res.status(400).json({ error: 'Valid target user ID and accountStatus are required.' });
        return;
      }
      if (!reason && nextStatus !== 'ACTIVE') {
        res.status(400).json({ error: 'A clear reason is required for rejections, holds, restrictions, or suspensions.' });
        return;
      }

      const adminUid = req.authToken!.uid;
      const nowMs = Date.now();
      let targetEmail = '';
      let targetName = '';

      await adminDb.runTransaction(async (tx) => {
        const userRef = adminDb.collection('users').doc(targetUid);
        const snap = await tx.get(userRef);
        if (!snap.exists) throw new Error('User record not found.');
        const data = snap.data()!;
        targetEmail = String(data.email || '');
        targetName = String(data.displayName || 'User');

        const patch: Record<string, unknown> = {
          accountStatus: nextStatus,
          statusReason: reason || `Approved and activated by administrator.`,
          updatedAt: FieldValue.serverTimestamp(),
        };
        if (nextStatus === 'ACTIVE') {
          patch.approvedAt = FieldValue.serverTimestamp();
          patch.approvedBy = adminUid;
        } else if (nextStatus === 'REJECTED') {
          patch.rejectedAt = FieldValue.serverTimestamp();
          patch.rejectedBy = adminUid;
        } else if (nextStatus === 'SUSPENDED') {
          patch.suspendedAt = FieldValue.serverTimestamp();
          patch.suspendedBy = adminUid;
          patch.suspendedReason = reason;
        }

        tx.update(userRef, patch);
        tx.set(
          adminDb.collection('accountApplications').doc(targetUid),
          {
            accountStatus: nextStatus,
            statusReason: patch.statusReason,
            reviewedBy: adminUid,
            reviewedAtMs: nowMs,
            updatedAtMs: nowMs,
          },
          { merge: true }
        );
        tx.set(adminDb.collection('notifications').doc(makeId('ntf')), {
          userId: targetUid,
          actorId: adminUid,
          type: 'account_status',
          title: `Account Status Updated: ${nextStatus.replace(/_/g, ' ')}`,
          body: String(patch.statusReason),
          linkRoute: 'dashboard',
          read: false,
          createdAt: FieldValue.serverTimestamp(),
        });
        tx.set(adminDb.collection('auditLogs').doc(makeId('aud')), {
          actorId: adminUid,
          actorEmail: req.authToken!.email || '',
          action: `account_status_${nextStatus.toLowerCase()}`,
          entityType: 'user',
          entityId: targetUid,
          details: `Changed user ${targetEmail} status to ${nextStatus}. Reason: ${patch.statusReason}`,
          createdAtMs: nowMs,
        });
        tx.set(adminDb.collection('securityEvents').doc(makeId('sec')), {
          userId: targetUid,
          eventType: `ACCOUNT_${nextStatus}`,
          severity: nextStatus === 'SUSPENDED' || nextStatus === 'REJECTED' ? 'warning' : 'info',
          description: String(patch.statusReason),
          createdAtMs: nowMs,
        });
      });

      if (targetEmail) {
        void sendOperationalEmailBestEffort({
          to: targetEmail,
          subject: `[SWAS TASKS] Account Status Update: ${nextStatus.replace(/_/g, ' ')}`,
          categoryLabel: 'Account Verification & Activation',
          bodyText: `Hello ${targetName},\n\nYour SWAS TASKS account status has been updated to ${nextStatus}.\nNote: ${reason || 'Your account is now active and approved for workspace participation.'}`,
        });
      }

      res.json({ ok: true, uid: targetUid, accountStatus: nextStatus });
    } catch (err) {
      handleRouteError(res, err, 'Failed to update user account status.');
    }
  });

  // 4. Configurable Task Categories CRUD
  app.post('/api/admin/categories', requireAdmin, async (req: OpRequest, res: Response) => {
    try {
      const body = (req.body || {}) as {
        id?: string;
        name?: string;
        description?: string;
        order?: number;
        enabled?: boolean;
        autoApprovalAllowed?: boolean;
      };
      const name = String(body.name || '').trim().slice(0, 80);
      if (name.length < 2) {
        res.status(400).json({ error: 'Category name must be at least 2 characters.' });
        return;
      }
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 64);
      const id = String(body.id || slug || makeId('cat')).trim();
      const nowMs = Date.now();
      await adminDb
        .collection('taskCategories')
        .doc(id)
        .set(
          {
            name,
            slug: slug || id,
            description: String(body.description || '').trim().slice(0, 300),
            order: Number(body.order ?? 100),
            enabled: body.enabled !== false,
            autoApprovalAllowed: body.autoApprovalAllowed !== false,
            updatedBy: req.authToken!.uid,
            updatedAtMs: nowMs,
            createdAtMs: nowMs,
          },
          { merge: true }
        );
      await adminDb.collection('auditLogs').doc(makeId('aud')).set({
        actorId: req.authToken!.uid,
        actorEmail: req.authToken!.email || '',
        action: 'save_task_category',
        entityType: 'category',
        entityId: id,
        details: `Saved task category "${name}" (enabled=${body.enabled !== false}).`,
        createdAtMs: nowMs,
      });
      res.json({ ok: true, id });
    } catch (err) {
      handleRouteError(res, err, 'Failed to save task category.');
    }
  });

  app.delete('/api/admin/categories/:categoryId', requireAdmin, async (req: OpRequest, res: Response) => {
    try {
      const categoryId = String(req.params.categoryId || '').trim();
      const tasksInCat = await adminDb
        .collection('tasks')
        .where('categoryId', '==', categoryId)
        .limit(1)
        .get();
      if (!tasksInCat.empty) {
        res.status(409).json({
          error: 'Category is referenced by existing tasks. Disable it instead of deleting.',
        });
        return;
      }
      await adminDb.collection('taskCategories').doc(categoryId).delete();
      res.json({ ok: true });
    } catch (err) {
      handleRouteError(res, err, 'Failed to delete task category.');
    }
  });

  // 5. External Task Sources (GWENO HUB & Authorized Partners) + Import
  app.post('/api/admin/task-sources', requireAdmin, async (req: OpRequest, res: Response) => {
    try {
      const body = (req.body || {}) as {
        id?: string;
        name?: string;
        websiteUrl?: string;
        sourceType?: string;
        importMethod?: string;
        enabled?: boolean;
        permissionConfirmed?: boolean;
        redistributionRightsConfirmed?: boolean;
        attributionRequired?: boolean;
        attributionTemplate?: string;
        notes?: string;
      };
      const name = String(body.name || '').trim().slice(0, 100);
      const websiteUrl = String(body.websiteUrl || '').trim().slice(0, 300);
      if (name.length < 2 || !/^https?:\/\/.+/i.test(websiteUrl)) {
        res.status(400).json({ error: 'Valid source name and https:// website URL are required.' });
        return;
      }
      const id = String(body.id || makeId('src')).trim();
      const nowMs = Date.now();
      await adminDb
        .collection('taskSources')
        .doc(id)
        .set(
          {
            name,
            websiteUrl,
            sourceType: body.sourceType === 'GWENO_HUB' ? 'GWENO_HUB' : 'AUTHORIZED_PARTNER',
            importMethod: body.importMethod || 'permitted_manual_entry',
            enabled: body.enabled !== false,
            permissionConfirmed: Boolean(body.permissionConfirmed),
            redistributionRightsConfirmed: Boolean(body.redistributionRightsConfirmed),
            attributionRequired: body.attributionRequired !== false,
            attributionTemplate: String(body.attributionTemplate || `Authorized source: ${name} (${websiteUrl})`).slice(0, 300),
            notes: String(body.notes || '').slice(0, 500),
            updatedBy: req.authToken!.uid,
            updatedAtMs: nowMs,
            createdAtMs: nowMs,
          },
          { merge: true }
        );
      res.json({ ok: true, id });
    } catch (err) {
      handleRouteError(res, err, 'Failed to save task source.');
    }
  });

  app.post('/api/admin/task-sources/import', requireAdmin, async (req: OpRequest, res: Response) => {
    try {
      const body = (req.body || {}) as {
        sourceId?: string;
        sourceName?: string;
        sourceWebsite?: string;
        sourceType?: 'GWENO_HUB' | 'AUTHORIZED_PARTNER';
        sourceTaskId?: string;
        importMethod?: string;
        title?: string;
        description?: string;
        instructions?: string;
        category?: string;
        categoryId?: string;
        sourceRewardOriginal?: number;
        sourceCurrency?: string;
        swasRewardKes?: number;
        maxSlots?: number;
        deadline?: string;
        permissionConfirmed?: boolean;
        redistributionRightsConfirmed?: boolean;
        autoApprovalEligible?: boolean;
        manualReviewOnly?: boolean;
        requiredDeliverables?: string[];
      };

      if (!body.permissionConfirmed || !body.redistributionRightsConfirmed) {
        res.status(400).json({
          error:
            'Explicit authorization and redistribution-rights confirmation are mandatory before importing external or GWENO tasks.',
        });
        return;
      }

      const sourceTaskId = String(body.sourceTaskId || '').trim();
      const title = String(body.title || '').trim().slice(0, 120);
      const description = String(body.description || '').trim().slice(0, 4000);
      const swasRewardKes = Number(body.swasRewardKes || 0);
      const maxSlots = Math.max(1, Math.min(10000, Math.floor(Number(body.maxSlots || 1))));

      if (!sourceTaskId || title.length < 5 || description.length < 15 || swasRewardKes < 50) {
        res.status(400).json({
          error: 'Source Task ID, valid title (5+ chars), description (15+ chars), and SWAS reward (>= 50 KES) are required.',
        });
        return;
      }

      // Duplicate import guard on same sourceTaskId
      const existingDup = await adminDb
        .collection('tasks')
        .where('sourceTaskId', '==', sourceTaskId)
        .limit(1)
        .get();
      if (!existingDup.empty) {
        res.status(409).json({
          error: `Duplicate source task ID "${sourceTaskId}" is already imported as task ${existingDup.docs[0].id}.`,
        });
        return;
      }

      const taskId = makeId('task');
      const importId = makeId('imp');
      const nowMs = Date.now();
      const sourceName = String(body.sourceName || 'GWENO HUB').trim();
      const sourceWebsite = String(body.sourceWebsite || 'https://www.gweno.business/').trim();
      const sourceType = body.sourceType || 'GWENO_HUB';

      await adminDb.runTransaction(async (tx) => {
        tx.set(adminDb.collection('tasks').doc(taskId), {
          clientId: req.authToken!.uid,
          clientName: `SWAS Operations · ${sourceName}`,
          title,
          description,
          instructions: String(body.instructions || description).slice(0, 4000),
          category: String(body.category || 'Online Research').slice(0, 80),
          ...(body.categoryId ? { categoryId: body.categoryId } : {}),
          budgetKes: swasRewardKes,
          deadline: String(body.deadline || new Date(nowMs + 7 * 86400000).toISOString().slice(0, 10)),
          visibility: 'public',
          status: 'open',
          executionMode: 'direct_claim',
          sourceType,
          sourceName,
          sourceWebsite,
          sourceTaskId,
          importMethod: body.importMethod || 'permitted_manual_entry',
          sourceAttribution: `Authorized external assignment from ${sourceName} (${sourceWebsite}) · Ref ${sourceTaskId}`,
          sourceRewardOriginal: Number(body.sourceRewardOriginal || swasRewardKes),
          sourceCurrency: String(body.sourceCurrency || 'KES').toUpperCase(),
          permissionConfirmed: true,
          redistributionRightsConfirmed: true,
          lifecycleStatus: 'PUBLISHED',
          maxSlots,
          claimedCount: 0,
          availableSlots: maxSlots,
          perUserLimit: 1,
          requiredDeliverables: Array.isArray(body.requiredDeliverables)
            ? body.requiredDeliverables.slice(0, 10)
            : ['Written completion summary', 'Supporting deliverable URL or uploaded file'],
          completionDeclarationRequired: true,
          autoApprovalEligible: body.autoApprovalEligible !== false && !body.manualReviewOnly,
          manualReviewOnly: Boolean(body.manualReviewOnly),
          reviewWindowMinutes: 90,
          version: 1,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });

        tx.set(adminDb.collection('taskSourceImports').doc(importId), {
          sourceId: String(body.sourceId || 'gweno_hub'),
          sourceName,
          sourceWebsite,
          sourceTaskId,
          importMethod: body.importMethod || 'permitted_manual_entry',
          importedTaskId: taskId,
          taskTitle: title,
          sourceRewardOriginal: Number(body.sourceRewardOriginal || swasRewardKes),
          sourceCurrency: String(body.sourceCurrency || 'KES').toUpperCase(),
          swasRewardKes,
          permissionConfirmed: true,
          redistributionRightsConfirmed: true,
          importedBy: req.authToken!.uid,
          createdAtMs: nowMs,
        });

        tx.set(adminDb.collection('auditLogs').doc(makeId('aud')), {
          actorId: req.authToken!.uid,
          actorEmail: req.authToken!.email || '',
          action: 'import_external_task',
          entityType: 'task',
          entityId: taskId,
          details: `Imported authorized task "${title}" from ${sourceName} (${sourceTaskId}) at KES ${swasRewardKes}.`,
          createdAtMs: nowMs,
        });
      });

      res.json({ ok: true, taskId, importId });
    } catch (err) {
      handleRouteError(res, err, 'Failed to import external task.');
    }
  });

  // 6. Admin Operational Task CRUD & Lifecycle Management
  app.post('/api/admin/tasks', requireAdmin, async (req: OpRequest, res: Response) => {
    try {
      const body = (req.body || {}) as Record<string, unknown>;
      const title = String(body.title || '').trim().slice(0, 120);
      const description = String(body.description || '').trim().slice(0, 4000);
      const budgetKes = Number(body.budgetKes || 0);
      const maxSlots = Math.max(1, Math.min(10000, Math.floor(Number(body.maxSlots || 1))));
      if (title.length < 5 || description.length < 15 || budgetKes < 50) {
        res.status(400).json({ error: 'Title (5+ chars), description (15+ chars), and reward (>= 50 KES) are required.' });
        return;
      }

      const taskId = makeId('task');
      const nowMs = Date.now();
      const lifecycleStatus = String(body.lifecycleStatus || 'PUBLISHED').toUpperCase();
      const status =
        lifecycleStatus === 'PUBLISHED'
          ? 'open'
          : lifecycleStatus === 'PAUSED' || lifecycleStatus === 'DRAFT' || lifecycleStatus === 'SCHEDULED'
            ? 'paused'
            : 'closed';

      await adminDb.collection('tasks').doc(taskId).set({
        clientId: req.authToken!.uid,
        clientName: 'SWAS TASKS Operations',
        title,
        description,
        instructions: String(body.instructions || description).slice(0, 4000),
        category: String(body.category || 'Writing').slice(0, 80),
        ...(body.categoryId ? { categoryId: String(body.categoryId) } : {}),
        skills: Array.isArray(body.skills) ? body.skills.slice(0, 8) : [],
        budgetKes,
        deadline: String(body.deadline || new Date(nowMs + 7 * 86400000).toISOString().slice(0, 10)),
        visibility: body.visibility === 'invite_only' ? 'invite_only' : 'public',
        status,
        executionMode: 'direct_claim',
        sourceType: 'SWAS_ORIGINAL',
        sourceName: 'SWAS TASKS Original',
        lifecycleStatus,
        maxSlots,
        claimedCount: 0,
        availableSlots: maxSlots,
        perUserLimit: Math.max(1, Math.min(20, Math.floor(Number(body.perUserLimit || 1)))),
        requiredDeliverables: Array.isArray(body.requiredDeliverables)
          ? body.requiredDeliverables.slice(0, 10)
          : ['Completion summary notes', 'Verified deliverable file or link'],
        completionDeclarationRequired: true,
        autoApprovalEligible: body.autoApprovalEligible !== false && !body.manualReviewOnly,
        manualReviewOnly: Boolean(body.manualReviewOnly),
        reviewWindowMinutes: Math.max(5, Math.min(1440, Number(body.reviewWindowMinutes || 90))),
        ...(body.scheduledPublishAt ? { scheduledPublishAt: String(body.scheduledPublishAt) } : {}),
        ...(body.expiresAt ? { expiresAt: String(body.expiresAt) } : {}),
        ...(body.recurringSchedule ? { recurringSchedule: String(body.recurringSchedule) } : {}),
        version: 1,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      await adminDb.collection('taskVersions').doc(makeId('tver')).set({
        taskId,
        version: 1,
        title,
        budgetKes,
        maxSlots,
        deadline: String(body.deadline || ''),
        lifecycleStatus,
        changeNote: 'Initial creation',
        editedBy: req.authToken!.uid,
        createdAtMs: nowMs,
      });

      await adminDb.collection('auditLogs').doc(makeId('aud')).set({
        actorId: req.authToken!.uid,
        actorEmail: req.authToken!.email || '',
        action: 'create_operational_task',
        entityType: 'task',
        entityId: taskId,
        details: `Created task "${title}" (${lifecycleStatus}, ${maxSlots} slots, KES ${budgetKes}).`,
        createdAtMs: nowMs,
      });

      res.json({ ok: true, taskId });
    } catch (err) {
      handleRouteError(res, err, 'Failed to create operational task.');
    }
  });

  app.patch('/api/admin/tasks/:taskId', requireAdmin, async (req: OpRequest, res: Response) => {
    try {
      const taskId = String(req.params.taskId || '').trim();
      const body = (req.body || {}) as Record<string, unknown>;
      const taskRef = adminDb.collection('tasks').doc(taskId);
      const nowMs = Date.now();

      await adminDb.runTransaction(async (tx) => {
        const snap = await tx.get(taskRef);
        if (!snap.exists) throw new Error('Task not found.');
        const existing = snap.data()!;
        const nextVersion = Number(existing.version || 1) + 1;
        const lifecycleStatus = String(body.lifecycleStatus || existing.lifecycleStatus || 'PUBLISHED').toUpperCase();
        const maxSlots = body.maxSlots !== undefined ? Math.max(1, Number(body.maxSlots)) : Number(existing.maxSlots || 1);
        const claimed = Number(existing.claimedCount || 0);
        const availableSlots = Math.max(0, maxSlots - claimed);
        const computedLifecycle =
          lifecycleStatus === 'PUBLISHED' && availableSlots === 0 && existing.executionMode === 'direct_claim'
            ? 'FULL'
            : lifecycleStatus;

        const mappedStatus =
          computedLifecycle === 'PUBLISHED'
            ? 'open'
            : computedLifecycle === 'PAUSED' || computedLifecycle === 'DRAFT' || computedLifecycle === 'SCHEDULED'
              ? 'paused'
              : 'closed';

        const updates: Record<string, unknown> = {
          version: nextVersion,
          lifecycleStatus: computedLifecycle,
          status: mappedStatus,
          maxSlots,
          availableSlots,
          updatedAt: FieldValue.serverTimestamp(),
        };

        if (typeof body.title === 'string' && body.title.trim().length >= 5) {
          updates.title = body.title.trim().slice(0, 120);
        }
        if (typeof body.description === 'string' && body.description.trim().length >= 15) {
          updates.description = body.description.trim().slice(0, 4000);
        }
        if (typeof body.budgetKes === 'number' && body.budgetKes >= 50) {
          updates.budgetKes = body.budgetKes;
        }
        if (typeof body.deadline === 'string' && body.deadline.trim().length >= 4) {
          updates.deadline = body.deadline.trim().slice(0, 32);
        }
        if (typeof body.autoApprovalEligible === 'boolean') {
          updates.autoApprovalEligible = body.autoApprovalEligible;
        }
        if (typeof body.manualReviewOnly === 'boolean') {
          updates.manualReviewOnly = body.manualReviewOnly;
        }

        tx.update(taskRef, updates);
        tx.set(adminDb.collection('taskVersions').doc(makeId('tver')), {
          taskId,
          version: nextVersion,
          title: String(updates.title || existing.title),
          budgetKes: Number(updates.budgetKes || existing.budgetKes),
          maxSlots,
          deadline: String(updates.deadline || existing.deadline),
          lifecycleStatus: computedLifecycle,
          changeNote: String(body.changeNote || 'Admin task update').slice(0, 300),
          editedBy: req.authToken!.uid,
          createdAtMs: nowMs,
        });
        tx.set(adminDb.collection('auditLogs').doc(makeId('aud')), {
          actorId: req.authToken!.uid,
          actorEmail: req.authToken!.email || '',
          action: 'update_operational_task',
          entityType: 'task',
          entityId: taskId,
          details: `Updated task ${taskId} to v${nextVersion} (${computedLifecycle}).`,
          createdAtMs: nowMs,
        });
      });

      res.json({ ok: true, taskId });
    } catch (err) {
      handleRouteError(res, err, 'Failed to update task.');
    }
  });

  // 7. Worker Task Acceptance, Start, Submit, Resubmit (with 90-Minute Review Engine Arming)
  app.post('/api/tasks/:taskId/accept', requireActiveUser, async (req: OpRequest, res: Response) => {
    try {
      const taskId = String(req.params.taskId || '').trim();
      const uid = req.authToken!.uid;
      const userData = req.userDoc!;
      const nowMs = Date.now();
      const reservationId = makeId('res');
      const submissionId = makeId('sub');

      await adminDb.runTransaction(async (tx) => {
        const taskRef = adminDb.collection('tasks').doc(taskId);
        const taskSnap = await tx.get(taskRef);
        if (!taskSnap.exists) throw new Error('Task not found.');
        const task = taskSnap.data()!;

        if (task.status !== 'open' || (task.lifecycleStatus && task.lifecycleStatus !== 'PUBLISHED')) {
          throw new Error('This task is not currently open for claiming.');
        }

        const existingSubs = await tx.get(
          adminDb
            .collection('taskSubmissions')
            .where('taskId', '==', taskId)
            .where('userId', '==', uid)
        );
        const activeOrCompleted = existingSubs.docs.filter((d) => {
          const st = String(d.data().status || '');
          return st !== 'EXPIRED' && st !== 'REJECTED';
        });
        const perUserLimit = Number(task.perUserLimit || 1);
        if (activeOrCompleted.length >= perUserLimit) {
          throw new Error(
            task.sourceType === 'GWENO_HUB'
              ? 'Duplicate participation prevented: you have already claimed or completed this GWENO HUB task.'
              : `You have already reached the participation limit (${perUserLimit}) for this task.`
          );
        }

        const avail = Number(task.availableSlots ?? 1);
        if (avail <= 0) {
          throw new Error('All slots for this task have already been reserved.');
        }

        const nextClaimed = Number(task.claimedCount || 0) + 1;
        const nextAvail = avail - 1;
        tx.update(taskRef, {
          claimedCount: nextClaimed,
          availableSlots: nextAvail,
          lifecycleStatus: nextAvail === 0 ? 'FULL' : 'PUBLISHED',
          status: nextAvail === 0 ? 'paused' : 'open',
          updatedAt: FieldValue.serverTimestamp(),
        });

        const expiresAtMs = nowMs + 24 * 60 * 60 * 1000;
        tx.set(adminDb.collection('taskReservations').doc(reservationId), {
          taskId,
          taskTitle: String(task.title),
          userId: uid,
          userName: String(userData.displayName || 'Worker'),
          sourceType: String(task.sourceType || 'SWAS_ORIGINAL'),
          rewardKes: Number(task.budgetKes || 0),
          status: 'RESERVED',
          reservedAtMs: nowMs,
          expiresAtMs,
          submissionId,
        });

        tx.set(adminDb.collection('taskSubmissions').doc(submissionId), {
          reservationId,
          taskId,
          taskTitle: String(task.title),
          category: String(task.category || 'General'),
          sourceType: String(task.sourceType || 'SWAS_ORIGINAL'),
          sourceName: String(task.sourceName || 'SWAS TASKS Original'),
          userId: uid,
          userName: String(userData.displayName || 'Worker'),
          userEmail: String(userData.email || ''),
          rewardKes: Number(task.budgetKes || 0),
          currency: 'KES',
          status: 'RESERVED',
          version: 1,
          notes: '',
          completionDeclared: false,
          reviewWindowMinutes: Number(task.reviewWindowMinutes || 90),
          autoApprovalEligible: task.autoApprovalEligible !== false && !task.manualReviewOnly,
          manualReviewOnly: Boolean(task.manualReviewOnly),
          onHold: false,
          createdAtMs: nowMs,
          updatedAtMs: nowMs,
        });
      });

      res.json({ ok: true, reservationId, submissionId });
    } catch (err) {
      handleRouteError(res, err, 'Unable to accept task slot.');
    }
  });

  app.post('/api/assignments/:submissionId/start', requireActiveUser, async (req: OpRequest, res: Response) => {
    try {
      const submissionId = String(req.params.submissionId || '').trim();
      const uid = req.authToken!.uid;
      const nowMs = Date.now();
      await adminDb.runTransaction(async (tx) => {
        const subRef = adminDb.collection('taskSubmissions').doc(submissionId);
        const snap = await tx.get(subRef);
        if (!snap.exists) throw new Error('Task assignment not found.');
        const sub = snap.data()!;
        if (sub.userId !== uid) throw new Error('Not authorized for this assignment.');
        if (sub.status !== 'RESERVED' && sub.status !== 'IN_PROGRESS') {
          throw new Error(`Cannot start task from status ${sub.status}.`);
        }
        tx.update(subRef, { status: 'IN_PROGRESS', updatedAtMs: nowMs });
        if (sub.reservationId) {
          tx.update(adminDb.collection('taskReservations').doc(String(sub.reservationId)), {
            status: 'STARTED',
            startedAtMs: nowMs,
          });
        }
      });
      res.json({ ok: true });
    } catch (err) {
      handleRouteError(res, err, 'Unable to start task.');
    }
  });

  app.post('/api/assignments/:submissionId/submit', requireActiveUser, async (req: OpRequest, res: Response) => {
    try {
      const submissionId = String(req.params.submissionId || '').trim();
      const uid = req.authToken!.uid;
      const body = (req.body || {}) as {
        notes?: string;
        deliverableUrl?: string;
        completionDeclared?: boolean;
        attachments?: Array<{
          fileName: string;
          mimeType: string;
          sizeBytes: number;
          storagePath: string;
          downloadUrl: string;
        }>;
      };

      const notes = String(body.notes || '').trim();
      const deliverableUrl = String(body.deliverableUrl || '').trim();
      if (notes.length < 10 || notes.length > 4000) {
        res.status(400).json({ error: 'Provide detailed completion notes (10–4000 characters).' });
        return;
      }
      if (!body.completionDeclared) {
        res.status(400).json({ error: 'You must confirm the completion declaration before submitting.' });
        return;
      }
      if (deliverableUrl && !/^https?:\/\/.+/i.test(deliverableUrl)) {
        res.status(400).json({ error: 'Deliverable link must begin with http:// or https://.' });
        return;
      }

      const autoCfg = await getAutoApprovalConfig();
      const nowMs = Date.now();
      let reviewDeadlineAtMs = 0;

      await adminDb.runTransaction(async (tx) => {
        const subRef = adminDb.collection('taskSubmissions').doc(submissionId);
        const snap = await tx.get(subRef);
        if (!snap.exists) throw new Error('Assignment submission record not found.');
        const sub = snap.data()!;
        if (sub.userId !== uid) throw new Error('Not authorized to submit for this assignment.');
        if (sub.status === 'UNDER_REVIEW' || sub.status === 'APPROVED' || sub.status === 'AUTO_APPROVED') {
          throw new Error('Submission is locked while under review or already approved.');
        }

        const windowMins = Number(sub.reviewWindowMinutes || autoCfg.reviewWindowMinutes || 90);
        reviewDeadlineAtMs = nowMs + windowMins * 60 * 1000;
        const nextVersion = sub.status === 'CORRECTION_REQUESTED' ? Number(sub.version || 1) + 1 : Number(sub.version || 1);
        const rewardKes = Number(sub.rewardKes || 0);

        const attachments = Array.isArray(body.attachments) ? body.attachments.slice(0, 5) : [];

        tx.update(subRef, {
          status: 'UNDER_REVIEW',
          version: nextVersion,
          notes,
          deliverableUrl,
          attachments,
          completionDeclared: true,
          submittedAtMs: sub.submittedAtMs || nowMs,
          resubmittedAtMs: sub.status === 'CORRECTION_REQUESTED' ? nowMs : null,
          reviewDeadlineAtMs,
          reviewWindowMinutes: windowMins,
          onHold: false,
          updatedAtMs: nowMs,
        });

        for (const att of attachments) {
          tx.set(adminDb.collection('submissionAttachments').doc(makeId('att')), {
            submissionId,
            userId: uid,
            fileName: String(att.fileName || 'file').slice(0, 140),
            mimeType: String(att.mimeType || 'application/octet-stream').slice(0, 120),
            sizeBytes: Number(att.sizeBytes || 0),
            storagePath: String(att.storagePath || '').slice(0, 300),
            downloadUrl: String(att.downloadUrl || '').slice(0, 600),
            uploadedAtMs: nowMs,
          });
        }

        if (sub.reservationId) {
          tx.update(adminDb.collection('taskReservations').doc(String(sub.reservationId)), {
            status: 'SUBMITTED',
          });
        }

        // Cancel any previous timer version if resubmitting
        if (nextVersion > 1) {
          const oldTimerRef = adminDb.collection('taskApprovalTimers').doc(`timer_${submissionId}_v${nextVersion - 1}`);
          const oldTimerSnap = await tx.get(oldTimerRef);
          if (oldTimerSnap.exists && oldTimerSnap.data()?.status === 'ARMED') {
            tx.update(oldTimerRef, {
              status: 'CANCELLED_SUPERSEDED',
              executedAtMs: nowMs,
              note: `Superseded by resubmission v${nextVersion}.`,
            });
          }
        }

        tx.set(adminDb.collection('taskApprovalTimers').doc(`timer_${submissionId}_v${nextVersion}`), {
          submissionId,
          taskId: String(sub.taskId),
          userId: uid,
          version: nextVersion,
          status: 'ARMED',
          armedAtMs: nowMs,
          dueAtMs: reviewDeadlineAtMs,
        });

        // Reserve pending earnings on initial submit (idempotent per submission)
        const pendingLedgerRef = adminDb.collection('walletLedger').doc(`pending_${submissionId}`);
        const pendingLedgerSnap = await tx.get(pendingLedgerRef);
        if (!pendingLedgerSnap.exists && rewardKes > 0) {
          const walletRef = adminDb.collection('wallets').doc(uid);
          const walletSnap = await tx.get(walletRef);
          const w = walletSnap.exists ? walletSnap.data()! : {};
          const avail = Number(w.availableBalance ?? w.availableKes ?? 0);
          const pendingBefore = Number(w.pendingEarnings ?? 0);
          const reserved = Number(w.reservedWithdrawalFunds ?? 0);
          const pendingAfter = Math.round((pendingBefore + rewardKes) * 100) / 100;
          tx.set(
            walletRef,
            {
              userId: uid,
              currency: 'KES',
              availableKes: avail,
              availableBalance: avail,
              pendingEarnings: pendingAfter,
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
          tx.set(pendingLedgerRef, {
            idempotencyKey: `pending_${submissionId}`,
            userId: uid,
            type: 'PENDING_EARNING',
            amount: rewardKes,
            currency: 'KES',
            balanceBefore: avail,
            balanceAfter: avail,
            pendingBefore,
            pendingAfter,
            reservedBefore: reserved,
            reservedAfter: reserved,
            referenceId: submissionId,
            referenceType: 'submission',
            actorId: uid,
            note: `Pending 90-min review earnings for "${sub.taskTitle}"`,
            createdAtMs: nowMs,
          });
        }

        tx.set(adminDb.collection('auditLogs').doc(makeId('aud')), {
          actorId: uid,
          action: 'submission_under_review',
          entityType: 'submission',
          entityId: submissionId,
          details: `Submitted work v${nextVersion} for "${sub.taskTitle}". 90-min deadline: ${new Date(reviewDeadlineAtMs).toISOString()}`,
          createdAtMs: nowMs,
        });
      });

      res.json({ ok: true, status: 'UNDER_REVIEW', reviewDeadlineAtMs });
    } catch (err) {
      handleRouteError(res, err, 'Failed to submit task work.');
    }
  });

  // 8. Admin Submission Review Centre Actions (Approve, Reject, Correction, Hold, Release Hold)
  app.post('/api/admin/submissions/:submissionId/review', requireAdmin, async (req: OpRequest, res: Response) => {
    try {
      const submissionId = String(req.params.submissionId || '').trim();
      const body = (req.body || {}) as {
        action?: 'approve' | 'reject' | 'request_correction' | 'hold' | 'release_hold';
        reason?: string;
        internalNote?: string;
      };
      const action = body.action;
      const reason = String(body.reason || '').trim().slice(0, 500);
      const internalNote = String(body.internalNote || '').trim().slice(0, 500);
      if (!action) {
        res.status(400).json({ error: 'Review action is required.' });
        return;
      }
      if ((action === 'reject' || action === 'request_correction' || action === 'hold') && reason.length < 3) {
        res.status(400).json({ error: 'Provide a clear reason for rejection, correction request, or hold.' });
        return;
      }

      const adminUid = req.authToken!.uid;
      const nowMs = Date.now();
      type ReviewEmailNotice = { to: string; subject: string; bodyText: string };
      const emailNotice = await adminDb.runTransaction<ReviewEmailNotice | null>(async (tx) => {
        let pendingEmailNotice: ReviewEmailNotice | null = null;
        const subRef = adminDb.collection('taskSubmissions').doc(submissionId);
        const subSnap = await tx.get(subRef);
        if (!subSnap.exists) throw new Error('Submission not found.');
        const sub = subSnap.data()!;
        const userId = String(sub.userId);
        const version = Number(sub.version || 1);
        const timerRef = adminDb.collection('taskApprovalTimers').doc(`timer_${submissionId}_v${version}`);
        const timerSnap = await tx.get(timerRef);
        const walletRef = adminDb.collection('wallets').doc(userId);
        const walletSnap = await tx.get(walletRef);
        const w = walletSnap.exists ? walletSnap.data()! : {};
        const availBefore = Number(w.availableBalance ?? w.availableKes ?? 0);
        const pendingBefore = Number(w.pendingEarnings ?? 0);
        const reservedBefore = Number(w.reservedWithdrawalFunds ?? 0);
        const totalEarnedBefore = Number(w.totalEarned ?? 0);
        const rewardKes = Number(sub.rewardKes || 0);

        if (action === 'approve') {
          if (sub.status === 'APPROVED' || sub.status === 'AUTO_APPROVED') {
            throw new Error('Submission is already approved.');
          }
          const idemKey = `admin_${submissionId}`;
          const existingAuto = await tx.get(adminDb.collection('walletLedger').doc(`auto_${submissionId}`));
          const existingAdmin = await tx.get(adminDb.collection('walletLedger').doc(idemKey));
          if (!existingAuto.exists && !existingAdmin.exists && rewardKes > 0) {
            const availAfter = Math.round((availBefore + rewardKes) * 100) / 100;
            const pendingAfter = Math.max(0, Math.round((pendingBefore - rewardKes) * 100) / 100);
            const totalEarnedAfter = Math.round((totalEarnedBefore + rewardKes) * 100) / 100;
            const curBalances = { ...(w.balancesByCurrency || {}) } as Record<string, number>;
            curBalances.KES = availAfter;

            tx.set(
              walletRef,
              {
                userId,
                currency: 'KES',
                availableKes: availAfter,
                availableBalance: availAfter,
                pendingEarnings: pendingAfter,
                totalEarned: totalEarnedAfter,
                balancesByCurrency: curBalances,
                updatedAt: FieldValue.serverTimestamp(),
              },
              { merge: true }
            );
            tx.set(adminDb.collection('walletLedger').doc(idemKey), {
              idempotencyKey: idemKey,
              userId,
              type: 'TASK_EARNING',
              amount: rewardKes,
              currency: 'KES',
              balanceBefore: availBefore,
              balanceAfter: availAfter,
              pendingBefore,
              pendingAfter,
              reservedBefore,
              reservedAfter: reservedBefore,
              referenceId: submissionId,
              referenceType: 'submission',
              actorId: adminUid,
              note: `Admin approved submission: ${sub.taskTitle}`,
              createdAtMs: nowMs,
            });
            tx.set(adminDb.collection('earnings').doc(`earn_${submissionId}`), {
              userId,
              submissionId,
              taskId: String(sub.taskId),
              taskTitle: String(sub.taskTitle),
              sourceType: String(sub.sourceType || 'SWAS_ORIGINAL'),
              amountKes: rewardKes,
              currency: 'KES',
              decisionType: 'APPROVED',
              decisionReason: reason || 'Approved by Administrator',
              idempotencyKey: idemKey,
              createdAtMs: nowMs,
            });
            tx.set(adminDb.collection('transactions').doc(`tx_adm_${submissionId}`), {
              userId,
              counterpartyId: adminUid,
              assignmentId: submissionId,
              taskTitle: String(sub.taskTitle).slice(0, 120),
              kind: 'earning',
              amountKes: rewardKes,
              currency: 'KES',
              status: 'verified_settled',
              reference: `ADM-${submissionId.slice(-8).toUpperCase()}`,
              provider: 'SWAS_ADMIN_REVIEW',
              auditNote: reason || 'Approved by Administrator',
              createdAt: FieldValue.serverTimestamp(),
            });
          }

          tx.update(subRef, {
            status: 'APPROVED',
            onHold: false,
            decisionReason: reason || 'Approved by Administrator',
            internalNotes: internalNote || sub.internalNotes || '',
            decidedBy: adminUid,
            decidedAtMs: nowMs,
            updatedAtMs: nowMs,
          });
          if (sub.reservationId) {
            tx.update(adminDb.collection('taskReservations').doc(String(sub.reservationId)), {
              status: 'COMPLETED',
            });
          }
          if (timerSnap.exists && timerSnap.data()?.status === 'ARMED') {
            tx.update(timerRef, {
              status: 'CANCELLED_ADMIN_DECISION',
              executedAtMs: nowMs,
              note: 'Manually approved before 90-min deadline.',
            });
          }
          tx.set(adminDb.collection('taskReviews').doc(makeId('rev')), {
            submissionId,
            taskId: String(sub.taskId),
            userId,
            decision: 'APPROVED',
            reason: reason || 'Approved by Administrator',
            internalNote,
            reviewerId: adminUid,
            reviewerEmail: req.authToken!.email || '',
            createdAtMs: nowMs,
          });
          tx.set(adminDb.collection('notifications').doc(makeId('ntf')), {
            userId,
            actorId: adminUid,
            type: 'work_approved',
            title: 'Submission Approved & Credited',
            body: `Your work on "${sub.taskTitle}" was approved and KES ${rewardKes} has been credited to your wallet.`,
            linkRoute: 'wallet',
            read: false,
            createdAt: FieldValue.serverTimestamp(),
          });
          pendingEmailNotice = {
            to: String(sub.userEmail || ''),
            subject: `[SWAS TASKS] Submission Approved (+KES ${rewardKes})`,
            bodyText: `Your submission for "${sub.taskTitle}" was approved by SWAS TASKS Review Team and KES ${rewardKes} is now available in your wallet.`,
          };
        } else if (action === 'reject') {
          const pendingAfter = Math.max(0, Math.round((pendingBefore - rewardKes) * 100) / 100);
          tx.set(
            walletRef,
            {
              pendingEarnings: pendingAfter,
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
          tx.update(subRef, {
            status: 'REJECTED',
            onHold: false,
            rejectionReason: reason,
            decisionReason: reason,
            internalNotes: internalNote || sub.internalNotes || '',
            decidedBy: adminUid,
            decidedAtMs: nowMs,
            updatedAtMs: nowMs,
          });
          if (timerSnap.exists) {
            tx.update(timerRef, {
              status: 'CANCELLED_ADMIN_DECISION',
              executedAtMs: nowMs,
              note: `Rejected: ${reason}`,
            });
          }
          tx.set(adminDb.collection('taskReviews').doc(makeId('rev')), {
            submissionId,
            taskId: String(sub.taskId),
            userId,
            decision: 'REJECTED',
            reason,
            internalNote,
            reviewerId: adminUid,
            reviewerEmail: req.authToken!.email || '',
            createdAtMs: nowMs,
          });
          tx.set(adminDb.collection('notifications').doc(makeId('ntf')), {
            userId,
            actorId: adminUid,
            type: 'revision_requested',
            title: 'Submission Rejected',
            body: `Your submission for "${sub.taskTitle}" was rejected. Reason: ${reason}`,
            linkRoute: 'operational-tasks',
            read: false,
            createdAt: FieldValue.serverTimestamp(),
          });
          pendingEmailNotice = {
            to: String(sub.userEmail || ''),
            subject: `[SWAS TASKS] Submission Review Decision: Rejected`,
            bodyText: `Your submission for "${sub.taskTitle}" was not approved.\nReason: ${reason}`,
          };
        } else if (action === 'request_correction') {
          tx.update(subRef, {
            status: 'CORRECTION_REQUESTED',
            onHold: false,
            correctionReason: reason,
            internalNotes: internalNote || sub.internalNotes || '',
            decidedBy: adminUid,
            updatedAtMs: nowMs,
          });
          if (timerSnap.exists) {
            tx.update(timerRef, {
              status: 'CANCELLED_ADMIN_DECISION',
              executedAtMs: nowMs,
              note: `Correction requested: ${reason}`,
            });
          }
          tx.set(adminDb.collection('taskCorrections').doc(makeId('cor')), {
            submissionId,
            taskId: String(sub.taskId),
            userId,
            versionRequested: version,
            reason,
            requestedBy: adminUid,
            createdAtMs: nowMs,
          });
          tx.set(adminDb.collection('taskReviews').doc(makeId('rev')), {
            submissionId,
            taskId: String(sub.taskId),
            userId,
            decision: 'CORRECTION_REQUESTED',
            reason,
            internalNote,
            reviewerId: adminUid,
            reviewerEmail: req.authToken!.email || '',
            createdAtMs: nowMs,
          });
          tx.set(adminDb.collection('notifications').doc(makeId('ntf')), {
            userId,
            actorId: adminUid,
            type: 'revision_requested',
            title: 'Correction Requested on Your Submission',
            body: `Corrections requested for "${sub.taskTitle}": ${reason}. Resubmit to start a new 90-minute review cycle.`,
            linkRoute: 'operational-tasks',
            read: false,
            createdAt: FieldValue.serverTimestamp(),
          });
          pendingEmailNotice = {
            to: String(sub.userEmail || ''),
            subject: `[SWAS TASKS] Action Required: Correction Requested`,
            bodyText: `Corrections have been requested on your submission for "${sub.taskTitle}".\nNotes: ${reason}\n\nPlease resubmit updated work in your SWAS TASKS workspace.`,
          };
        } else if (action === 'hold') {
          tx.update(subRef, {
            status: 'ON_HOLD',
            onHold: true,
            holdReason: reason,
            internalNotes: internalNote || sub.internalNotes || '',
            updatedAtMs: nowMs,
          });
          if (timerSnap.exists && timerSnap.data()?.status === 'ARMED') {
            tx.update(timerRef, { status: 'PAUSED_ON_HOLD', note: reason });
          }
          tx.set(adminDb.collection('taskReviews').doc(makeId('rev')), {
            submissionId,
            taskId: String(sub.taskId),
            userId,
            decision: 'ON_HOLD',
            reason,
            internalNote,
            reviewerId: adminUid,
            reviewerEmail: req.authToken!.email || '',
            createdAtMs: nowMs,
          });
        } else if (action === 'release_hold') {
          const freshDeadline = nowMs + Number(sub.reviewWindowMinutes || 90) * 60 * 1000;
          tx.update(subRef, {
            status: 'UNDER_REVIEW',
            onHold: false,
            holdReason: '',
            reviewDeadlineAtMs: freshDeadline,
            updatedAtMs: nowMs,
          });
          if (timerSnap.exists) {
            tx.update(timerRef, { status: 'ARMED', dueAtMs: freshDeadline, note: 'Hold released.' });
          }
          tx.set(adminDb.collection('taskReviews').doc(makeId('rev')), {
            submissionId,
            taskId: String(sub.taskId),
            userId,
            decision: 'HOLD_RELEASED',
            reason: reason || 'Hold released by administrator',
            internalNote,
            reviewerId: adminUid,
            reviewerEmail: req.authToken!.email || '',
            createdAtMs: nowMs,
          });
        }

        tx.set(adminDb.collection('auditLogs').doc(makeId('aud')), {
          actorId: adminUid,
          actorEmail: req.authToken!.email || '',
          action: `submission_review_${action}`,
          entityType: 'submission',
          entityId: submissionId,
          details: `Admin performed ${action} on submission ${submissionId}. ${reason}`,
          createdAtMs: nowMs,
        });
        return pendingEmailNotice;
      });

      if (emailNotice?.to) {
        void sendOperationalEmailBestEffort({
          to: emailNotice.to,
          subject: emailNotice.subject,
          categoryLabel: 'Submission Review Update',
          bodyText: emailNotice.bodyText,
        });
      }

      res.json({ ok: true, submissionId, action });
    } catch (err) {
      handleRouteError(res, err, 'Failed to process submission review.');
    }
  });

  // 9. Auto-Approval Settings & Cron Trigger
  app.put('/api/admin/settings/auto-approval', requireAdmin, async (req: OpRequest, res: Response) => {
    try {
      const body = (req.body || {}) as Record<string, unknown>;
      const nowMs = Date.now();
      const payload = {
        enabled: body.enabled !== false,
        reviewWindowMinutes: Math.max(5, Math.min(1440, Number(body.reviewWindowMinutes || 90))),
        excludedCategoryIds: Array.isArray(body.excludedCategoryIds)
          ? body.excludedCategoryIds.slice(0, 50)
          : [],
        excludedSourceTypes: Array.isArray(body.excludedSourceTypes)
          ? body.excludedSourceTypes.slice(0, 10)
          : [],
        maxAutoApproveAmountKes: Math.max(50, Number(body.maxAutoApproveAmountKes || 50000)),
        minAccountAgeDays: Math.max(0, Number(body.minAccountAgeDays || 0)),
        updatedBy: req.authToken!.uid,
        updatedAtMs: nowMs,
      };
      await adminDb.collection('adminSettings').doc('autoApproval').set(payload);
      await adminDb.collection('auditLogs').doc(makeId('aud')).set({
        actorId: req.authToken!.uid,
        actorEmail: req.authToken!.email || '',
        action: 'update_auto_approval_settings',
        entityType: 'adminSettings',
        entityId: 'autoApproval',
        details: `Updated auto-approval settings: enabled=${payload.enabled}, window=${payload.reviewWindowMinutes}m, maxKes=${payload.maxAutoApproveAmountKes}.`,
        createdAtMs: nowMs,
      });
      res.json({ ok: true, settings: payload });
    } catch (err) {
      handleRouteError(res, err, 'Failed to save auto-approval settings.');
    }
  });

  app.post('/api/cron/process-timers', async (req: OpRequest, res: Response) => {
    const cronSecret = (process.env.CRON_SECRET || '').trim();
    const providedSecret = String(req.headers['x-cron-secret'] || '').trim();
    let authorized = Boolean(cronSecret && providedSecret && cronSecret === providedSecret);
    let triggerSource: 'cron_endpoint' | 'manual_admin' = 'cron_endpoint';

    if (!authorized) {
      const authHeader = req.headers.authorization || '';
      if (authHeader.startsWith('Bearer ')) {
        try {
          const decoded = await adminAuth.verifyIdToken(authHeader.slice(7).trim());
          if (await isTrustedAdmin(decoded)) {
            authorized = true;
            triggerSource = 'manual_admin';
          }
        } catch {
          authorized = false;
        }
      }
    }

    if (!authorized) {
      res.status(401).json({ error: 'Unauthorized cron or administrator sweep trigger.' });
      return;
    }

    const summary = await runScheduledMaintenanceSweep(triggerSource);
    res.status(summary.blockedByPermissions ? 503 : 200).json(summary);
  });

  // 10. Atomic Withdrawals (Request -> Reserve -> Admin Review / Paid / Reject-Release)
  app.post('/api/withdrawals/request', requireActiveUser, async (req: OpRequest, res: Response) => {
    try {
      const uid = req.authToken!.uid;
      const body = (req.body || {}) as {
        amount?: number;
        currency?: string;
        feeAmount?: number;
        netAmount?: number;
        institutionId?: string;
        institutionName?: string;
        category?: string;
        method?: string;
        destination?: string;
        maskedDestination?: string;
        country?: string;
        payoutAccountId?: string;
        cryptoAsset?: string;
        cryptoNetwork?: string;
      };

      const amount = Number(body.amount || 0);
      const currency = String(body.currency || 'KES').trim().toUpperCase().slice(0, 8);
      const feeAmount = Math.max(0, Number(body.feeAmount || 0));
      const netAmount = Math.max(0, Number(body.netAmount ?? amount - feeAmount));
      const destination = String(body.destination || '').trim().slice(0, 160);
      if (!Number.isFinite(amount) || amount < 1 || destination.length < 4) {
        res.status(400).json({ error: 'Valid withdrawal amount and destination are required.' });
        return;
      }

      const nowMs = Date.now();
      const withdrawalId = makeId('wd');
      const reference = `SWD-${nowMs.toString(36).toUpperCase()}`;

      await adminDb.runTransaction(async (tx) => {
        const walletRef = adminDb.collection('wallets').doc(uid);
        const walletSnap = await tx.get(walletRef);
        if (!walletSnap.exists) throw new Error('Wallet record not found.');
        const w = walletSnap.data()!;
        const balances = { ...(w.balancesByCurrency || {}) } as Record<string, number>;
        const availForCurrency =
          currency === 'KES'
            ? Number(w.availableBalance ?? w.availableKes ?? 0)
            : Number(balances[currency] ?? 0);

        if (amount > availForCurrency) {
          throw new Error(`Insufficient ${currency} available balance (${availForCurrency}).`);
        }

        const nextCurrencyAvail = Math.round((availForCurrency - amount) * 100) / 100;
        const reservedBefore = Number(w.reservedWithdrawalFunds ?? 0);
        const reservedAfter =
          currency === 'KES'
            ? Math.round((reservedBefore + amount) * 100) / 100
            : reservedBefore;

        balances[currency] = nextCurrencyAvail;
        const nextKesAvail = currency === 'KES' ? nextCurrencyAvail : Number(w.availableKes ?? 0);

        tx.update(walletRef, {
          availableKes: nextKesAvail,
          availableBalance: nextKesAvail,
          reservedWithdrawalFunds: reservedAfter,
          balancesByCurrency: balances,
          updatedAt: FieldValue.serverTimestamp(),
        });

        tx.set(adminDb.collection('withdrawals').doc(withdrawalId), {
          userId: uid,
          amountKes: amount,
          currency,
          feeAmount,
          netAmount,
          method: String(body.method || body.institutionName || 'Payout').slice(0, 80),
          destination,
          country: String(body.country || 'KE').slice(0, 12),
          institutionId: String(body.institutionId || '').slice(0, 64),
          institutionName: String(body.institutionName || '').slice(0, 100),
          category: String(body.category || 'mobile_money'),
          payoutAccountId: String(body.payoutAccountId || ''),
          maskedDestination: String(body.maskedDestination || destination).slice(0, 120),
          reference,
          providerStatus: 'PENDING_ADMIN_APPROVAL',
          idempotencyKey: `wd_${withdrawalId}`,
          ...(body.cryptoAsset ? { cryptoAsset: String(body.cryptoAsset) } : {}),
          ...(body.cryptoNetwork ? { cryptoNetwork: String(body.cryptoNetwork) } : {}),
          status: 'PENDING_ADMIN_APPROVAL',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });

        tx.set(adminDb.collection('walletLedger').doc(`wdres_${withdrawalId}`), {
          idempotencyKey: `wdres_${withdrawalId}`,
          userId: uid,
          type: 'WITHDRAWAL_RESERVATION',
          amount,
          currency,
          balanceBefore: availForCurrency,
          balanceAfter: nextCurrencyAvail,
          pendingBefore: Number(w.pendingEarnings ?? 0),
          pendingAfter: Number(w.pendingEarnings ?? 0),
          reservedBefore,
          reservedAfter,
          referenceId: withdrawalId,
          referenceType: 'withdrawal',
          actorId: uid,
          note: `Reserved funds for withdrawal ${reference} (PENDING_ADMIN_APPROVAL)`,
          createdAtMs: nowMs,
        });

        tx.set(adminDb.collection('transactions').doc(makeId('tx')), {
          userId: uid,
          counterpartyId: uid,
          assignmentId: withdrawalId,
          taskTitle: `Withdrawal · ${body.institutionName || body.method || 'Payout'}`,
          kind: 'withdrawal_request',
          amountKes: amount,
          currency,
          status: 'pending_confirmation',
          reference,
          withdrawalId,
          provider: String(body.institutionName || ''),
          auditNote: 'Reserved pending administrator approval.',
          createdAt: FieldValue.serverTimestamp(),
        });

        tx.set(adminDb.collection('auditLogs').doc(makeId('aud')), {
          actorId: uid,
          action: 'withdrawal_requested',
          entityType: 'withdrawal',
          entityId: withdrawalId,
          details: `Requested ${currency} ${amount} withdrawal (${reference}) — funds reserved.`,
          createdAtMs: nowMs,
        });
      });

      res.json({ ok: true, withdrawalId, reference, status: 'PENDING_ADMIN_APPROVAL' });
    } catch (err) {
      handleRouteError(res, err, 'Unable to submit withdrawal request.');
    }
  });

  app.post('/api/withdrawals/:withdrawalId/cancel', requireActiveUser, async (req: OpRequest, res: Response) => {
    try {
      const withdrawalId = String(req.params.withdrawalId || '').trim();
      const uid = req.authToken!.uid;
      const nowMs = Date.now();

      await adminDb.runTransaction(async (tx) => {
        const wdRef = adminDb.collection('withdrawals').doc(withdrawalId);
        const wdSnap = await tx.get(wdRef);
        if (!wdSnap.exists) throw new Error('Withdrawal request not found.');
        const wd = wdSnap.data()!;
        if (wd.userId !== uid) throw new Error('Not authorized to cancel this withdrawal.');
        if (
          wd.status !== 'PENDING_ADMIN_APPROVAL' &&
          wd.status !== 'requested' &&
          wd.status !== 'pending_verification'
        ) {
          throw new Error('Only pending withdrawal requests can be cancelled.');
        }

        const currency = String(wd.currency || 'KES').toUpperCase();
        const amount = Number(wd.amountKes || 0);
        const walletRef = adminDb.collection('wallets').doc(uid);
        const walletSnap = await tx.get(walletRef);
        const w = walletSnap.exists ? walletSnap.data()! : {};
        const balances = { ...(w.balancesByCurrency || {}) } as Record<string, number>;
        const availBefore =
          currency === 'KES'
            ? Number(w.availableBalance ?? w.availableKes ?? 0)
            : Number(balances[currency] ?? 0);
        const availAfter = Math.round((availBefore + amount) * 100) / 100;
        const reservedBefore = Number(w.reservedWithdrawalFunds ?? 0);
        const reservedAfter =
          currency === 'KES'
            ? Math.max(0, Math.round((reservedBefore - amount) * 100) / 100)
            : reservedBefore;
        balances[currency] = availAfter;

        tx.update(walletRef, {
          availableKes: currency === 'KES' ? availAfter : Number(w.availableKes ?? 0),
          availableBalance: currency === 'KES' ? availAfter : Number(w.availableBalance ?? w.availableKes ?? 0),
          reservedWithdrawalFunds: reservedAfter,
          balancesByCurrency: balances,
          updatedAt: FieldValue.serverTimestamp(),
        });
        tx.update(wdRef, {
          status: 'CANCELLED',
          providerStatus: 'CANCELLED',
          updatedAt: FieldValue.serverTimestamp(),
        });
        tx.set(adminDb.collection('walletLedger').doc(`wdcan_${withdrawalId}`), {
          idempotencyKey: `wdcan_${withdrawalId}`,
          userId: uid,
          type: 'WITHDRAWAL_RELEASE',
          amount,
          currency,
          balanceBefore: availBefore,
          balanceAfter: availAfter,
          pendingBefore: Number(w.pendingEarnings ?? 0),
          pendingAfter: Number(w.pendingEarnings ?? 0),
          reservedBefore,
          reservedAfter,
          referenceId: withdrawalId,
          referenceType: 'withdrawal',
          actorId: uid,
          note: `User cancelled withdrawal ${wd.reference || withdrawalId}; reserved funds released.`,
          createdAtMs: nowMs,
        });
      });

      res.json({ ok: true });
    } catch (err) {
      handleRouteError(res, err, 'Unable to cancel withdrawal request.');
    }
  });

  app.post('/api/admin/withdrawals/:withdrawalId/review', requireAdmin, async (req: OpRequest, res: Response) => {
    try {
      const withdrawalId = String(req.params.withdrawalId || '').trim();
      const body = (req.body || {}) as {
        action?: 'approve_for_payment' | 'mark_processing' | 'mark_paid' | 'reject' | 'hold';
        providerReference?: string;
        txHash?: string;
        reviewNotes?: string;
        rejectionReason?: string;
      };
      const action = body.action;
      if (!action) {
        res.status(400).json({ error: 'Withdrawal review action is required.' });
        return;
      }
      if (action === 'mark_paid' && !String(body.providerReference || body.txHash || '').trim()) {
        res.status(400).json({ error: 'Real provider reference or blockchain txHash is required to mark withdrawal PAID.' });
        return;
      }
      if (action === 'reject' && String(body.rejectionReason || body.reviewNotes || '').trim().length < 3) {
        res.status(400).json({ error: 'Rejection reason is required.' });
        return;
      }

      const adminUid = req.authToken!.uid;
      const nowMs = Date.now();
      type WithdrawalNotifyPayload = { userId: string; status: string; amount: number; currency: string; reason: string };
      const notifyUser = await adminDb.runTransaction<WithdrawalNotifyPayload | null>(async (tx) => {
        const wdRef = adminDb.collection('withdrawals').doc(withdrawalId);
        const wdSnap = await tx.get(wdRef);
        if (!wdSnap.exists) throw new Error('Withdrawal request not found.');
        const wd = wdSnap.data()!;
        const userId = String(wd.userId);
        const currency = String(wd.currency || 'KES').toUpperCase();
        const amount = Number(wd.amountKes || 0);
        const walletRef = adminDb.collection('wallets').doc(userId);
        const walletSnap = await tx.get(walletRef);
        const w = walletSnap.exists ? walletSnap.data()! : {};
        const balances = { ...(w.balancesByCurrency || {}) } as Record<string, number>;
        const availBefore =
          currency === 'KES'
            ? Number(w.availableBalance ?? w.availableKes ?? 0)
            : Number(balances[currency] ?? 0);
        const reservedBefore = Number(w.reservedWithdrawalFunds ?? 0);
        const totalWithdrawnBefore = Number(w.totalWithdrawn ?? 0);

        if (action === 'approve_for_payment') {
          tx.update(wdRef, {
            status: 'APPROVED_FOR_PAYMENT',
            providerStatus: 'APPROVED_FOR_PAYMENT',
            approvedBy: adminUid,
            reviewNotes: String(body.reviewNotes || 'Approved for payment').slice(0, 400),
            updatedAt: FieldValue.serverTimestamp(),
          });
          tx.set(adminDb.collection('walletLedger').doc(`wdapp_${withdrawalId}`), {
            idempotencyKey: `wdapp_${withdrawalId}`,
            userId,
            type: 'WITHDRAWAL_APPROVAL',
            amount,
            currency,
            balanceBefore: availBefore,
            balanceAfter: availBefore,
            pendingBefore: Number(w.pendingEarnings ?? 0),
            pendingAfter: Number(w.pendingEarnings ?? 0),
            reservedBefore,
            reservedAfter: reservedBefore,
            referenceId: withdrawalId,
            referenceType: 'withdrawal',
            actorId: adminUid,
            note: `Approved withdrawal ${wd.reference || withdrawalId} for payment.`,
            createdAtMs: nowMs,
          });
        } else if (action === 'mark_processing') {
          tx.update(wdRef, {
            status: 'PROCESSING',
            providerStatus: 'PROCESSING',
            reviewNotes: String(body.reviewNotes || 'Processing settlement').slice(0, 400),
            updatedAt: FieldValue.serverTimestamp(),
          });
        } else if (action === 'hold') {
          tx.update(wdRef, {
            status: 'ON_HOLD',
            providerStatus: 'ON_HOLD',
            reviewNotes: String(body.reviewNotes || 'Placed on compliance hold').slice(0, 400),
            updatedAt: FieldValue.serverTimestamp(),
          });
        } else if (action === 'mark_paid') {
          const idemKey = `wdpaid_${withdrawalId}`;
          const paidCheck = await tx.get(adminDb.collection('walletLedger').doc(idemKey));
          if (paidCheck.exists) throw new Error('Withdrawal has already been marked paid.');

          const reservedAfter =
            currency === 'KES'
              ? Math.max(0, Math.round((reservedBefore - amount) * 100) / 100)
              : reservedBefore;
          const totalWithdrawnAfter =
            currency === 'KES'
              ? Math.round((totalWithdrawnBefore + amount) * 100) / 100
              : totalWithdrawnBefore;

          tx.update(walletRef, {
            reservedWithdrawalFunds: reservedAfter,
            totalWithdrawn: totalWithdrawnAfter,
            updatedAt: FieldValue.serverTimestamp(),
          });
          tx.update(wdRef, {
            status: 'PAID',
            providerStatus: 'PAID',
            paidBy: adminUid,
            providerReference: String(body.providerReference || '').slice(0, 128),
            txHash: String(body.txHash || '').slice(0, 160),
            reviewNotes: String(body.reviewNotes || 'Paid and settled').slice(0, 400),
            updatedAt: FieldValue.serverTimestamp(),
          });
          tx.set(adminDb.collection('walletLedger').doc(idemKey), {
            idempotencyKey: idemKey,
            userId,
            type: 'WITHDRAWAL_PAID',
            amount,
            currency,
            balanceBefore: availBefore,
            balanceAfter: availBefore,
            pendingBefore: Number(w.pendingEarnings ?? 0),
            pendingAfter: Number(w.pendingEarnings ?? 0),
            reservedBefore,
            reservedAfter,
            referenceId: withdrawalId,
            referenceType: 'withdrawal',
            actorId: adminUid,
            note: `Paid withdrawal ${wd.reference || withdrawalId}. Ref: ${body.providerReference || body.txHash}`,
            createdAtMs: nowMs,
          });
        } else if (action === 'reject') {
          const idemKey = `wdrel_${withdrawalId}`;
          const relCheck = await tx.get(adminDb.collection('walletLedger').doc(idemKey));
          if (relCheck.exists) throw new Error('Withdrawal rejection release already processed.');

          const reason = String(body.rejectionReason || body.reviewNotes || '').slice(0, 400);
          const availAfter = Math.round((availBefore + amount) * 100) / 100;
          const reservedAfter =
            currency === 'KES'
              ? Math.max(0, Math.round((reservedBefore - amount) * 100) / 100)
              : reservedBefore;
          balances[currency] = availAfter;

          tx.update(walletRef, {
            availableKes: currency === 'KES' ? availAfter : Number(w.availableKes ?? 0),
            availableBalance: currency === 'KES' ? availAfter : Number(w.availableBalance ?? w.availableKes ?? 0),
            reservedWithdrawalFunds: reservedAfter,
            balancesByCurrency: balances,
            updatedAt: FieldValue.serverTimestamp(),
          });
          tx.update(wdRef, {
            status: 'REJECTED',
            providerStatus: 'REJECTED',
            rejectionReason: reason,
            reviewNotes: reason,
            updatedAt: FieldValue.serverTimestamp(),
          });
          tx.set(adminDb.collection('walletLedger').doc(idemKey), {
            idempotencyKey: idemKey,
            userId,
            type: 'WITHDRAWAL_RELEASE',
            amount,
            currency,
            balanceBefore: availBefore,
            balanceAfter: availAfter,
            pendingBefore: Number(w.pendingEarnings ?? 0),
            pendingAfter: Number(w.pendingEarnings ?? 0),
            reservedBefore,
            reservedAfter,
            referenceId: withdrawalId,
            referenceType: 'withdrawal',
            actorId: adminUid,
            note: `Withdrawal rejected (${reason}); reserved funds released back to available balance.`,
            createdAtMs: nowMs,
          });
        }

        tx.set(adminDb.collection('auditLogs').doc(makeId('aud')), {
          actorId: adminUid,
          actorEmail: req.authToken!.email || '',
          action: `withdrawal_${action}`,
          entityType: 'withdrawal',
          entityId: withdrawalId,
          details: `Admin ${action} on withdrawal ${withdrawalId} (${currency} ${amount}).`,
          createdAtMs: nowMs,
        });

        return {
          userId,
          status: action.toUpperCase(),
          amount,
          currency,
          reason: String(body.rejectionReason || body.reviewNotes || ''),
        };
      });

      if (notifyUser) {
        const uSnap = await adminDb.collection('users').doc(notifyUser.userId).get();
        const uEmail = uSnap.exists ? String(uSnap.data()?.email || '') : '';
        await adminDb.collection('notifications').doc(makeId('ntf')).set({
          userId: notifyUser.userId,
          actorId: adminUid,
          type: 'withdrawal_update',
          title: `Withdrawal Update (${notifyUser.currency} ${notifyUser.amount})`,
          body: `Your withdrawal request status changed to ${notifyUser.status}. ${notifyUser.reason}`,
          linkRoute: 'withdrawals',
          read: false,
          createdAt: FieldValue.serverTimestamp(),
        });
        if (uEmail) {
          void sendOperationalEmailBestEffort({
            to: uEmail,
            subject: `[SWAS TASKS] Withdrawal Update (${notifyUser.currency} ${notifyUser.amount})`,
            categoryLabel: 'Withdrawal Status Update',
            bodyText: `Your withdrawal of ${notifyUser.currency} ${notifyUser.amount} is now ${notifyUser.status}.\n${notifyUser.reason}`,
          });
        }
      }

      res.json({ ok: true, withdrawalId, action });
    } catch (err) {
      handleRouteError(res, err, 'Failed to process withdrawal review.');
    }
  });

  // 11. Announcements CRUD
  app.post('/api/admin/announcements', requireAdmin, async (req: OpRequest, res: Response) => {
    try {
      const body = (req.body || {}) as {
        id?: string;
        title?: string;
        body?: string;
        audience?: 'all' | 'workers' | 'clients';
        priority?: 'normal' | 'important' | 'critical';
        published?: boolean;
      };
      const title = String(body.title || '').trim().slice(0, 140);
      const text = String(body.body || '').trim().slice(0, 2000);
      if (title.length < 3 || text.length < 5) {
        res.status(400).json({ error: 'Title and message body are required.' });
        return;
      }
      const id = String(body.id || makeId('ann')).trim();
      const nowMs = Date.now();
      await adminDb.collection('announcements').doc(id).set(
        {
          title,
          body: text,
          audience: body.audience || 'all',
          priority: body.priority || 'normal',
          published: body.published !== false,
          publishedBy: req.authToken!.uid,
          updatedAtMs: nowMs,
          createdAtMs: nowMs,
        },
        { merge: true }
      );
      res.json({ ok: true, id });
    } catch (err) {
      handleRouteError(res, err, 'Failed to publish announcement.');
    }
  });

  // 12. Real Reports & CSV Export
  app.get('/api/admin/reports/overview', requireAdmin, async (_req: OpRequest, res: Response) => {
    try {
      const [usersSnap, tasksSnap, subsSnap, ledgerSnap, wdSnap, auditSnap] = await Promise.all([
        adminDb.collection('users').get(),
        adminDb.collection('tasks').get(),
        adminDb.collection('taskSubmissions').get(),
        adminDb.collection('walletLedger').get(),
        adminDb.collection('withdrawals').get(),
        adminDb.collection('auditLogs').get(),
      ]);

      const users = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const tasks = tasksSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const submissions = subsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const ledger = ledgerSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const withdrawals = wdSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const auditLogs = auditSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      res.json({
        ok: true,
        summary: {
          totalUsers: users.length,
          pendingApprovalUsers: users.filter((u: Record<string, unknown>) => u.accountStatus === 'PENDING_ADMIN_APPROVAL').length,
          activeUsers: users.filter((u: Record<string, unknown>) => !u.accountStatus || u.accountStatus === 'ACTIVE').length,
          totalTasks: tasks.length,
          gwenoTasks: tasks.filter((t: Record<string, unknown>) => t.sourceType === 'GWENO_HUB').length,
          totalSubmissions: submissions.length,
          underReviewSubmissions: submissions.filter((s: Record<string, unknown>) => s.status === 'UNDER_REVIEW').length,
          autoApprovedSubmissions: submissions.filter((s: Record<string, unknown>) => s.status === 'AUTO_APPROVED').length,
          pendingWithdrawals: withdrawals.filter((w: Record<string, unknown>) =>
            ['PENDING_ADMIN_APPROVAL', 'requested', 'pending_verification'].includes(String(w.status || ''))
          ).length,
          totalLedgerEntries: ledger.length,
          totalAuditLogs: auditLogs.length,
        },
      });
    } catch (err) {
      handleRouteError(res, err, 'Failed to generate operational report.');
    }
  });

  app.get('/api/admin/reports/export', requireAdmin, async (req: OpRequest, res: Response) => {
    try {
      const reportType = String(req.query.type || 'users').trim().toLowerCase();
      const collectionMap: Record<string, { col: string; headers: string[] }> = {
        users: {
          col: 'users',
          headers: ['id', 'email', 'displayName', 'username', 'role', 'country', 'phone', 'accountStatus', 'statusReason'],
        },
        tasks: {
          col: 'tasks',
          headers: ['id', 'title', 'category', 'sourceType', 'sourceName', 'sourceTaskId', 'budgetKes', 'lifecycleStatus', 'maxSlots', 'availableSlots', 'deadline'],
        },
        submissions: {
          col: 'taskSubmissions',
          headers: ['id', 'taskId', 'taskTitle', 'userId', 'userName', 'sourceType', 'rewardKes', 'status', 'version', 'submittedAtMs', 'reviewDeadlineAtMs', 'decisionReason'],
        },
        auto_approvals: {
          col: 'earnings',
          headers: ['id', 'userId', 'submissionId', 'taskId', 'taskTitle', 'sourceType', 'amountKes', 'decisionType', 'decisionReason', 'createdAtMs'],
        },
        corrections: {
          col: 'taskCorrections',
          headers: ['id', 'submissionId', 'taskId', 'userId', 'versionRequested', 'reason', 'requestedBy', 'createdAtMs'],
        },
        ledger: {
          col: 'walletLedger',
          headers: ['id', 'idempotencyKey', 'userId', 'type', 'amount', 'currency', 'balanceBefore', 'balanceAfter', 'referenceType', 'referenceId', 'note', 'createdAtMs'],
        },
        withdrawals: {
          col: 'withdrawals',
          headers: ['id', 'userId', 'amountKes', 'currency', 'feeAmount', 'netAmount', 'institutionName', 'maskedDestination', 'status', 'reference', 'providerReference', 'rejectionReason'],
        },
        referrals: {
          col: 'referrals',
          headers: ['id', 'referrerUid', 'referredUid', 'referredEmail', 'code', 'status', 'rewardKes', 'createdAtMs'],
        },
        audit_logs: {
          col: 'auditLogs',
          headers: ['id', 'actorId', 'actorEmail', 'action', 'entityType', 'entityId', 'details', 'createdAtMs'],
        },
      };

      const target = collectionMap[reportType] || collectionMap.users;
      const snap = await adminDb.collection(target.col).get();
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }));
      const csv = toCsv(target.headers, rows);

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="swas-${reportType}-report.csv"`);
      res.send(csv);
    } catch (err) {
      handleRouteError(res, err, 'Failed to export CSV report.');
    }
  });
}
