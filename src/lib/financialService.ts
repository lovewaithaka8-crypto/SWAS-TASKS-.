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
import { OFFICIAL_EMAIL_IDENTITY } from './emailConfig';
import { dispatchPlatformEmail } from './emailService';
import {
  buildDefaultFinancialPlatformConfig,
  DEFAULT_COUNTRIES,
  DEFAULT_CURRENCIES,
  DEFAULT_INSTITUTIONS,
} from './financialCatalog';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { generateDocId, pushNotification } from './marketplaceService';
import {
  cleanText,
  detectPrivateKeyOrSeedPhrase,
  formatCurrency,
  maskAccountIdentifier,
  validateCryptoAddress,
} from './validation';
import type {
  FinancialAuditLog,
  FinancialCategory,
  FinancialInstitutionConfig,
  FinancialPlatformConfig,
  LedgerTransaction,
  PayoutAccount,
  ProviderIntegrationStatus,
  WalletAccount,
  WithdrawalRequest,
  WithdrawalStatus,
} from '../types/marketplace';

function sortDesc<T extends { createdAt?: Timestamp }>(items: T[]): T[] {
  return [...items].sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
}

export function getCurrencyAvailableBalance(
  wallet: WalletAccount | null,
  currency: string
): number {
  const code = (currency || 'KES').toUpperCase();
  if (!wallet) return 0;
  if (code === 'KES') {
    return Number(wallet.balancesByCurrency?.KES ?? wallet.availableKes ?? 0);
  }
  return Number(wallet.balancesByCurrency?.[code] ?? 0);
}

export function getAllCurrencyBalances(
  wallet: WalletAccount | null
): Record<string, number> {
  if (!wallet) return { KES: 0 };
  const map: Record<string, number> = {
    KES: Number(wallet.availableKes || 0),
    ...(wallet.balancesByCurrency || {}),
  };
  return map;
}

export function computeWithdrawalBreakdown(
  amount: number,
  institution: FinancialInstitutionConfig
): { feeAmount: number; netAmount: number; valid: boolean; reason?: string } {
  const cleanAmt = Number(amount || 0);
  if (!Number.isFinite(cleanAmt) || cleanAmt <= 0) {
    return { feeAmount: 0, netAmount: 0, valid: false, reason: 'Enter a valid withdrawal amount.' };
  }
  if (cleanAmt < institution.minWithdrawal) {
    return {
      feeAmount: 0,
      netAmount: 0,
      valid: false,
      reason: `Minimum withdrawal for ${institution.name} is ${institution.minWithdrawal}.`,
    };
  }
  if (cleanAmt > institution.maxWithdrawal) {
    return {
      feeAmount: 0,
      netAmount: 0,
      valid: false,
      reason: `Maximum withdrawal for ${institution.name} is ${institution.maxWithdrawal}.`,
    };
  }
  const pctFee = (cleanAmt * Number(institution.feePercent || 0)) / 100;
  const rawFee = Number(institution.feeFlat || 0) + pctFee;
  const feeAmount = Math.round(rawFee * 100) / 100;
  const netAmount = Math.max(0, Math.round((cleanAmt - feeAmount) * 100) / 100);
  if (netAmount <= 0) {
    return {
      feeAmount,
      netAmount: 0,
      valid: false,
      reason: 'Withdrawal amount must exceed configured transaction fee.',
    };
  }
  return { feeAmount, netAmount, valid: true };
}

export async function writeFinancialAuditLog(params: {
  actorId: string;
  actorEmail?: string;
  action: string;
  targetType: FinancialAuditLog['targetType'];
  targetId: string;
  currency?: string;
  amount?: number;
  details: string;
}): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== params.actorId) return;
  const id = generateDocId('faud');
  try {
    const payload: Record<string, unknown> = {
      actorId: params.actorId,
      action: cleanText(params.action, 80),
      targetType: params.targetType,
      targetId: cleanText(params.targetId, 128),
      details: cleanText(params.details, 500),
      createdAt: serverTimestamp(),
    };
    if (params.actorEmail) payload.actorEmail = cleanText(params.actorEmail, 254);
    if (params.currency) payload.currency = cleanText(params.currency, 8);
    if (typeof params.amount === 'number' && Number.isFinite(params.amount)) {
      payload.amount = params.amount;
    }
    await setDoc(doc(db, 'financialAuditLogs', id), payload);
  } catch {
    // Audit write is best-effort for non-admin actions where rules apply cleanly
  }
}

