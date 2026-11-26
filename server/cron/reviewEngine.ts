import { FieldValue } from 'firebase-admin/firestore';
import { adminDb, isPermissionDeniedError } from '../lib/firebaseAdmin';
import { sendOperationalEmailBestEffort } from '../lib/emailDispatch';

export interface MaintenanceSweepSummary {
  ok: boolean;
  triggerSource: 'scheduler' | 'cron_endpoint' | 'manual_admin';
  ranAt: string;
  blockedByPermissions: boolean;
  error?: string;
  publishedScheduledTasks: number;
  expiredTasks: number;
  expiredReservations: number;
  timersChecked: number;
  autoApprovedCount: number;
  skippedOrBlockedTimers: number;
}

let sweepInFlight = false;

export async function getAutoApprovalConfig() {
  const snap = await adminDb.collection('adminSettings').doc('autoApproval').get();
  const data = snap.exists ? (snap.data() as Record<string, unknown>) : {};
  return {
    enabled: data.enabled !== false,
    reviewWindowMinutes:
      typeof data.reviewWindowMinutes === 'number' && data.reviewWindowMinutes >= 1
        ? data.reviewWindowMinutes
        : 90,
    excludedCategoryIds: Array.isArray(data.excludedCategoryIds)
      ? (data.excludedCategoryIds as string[])
      : [],
    excludedSourceTypes: Array.isArray(data.excludedSourceTypes)
      ? (data.excludedSourceTypes as string[])
      : [],
    maxAutoApproveAmountKes:
      typeof data.maxAutoApproveAmountKes === 'number' && data.maxAutoApproveAmountKes > 0
        ? data.maxAutoApproveAmountKes
        : 50000,
    minAccountAgeDays:
      typeof data.minAccountAgeDays === 'number' && data.minAccountAgeDays >= 0
        ? data.minAccountAgeDays
        : 0,
  };
}

