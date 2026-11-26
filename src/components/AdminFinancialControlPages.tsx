import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Globe,
  Plus,
  RefreshCw,
  Save,
  ShieldAlert,
  SlidersHorizontal,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  FINANCIAL_CATEGORY_LABELS,
  WITHDRAWAL_STATUS_LABELS,
} from '../lib/financialCatalog';
import {
  adminReviewWithdrawal,
  adminSettlePendingTransaction,
  dispatchAutomatedPayout,
  fetchProviderStatuses,
  getPayoutAccountRaw,
  saveFinancialConfig,
} from '../lib/financialService';
import { formatCurrency } from '../lib/validation';
import type {
  FinancialAuditLog,
  FinancialCategory,
  FinancialInstitutionConfig,
  FinancialPlatformConfig,
  InstitutionAvailabilityStatus,
  LedgerTransaction,
  ProviderIntegrationStatus,
  WithdrawalRequest,
  WithdrawalStatus,
} from '../types/marketplace';

interface AdminFinancialControlPagesProps {
  financialConfig: FinancialPlatformConfig;
  allWithdrawals: WithdrawalRequest[];
  allTransactions: LedgerTransaction[];
  auditLogs: FinancialAuditLog[];
}

export function AdminFinancialControlPages({
  financialConfig,
  allWithdrawals,
  allTransactions,
  auditLogs,
}: AdminFinancialControlPagesProps) {
  const { firebaseUser, isSuperAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'queue' | 'providers' | 'config' | 'audit'>('queue');

  const [providers, setProviders] = useState<ProviderIntegrationStatus[]>([]);
  const [providersLoading, setProvidersLoading] = useState(false);
  const [providersError, setProvidersError] = useState<string | null>(null);

  const loadProviders = async (verify = false) => {
    if (!firebaseUser || !isSuperAdmin) return;
    setProvidersLoading(true);
    setProvidersError(null);
    try {
      const list = await fetchProviderStatuses(firebaseUser, verify);
      setProviders(list);
    } catch (err) {
      setProvidersError(
        err instanceof Error ? err.message : 'Unable to check payout provider health.'
      );
    } finally {
      setProvidersLoading(false);
    }
  };

  useEffect(() => {
    void loadProviders(false);
  }, [firebaseUser?.uid, isSuperAdmin]);

  if (!isSuperAdmin) {
    return (
      <div className="swas-card rounded-[14px] p-8 text-center space-y-2">
        <ShieldAlert className="w-8 h-8 text-[#d34552] mx-auto" />
        <h2 className="swas-heading-section">Restricted Access</h2>
        <p className="swas-body text-[#75869d]">
          SWAS Financial Control Centre is restricted to verified Super Administrators.
        </p>
      </div>
    );
  }

  const pendingWithdrawalsCount = allWithdrawals.filter((w) =>
    [
      'requested',
      'pending_verification',
      'approved',
      'processing',
      'PENDING_ADMIN_APPROVAL',
      'APPROVED_FOR_PAYMENT',
      'PROCESSING',
      'ON_HOLD',
    ].includes(w.status)
  ).length;
  const failedWithdrawalsCount = allWithdrawals.filter((w) => w.status === 'failed').length;
  const pendingTxCount = allTransactions.filter(
    (t) => t.status === 'pending_confirmation' && t.kind === 'earning'
  ).length;

  return (
    <div className="space-y-6">
      <div className="swas-hero rounded-[16px] p-6 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#a9c7ee]">
            CENTRAL CONTROL CENTRE · FINANCE
          </p>
          <h2 className="mt-1 font-display text-[22px] font-bold">
            Financial Institutions, Providers & Reconciliation
          </h2>
          <p className="mt-1 text-[13px] text-[#dce7f5]">
            Configure regional banks, limits, fees, inspect real provider API status, approve or settle payouts, and audit all financial events.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="px-4 py-2.5 rounded-[10px] bg-white/10 border border-white/15">
            <div className="font-display text-[20px] font-bold tabular-nums">
              {pendingWithdrawalsCount}
            </div>
            <div className="text-[11px] text-[#c8dcf5]">Open Payouts</div>
          </div>
          <div className="px-4 py-2.5 rounded-[10px] bg-white/10 border border-white/15">
            <div className="font-display text-[20px] font-bold tabular-nums">
              {failedWithdrawalsCount}
            </div>
            <div className="text-[11px] text-[#ffd485]">Failed Payouts</div>
          </div>
          <div className="px-4 py-2.5 rounded-[10px] bg-white/10 border border-white/15">
            <div className="font-display text-[20px] font-bold tabular-nums">
              {pendingTxCount}
            </div>
            <div className="text-[11px] text-[#c8dcf5]">Pending Earnings</div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-[#dce5f0] pb-3">
        {(
          [
            { id: 'queue', label: `Payout & Settlement Queue (${pendingWithdrawalsCount + pendingTxCount})`, icon: Wallet },
            { id: 'providers', label: 'Provider Integrations & Health', icon: Activity },
            { id: 'config', label: 'Countries, Institutions & Fees', icon: SlidersHorizontal },
            { id: 'audit', label: `Audit Logs (${auditLogs.length})`, icon: ClipboardList },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-[9px] text-[13px] font-semibold cursor-pointer ${
                active
                  ? 'bg-[#1265c8] text-white'
                  : 'bg-white border border-[#dce5f0] text-[#42556f] hover:bg-[#e9f2ff] hover:text-[#1265c8]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'queue' && (
        <AdminQueueSection
          allWithdrawals={allWithdrawals}
          allTransactions={allTransactions}
          financialConfig={financialConfig}
        />
      )}

      {activeTab === 'providers' && (
        <AdminProvidersSection
          providers={providers}
          loading={providersLoading}
          errorMsg={providersError}
          onRunChecks={() => void loadProviders(true)}
        />
      )}

      {activeTab === 'config' && (
        <AdminFinancialConfigSection financialConfig={financialConfig} />
      )}

      {activeTab === 'audit' && <AdminAuditLogSection auditLogs={auditLogs} />}
    </div>
  );
}

function AdminQueueSection({
  allWithdrawals,
  allTransactions,
  financialConfig,
}: {
  allWithdrawals: WithdrawalRequest[];
  allTransactions: LedgerTransaction[];
  financialConfig: FinancialPlatformConfig;
}) {
  const { firebaseUser } = useAuth();
  const [wdFilter, setWdFilter] = useState<'open' | 'failed' | 'all'>('open');
  const [selectedWd, setSelectedWd] = useState<WithdrawalRequest | null>(null);
  const [rawDestination, setRawDestination] = useState<string | null>(null);
  const [provRefInput, setProvRefInput] = useState('');
  const [txHashInput, setTxHashInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const [settleRefMap, setSettleRefMap] = useState<Record<string, string>>({});

  const visibleWithdrawals = useMemo(() => {
    if (wdFilter === 'open') {
      return allWithdrawals.filter((w) =>
        [
          'requested',
          'pending_verification',
          'approved',
          'processing',
          'PENDING_ADMIN_APPROVAL',
          'APPROVED_FOR_PAYMENT',
          'PROCESSING',
          'ON_HOLD',
        ].includes(w.status)
      );
    }
    if (wdFilter === 'failed') {
      return allWithdrawals.filter((w) => w.status === 'failed');
    }
    return allWithdrawals;
  }, [allWithdrawals, wdFilter]);

  const pendingEarnings = useMemo(
    () =>
      allTransactions.filter(
        (t) => t.status === 'pending_confirmation' && t.kind === 'earning'
      ),
    [allTransactions]
  );

  const handleInspectWithdrawal = async (w: WithdrawalRequest) => {
    setSelectedWd(w);
    setProvRefInput(w.providerReference || '');
    setTxHashInput(w.txHash || '');
    setNotesInput(w.reviewNotes || '');
    setErrMsg(null);
    setNotice(null);
    if (w.payoutAccountId) {
      const pa = await getPayoutAccountRaw(w.payoutAccountId);
      setRawDestination(pa ? pa.accountReference : null);
    } else {
      setRawDestination(null);
    }
  };

  const handleTransition = async (nextStatus: WithdrawalStatus) => {
    if (!firebaseUser || !selectedWd) return;
    setBusy(true);
    setErrMsg(null);
    setNotice(null);
    try {
      await adminReviewWithdrawal({
        adminUid: firebaseUser.uid,
        adminEmail: firebaseUser.email || undefined,
        withdrawal: selectedWd,
        nextStatus,
        providerReference: provRefInput,
        txHash: txHashInput,
        reviewNotes: notesInput,
      });
      setNotice(`Withdrawal ${selectedWd.reference || selectedWd.id} updated to ${nextStatus}.`);
      setSelectedWd(null);
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Unable to update withdrawal status.');
    } finally {
      setBusy(false);
    }
  };

  const handleAutomatedDispatch = async () => {
    if (!firebaseUser || !selectedWd) return;
    const inst = financialConfig.institutions.find((i) => i.id === selectedWd.institutionId);
    setBusy(true);
    setErrMsg(null);
    setNotice(null);
    try {
      const res = await dispatchAutomatedPayout(firebaseUser, {
        providerKey: inst?.providerKey || 'manual',
        withdrawalId: selectedWd.id,
        amount: selectedWd.netAmount ?? selectedWd.amountKes,
        currency: selectedWd.currency || 'KES',
        destination: rawDestination || selectedWd.destination,
        recipientName: selectedWd.userId,
        institutionId: selectedWd.institutionId || '',
        idempotencyKey: selectedWd.idempotencyKey || `idem_${selectedWd.id}`,
        cryptoNetwork: selectedWd.cryptoNetwork,
      });
      if (!res.dispatched) {
        setErrMsg(res.error || 'Automated provider dispatch unavailable.');
      } else {
        setNotice(`Dispatched via provider (${res.providerReference}).`);
      }
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Provider dispatch request failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleSettleEarning = async (tx: LedgerTransaction) => {
    if (!firebaseUser) return;
    const refVal = (settleRefMap[tx.id] || '').trim();
    setBusy(true);
    setErrMsg(null);
    setNotice(null);
    try {
      await adminSettlePendingTransaction({
        adminUid: firebaseUser.uid,
        adminEmail: firebaseUser.email || undefined,
        transaction: tx,
        providerReference: refVal,
      });
      setNotice(`Settled ${tx.reference} into verified wallet balance.`);
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Unable to settle earning.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {notice && (
        <div className="p-3.5 rounded-[10px] bg-[#eaf8f2] border border-[#bce8d4] text-[13px] text-[#15966b]">
          {notice}
        </div>
      )}
      {errMsg && (
        <div className="p-3.5 rounded-[10px] bg-[#fff0f0] border border-[#f1c7c7] text-[13px] text-[#d34552]">
          {errMsg}
        </div>
      )}

      {/* Withdrawals Review */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 swas-card rounded-[14px] p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="swas-heading-section">Withdrawal Requests Queue</h3>
            <div className="flex gap-1.5">
              {(['open', 'failed', 'all'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setWdFilter(f)}
                  className={`px-3 py-1.5 rounded-[8px] text-[12px] font-semibold capitalize cursor-pointer ${
                    wdFilter === f
                      ? 'bg-[#102b50] text-white'
                      : 'bg-[#f3f6fa] text-[#42556f] hover:bg-[#e9f2ff]'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {visibleWithdrawals.length === 0 ? (
            <p className="swas-body text-[#75869d]">No withdrawals in this queue.</p>
          ) : (
            <div className="space-y-2.5">
              {visibleWithdrawals.map((w) => {
                const cur = w.currency || 'KES';
                const active = selectedWd?.id === w.id;
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => void handleInspectWithdrawal(w)}
                    className={`w-full text-left p-3.5 rounded-[10px] border transition cursor-pointer ${
                      active
                        ? 'bg-[#e9f2ff] border-[#1265c8]'
                        : 'bg-[#f9fbfe] border-[#e1e8f2] hover:border-[#b7cff0]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[14px] font-bold text-[#172b46]">
                          {w.institutionName || w.method} · {w.maskedDestination || w.destination}
                        </p>
                        <p className="swas-meta">
                          User: {w.userId.slice(0, 10)}... · Ref: {w.reference || w.id}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="block text-[14px] font-bold text-[#172b46] tabular-nums">
                          {formatCurrency(w.amountKes, cur)}
                        </span>
                        <span className="text-[11px] font-semibold text-[#1265c8]">
                          {WITHDRAWAL_STATUS_LABELS[w.status] || w.status}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="lg:col-span-5 swas-card rounded-[14px] p-6 space-y-4">
          <h3 className="swas-heading-section">Payout Inspection & Action</h3>
          {!selectedWd ? (
            <p className="swas-body text-[#75869d]">
              Select a withdrawal on the left to verify destination details, attempt automated provider dispatch, or record settled payout references.
            </p>
          ) : (
            <div className="space-y-3.5 text-[13px]">
              <div className="p-3.5 rounded-[10px] bg-[#f3f6fa] border border-[#dce5f0] space-y-1">
                <p>
                  <strong>Reference:</strong> {selectedWd.reference || selectedWd.id}
                </p>
                <p>
                  <strong>Institution:</strong> {selectedWd.institutionName || selectedWd.method}
                </p>
                <p>
                  <strong>Masked Dest:</strong> {selectedWd.maskedDestination || selectedWd.destination}
                </p>
                {rawDestination && (
                  <p className="break-all">
                    <strong>Verified Account Reference:</strong> {rawDestination}
                  </p>
                )}
                {selectedWd.cryptoNetwork && (
                  <p>
                    <strong>Crypto:</strong> {selectedWd.cryptoAsset || 'USDT'} ({selectedWd.cryptoNetwork})
                  </p>
                )}
                <p>
                  <strong>Gross / Net:</strong>{' '}
                  {formatCurrency(selectedWd.amountKes, selectedWd.currency || 'KES')} /{' '}
                  {formatCurrency(
                    selectedWd.netAmount ?? selectedWd.amountKes,
                    selectedWd.currency || 'KES'
                  )}
                </p>
              </div>

              <div>
                <label className="block swas-label mb-1">Provider Receipt / Bank Reference</label>
                <input
                  type="text"
                  maxLength={128}
                  value={provRefInput}
                  onChange={(e) => setProvRefInput(e.target.value)}
                  placeholder="Required before marking Paid (e.g. MPESA-QJK..., EFT-8912)"
                  className="w-full px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
                />
              </div>

              {selectedWd.category === 'cryptocurrency' && (
                <div>
                  <label className="block swas-label mb-1">Blockchain Tx Hash (Real On-Chain Only)</label>
                  <input
                    type="text"
                    maxLength={160}
                    value={txHashInput}
                    onChange={(e) => setTxHashInput(e.target.value)}
                    placeholder="0x... or TRON tx hash"
                    className="w-full px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
                  />
                </div>
              )}

              <div>
                <label className="block swas-label mb-1">Admin Review / Reconciliation Notes</label>
                <textarea
                  maxLength={400}
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="Optional audit note for user & ledger..."
                  className="w-full min-h-[72px] px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleTransition('approved')}
                  className="py-2 px-3 rounded-[8px] bg-[#e9f2ff] text-[#1265c8] text-[12px] font-semibold hover:bg-[#dcebff] cursor-pointer"
                >
                  Approve
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleAutomatedDispatch()}
                  className="py-2 px-3 rounded-[8px] bg-[#102b50] text-white text-[12px] font-semibold hover:bg-[#173b6d] cursor-pointer"
                >
                  Attempt API Payout
                </button>
                <button
                  type="button"
                  disabled={busy || selectedWd.status === 'paid' || selectedWd.status === 'PAID'}
                  onClick={() => void handleTransition('paid')}
                  className="py-2 px-3 rounded-[8px] bg-[#15966b] text-white text-[12px] font-semibold hover:brightness-95 disabled:opacity-50 cursor-pointer"
                >
                  Mark Manual Paid
                </button>
                <button
                  type="button"
                  disabled={busy || selectedWd.status === 'paid' || selectedWd.status === 'PAID'}
                  onClick={() => void handleTransition('rejected')}
                  className="py-2 px-3 rounded-[8px] bg-[#fff0f0] border border-[#e7c0c4] text-[#d34552] text-[12px] font-semibold hover:bg-[#ffe4e4] disabled:opacity-50 cursor-pointer"
                >
                  Reject
                </button>
                {selectedWd.status === 'failed' && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleTransition('requested')}
                    className="col-span-2 py-2 px-3 rounded-[8px] bg-[#fff8ec] border border-[#f5dca8] text-[#8a5708] text-[12px] font-semibold cursor-pointer"
                  >
                    Re-Queue Failed Payout for Retry
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pending Task Earnings Settlement Verification */}
      <div className="swas-card rounded-[14px] p-6 space-y-4">
        <div>
          <h3 className="swas-heading-section">Pending Earnings Settlement Confirmation</h3>
          <p className="swas-desc mt-0.5">
            Confirm client-approved task deliverables into workers&apos; verified withdrawable wallet balances once client payment receipt is verified.
          </p>
        </div>

        {pendingEarnings.length === 0 ? (
          <p className="swas-body text-[#75869d]">
            No pending worker earnings awaiting settlement confirmation.
          </p>
        ) : (
          <div className="space-y-3">
            {pendingEarnings.map((tx) => {
              const cur = tx.currency || 'KES';
              return (
                <div
                  key={tx.id}
                  className="p-4 rounded-[11px] bg-[#f9fbfe] border border-[#e1e8f2] flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div>
                    <p className="text-[14px] font-bold text-[#172b46]">{tx.taskTitle}</p>
                    <p className="swas-meta">
                      Worker: {tx.userId} · Ref: {tx.reference} ·{' '}
                      <strong className="text-[#172b46]">{formatCurrency(tx.amountKes, cur)}</strong>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={settleRefMap[tx.id] || ''}
                      onChange={(e) =>
                        setSettleRefMap((prev) => ({ ...prev, [tx.id]: e.target.value }))
                      }
                      placeholder="Receipt / Escrow Ref"
                      className="px-3 py-1.5 swas-input bg-white border border-[#d7e2ef] rounded-[8px]"
                    />
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleSettleEarning(tx)}
                      className="px-3.5 py-2 rounded-[8px] swas-btn-primary text-[12px] cursor-pointer"
                    >
                      Verify & Credit Wallet
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function AdminProvidersSection({
  providers,
  loading,
  errorMsg,
  onRunChecks,
}: {
  providers: ProviderIntegrationStatus[];
  loading: boolean;
  errorMsg: string | null;
  onRunChecks: () => void;
}) {
  return (
    <div className="swas-card rounded-[14px] p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="swas-heading-section">Modular Payment Provider Architecture</h3>
          <p className="swas-desc mt-0.5">
            Live backend status checks against configured environment credentials. Unconfigured providers honestly report NOT CONFIGURED.
          </p>
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={onRunChecks}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-[9px] swas-btn-primary swas-btn-text disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Running Live Checks...' : 'Run Live Connection Checks'}
        </button>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-[9px] bg-[#fff0f0] border border-[#f1c7c7] text-[13px] text-[#d34552]">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {providers.map((p) => {
          const isHealthy = p.statusLabel === 'AUTOMATED' || p.statusLabel === 'CONNECTED';
          return (
            <div
              key={p.id}
              className="p-5 rounded-[12px] bg-[#f9fbfe] border border-[#dce5f0] space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-[15px] font-bold text-[#172b46]">{p.name}</h4>
                  <p className="swas-meta">
                    {FINANCIAL_CATEGORY_LABELS[p.category]} · {p.supportedCountries.join(', ')} ·{' '}
                    {p.supportedCurrencies.join(', ')}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1 text-[12px] font-bold ${
                    isHealthy ? 'text-[#15966b]' : 'text-[#d99527]'
                  }`}
                >
                  {isHealthy ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <AlertTriangle className="w-4 h-4" />
                  )}
                  {p.statusLabel}
                </span>
              </div>

              <p className="text-[13px] text-[#42556f]">{p.detail}</p>

              <div className="pt-2 border-t border-[#e1e8f2] space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#75869d]">
                  Server Environment Requirements
                </p>
                <ul className="space-y-1 text-[12px] text-[#42556f] list-disc pl-4">
                  {p.setupRequirements.map((req) => (
                    <li key={req}>{req}</li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AdminFinancialConfigSection({
  financialConfig,
}: {
  financialConfig: FinancialPlatformConfig;
}) {
  const { firebaseUser } = useAuth();
  const [draft, setDraft] = useState<FinancialPlatformConfig>(financialConfig);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [newInstName, setNewInstName] = useState('');
  const [newInstCountry, setNewInstCountry] = useState('KE');
  const [newInstCurrency, setNewInstCurrency] = useState('KES');
  const [newInstCategory, setNewInstCategory] = useState<FinancialCategory>('banks');

  useEffect(() => {
    setDraft(financialConfig);
  }, [financialConfig]);

  const handleSave = async () => {
    if (!firebaseUser) return;
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      await saveFinancialConfig({
        adminUid: firebaseUser.uid,
        adminEmail: firebaseUser.email || undefined,
        config: draft,
      });
      setMsg('Financial configuration saved and audit logged.');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Unable to save financial config.');
    } finally {
      setBusy(false);
    }
  };

  const toggleCountry = (code: string) => {
    setDraft((prev) => ({
      ...prev,
      countries: prev.countries.map((c) => (c.code === code ? { ...c, enabled: !c.enabled } : c)),
    }));
  };

  const toggleCurrency = (code: string) => {
    setDraft((prev) => ({
      ...prev,
      currencies: prev.currencies.map((c) => (c.code === code ? { ...c, enabled: !c.enabled } : c)),
    }));
  };

  const updateInstitution = (
    id: string,
    patch: Partial<FinancialInstitutionConfig>
  ) => {
    setDraft((prev) => ({
      ...prev,
      institutions: prev.institutions.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    }));
  };

  const handleAddInstitution = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newInstName.trim();
    if (cleanName.length < 2) return;
    const id = `custom_${cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${Date.now()
      .toString(36)
      .slice(-4)}`;
    const shortCode = cleanName
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    const added: FinancialInstitutionConfig = {
      id,
      name: cleanName,
      shortCode: shortCode || 'BK',
      category: newInstCategory,
      providerKey: newInstCategory === 'banks' ? 'manual_bank' : 'manual_mobile',
      countries: [newInstCountry],
      currencies: [newInstCurrency],
      methodTypeLabel:
        newInstCategory === 'banks' ? 'Regional Bank Transfer' : FINANCIAL_CATEGORY_LABELS[newInstCategory],
      brandBg: '#102B50',
      brandFg: '#FFFFFF',
      availabilityStatus: 'manual_payout',
      enabled: true,
      automatedSupported: false,
      feeFlat: 0,
      feePercent: 0,
      minWithdrawal: newInstCurrency === 'KES' ? 500 : 10,
      maxWithdrawal: 1000000,
      processingSpeedLabel: 'Manual admin settlement',
      verificationRequirement: 'Valid beneficiary name and account identifier.',
      processingInstructions: 'Added by Super Administrator.',
    };
    setDraft((prev) => ({ ...prev, institutions: [added, ...prev.institutions] }));
    setNewInstName('');
  };

  return (
    <div className="space-y-6">
      {msg && (
        <div className="p-3.5 rounded-[10px] bg-[#eaf8f2] border border-[#bce8d4] text-[13px] text-[#15966b]">
          {msg}
        </div>
      )}
      {err && (
        <div className="p-3.5 rounded-[10px] bg-[#fff0f0] border border-[#f1c7c7] text-[13px] text-[#d34552]">
          {err}
        </div>
      )}

      <div className="swas-card rounded-[14px] p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="swas-heading-section">Global Countries, Currencies & Security Policies</h3>
            <p className="swas-desc mt-0.5">
              Control active countries, supported payout currencies, crypto availability, and identity re-verification policy.
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleSave()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-[9px] swas-btn-primary swas-btn-text disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {busy ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2.5">
            <h4 className="swas-label flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-[#1265c8]" />
              Supported Countries
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {draft.countries.map((c) => (
                <label
                  key={c.code}
                  className="flex items-center justify-between p-2.5 rounded-[9px] bg-[#f9fbfe] border border-[#e1e8f2] text-[13px] cursor-pointer"
                >
                  <span>
                    {c.name} ({c.defaultCurrency})
                  </span>
                  <input
                    type="checkbox"
                    checked={c.enabled}
                    onChange={() => toggleCountry(c.code)}
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2.5">
            <h4 className="swas-label">Enabled Currencies & Security</h4>
            <div className="grid grid-cols-3 gap-2">
              {draft.currencies.map((cur) => (
                <label
                  key={cur.code}
                  className="flex items-center justify-between p-2.5 rounded-[9px] bg-[#f9fbfe] border border-[#e1e8f2] text-[13px] cursor-pointer"
                >
                  <span className="font-semibold">{cur.code}</span>
                  <input
                    type="checkbox"
                    checked={cur.enabled}
                    onChange={() => toggleCurrency(cur.code)}
                  />
                </label>
              ))}
            </div>

            <div className="pt-2 space-y-2">
              <label className="flex items-center gap-2 text-[13px] text-[#42556f] cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.cryptoPayoutsEnabled}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, cryptoPayoutsEnabled: e.target.checked }))
                  }
                />
                Enable Cryptocurrency Payout Institutions (USDT / Binance Pay)
              </label>
              <label className="flex items-center gap-2 text-[13px] text-[#42556f] cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.requireReauthForPayoutAccountChanges}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      requireReauthForPayoutAccountChanges: e.target.checked,
                    }))
                  }
                />
                Require password / Google re-authentication before modifying payout accounts
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Add Custom Institution */}
      <form
        onSubmit={handleAddInstitution}
        className="swas-card rounded-[14px] p-5 flex flex-wrap items-end gap-3"
      >
        <div className="flex-1 min-w-[200px]">
          <label className="block swas-label mb-1">Add Bank / Regional Institution</label>
          <input
            type="text"
            required
            value={newInstName}
            onChange={(e) => setNewInstName(e.target.value)}
            placeholder="e.g. I&M Bank Kenya"
            className="w-full px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
          />
        </div>
        <div>
          <label className="block swas-label mb-1">Country</label>
          <select
            value={newInstCountry}
            onChange={(e) => setNewInstCountry(e.target.value)}
            className="px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
          >
            {draft.countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block swas-label mb-1">Currency</label>
          <select
            value={newInstCurrency}
            onChange={(e) => setNewInstCurrency(e.target.value)}
            className="px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
          >
            {draft.currencies.map((cur) => (
              <option key={cur.code} value={cur.code}>
                {cur.code}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block swas-label mb-1">Category</label>
          <select
            value={newInstCategory}
            onChange={(e) => setNewInstCategory(e.target.value as FinancialCategory)}
            className="px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
          >
            {(Object.keys(FINANCIAL_CATEGORY_LABELS) as FinancialCategory[]).map((k) => (
              <option key={k} value={k}>
                {FINANCIAL_CATEGORY_LABELS[k]}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 px-4 py-2 swas-btn-primary swas-btn-text rounded-[9px] cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Institution
        </button>
      </form>

      {/* Institutions Table */}
      <div className="swas-card rounded-[14px] p-6 space-y-4 overflow-x-auto">
        <h3 className="swas-heading-section">
          Configured Institutions ({draft.institutions.length})
        </h3>
        <table className="w-full text-left border-collapse swas-table min-w-[780px]">
          <thead>
            <tr className="border-b border-[#e1e8f2] text-[#75869d]">
              <th className="py-2 pr-3 font-semibold">Enabled</th>
              <th className="py-2 pr-3 font-semibold">Institution</th>
              <th className="py-2 pr-3 font-semibold">Status</th>
              <th className="py-2 pr-3 font-semibold">Flat Fee</th>
              <th className="py-2 pr-3 font-semibold">% Fee</th>
              <th className="py-2 pr-3 font-semibold">Min</th>
              <th className="py-2 font-semibold">Max</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e1e8f2]">
            {draft.institutions.map((inst) => (
              <tr key={inst.id}>
                <td className="py-2.5 pr-3">
                  <input
                    type="checkbox"
                    checked={inst.enabled}
                    onChange={(e) => updateInstitution(inst.id, { enabled: e.target.checked })}
                  />
                </td>
                <td className="py-2.5 pr-3">
                  <div className="font-semibold text-[#172b46]">{inst.name}</div>
                  <div className="swas-meta">
                    {inst.countries.join(', ')} · {inst.currencies.join(', ')}
                  </div>
                </td>
                <td className="py-2.5 pr-3">
                  <select
                    value={inst.availabilityStatus}
                    onChange={(e) =>
                      updateInstitution(inst.id, {
                        availabilityStatus: e.target.value as InstitutionAvailabilityStatus,
                      })
                    }
                    className="px-2 py-1 bg-[#f9fbfe] border border-[#d7e2ef] rounded-[7px] text-[12px]"
                  >
                    <option value="listed">Institution Listed</option>
                    <option value="manual_payout">Manual Payout Supported</option>
                    <option value="connected">Provider Connected</option>
                    <option value="automated">Automated Payout Enabled</option>
                    <option value="unavailable">Temporarily Unavailable</option>
                  </select>
                </td>
                <td className="py-2.5 pr-3">
                  <input
                    type="number"
                    min={0}
                    value={inst.feeFlat}
                    onChange={(e) =>
                      updateInstitution(inst.id, { feeFlat: Number(e.target.value || 0) })
                    }
                    className="w-20 px-2 py-1 bg-[#f9fbfe] border border-[#d7e2ef] rounded-[7px] tabular-nums"
                  />
                </td>
                <td className="py-2.5 pr-3">
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    max={25}
                    value={inst.feePercent}
                    onChange={(e) =>
                      updateInstitution(inst.id, { feePercent: Number(e.target.value || 0) })
                    }
                    className="w-16 px-2 py-1 bg-[#f9fbfe] border border-[#d7e2ef] rounded-[7px] tabular-nums"
                  />
                </td>
                <td className="py-2.5 pr-3">
                  <input
                    type="number"
                    min={1}
                    value={inst.minWithdrawal}
                    onChange={(e) =>
                      updateInstitution(inst.id, { minWithdrawal: Number(e.target.value || 1) })
                    }
                    className="w-24 px-2 py-1 bg-[#f9fbfe] border border-[#d7e2ef] rounded-[7px] tabular-nums"
                  />
                </td>
                <td className="py-2.5">
                  <input
                    type="number"
                    min={1}
                    value={inst.maxWithdrawal}
                    onChange={(e) =>
                      updateInstitution(inst.id, { maxWithdrawal: Number(e.target.value || 1) })
                    }
                    className="w-28 px-2 py-1 bg-[#f9fbfe] border border-[#d7e2ef] rounded-[7px] tabular-nums"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminAuditLogSection({ auditLogs }: { auditLogs: FinancialAuditLog[] }) {
  return (
    <div className="swas-card rounded-[14px] p-6 space-y-4">
      <div>
        <h3 className="swas-heading-section">Append-Only Financial Audit Logs</h3>
        <p className="swas-desc mt-0.5">
          Immutable log of withdrawal submissions, status transitions, config changes, and account updates.
        </p>
      </div>

      {auditLogs.length === 0 ? (
        <p className="swas-body text-[#75869d]">No financial audit entries recorded yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse swas-table">
            <thead>
              <tr className="border-b border-[#e1e8f2] text-[#75869d]">
                <th className="py-2.5 pr-4 font-semibold">Timestamp</th>
                <th className="py-2.5 pr-4 font-semibold">Actor</th>
                <th className="py-2.5 pr-4 font-semibold">Action</th>
                <th className="py-2.5 pr-4 font-semibold">Target</th>
                <th className="py-2.5 font-semibold">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e1e8f2]">
              {auditLogs.map((log) => (
                <tr key={log.id}>
                  <td className="py-2.5 pr-4 text-[#75869d] tabular-nums">
                    {log.createdAt?.toDate ? log.createdAt.toDate().toLocaleString('en-KE') : '—'}
                  </td>
                  <td className="py-2.5 pr-4 text-[#42556f]">
                    {log.actorEmail || log.actorId.slice(0, 10)}
                  </td>
                  <td className="py-2.5 pr-4 font-semibold text-[#172b46]">
                    {log.action.replace(/_/g, ' ')}
                  </td>
                  <td className="py-2.5 pr-4 text-[#42556f]">
                    {log.targetType} · {log.targetId.slice(0, 14)}
                  </td>
                  <td className="py-2.5 text-[#42556f]">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