export function subscribeFinancialConfig(
  onData: (cfg: FinancialPlatformConfig) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, 'financialConfig', 'global'),
    (snap) => {
      if (!snap.exists()) {
        onData(buildDefaultFinancialPlatformConfig());
        return;
      }
      const data = snap.data() as Partial<FinancialPlatformConfig>;
      onData({
        id: snap.id,
        countries: Array.isArray(data.countries) && data.countries.length ? data.countries : DEFAULT_COUNTRIES,
        currencies:
          Array.isArray(data.currencies) && data.currencies.length ? data.currencies : DEFAULT_CURRENCIES,
        institutions:
          Array.isArray(data.institutions) && data.institutions.length
            ? data.institutions
            : DEFAULT_INSTITUTIONS,
        cryptoPayoutsEnabled: data.cryptoPayoutsEnabled ?? true,
        requireReauthForPayoutAccountChanges: data.requireReauthForPayoutAccountChanges ?? true,
        updatedBy: data.updatedBy || 'system',
        updatedAt: data.updatedAt,
      });
    },
    () => {
      onData(buildDefaultFinancialPlatformConfig());
    }
  );
}

export async function saveFinancialConfig(params: {
  adminUid: string;
  adminEmail?: string;
  config: FinancialPlatformConfig;
}): Promise<void> {
  const ref = doc(db, 'financialConfig', 'global');
  try {
    await setDoc(ref, {
      countries: params.config.countries,
      currencies: params.config.currencies,
      institutions: params.config.institutions,
      cryptoPayoutsEnabled: Boolean(params.config.cryptoPayoutsEnabled),
      requireReauthForPayoutAccountChanges: Boolean(
        params.config.requireReauthForPayoutAccountChanges
      ),
      updatedBy: params.adminUid,
      updatedAt: serverTimestamp(),
    });
    await writeFinancialAuditLog({
      actorId: params.adminUid,
      actorEmail: params.adminEmail,
      action: 'update_financial_config',
      targetType: 'financial_config',
      targetId: 'global',
      details: `Updated financial config (${params.config.institutions.filter((i) => i.enabled).length} enabled institutions, crypto payouts ${params.config.cryptoPayoutsEnabled ? 'enabled' : 'disabled'}).`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'financialConfig/global');
  }
}

export async function updateUserCountryPreference(
  uid: string,
  country: string,
  preferredCurrency: string
): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', uid), {
      country: cleanText(country, 12),
      preferredCurrency: cleanText(preferredCurrency, 8),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
  }
}

// --- Payout Accounts ---
export function subscribePayoutAccounts(
  userId: string,
  onData: (items: PayoutAccount[]) => void
): Unsubscribe {
  const q = query(collection(db, 'payoutAccounts'), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snap) => {
      onData(
        sortDesc(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<PayoutAccount, 'id'>),
          }))
        )
      );
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'payoutAccounts')
  );
}