export async function runScheduledMaintenanceSweep(
  triggerSource: 'scheduler' | 'cron_endpoint' | 'manual_admin'
): Promise<MaintenanceSweepSummary> {
  const ranAt = new Date().toISOString();
  const nowMs = Date.now();

  if (sweepInFlight) {
    return {
      ok: true,
      triggerSource,
      ranAt,
      blockedByPermissions: false,
      publishedScheduledTasks: 0,
      expiredTasks: 0,
      expiredReservations: 0,
      timersChecked: 0,
      autoApprovedCount: 0,
      skippedOrBlockedTimers: 0,
    };
  }

  sweepInFlight = true;
  let publishedScheduledTasks = 0;
  let expiredTasks = 0;
  let expiredReservations = 0;
  let timersChecked = 0;
  let autoApprovedCount = 0;
  let skippedOrBlockedTimers = 0;

  try {
    // 1. Publish scheduled tasks whose scheduledPublishAt <= now
    const scheduledSnap = await adminDb
      .collection('tasks')
      .where('lifecycleStatus', '==', 'SCHEDULED')
      .get();

    for (const taskDoc of scheduledSnap.docs) {
      const data = taskDoc.data();
      const pubMs = data.scheduledPublishAt ? Date.parse(String(data.scheduledPublishAt)) : NaN;
      if (Number.isFinite(pubMs) && pubMs <= nowMs) {
        await taskDoc.ref.update({
          lifecycleStatus: 'PUBLISHED',
          status: 'open',
          updatedAt: FieldValue.serverTimestamp(),
        });
        publishedScheduledTasks++;
      }
    }

    // 2. Expire published tasks whose expiresAt <= now
    const publishedSnap = await adminDb
      .collection('tasks')
      .where('lifecycleStatus', '==', 'PUBLISHED')
      .get();

    for (const taskDoc of publishedSnap.docs) {
      const data = taskDoc.data();
      const expMs = data.expiresAt ? Date.parse(String(data.expiresAt)) : NaN;
      if (Number.isFinite(expMs) && expMs <= nowMs) {
        await taskDoc.ref.update({
          lifecycleStatus: 'EXPIRED',
          status: 'closed',
          updatedAt: FieldValue.serverTimestamp(),
        });
        expiredTasks++;
      }
    }

    // 3. Release expired task slot reservations
    const resSnap = await adminDb
      .collection('taskReservations')
      .where('status', '==', 'RESERVED')
      .get();

    for (const resDoc of resSnap.docs) {
      const rData = resDoc.data();
      if (typeof rData.expiresAtMs === 'number' && rData.expiresAtMs <= nowMs) {
        await adminDb.runTransaction(async (tx) => {
          const freshRes = await tx.get(resDoc.ref);
          if (!freshRes.exists || freshRes.data()?.status !== 'RESERVED') return;
          const taskRef = adminDb.collection('tasks').doc(String(rData.taskId));
          const taskSnap = await tx.get(taskRef);
          tx.update(resDoc.ref, { status: 'EXPIRED', updatedAtMs: nowMs });
          if (rData.submissionId) {
            const subRef = adminDb.collection('taskSubmissions').doc(String(rData.submissionId));
            const subSnap = await tx.get(subRef);
            if (subSnap.exists && subSnap.data()?.status === 'RESERVED') {
              tx.update(subRef, { status: 'EXPIRED', updatedAtMs: nowMs });
            }
          }
          if (taskSnap.exists) {
            const tData = taskSnap.data()!;
            const claimed = Math.max(0, Number(tData.claimedCount || 0) - 1);
            const maxSlots = Number(tData.maxSlots || 1);
            const avail = Math.min(maxSlots, Math.max(0, Number(tData.availableSlots || 0) + 1));
            tx.update(taskRef, {
              claimedCount: claimed,
              availableSlots: avail,
              lifecycleStatus:
                tData.lifecycleStatus === 'FULL' && avail > 0 ? 'PUBLISHED' : tData.lifecycleStatus,
              status: tData.lifecycleStatus === 'FULL' && avail > 0 ? 'open' : tData.status,
              updatedAt: FieldValue.serverTimestamp(),
            });
          }
        });
        expiredReservations++;
      }
    }

    // 4. Process due 90-minute auto-approval timers
    const autoCfg = await getAutoApprovalConfig();
    if (autoCfg.enabled) {
      const armedTimers = await adminDb
        .collection('taskApprovalTimers')
        .where('status', '==', 'ARMED')
        .get();

      for (const timerDoc of armedTimers.docs) {
        const timer = timerDoc.data();
        if (typeof timer.dueAtMs !== 'number' || timer.dueAtMs > nowMs) {
          continue;
        }
        timersChecked++;

        const submissionId = String(timer.submissionId || '');
        const taskId = String(timer.taskId || '');
        const userId = String(timer.userId || '');
        if (!submissionId || !taskId || !userId) {
          skippedOrBlockedTimers++;
          continue;
        }

        type AutoEmailOutcome = { to: string; taskTitle: string; rewardKes: number };
        const txResult = await adminDb.runTransaction<{ executed: boolean; outcomeEmail: AutoEmailOutcome | null }>(async (tx) => {
          const freshTimerSnap = await tx.get(timerDoc.ref);
          if (!freshTimerSnap.exists || freshTimerSnap.data()?.status !== 'ARMED') {
            return { executed: false, outcomeEmail: null };
          }
          const subRef = adminDb.collection('taskSubmissions').doc(submissionId);
          const subSnap = await tx.get(subRef);
          if (!subSnap.exists) {
            tx.update(timerDoc.ref, {
              status: 'CANCELLED_ADMIN_DECISION',
              executedAtMs: nowMs,
              note: 'Submission missing.',
            });
            return { executed: false, outcomeEmail: null };
          }

          const sub = subSnap.data()!;
          if (
            sub.status !== 'UNDER_REVIEW' ||
            Number(sub.version || 1) !== Number(timer.version || 1)
          ) {
            tx.update(timerDoc.ref, {
              status: 'CANCELLED_SUPERSEDED',
              executedAtMs: nowMs,
              note: `Superseded by submission status ${sub.status} v${sub.version}.`,
            });
            return { executed: false, outcomeEmail: null };
          }

          if (sub.onHold === true || sub.manualReviewOnly === true || sub.autoApprovalEligible === false) {
            tx.update(timerDoc.ref, {
              status: 'PAUSED_ON_HOLD',
              note: 'Submission held or restricted to manual review.',
            });
            return { executed: false, outcomeEmail: null };
          }

          const taskSnap = await tx.get(adminDb.collection('tasks').doc(taskId));
          const taskData = taskSnap.exists ? taskSnap.data()! : null;
          if (
            taskData &&
            ((taskData.categoryId && autoCfg.excludedCategoryIds.includes(String(taskData.categoryId))) ||
              (taskData.sourceType && autoCfg.excludedSourceTypes.includes(String(taskData.sourceType))))
          ) {
            tx.update(timerDoc.ref, {
              status: 'PAUSED_ON_HOLD',
              note: 'Excluded category or source requires manual review.',
            });
            return { executed: false, outcomeEmail: null };
          }

          const userSnap = await tx.get(adminDb.collection('users').doc(userId));
          const userData = userSnap.exists ? userSnap.data()! : null;
          if (!userData || (userData.accountStatus && userData.accountStatus !== 'ACTIVE')) {
            tx.update(timerDoc.ref, {
              status: 'BLOCKED_USER_STATUS',
              note: `Account status ${userData?.accountStatus || 'UNKNOWN'} is not ACTIVE.`,
            });
            tx.update(subRef, {
              status: 'ON_HOLD',
              onHold: true,
              holdReason: 'Account status requires administrator verification before settlement.',
              updatedAtMs: nowMs,
            });
            return { executed: false, outcomeEmail: null };
          }

          const rewardKes = Number(sub.rewardKes || 0);
          if (rewardKes <= 0 || rewardKes > autoCfg.maxAutoApproveAmountKes) {
            tx.update(timerDoc.ref, {
              status: 'PAUSED_ON_HOLD',
              note: 'Reward exceeds maximum automatic approval threshold.',
            });
            return { executed: false, outcomeEmail: null };
          }

          // Idempotency guarantee: never credit the same submission twice
          const idemKey = `auto_${submissionId}`;
          const ledgerRef = adminDb.collection('walletLedger').doc(idemKey);
          const existingLedger = await tx.get(ledgerRef);
          if (existingLedger.exists) {
            tx.update(timerDoc.ref, {
              status: 'AUTO_APPROVED_EXECUTED',
              executedAtMs: nowMs,
              note: 'Idempotent completion: ledger credit already recorded.',
            });
            return { executed: false, outcomeEmail: null };
          }

          const walletRef = adminDb.collection('wallets').doc(userId);
          const walletSnap = await tx.get(walletRef);
          const walletData = walletSnap.exists
            ? walletSnap.data()!
            : {
                userId,
                currency: 'KES',
                availableKes: 0,
                availableBalance: 0,
                pendingEarnings: 0,
                totalEarned: 0,
                totalWithdrawn: 0,
                reservedWithdrawalFunds: 0,
                balancesByCurrency: { KES: 0 },
              };

          const availBefore = Number(walletData.availableBalance ?? walletData.availableKes ?? 0);
          const pendingBefore = Number(walletData.pendingEarnings ?? 0);
          const reservedBefore = Number(walletData.reservedWithdrawalFunds ?? 0);
          const totalEarnedBefore = Number(walletData.totalEarned ?? 0);

          const availAfter = Math.round((availBefore + rewardKes) * 100) / 100;
          const pendingAfter = Math.max(0, Math.round((pendingBefore - rewardKes) * 100) / 100);
          const totalEarnedAfter = Math.round((totalEarnedBefore + rewardKes) * 100) / 100;

          const curBalances = { ...(walletData.balancesByCurrency || {}) } as Record<string, number>;
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
              totalWithdrawn: Number(walletData.totalWithdrawn ?? 0),
              reservedWithdrawalFunds: reservedBefore,
              balancesByCurrency: curBalances,
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );

          tx.set(ledgerRef, {
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
            actorId: 'SYSTEM_90M_ENGINE',
            note: `Auto-approved after 90-minute review deadline: ${sub.taskTitle}`,
            createdAtMs: nowMs,
          });

          const earningRef = adminDb.collection('earnings').doc(`earn_${submissionId}`);
          tx.set(earningRef, {
            userId,
            submissionId,
            taskId,
            taskTitle: String(sub.taskTitle || 'Task'),
            sourceType: String(sub.sourceType || 'SWAS_ORIGINAL'),
            amountKes: rewardKes,
            currency: 'KES',
            decisionType: 'AUTO_APPROVED',
            decisionReason: 'REVIEW DEADLINE REACHED',
            idempotencyKey: idemKey,
            createdAtMs: nowMs,
          });

          const legacyTxRef = adminDb.collection('transactions').doc(`tx_auto_${submissionId}`);
          tx.set(legacyTxRef, {
            userId,
            counterpartyId: 'SWAS_PLATFORM',
            assignmentId: submissionId,
            taskTitle: String(sub.taskTitle || 'Task').slice(0, 120),
            kind: 'earning',
            amountKes: rewardKes,
            currency: 'KES',
            status: 'verified_settled',
            reference: `AUTO-${submissionId.slice(-8).toUpperCase()}`,
            provider: 'SWAS_90M_ENGINE',
            auditNote: 'REVIEW DEADLINE REACHED — Credited automatically.',
            createdAt: FieldValue.serverTimestamp(),
          });

          tx.update(subRef, {
            status: 'AUTO_APPROVED',
            decisionReason: 'REVIEW DEADLINE REACHED',
            decidedBy: 'SYSTEM_90M_ENGINE',
            decidedAtMs: nowMs,
            updatedAtMs: nowMs,
          });

          if (sub.reservationId) {
            tx.update(adminDb.collection('taskReservations').doc(String(sub.reservationId)), {
              status: 'COMPLETED',
            });
          }

          tx.set(adminDb.collection('taskReviews').doc(`rev_auto_${submissionId}`), {
            submissionId,
            taskId,
            userId,
            decision: 'AUTO_APPROVED',
            reason: 'REVIEW DEADLINE REACHED',
            reviewerId: 'SYSTEM_90M_ENGINE',
            createdAtMs: nowMs,
          });

          tx.update(timerDoc.ref, {
            status: 'AUTO_APPROVED_EXECUTED',
            executedAtMs: nowMs,
            note: 'REVIEW DEADLINE REACHED',
          });

          tx.set(adminDb.collection('notifications').doc(`notif_auto_${submissionId}`), {
            userId,
            actorId: 'SYSTEM_90M_ENGINE',
            type: 'auto_approval',
            title: 'Submission Auto-Approved & Wallet Credited',
            body: `Your submission for "${sub.taskTitle}" reached the 90-minute review deadline and was automatically approved (+KES ${rewardKes}).`,
            linkRoute: 'wallet',
            read: false,
            createdAt: FieldValue.serverTimestamp(),
          });

          tx.set(adminDb.collection('auditLogs').doc(`aud_auto_${submissionId}`), {
            actorId: 'SYSTEM_90M_ENGINE',
            action: 'submission_auto_approved',
            entityType: 'submission',
            entityId: submissionId,
            details: `Auto-approved submission ${submissionId} for user ${userId} (+KES ${rewardKes}) — REVIEW DEADLINE REACHED.`,
            createdAtMs: nowMs,
          });

          return {
            executed: true,
            outcomeEmail: {
              to: String(sub.userEmail || userData.email || ''),
              taskTitle: String(sub.taskTitle || 'Task'),
              rewardKes,
            },
          };
        });

        if (txResult.executed) {
          autoApprovedCount++;
          const outcomeEmail = txResult.outcomeEmail;
          if (outcomeEmail?.to) {
            void sendOperationalEmailBestEffort({
              to: outcomeEmail.to,
              subject: `[SWAS TASKS] Submission Approved & Wallet Credited (+KES ${outcomeEmail.rewardKes})`,
              categoryLabel: 'Payment & Review Confirmation',
              bodyText: `Your submission for "${outcomeEmail.taskTitle}" passed the 90-minute review window (REVIEW DEADLINE REACHED) and KES ${outcomeEmail.rewardKes} has been credited to your available balance.`,
            });
          }
        } else {
          skippedOrBlockedTimers++;
        }
      }
    }

    return {
      ok: true,
      triggerSource,
      ranAt,
      blockedByPermissions: false,
      publishedScheduledTasks,
      expiredTasks,
      expiredReservations,
      timersChecked,
      autoApprovedCount,
      skippedOrBlockedTimers,
    };
  } catch (err) {
    const blocked = isPermissionDeniedError(err);
    return {
      ok: false,
      triggerSource,
      ranAt,
      blockedByPermissions: blocked,
      error: err instanceof Error ? err.message : String(err),
      publishedScheduledTasks,
      expiredTasks,
      expiredReservations,
      timersChecked,
      autoApprovedCount,
      skippedOrBlockedTimers,
    };
  } finally {
    sweepInFlight = false;
  }
}