export async function addPayoutAccount(params: {
  userId: string;
  userEmail?: string;
  institution: FinancialInstitutionConfig;
  country: string;
  currency: string;
  accountHolderName: string;
  accountIdentifier: string;
  bankBranchOrCode?: string;
  cryptoAsset?: string;
  cryptoNetwork?: string;
  makeDefault: boolean;
  existingAccounts: PayoutAccount[];
}): Promise<string> {
  const holder = cleanText(params.accountHolderName, 100);
  const rawIdent = cleanText(params.accountIdentifier, 160);
  if (holder.length < 2) {
    throw new Error('Enter the full legal account holder name.');
  }
  if (detectPrivateKeyOrSeedPhrase(rawIdent)) {
    throw new Error(
      'Security block: Never enter recovery seed phrases or private keys. Only public deposit addresses or account numbers are accepted.'
    );
  }
  if (params.institution.category === 'cryptocurrency') {
    const cryptoErr = validateCryptoAddress(rawIdent, params.cryptoNetwork || 'TRC20');
    if (cryptoErr) throw new Error(cryptoErr);
  } else if (rawIdent.length < 4) {
    throw new Error('Provide a valid account number, phone number, or wallet identifier.');
  }

  const { masked, last4 } = maskAccountIdentifier(rawIdent);
  const id = generateDocId('pa');

  try {
    const batch = writeBatch(db);
    if (params.makeDefault) {
      params.existingAccounts
        .filter((a) => a.isDefault)
        .forEach((a) => {
          batch.update(doc(db, 'payoutAccounts', a.id), {
            isDefault: false,
            updatedAt: serverTimestamp(),
          });
        });
    }

    const payload: Record<string, unknown> = {
      userId: params.userId,
      institutionId: params.institution.id,
      institutionName: cleanText(params.institution.name, 100),
      category: params.institution.category,
      country: cleanText(params.country, 12),
      currency: cleanText(params.currency, 8),
      accountHolderName: holder,
      maskedAccount: masked,
      accountLast4: last4,
      accountReference: rawIdent,
      verificationStatus:
        params.institution.category === 'cryptocurrency' ? 'requires_review' : 'pending',
      isDefault: params.makeDefault || params.existingAccounts.length === 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (params.bankBranchOrCode?.trim()) {
      payload.bankBranchOrCode = cleanText(params.bankBranchOrCode, 64);
    }
    if (params.cryptoAsset?.trim()) {
      payload.cryptoAsset = cleanText(params.cryptoAsset, 24);
    }
    if (params.cryptoNetwork?.trim()) {
      payload.cryptoNetwork = cleanText(params.cryptoNetwork, 32);
    }

    batch.set(doc(db, 'payoutAccounts', id), payload);
    await batch.commit();

    await writeFinancialAuditLog({
      actorId: params.userId,
      actorEmail: params.userEmail,
      action: 'add_payout_account',
      targetType: 'payout_account',
      targetId: id,
      currency: params.currency,
      details: `Added ${params.institution.name} (${masked}) in ${params.country}.`,
    });

    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `payoutAccounts/${id}`);
  }
}

export async function updatePayoutAccount(params: {
  userId: string;
  userEmail?: string;
  accountId: string;
  accountHolderName: string;
  accountIdentifier: string;
  bankBranchOrCode?: string;
  cryptoNetwork?: string;
  category: FinancialCategory;
}): Promise<void> {
  const holder = cleanText(params.accountHolderName, 100);
  const rawIdent = cleanText(params.accountIdentifier, 160);
  if (holder.length < 2) throw new Error('Account holder name must be at least 2 characters.');
  if (detectPrivateKeyOrSeedPhrase(rawIdent)) {
    throw new Error('Never enter private keys or recovery seed phrases.');
  }
  if (params.category === 'cryptocurrency') {
    const err = validateCryptoAddress(rawIdent, params.cryptoNetwork || 'TRC20');
    if (err) throw new Error(err);
  } else if (rawIdent.length < 4) {
    throw new Error('Enter a valid account identifier.');
  }
  const { masked, last4 } = maskAccountIdentifier(rawIdent);

  try {
    const payload: Record<string, unknown> = {
      accountHolderName: holder,
      maskedAccount: masked,
      accountLast4: last4,
      accountReference: rawIdent,
      verificationStatus: params.category === 'cryptocurrency' ? 'requires_review' : 'pending',
      updatedAt: serverTimestamp(),
    };
    if (params.bankBranchOrCode !== undefined) {
      payload.bankBranchOrCode = cleanText(params.bankBranchOrCode, 64);
    }
    if (params.cryptoNetwork !== undefined) {
      payload.cryptoNetwork = cleanText(params.cryptoNetwork, 32);
    }
    await updateDoc(doc(db, 'payoutAccounts', params.accountId), payload);
    await writeFinancialAuditLog({
      actorId: params.userId,
      actorEmail: params.userEmail,
      action: 'update_payout_account',
      targetType: 'payout_account',
      targetId: params.accountId,
      details: `Updated payout destination to ${masked}. Re-verification required.`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `payoutAccounts/${params.accountId}`);
  }
}

export async function setDefaultPayoutAccount(
  userId: string,
  accountId: string,
  existingAccounts: PayoutAccount[]
): Promise<void> {
  try {
    const batch = writeBatch(db);
    existingAccounts.forEach((acc) => {
      batch.update(doc(db, 'payoutAccounts', acc.id), {
        isDefault: acc.id === accountId,
        updatedAt: serverTimestamp(),
      });
    });
    await batch.commit();
    await writeFinancialAuditLog({
      actorId: userId,
      action: 'set_default_payout_account',
      targetType: 'payout_account',
      targetId: accountId,
      details: `Set payout account ${accountId} as default.`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `payoutAccounts/${accountId}`);
  }
}

export async function deletePayoutAccount(
  userId: string,
  accountId: string,
  withdrawals: WithdrawalRequest[]
): Promise<void> {
  const activeDep = withdrawals.some(
    (w) =>
      w.payoutAccountId === accountId &&
      ['requested', 'pending_verification', 'approved', 'processing'].includes(w.status)
  );
  if (activeDep) {
    throw new Error(
      'Cannot remove this payout account while an active withdrawal depends on it. Cancel or wait for settlement first.'
    );
  }
  try {
    await deleteDoc(doc(db, 'payoutAccounts', accountId));
    await writeFinancialAuditLog({
      actorId: userId,
      action: 'delete_payout_account',
      targetType: 'payout_account',
      targetId: accountId,
      details: `Deleted saved payout account ${accountId}.`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `payoutAccounts/${accountId}`);
  }
}

// --- Guided Withdrawals ---
export async function submitFinancialWithdrawal(params: {
  userId: string;
  userEmail?: string;
  wallet: WalletAccount | null;
  currency: string;
  amount: number;
  country: string;
  institution: FinancialInstitutionConfig;
  payoutAccount: PayoutAccount;
  cryptoIrreversibleConfirmed?: boolean;
}): Promise<{ id: string; reference: string }> {
  const currency = (params.currency || 'KES').toUpperCase();
  if (!params.institution.enabled || params.institution.availabilityStatus === 'unavailable') {
    throw new Error(`${params.institution.name} is currently unavailable.`);
  }
  if (params.institution.category === 'cryptocurrency' && !params.cryptoIrreversibleConfirmed) {
    throw new Error(
      'Confirm the asset, network, and irreversible blockchain transfer acknowledgement before submitting.'
    );
  }

  const available = getCurrencyAvailableBalance(params.wallet, currency);
  const breakdown = computeWithdrawalBreakdown(params.amount, params.institution);
  if (!breakdown.valid) {
    throw new Error(breakdown.reason || 'Invalid withdrawal amount.');
  }
  if (params.amount > available) {
    throw new Error(
      `Insufficient verified available ${currency} balance (${formatCurrency(available, currency)}).`
    );
  }

  if (!auth.currentUser || auth.currentUser.uid !== params.userId) {
    throw new Error('Sign in before submitting a withdrawal request.');
  }

  const token = await auth.currentUser.getIdToken();
  const res = await fetch('/api/withdrawals/request', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      amount: Number(params.amount),
      currency,
      feeAmount: breakdown.feeAmount,
      netAmount: breakdown.netAmount,
      institutionId: params.institution.id,
      institutionName: params.institution.name,
      category: params.institution.category,
      method: params.institution.name,
      destination: params.payoutAccount.maskedAccount,
      maskedDestination: params.payoutAccount.maskedAccount,
      country: params.country,
      payoutAccountId: params.payoutAccount.id,
      cryptoAsset: params.payoutAccount.cryptoAsset,
      cryptoNetwork: params.payoutAccount.cryptoNetwork,
    }),
  });

  const payload = (await res.json().catch(() => ({}))) as {
    withdrawalId?: string;
    reference?: string;
    error?: string;
  };
  if (!res.ok || !payload.withdrawalId) {
    throw new Error(payload.error || 'Unable to submit withdrawal request.');
  }

  const id = payload.withdrawalId;
  const reference = payload.reference || id;

  await pushNotification({
    userId: params.userId,
    actorId: params.userId,
    type: 'payment_update',
    title: `Withdrawal ${reference} Submitted`,
    body: `${formatCurrency(params.amount, currency)} payout to ${params.institution.name} (${params.payoutAccount.maskedAccount}) is pending administrator approval (funds reserved).`,
    linkRoute: 'withdrawals',
  });

  if (auth.currentUser && params.userEmail) {
    void dispatchPlatformEmail({
      user: auth.currentUser,
      surface: 'website',
      category: 'withdrawal_notification',
      recipientEmail: params.userEmail,
      subject: `[SWAS TASKS] Withdrawal Request ${reference}`,
      bodyText: `Your withdrawal request (${reference}) of ${formatCurrency(
        params.amount,
        currency
      )} (fee ${formatCurrency(breakdown.feeAmount, currency)}, net payout ${formatCurrency(
        breakdown.netAmount,
        currency
      )}) to ${params.institution.name} (${params.payoutAccount.maskedAccount}) has been reserved and queued for administrator approval.\n\nSupport: ${OFFICIAL_EMAIL_IDENTITY.officialEmail}`,
    });
  }

  return { id, reference };
}

export async function cancelWithdrawalRequest(
  _userId: string,
  withdrawal: WithdrawalRequest
): Promise<void> {
  if (
    ![
      'requested',
      'pending_verification',
      'PENDING_ADMIN_APPROVAL',
    ].includes(withdrawal.status)
  ) {
    throw new Error('Only pending withdrawal requests can be cancelled.');
  }
  if (!auth.currentUser) {
    throw new Error('Sign in before cancelling a withdrawal request.');
  }
  const token = await auth.currentUser.getIdToken();
  const res = await fetch(`/api/withdrawals/${encodeURIComponent(withdrawal.id)}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  const payload = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    throw new Error(payload.error || 'Unable to cancel withdrawal request.');
  }
}

// --- Super Admin Operations ---
export function subscribeAllWithdrawals(
  onData: (items: WithdrawalRequest[]) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, 'withdrawals'),
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

export function subscribeAllTransactions(
  onData: (items: LedgerTransaction[]) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, 'transactions'),
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

export function subscribeFinancialAuditLogs(
  onData: (items: FinancialAuditLog[]) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, 'financialAuditLogs'),
    (snap) => {
      onData(
        sortDesc(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<FinancialAuditLog, 'id'>),
          }))
        )
      );
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'financialAuditLogs')
  );
}

export async function adminReviewWithdrawal(params: {
  adminUid: string;
  adminEmail?: string;
  withdrawal: WithdrawalRequest;
  nextStatus: WithdrawalStatus;
  providerReference?: string;
  txHash?: string;
  reviewNotes?: string;
}): Promise<void> {
  const { withdrawal, nextStatus } = params;
  const currency = (withdrawal.currency || 'KES').toUpperCase();
  const provRef = cleanText(params.providerReference || '', 128);
  const txHash = cleanText(params.txHash || '', 160);
  const notes = cleanText(params.reviewNotes || '', 400);

  if (nextStatus === 'paid') {
    if (withdrawal.category === 'cryptocurrency' && !txHash && !provRef) {
      throw new Error(
        'Recording a paid crypto withdrawal requires a real blockchain transaction hash (txHash) or verified merchant reference.'
      );
    }
    if (!provRef && !txHash) {
      throw new Error(
        'Provide a real provider/bank payout reference or receipt number before marking Paid.'
      );
    }
  }

  try {
    await runTransaction(db, async (tx) => {
      const wdRef = doc(db, 'withdrawals', withdrawal.id);
      const wdSnap = await tx.get(wdRef);
      if (!wdSnap.exists()) throw new Error('Withdrawal record not found.');
      const current = wdSnap.data() as WithdrawalRequest;

      if (current.status === 'paid' && nextStatus === 'paid') {
        throw new Error('This withdrawal has already been marked paid.');
      }

      const updatePayload: Record<string, unknown> = {
        status: nextStatus,
        providerStatus: nextStatus === 'paid' ? 'settled_confirmed' : `admin_${nextStatus}`,
        updatedAt: serverTimestamp(),
      };
      if (provRef) updatePayload.providerReference = provRef;
      if (txHash) updatePayload.txHash = txHash;
      if (notes) updatePayload.reviewNotes = notes;

      if (nextStatus === 'paid') {
        const walletRef = doc(db, 'wallets', current.userId);
        const walletSnap = await tx.get(walletRef);
        if (!walletSnap.exists()) throw new Error('User wallet not found.');
        const wData = walletSnap.data() as WalletAccount;
        const balances = { ...(wData.balancesByCurrency || {}) };
        const currBal =
          currency === 'KES'
            ? Number(balances.KES ?? wData.availableKes ?? 0)
            : Number(balances[currency] ?? 0);

        if (currBal < current.amountKes) {
          throw new Error(
            `Insufficient wallet ${currency} balance (${currBal}) to finalize ${current.amountKes} payout.`
          );
        }

        const nextBal = Math.max(0, currBal - current.amountKes);
        balances[currency] = nextBal;

        tx.update(walletRef, {
          availableKes: currency === 'KES' ? nextBal : Number(wData.availableKes || 0),
          balancesByCurrency: balances,
          updatedAt: serverTimestamp(),
        });

        const confTxId = generateDocId('txconf');
        tx.set(doc(db, 'transactions', confTxId), {
          userId: current.userId,
          counterpartyId: 'swas_finance',
          assignmentId: withdrawal.id,
          taskTitle: cleanText(`Payout Settled · ${current.institutionName || current.method}`, 120),
          kind: 'payment_confirmation',
          amountKes: current.netAmount ?? current.amountKes,
          currency,
          status: 'verified_settled',
          reference: current.reference || withdrawal.id,
          provider: current.institutionId || current.method,
          providerReference: provRef || txHash,
          withdrawalId: withdrawal.id,
          auditNote: cleanText(notes || `Settled by ${params.adminEmail || params.adminUid}`, 300),
          createdAt: serverTimestamp(),
        });
      }

      tx.update(wdRef, updatePayload);
    });

    await writeFinancialAuditLog({
      actorId: params.adminUid,
      actorEmail: params.adminEmail,
      action: `withdrawal_${nextStatus}`,
      targetType: 'withdrawal',
      targetId: withdrawal.id,
      currency,
      amount: withdrawal.amountKes,
      details: `Updated withdrawal ${withdrawal.reference || withdrawal.id} to ${nextStatus}. ${
        provRef ? `Ref: ${provRef}. ` : ''
      }${txHash ? `TxHash: ${txHash}. ` : ''}${notes}`,
    });

    await pushNotification({
      userId: withdrawal.userId,
      actorId: params.adminUid,
      type: 'payment_update',
      title: `Withdrawal ${withdrawal.reference || withdrawal.id} ${nextStatus.toUpperCase()}`,
      body: `Status updated to ${nextStatus.replace('_', ' ')}${provRef ? ` · Ref: ${provRef}` : ''}.`,
      linkRoute: 'withdrawals',
    });
  } catch (error) {
    if (error instanceof Error) throw error;
    handleFirestoreError(error, OperationType.UPDATE, `withdrawals/${withdrawal.id}`);
  }
}

export async function adminSettlePendingTransaction(params: {
  adminUid: string;
  adminEmail?: string;
  transaction: LedgerTransaction;
  providerReference: string;
}): Promise<void> {
  const refCode = cleanText(params.providerReference, 128);
  if (refCode.length < 3) {
    throw new Error('Provide a verified payment receipt or bank settlement reference.');
  }
  const currency = (params.transaction.currency || 'KES').toUpperCase();

  try {
    await runTransaction(db, async (tx) => {
      const txRef = doc(db, 'transactions', params.transaction.id);
      const txSnap = await tx.get(txRef);
      if (!txSnap.exists()) throw new Error('Transaction record not found.');
      const cur = txSnap.data() as LedgerTransaction;
      if (cur.status === 'verified_settled') {
        throw new Error('Transaction is already verified and settled.');
      }

      if (cur.kind === 'earning' || cur.kind === 'adjustment' || cur.kind === 'refund') {
        const walletRef = doc(db, 'wallets', cur.userId);
        const wSnap = await tx.get(walletRef);
        if (wSnap.exists()) {
          const wData = wSnap.data() as WalletAccount;
          const balances = { ...(wData.balancesByCurrency || {}) };
          const existingBal =
            currency === 'KES'
              ? Number(balances.KES ?? wData.availableKes ?? 0)
              : Number(balances[currency] ?? 0);
          const nextBal = existingBal + Number(cur.amountKes || 0);
          balances[currency] = nextBal;

          tx.update(walletRef, {
            availableKes: currency === 'KES' ? nextBal : Number(wData.availableKes || 0),
            balancesByCurrency: balances,
            updatedAt: serverTimestamp(),
          });
        }
      }

      tx.update(txRef, {
        status: 'verified_settled',
        provider: 'admin_reconciled',
        providerReference: refCode,
        auditNote: cleanText(`Confirmed by ${params.adminEmail || params.adminUid}`, 300),
      });
    });

    await writeFinancialAuditLog({
      actorId: params.adminUid,
      actorEmail: params.adminEmail,
      action: 'settle_ledger_transaction',
      targetType: 'wallet',
      targetId: params.transaction.userId,
      currency,
      amount: params.transaction.amountKes,
      details: `Settled ${params.transaction.kind} transaction ${params.transaction.reference} (${formatCurrency(
        params.transaction.amountKes,
        currency
      )}) with ref ${refCode}.`,
    });
  } catch (error) {
    if (error instanceof Error) throw error;
    handleFirestoreError(error, OperationType.UPDATE, `transactions/${params.transaction.id}`);
  }
}

// --- Backend Provider APIs ---
export async function fetchProviderStatuses(
  user: User,
  verify = false
): Promise<ProviderIntegrationStatus[]> {
  const token = await user.getIdToken();
  const resp = await fetch(`/api/financial/providers/status${verify ? '?verify=true' : ''}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = (await resp.json()) as { providers?: ProviderIntegrationStatus[]; error?: string };
  if (!resp.ok || !data.providers) {
    throw new Error(data.error || 'Unable to inspect payment provider status.');
  }
  return data.providers;
}

export async function dispatchAutomatedPayout(
  user: User,
  payload: {
    providerKey: string;
    withdrawalId: string;
    amount: number;
    currency: string;
    destination: string;
    recipientName: string;
    institutionId: string;
    idempotencyKey: string;
    cryptoNetwork?: string;
  }
): Promise<{ dispatched: boolean; status: string; providerReference?: string; error?: string }> {
  const token = await user.getIdToken();
  const resp = await fetch('/api/financial/payouts/initiate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  return (await resp.json()) as {
    dispatched: boolean;
    status: string;
    providerReference?: string;
    error?: string;
  };
}

export async function getPayoutAccountRaw(accountId: string): Promise<PayoutAccount | null> {
  try {
    const snap = await getDoc(doc(db, 'payoutAccounts', accountId));
    return snap.exists() ? { id: snap.id, ...(snap.data() as Omit<PayoutAccount, 'id'>) } : null;
  } catch {
    return null;
  }
}
