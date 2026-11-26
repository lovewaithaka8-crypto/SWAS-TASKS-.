import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownToLine,
  BookOpen,
  Building2,
  CheckCircle2,
  Clock,
  CreditCard,
  Globe,
  KeyRound,
  Landmark,
  Lock,
  Plus,
  Receipt,
  ShieldCheck,
  Smartphone,
  Star,
  Trash2,
  Wallet,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  AVAILABILITY_STATUS_LABELS,
  FINANCIAL_CATEGORY_LABELS,
  getCountryName,
  WITHDRAWAL_STATUS_LABELS,
} from '../lib/financialCatalog';
import {
  addPayoutAccount,
  cancelWithdrawalRequest,
  computeWithdrawalBreakdown,
  deletePayoutAccount,
  getAllCurrencyBalances,
  getCurrencyAvailableBalance,
  setDefaultPayoutAccount,
  submitFinancialWithdrawal,
  updatePayoutAccount,
  updateUserCountryPreference,
} from '../lib/financialService';
import { resolvePolicyBySlug } from '../lib/policies';
import { getPolicyAcceptanceState, recordPolicyAcceptances } from '../lib/policyService';
import { formatCurrency } from '../lib/validation';
import type {
  FinancialCategory,
  FinancialInstitutionConfig,
  FinancialPlatformConfig,
  LedgerTransaction,
  PayoutAccount,
  PolicyAcceptanceRecord,
  PolicyDocument,
  WalletAccount,
  WithdrawalRequest,
  WithdrawalStatus,
  WorkspaceRoute,
} from '../types/marketplace';
import { PolicyReaderModal } from './PolicyCentrePages';

interface FinancialCentrePagesProps {
  route: 'wallet' | 'payout-accounts' | 'transactions' | 'withdrawals' | 'payment-history';
  wallet: WalletAccount | null;
  transactions: LedgerTransaction[];
  withdrawals: WithdrawalRequest[];
  payoutAccounts: PayoutAccount[];
  financialConfig: FinancialPlatformConfig;
  policies?: PolicyDocument[];
  userAcceptances?: PolicyAcceptanceRecord[];
  onOpenPublicPolicy?: (slug?: string | null) => void;
  onNavigate: (route: WorkspaceRoute) => void;
}

function InstitutionEmblem({ inst }: { inst: FinancialInstitutionConfig }) {
  return (
    <div
      className="w-11 h-11 rounded-[10px] flex items-center justify-center font-display font-bold text-[13px] tracking-tight shrink-0 shadow-[0_3px_10px_rgba(16,43,80,0.12)]"
      style={{ backgroundColor: inst.brandBg, color: inst.brandFg }}
      aria-hidden="true"
    >
      {inst.shortCode}
    </div>
  );
}

function StatusTextBadge({ status }: { status: FinancialInstitutionConfig['availabilityStatus'] }) {
  const meta = AVAILABILITY_STATUS_LABELS[status];
  const color =
    status === 'automated' || status === 'connected'
      ? 'text-[#15966b]'
      : status === 'manual_payout'
        ? 'text-[#1265c8]'
        : status === 'listed'
          ? 'text-[#75869d]'
          : 'text-[#d34552]';
  return (
    <span className={`text-[12px] font-semibold ${color}`} title={meta.description}>
      {meta.label}
    </span>
  );
}

function WithdrawalStatusColor(status: WithdrawalStatus): string {
  switch (status) {
    case 'paid':
    case 'PAID':
      return 'text-[#15966b]';
    case 'approved':
    case 'processing':
    case 'APPROVED_FOR_PAYMENT':
    case 'PROCESSING':
      return 'text-[#1265c8]';
    case 'requested':
    case 'pending_verification':
    case 'PENDING_ADMIN_APPROVAL':
    case 'ON_HOLD':
      return 'text-[#d99527]';
    case 'failed':
    case 'rejected':
    case 'cancelled':
    case 'REJECTED':
    case 'CANCELLED':
      return 'text-[#d34552]';
    default:
      return 'text-[#75869d]';
  }
}

export function FinancialCentrePages({
  route,
  wallet,
  transactions,
  withdrawals,
  payoutAccounts,
  financialConfig,
  policies = [],
  userAcceptances = [],
  onOpenPublicPolicy,
  onNavigate,
}: FinancialCentrePagesProps) {
  const { firebaseUser, userPrivate, reauthenticateCurrentUser } = useAuth();
  const enabledCountries = useMemo(
    () => financialConfig.countries.filter((c) => c.enabled),
    [financialConfig.countries]
  );

  const [selectedCountry, setSelectedCountry] = useState<string>(
    userPrivate?.country || enabledCountries[0]?.code || 'KE'
  );
  const [selectedCurrency, setSelectedCurrency] = useState<string>(
    userPrivate?.preferredCurrency ||
      enabledCountries.find((c) => c.code === (userPrivate?.country || 'KE'))?.defaultCurrency ||
      'KES'
  );
  const [savingCountry, setSavingCountry] = useState(false);

  useEffect(() => {
    if (userPrivate?.country) {
      setSelectedCountry(userPrivate.country);
    }
    if (userPrivate?.preferredCurrency) {
      setSelectedCurrency(userPrivate.preferredCurrency);
    }
  }, [userPrivate?.country, userPrivate?.preferredCurrency]);

  const enabledCurrencies = useMemo(
    () => financialConfig.currencies.filter((c) => c.enabled),
    [financialConfig.currencies]
  );

  const countryInstitutions = useMemo(() => {
    return financialConfig.institutions.filter((inst) => {
      if (!inst.enabled) return false;
      if (!financialConfig.cryptoPayoutsEnabled && inst.category === 'cryptocurrency') return false;
      return inst.countries.includes(selectedCountry) || inst.countries.includes('GLOBAL');
    });
  }, [financialConfig, selectedCountry]);

  const currencyBalances = useMemo(() => getAllCurrencyBalances(wallet), [wallet]);

  const activeCurrencyAvailable = useMemo(
    () => getCurrencyAvailableBalance(wallet, selectedCurrency),
    [wallet, selectedCurrency]
  );

  const pendingByCurrency = useMemo(() => {
    const map: Record<string, number> = {};
    transactions
      .filter((t) => t.status === 'pending_confirmation' && t.kind !== 'withdrawal_request')
      .forEach((t) => {
        const cur = (t.currency || 'KES').toUpperCase();
        map[cur] = (map[cur] || 0) + Number(t.amountKes || 0);
      });
    return map;
  }, [transactions]);

  const activeCurrencyPending = pendingByCurrency[selectedCurrency] || 0;

  const [preselectedInstitutionId, setPreselectedInstitutionId] = useState<string | null>(null);

  const handleCountryChange = async (nextCountry: string) => {
    setSelectedCountry(nextCountry);
    const countryMeta = enabledCountries.find((c) => c.code === nextCountry);
    const nextCurrency = countryMeta?.defaultCurrency || selectedCurrency;
    setSelectedCurrency(nextCurrency);
    if (firebaseUser) {
      setSavingCountry(true);
      try {
        await updateUserCountryPreference(firebaseUser.uid, nextCountry, nextCurrency);
      } finally {
        setSavingCountry(false);
      }
    }
  };

  const handleCurrencyChange = async (nextCurrency: string) => {
    setSelectedCurrency(nextCurrency);
    if (firebaseUser) {
      try {
        await updateUserCountryPreference(firebaseUser.uid, selectedCountry, nextCurrency);
      } catch {
        // non-blocking
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Financial Centre Header & Currency-Isolated Balance Banner */}
      <div className="swas-hero rounded-[16px] p-6 md:p-7 text-white space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#a9c7ee]">
              SWAS FINANCIAL CENTRE
            </p>
            <h2 className="mt-1 font-display text-[22px] md:text-[26px] font-bold text-white">
              Wallet, Institutions & Payout Gateways
            </h2>
            <p className="mt-1 text-[13px] text-[#dce7f5]">
              Balances are strictly isolated per currency. Select your registered country to inspect verified payout institutions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-[10px] px-3 py-2 text-[13px]">
              <Globe className="w-4 h-4 text-[#a9c7ee]" />
              <span className="text-[#dce7f5] text-[12px]">Country:</span>
              <select
                value={selectedCountry}
                disabled={savingCountry}
                onChange={(e) => void handleCountryChange(e.target.value)}
                className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer [&>option]:text-[#172b46]"
              >
                {enabledCountries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-[10px] px-3 py-2 text-[13px]">
              <CreditCard className="w-4 h-4 text-[#a9c7ee]" />
              <span className="text-[#dce7f5] text-[12px]">Currency:</span>
              <select
                value={selectedCurrency}
                onChange={(e) => void handleCurrencyChange(e.target.value)}
                className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer [&>option]:text-[#172b46]"
              >
                {enabledCurrencies.map((cur) => (
                  <option key={cur.code} value={cur.code}>
                    {cur.code}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-white/15">
          <div className="bg-white/10 border border-white/15 rounded-[12px] p-4">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-medium text-[#c8dcf5]">
                Available Balance ({selectedCurrency})
              </span>
              <Wallet className="w-4 h-4 text-[#8be4c1]" />
            </div>
            <div className="mt-1.5 font-display text-[26px] font-bold text-white tabular-nums">
              {formatCurrency(activeCurrencyAvailable, selectedCurrency)}
            </div>
            <p className="mt-1 text-[11px] text-[#b7cde8]">
              Confirmed & withdrawable in {selectedCurrency}
            </p>
          </div>

          <div className="bg-white/10 border border-white/15 rounded-[12px] p-4">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-medium text-[#c8dcf5]">
                Pending Earnings ({selectedCurrency})
              </span>
              <Clock className="w-4 h-4 text-[#ffd485]" />
            </div>
            <div className="mt-1.5 font-display text-[26px] font-bold text-[#ffe2ab] tabular-nums">
              {formatCurrency(
                selectedCurrency === 'KES'
                  ? Number(wallet?.pendingEarnings ?? activeCurrencyPending)
                  : activeCurrencyPending,
                selectedCurrency
              )}
            </div>
            <p className="mt-1 text-[11px] text-[#b7cde8]">
              Under 90-min review / settlement · Reserved withdrawal:{' '}
              {formatCurrency(Number(wallet?.reservedWithdrawalFunds ?? 0), 'KES')}
            </p>
          </div>

          <div className="bg-white/10 border border-white/15 rounded-[12px] p-4 flex flex-col justify-between gap-3">
            <div>
              <span className="text-[12px] font-medium text-[#c8dcf5]">Saved Payout Accounts</span>
              <div className="mt-1 font-display text-[20px] font-bold text-white tabular-nums">
                {payoutAccounts.length} Linked
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onNavigate('withdrawals')}
                className="px-3.5 py-2 rounded-[8px] bg-white text-[#102b50] text-[13px] font-semibold hover:bg-[#e9f2ff] cursor-pointer"
              >
                Withdraw Funds
              </button>
              <button
                type="button"
                onClick={() => onNavigate('payout-accounts')}
                className="px-3.5 py-2 rounded-[8px] bg-[#1265c8] border border-white/25 text-white text-[13px] font-semibold hover:bg-[#0d4fa5] cursor-pointer"
              >
                Payout Accounts
              </button>
            </div>
          </div>
        </div>

        {/* Isolated Currency Strip if user holds balances in multiple currencies */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12px] text-[#c8dcf5]">
          <span className="font-semibold text-white">Currency Wallets:</span>
          {enabledCurrencies.map((cur) => {
            const bal = currencyBalances[cur.code] || 0;
            return (
              <button
                key={cur.code}
                type="button"
                onClick={() => void handleCurrencyChange(cur.code)}
                className={`tabular-nums cursor-pointer transition ${
                  selectedCurrency === cur.code
                    ? 'text-white font-bold underline underline-offset-4'
                    : 'text-[#b7cde8] hover:text-white'
                }`}
              >
                {cur.code}: {formatCurrency(bal, cur.code)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-navigation Tabs inside Financial Centre */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dce5f0] pb-3">
        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: 'wallet', label: 'Institutions & Overview', icon: Landmark },
              { id: 'payout-accounts', label: `Payout Accounts (${payoutAccounts.length})`, icon: Building2 },
              { id: 'withdrawals', label: `Withdraw Funds (${withdrawals.length})`, icon: ArrowDownToLine },
              { id: 'transactions', label: `Transactions (${transactions.length})`, icon: Receipt },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const active =
              route === tab.id || (route === 'payment-history' && tab.id === 'transactions');
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onNavigate(tab.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-[9px] text-[13px] font-semibold transition cursor-pointer ${
                  active
                    ? 'bg-[#1265c8] text-white shadow-[0_4px_12px_rgba(18,101,200,0.22)]'
                    : 'bg-white border border-[#dce5f0] text-[#42556f] hover:bg-[#e9f2ff] hover:text-[#1265c8]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {onOpenPublicPolicy && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] text-[#5b6d85]">
            <span className="inline-flex items-center gap-1 font-semibold text-[#172b46]">
              <BookOpen className="w-3.5 h-3.5 text-[#1265c8]" />
              Financial Policies:
            </span>
            {(
              [
                { slug: 'earnings', label: 'Earnings Policy' },
                { slug: 'withdrawals', label: 'Withdrawal Policy' },
                { slug: 'cryptocurrency', label: 'Cryptocurrency Policy' },
                { slug: 'payment-provider', label: 'Payment Provider Policy' },
              ] as const
            ).map((item, idx) => (
              <React.Fragment key={item.slug}>
                {idx > 0 && <span aria-hidden="true">·</span>}
                <button
                  type="button"
                  onClick={() => onOpenPublicPolicy(item.slug)}
                  className="text-[#1265c8] hover:underline font-medium cursor-pointer"
                >
                  {item.label}
                </button>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {route === 'wallet' && (
        <InstitutionsOverviewSection
          selectedCountry={selectedCountry}
          countryName={getCountryName(selectedCountry, enabledCountries)}
          institutions={countryInstitutions}
          transactions={transactions}
          onLinkInstitution={(instId) => {
            setPreselectedInstitutionId(instId);
            onNavigate('payout-accounts');
          }}
          onWithdrawWithInstitution={(instId) => {
            setPreselectedInstitutionId(instId);
            onNavigate('withdrawals');
          }}
        />
      )}

      {route === 'payout-accounts' && (
        <PayoutAccountsSection
          selectedCountry={selectedCountry}
          selectedCurrency={selectedCurrency}
          institutions={countryInstitutions}
          allCountries={enabledCountries}
          payoutAccounts={payoutAccounts}
          withdrawals={withdrawals}
          requireReauth={financialConfig.requireReauthForPayoutAccountChanges}
          preselectedInstitutionId={preselectedInstitutionId}
          onClearPreselected={() => setPreselectedInstitutionId(null)}
          onReauth={reauthenticateCurrentUser}
        />
      )}

      {route === 'withdrawals' && (
        <WithdrawalsSection
          selectedCountry={selectedCountry}
          selectedCurrency={selectedCurrency}
          wallet={wallet}
          institutions={countryInstitutions}
          payoutAccounts={payoutAccounts}
          withdrawals={withdrawals}
          policies={policies}
          userAcceptances={userAcceptances}
          preselectedInstitutionId={preselectedInstitutionId}
          onNavigate={onNavigate}
        />
      )}

      {(route === 'transactions' || route === 'payment-history') && (
        <TransactionsLedgerSection
          route={route}
          transactions={transactions}
        />
      )}
    </div>
  );
}

function InstitutionsOverviewSection({
  selectedCountry,
  countryName,
  institutions,
  transactions,
  onLinkInstitution,
  onWithdrawWithInstitution,
}: {
  selectedCountry: string;
  countryName: string;
  institutions: FinancialInstitutionConfig[];
  transactions: LedgerTransaction[];
  onLinkInstitution: (instId: string) => void;
  onWithdrawWithInstitution: (instId: string) => void;
}) {
  const [catFilter, setCatFilter] = useState<'all' | FinancialCategory>('all');

  const categories = useMemo(() => {
    const present = new Set(institutions.map((i) => i.category));
    return (Object.keys(FINANCIAL_CATEGORY_LABELS) as FinancialCategory[]).filter((c) =>
      present.has(c)
    );
  }, [institutions]);

  const filtered = useMemo(() => {
    if (catFilter === 'all') return institutions;
    return institutions.filter((i) => i.category === catFilter);
  }, [institutions, catFilter]);

  return (
    <div className="space-y-6">
      <div className="swas-card rounded-[14px] p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="swas-heading-section">
              Supported Financial Institutions — {countryName} ({selectedCountry})
            </h3>
            <p className="swas-desc mt-1">
              Regional banks, mobile money wallets, payment gateways, and digital asset channels filtered for your country.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setCatFilter('all')}
              className={`px-3 py-1.5 rounded-[8px] text-[12px] font-semibold cursor-pointer ${
                catFilter === 'all'
                  ? 'bg-[#102b50] text-white'
                  : 'bg-[#f3f6fa] text-[#42556f] hover:bg-[#e9f2ff]'
              }`}
            >
              All ({institutions.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCatFilter(cat)}
                className={`px-3 py-1.5 rounded-[8px] text-[12px] font-semibold cursor-pointer ${
                  catFilter === cat
                    ? 'bg-[#102b50] text-white'
                    : 'bg-[#f3f6fa] text-[#42556f] hover:bg-[#e9f2ff]'
                }`}
              >
                {FINANCIAL_CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((inst) => {
            const unavailable = inst.availabilityStatus === 'unavailable';
            const feeText =
              inst.feeFlat === 0 && inst.feePercent === 0
                ? 'No platform fee'
                : `${inst.feeFlat > 0 ? `${inst.feeFlat} ${inst.currencies[0]}` : ''}${
                    inst.feeFlat > 0 && inst.feePercent > 0 ? ' + ' : ''
                  }${inst.feePercent > 0 ? `${inst.feePercent}%` : ''}`;

            return (
              <div
                key={inst.id}
                className={`swas-card-hover rounded-[13px] p-5 flex flex-col justify-between gap-4 ${
                  unavailable ? 'opacity-70 bg-[#f9fbfe]' : ''
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <InstitutionEmblem inst={inst} />
                      <div className="min-w-0">
                        <h4 className="text-[15px] font-bold text-[#172b46] truncate">
                          {inst.name}
                        </h4>
                        <p className="swas-meta truncate">
                          {FINANCIAL_CATEGORY_LABELS[inst.category]} · {inst.methodTypeLabel}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-[12px] text-[#42556f] border-t border-[#e9eff7] pt-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#75869d]">Integration Status</span>
                      <StatusTextBadge status={inst.availabilityStatus} />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#75869d]">Currencies</span>
                      <span className="font-semibold text-[#172b46]">
                        {inst.currencies.join(' · ')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#75869d]">Configured Fee</span>
                      <span className="font-medium text-[#172b46] tabular-nums">{feeText}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#75869d]">Limits</span>
                      <span className="font-medium text-[#172b46] tabular-nums">
                        {inst.minWithdrawal.toLocaleString()} – {inst.maxWithdrawal.toLocaleString()}{' '}
                        {inst.currencies[0]}
                      </span>
                    </div>
                    <p className="pt-1 swas-desc">{inst.processingSpeedLabel}</p>
                    <p className="swas-meta">Requirements: {inst.verificationRequirement}</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    disabled={unavailable}
                    onClick={() => onLinkInstitution(inst.id)}
                    className="flex-1 py-2 px-3 rounded-[8px] bg-[#e9f2ff] text-[#1265c8] text-[12px] font-semibold hover:bg-[#dcebff] disabled:opacity-50 cursor-pointer"
                  >
                    Link Account
                  </button>
                  <button
                    type="button"
                    disabled={unavailable}
                    onClick={() => onWithdrawWithInstitution(inst.id)}
                    className="flex-1 py-2 px-3 rounded-[8px] swas-btn-primary text-[12px] disabled:opacity-50 cursor-pointer"
                  >
                    Withdraw
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Ledger Activity Preview */}
      <div className="swas-card rounded-[14px] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="swas-heading-section">Recent Ledger Activity</h3>
            <p className="swas-desc mt-0.5">
              Verified settlements, pending task credits, and withdrawal logs.
            </p>
          </div>
        </div>

        {transactions.length === 0 ? (
          <p className="swas-body text-[#75869d]">
            No ledger records yet. Approved task deliverables and payout requests appear here.
          </p>
        ) : (
          <div className="space-y-2.5">
            {transactions.slice(0, 6).map((tx) => {
              const cur = tx.currency || 'KES';
              return (
                <div
                  key={tx.id}
                  className="p-3.5 rounded-[10px] bg-[#f9fbfe] border border-[#e1e8f2] flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-[14px] font-semibold text-[#172b46]">{tx.taskTitle}</p>
                    <p className="swas-meta">
                      {tx.reference} · {tx.kind.replace(/_/g, ' ')} · {cur}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="block text-[14px] font-bold text-[#172b46] tabular-nums">
                      {formatCurrency(tx.amountKes, cur)}
                    </span>
                    <span
                      className={`text-[11px] font-semibold ${
                        tx.status === 'verified_settled' ? 'text-[#15966b]' : 'text-[#d99527]'
                      }`}
                    >
                      {tx.status === 'verified_settled' ? 'Verified Settled' : 'Pending Confirmation'}
                    </span>
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

function PayoutAccountsSection({
  selectedCountry,
  selectedCurrency,
  institutions,
  allCountries,
  payoutAccounts,
  withdrawals,
  requireReauth,
  preselectedInstitutionId,
  onClearPreselected,
  onReauth,
}: {
  selectedCountry: string;
  selectedCurrency: string;
  institutions: FinancialInstitutionConfig[];
  allCountries: { code: string; name: string }[];
  payoutAccounts: PayoutAccount[];
  withdrawals: WithdrawalRequest[];
  requireReauth: boolean;
  preselectedInstitutionId: string | null;
  onClearPreselected: () => void;
  onReauth: (password?: string) => Promise<void>;
}) {
  const { firebaseUser, userPrivate } = useAuth();
  const availableInstitutions = institutions.filter(
    (i) => i.enabled && i.availabilityStatus !== 'unavailable'
  );

  const [institutionId, setInstitutionId] = useState(
    preselectedInstitutionId || availableInstitutions[0]?.id || ''
  );
  const selectedInst = useMemo(
    () =>
      availableInstitutions.find((i) => i.id === institutionId) || availableInstitutions[0] || null,
    [availableInstitutions, institutionId]
  );

  useEffect(() => {
    if (preselectedInstitutionId && availableInstitutions.some((i) => i.id === preselectedInstitutionId)) {
      setInstitutionId(preselectedInstitutionId);
      onClearPreselected();
    }
  }, [preselectedInstitutionId, availableInstitutions, onClearPreselected]);

  const [currency, setCurrency] = useState(selectedInst?.currencies[0] || selectedCurrency);
  useEffect(() => {
    if (selectedInst && !selectedInst.currencies.includes(currency)) {
      setCurrency(selectedInst.currencies[0] || 'KES');
    }
  }, [selectedInst, currency]);

  const [holderName, setHolderName] = useState(userPrivate?.displayName || '');
  const [accountIdent, setAccountIdent] = useState('');
  const [branchOrCode, setBranchOrCode] = useState('');
  const [cryptoAsset, setCryptoAsset] = useState('USDT');
  const [cryptoNetwork, setCryptoNetwork] = useState('TRC20');
  const [makeDefault, setMakeDefault] = useState(payoutAccounts.length === 0);
  const [reauthPassword, setReauthPassword] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const hasPasswordProvider = Boolean(
    firebaseUser?.providerData.some((p) => p.providerId === 'password')
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !selectedInst) return;
    setBusy(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      if (requireReauth) {
        await onReauth(hasPasswordProvider ? reauthPassword : undefined);
      }

      if (editingId) {
        await updatePayoutAccount({
          userId: firebaseUser.uid,
          userEmail: firebaseUser.email || undefined,
          accountId: editingId,
          accountHolderName: holderName,
          accountIdentifier: accountIdent,
          bankBranchOrCode: branchOrCode,
          cryptoNetwork: selectedInst.category === 'cryptocurrency' ? cryptoNetwork : undefined,
          category: selectedInst.category,
        });
        setSuccessMsg('Payout account updated and queued for verification.');
        setEditingId(null);
      } else {
        await addPayoutAccount({
          userId: firebaseUser.uid,
          userEmail: firebaseUser.email || undefined,
          institution: selectedInst,
          country: selectedCountry,
          currency,
          accountHolderName: holderName,
          accountIdentifier: accountIdent,
          bankBranchOrCode: branchOrCode,
          cryptoAsset: selectedInst.category === 'cryptocurrency' ? cryptoAsset : undefined,
          cryptoNetwork: selectedInst.category === 'cryptocurrency' ? cryptoNetwork : undefined,
          makeDefault,
          existingAccounts: payoutAccounts,
        });
        setSuccessMsg(`Saved payout destination for ${selectedInst.name}.`);
      }

      setAccountIdent('');
      setBranchOrCode('');
      setReauthPassword('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to save payout account.');
    } finally {
      setBusy(false);
    }
  };

  const handleSetDefault = async (accId: string) => {
    if (!firebaseUser) return;
    setErrorMsg(null);
    try {
      await setDefaultPayoutAccount(firebaseUser.uid, accId, payoutAccounts);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to update default account.');
    }
  };

  const handleDelete = async (accId: string) => {
    if (!firebaseUser) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await deletePayoutAccount(firebaseUser.uid, accId, withdrawals);
      setSuccessMsg('Payout account removed.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to remove payout account.');
    }
  };

  const startEdit = (acc: PayoutAccount) => {
    setEditingId(acc.id);
    setInstitutionId(acc.institutionId);
    setCurrency(acc.currency);
    setHolderName(acc.accountHolderName);
    setBranchOrCode(acc.bankBranchOrCode || '');
    if (acc.cryptoNetwork) setCryptoNetwork(acc.cryptoNetwork);
    setAccountIdent('');
    setSuccessMsg(null);
    setErrorMsg(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-5 swas-card rounded-[14px] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="swas-heading-section">
            {editingId ? 'Update Payout Destination' : 'Link Payout Account'}
          </h3>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setAccountIdent('');
              }}
              className="text-[12px] font-semibold text-[#1265c8] hover:underline cursor-pointer"
            >
              Cancel Edit
            </button>
          )}
        </div>

        <p className="swas-desc">
          Saved account numbers are masked in all views. SWAS TASKS never stores or requests crypto private keys or recovery seed phrases.
        </p>

        {successMsg && (
          <div className="p-3 rounded-[9px] bg-[#eaf8f2] border border-[#bce8d4] text-[13px] text-[#15966b]">
            {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="p-3 rounded-[9px] bg-[#fff0f0] border border-[#f1c7c7] text-[13px] text-[#d34552]">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-3.5">
          {!editingId && (
            <div>
              <label className="block swas-label mb-1">Financial Institution / Gateway</label>
              <select
                value={selectedInst?.id || ''}
                onChange={(e) => setInstitutionId(e.target.value)}
                className="w-full px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
              >
                {availableInstitutions.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name} ({FINANCIAL_CATEGORY_LABELS[inst.category]})
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedInst && (
            <div className="p-3 rounded-[9px] bg-[#f3f6fa] border border-[#dce5f0] text-[12px] text-[#42556f]">
              <strong className="text-[#172b46]">{selectedInst.name}:</strong>{' '}
              {selectedInst.verificationRequirement}
            </div>
          )}

          {selectedInst && !editingId && (
            <div>
              <label className="block swas-label mb-1">Payout Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
              >
                {selectedInst.currencies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block swas-label mb-1">Legal Account Holder Name</label>
            <input
              type="text"
              required
              minLength={2}
              maxLength={100}
              value={holderName}
              onChange={(e) => setHolderName(e.target.value)}
              placeholder="Full name matching bank / wallet registration"
              className="w-full px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
            />
          </div>

          {selectedInst?.category === 'cryptocurrency' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block swas-label mb-1">Asset</label>
                <select
                  value={cryptoAsset}
                  onChange={(e) => setCryptoAsset(e.target.value)}
                  className="w-full px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
                >
                  {(selectedInst.cryptoAssets || ['USDT']).map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block swas-label mb-1">Network</label>
                <select
                  value={cryptoNetwork}
                  onChange={(e) => setCryptoNetwork(e.target.value)}
                  className="w-full px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
                >
                  {(selectedInst.cryptoNetworks || ['TRC20', 'ERC20', 'BEP20']).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div>
            <label className="block swas-label mb-1">
              {selectedInst?.category === 'cryptocurrency'
                ? `Public ${cryptoAsset} Deposit Address (${cryptoNetwork})`
                : selectedInst?.category === 'mobile_money'
                  ? 'Registered Mobile Money Phone Number'
                  : 'Account Number / IBAN / Wallet ID'}
            </label>
            <input
              type="text"
              required
              minLength={4}
              maxLength={160}
              value={accountIdent}
              onChange={(e) => setAccountIdent(e.target.value)}
              placeholder={
                selectedInst?.category === 'cryptocurrency'
                  ? cryptoNetwork === 'TRC20'
                    ? 'T...'
                    : '0x...'
                  : selectedInst?.category === 'mobile_money'
                    ? '+254 7XX XXX XXX'
                    : 'Account number or IBAN'
              }
              className="w-full px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
            />
          </div>

          {(selectedInst?.category === 'banks' ||
            selectedInst?.category === 'international_transfers' ||
            selectedInst?.category === 'payment_gateways') && (
            <div>
              <label className="block swas-label mb-1">
                Branch / Bank Code / SWIFT BIC (Optional)
              </label>
              <input
                type="text"
                maxLength={64}
                value={branchOrCode}
                onChange={(e) => setBranchOrCode(e.target.value)}
                placeholder="e.g. EQBLKENA or Branch Code"
                className="w-full px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
              />
            </div>
          )}

          {!editingId && (
            <label className="flex items-center gap-2 text-[13px] text-[#42556f] cursor-pointer">
              <input
                type="checkbox"
                checked={makeDefault}
                onChange={(e) => setMakeDefault(e.target.checked)}
                className="rounded border-[#dce5f0]"
              />
              Set as default payout destination
            </label>
          )}

          {requireReauth && (
            <div className="p-3 rounded-[9px] bg-[#fff8ec] border border-[#f5dca8] space-y-2">
              <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#8a5708]">
                <Lock className="w-3.5 h-3.5" />
                Identity Re-Verification Required
              </div>
              {hasPasswordProvider ? (
                <input
                  type="password"
                  required
                  value={reauthPassword}
                  onChange={(e) => setReauthPassword(e.target.value)}
                  placeholder="Enter your account password to confirm"
                  className="w-full px-3 py-2 swas-input bg-white border border-[#e6cc93] rounded-[8px]"
                />
              ) : (
                <p className="text-[11px] text-[#8a5708]">
                  Submitting will prompt Google Sign-In confirmation to protect your payout destination.
                </p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={busy || !selectedInst}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 swas-btn-primary swas-btn-text rounded-[9px] disabled:opacity-50 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {busy ? 'Verifying & Saving...' : editingId ? 'Update Payout Account' : 'Save Payout Account'}
          </button>
        </form>
      </div>

      <div className="lg:col-span-7 swas-card rounded-[14px] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="swas-heading-section">Saved Payout Accounts</h3>
            <p className="swas-desc mt-0.5">
              All saved bank, mobile money, gateway, and digital wallet accounts (masked for security).
            </p>
          </div>
        </div>

        {payoutAccounts.length === 0 ? (
          <div className="p-8 rounded-[12px] bg-[#f9fbfe] border border-[#e1e8f2] text-center space-y-2">
            <Building2 className="w-7 h-7 text-[#1265c8] mx-auto" />
            <p className="swas-body font-medium text-[#172b46]">No payout accounts saved yet</p>
            <p className="swas-desc">
              Link a bank account, mobile money wallet, or supported payout address on the left to enable guided withdrawals.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {payoutAccounts.map((acc) => (
              <div
                key={acc.id}
                className="p-4 rounded-[11px] bg-[#f9fbfe] border border-[#e1e8f2] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[14px] font-bold text-[#172b46]">
                      {acc.institutionName}
                    </span>
                    <span className="text-[12px] font-semibold text-[#1265c8]">
                      {acc.maskedAccount}
                    </span>
                    {acc.isDefault && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#15966b]">
                        <Star className="w-3 h-3 fill-[#15966b]" />
                        Default
                      </span>
                    )}
                  </div>
                  <p className="swas-meta">
                    {acc.accountHolderName} · {getCountryName(acc.country, allCountries as never)} ·{' '}
                    {acc.currency}
                    {acc.cryptoNetwork ? ` · ${acc.cryptoAsset || 'USDT'} (${acc.cryptoNetwork})` : ''}
                    {acc.bankBranchOrCode ? ` · Code: ${acc.bankBranchOrCode}` : ''}
                  </p>
                  <p className="text-[11px] font-semibold capitalize text-[#d99527]">
                    Verification: {acc.verificationStatus.replace('_', ' ')}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {!acc.isDefault && (
                    <button
                      type="button"
                      onClick={() => void handleSetDefault(acc.id)}
                      className="px-2.5 py-1.5 rounded-[7px] bg-white border border-[#dce5f0] text-[12px] font-semibold text-[#42556f] hover:bg-[#e9f2ff] hover:text-[#1265c8] cursor-pointer"
                    >
                      Set Default
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => startEdit(acc)}
                    className="px-2.5 py-1.5 rounded-[7px] bg-white border border-[#dce5f0] text-[12px] font-semibold text-[#42556f] hover:bg-[#e9f2ff] hover:text-[#1265c8] cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(acc.id)}
                    aria-label="Delete payout account"
                    className="p-1.5 rounded-[7px] bg-white border border-[#dce5f0] text-[#d34552] hover:bg-[#fff0f0] cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function WithdrawalsSection({
  selectedCountry,
  selectedCurrency,
  wallet,
  institutions,
  payoutAccounts,
  withdrawals,
  policies,
  userAcceptances,
  preselectedInstitutionId,
  onNavigate,
}: {
  selectedCountry: string;
  selectedCurrency: string;
  wallet: WalletAccount | null;
  institutions: FinancialInstitutionConfig[];
  payoutAccounts: PayoutAccount[];
  withdrawals: WithdrawalRequest[];
  policies: PolicyDocument[];
  userAcceptances: PolicyAcceptanceRecord[];
  preselectedInstitutionId: string | null;
  onNavigate: (route: WorkspaceRoute) => void;
}) {
  const { firebaseUser } = useAuth();
  const availableInstitutions = useMemo(
    () => institutions.filter((i) => i.enabled && i.availabilityStatus !== 'unavailable'),
    [institutions]
  );

  const withdrawalPolicy = useMemo(
    () => resolvePolicyBySlug(policies, 'withdrawals'),
    [policies]
  );
  const withdrawalPolicyState = useMemo(
    () =>
      withdrawalPolicy
        ? getPolicyAcceptanceState(withdrawalPolicy, userAcceptances)
        : null,
    [withdrawalPolicy, userAcceptances]
  );
  const needsWithdrawalPolicyConsent = Boolean(
    withdrawalPolicy && withdrawalPolicyState && !withdrawalPolicyState.acceptedCurrentVersion
  );

  const [selectedInstId, setSelectedInstId] = useState(
    preselectedInstitutionId || payoutAccounts.find((p) => p.isDefault)?.institutionId || availableInstitutions[0]?.id || ''
  );

  const selectedInst = useMemo(
    () =>
      availableInstitutions.find((i) => i.id === selectedInstId) || availableInstitutions[0] || null,
    [availableInstitutions, selectedInstId]
  );

  const matchingAccounts = useMemo(() => {
    if (!selectedInst) return [];
    return payoutAccounts.filter((p) => p.institutionId === selectedInst.id);
  }, [payoutAccounts, selectedInst]);

  const [selectedAccountId, setSelectedAccountId] = useState(
    matchingAccounts.find((a) => a.isDefault)?.id || matchingAccounts[0]?.id || ''
  );

  useEffect(() => {
    const def = matchingAccounts.find((a) => a.isDefault) || matchingAccounts[0];
    setSelectedAccountId(def ? def.id : '');
  }, [selectedInst?.id, matchingAccounts.length]);

  const selectedAccount = useMemo(
    () => matchingAccounts.find((a) => a.id === selectedAccountId) || matchingAccounts[0] || null,
    [matchingAccounts, selectedAccountId]
  );

  const wdCurrency = selectedAccount?.currency || selectedInst?.currencies[0] || selectedCurrency;
  const availableBalance = getCurrencyAvailableBalance(wallet, wdCurrency);

  const [amountRaw, setAmountRaw] = useState('');
  const [cryptoAck, setCryptoAck] = useState(false);
  const [policyAcceptedTick, setPolicyAcceptedTick] = useState(false);
  const [readerPolicy, setReaderPolicy] = useState<PolicyDocument | null>(null);
  const [stepConfirm, setStepConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ reference: string; amount: number; currency: string } | null>(null);

  const numericAmount = Number(amountRaw || 0);
  const breakdown = selectedInst
    ? computeWithdrawalBreakdown(numericAmount, selectedInst)
    : { feeAmount: 0, netAmount: 0, valid: false, reason: 'Select a payout institution.' };

  const handleReviewStep = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!selectedInst || !selectedAccount) {
      setErrorMsg('Link and select a payout account for this institution first.');
      return;
    }
    if (!breakdown.valid) {
      setErrorMsg(breakdown.reason || 'Enter a valid amount.');
      return;
    }
    if (numericAmount > availableBalance) {
      setErrorMsg(
        `Insufficient verified ${wdCurrency} balance (${formatCurrency(availableBalance, wdCurrency)}).`
      );
      return;
    }
    if (selectedInst.category === 'cryptocurrency' && !cryptoAck) {
      setErrorMsg('Please confirm the cryptocurrency network & irreversible transfer warning.');
      return;
    }
    if (needsWithdrawalPolicyConsent && !policyAcceptedTick) {
      setErrorMsg(
        `Please read and actively accept the Withdrawal Policy (v${withdrawalPolicy?.version || ''}) before proceeding.`
      );
      return;
    }
    setStepConfirm(true);
  };

  const handleConfirmSubmit = async () => {
    if (!firebaseUser || !selectedInst || !selectedAccount) return;
    if (needsWithdrawalPolicyConsent && !policyAcceptedTick) {
      setErrorMsg('Please accept the current Withdrawal Policy before submitting.');
      return;
    }
    setBusy(true);
    setErrorMsg(null);
    try {
      if (needsWithdrawalPolicyConsent && withdrawalPolicy && policyAcceptedTick) {
        await recordPolicyAcceptances(firebaseUser.uid, [
          { policy: withdrawalPolicy, context: 'withdrawal_request' },
        ]);
      }
      const res = await submitFinancialWithdrawal({
        userId: firebaseUser.uid,
        userEmail: firebaseUser.email || undefined,
        wallet,
        currency: wdCurrency,
        amount: numericAmount,
        country: selectedCountry,
        institution: selectedInst,
        payoutAccount: selectedAccount,
        cryptoIrreversibleConfirmed: cryptoAck,
      });
      setSuccessInfo({ reference: res.reference, amount: numericAmount, currency: wdCurrency });
      setAmountRaw('');
      setCryptoAck(false);
      setPolicyAcceptedTick(false);
      setStepConfirm(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to submit withdrawal.');
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async (w: WithdrawalRequest) => {
    if (!firebaseUser) return;
    try {
      await cancelWithdrawalRequest(firebaseUser.uid, w);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to cancel withdrawal.');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-5 swas-card rounded-[14px] p-6 space-y-4">
        <div>
          <h3 className="swas-heading-section">Guided Payout Withdrawal</h3>
          <p className="swas-desc mt-0.5">
            Available {wdCurrency}: <strong className="text-[#15966b]">{formatCurrency(availableBalance, wdCurrency)}</strong>
          </p>
        </div>

        {successInfo && (
          <div className="p-4 rounded-[10px] bg-[#eaf8f2] border border-[#bce8d4] space-y-1">
            <div className="flex items-center gap-2 text-[13px] font-bold text-[#15966b]">
              <CheckCircle2 className="w-4 h-4" />
              Withdrawal Submitted · {successInfo.reference}
            </div>
            <p className="text-[12px] text-[#285e47]">
              Request for {formatCurrency(successInfo.amount, successInfo.currency)} logged for processing. Track live status on the right.
            </p>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 rounded-[9px] bg-[#fff0f0] border border-[#f1c7c7] text-[13px] text-[#d34552]">
            {errorMsg}
          </div>
        )}

        {!stepConfirm ? (
          <form onSubmit={handleReviewStep} className="space-y-3.5">
            <div>
              <label className="block swas-label mb-1">1. Select Country Institution</label>
              <select
                value={selectedInst?.id || ''}
                onChange={(e) => {
                  setSelectedInstId(e.target.value);
                  setStepConfirm(false);
                }}
                className="w-full px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
              >
                {availableInstitutions.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name} ({inst.currencies.join('/')})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="swas-label">2. Select Saved Payout Account</label>
                <button
                  type="button"
                  onClick={() => onNavigate('payout-accounts')}
                  className="text-[12px] font-semibold text-[#1265c8] hover:underline cursor-pointer"
                >
                  + Add / Manage Accounts
                </button>
              </div>
              {matchingAccounts.length === 0 ? (
                <div className="p-3 rounded-[9px] bg-[#fff8ec] border border-[#f5dca8] text-[12px] text-[#8a5708]">
                  No saved account linked for <strong>{selectedInst?.name}</strong>.{' '}
                  <button
                    type="button"
                    onClick={() => onNavigate('payout-accounts')}
                    className="font-semibold underline cursor-pointer"
                  >
                    Link an account now
                  </button>
                  .
                </div>
              ) : (
                <select
                  value={selectedAccount?.id || ''}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
                >
                  {matchingAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.accountHolderName} · {acc.maskedAccount} ({acc.currency})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block swas-label mb-1">3. Withdrawal Amount ({wdCurrency})</label>
              <input
                type="number"
                step="any"
                required
                min={selectedInst?.minWithdrawal || 1}
                max={Math.max(selectedInst?.minWithdrawal || 1, availableBalance)}
                value={amountRaw}
                onChange={(e) => setAmountRaw(e.target.value)}
                placeholder={`Min ${selectedInst?.minWithdrawal || 50}`}
                className="w-full px-3 py-2 swas-input tabular-nums bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
              />
            </div>

            {selectedInst && numericAmount > 0 && (
              <div className="p-3.5 rounded-[10px] bg-[#f3f6fa] border border-[#dce5f0] space-y-1.5 text-[12px]">
                <div className="flex justify-between">
                  <span className="text-[#75869d]">Requested Amount</span>
                  <span className="font-semibold text-[#172b46] tabular-nums">
                    {formatCurrency(numericAmount, wdCurrency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#75869d]">Configured Fee</span>
                  <span className="font-semibold text-[#172b46] tabular-nums">
                    {formatCurrency(breakdown.feeAmount, wdCurrency)}
                  </span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-[#dce5f0]">
                  <span className="font-semibold text-[#172b46]">Net Payout Amount</span>
                  <span className="font-bold text-[#15966b] tabular-nums">
                    {formatCurrency(breakdown.netAmount, wdCurrency)}
                  </span>
                </div>
                <p className="pt-1 swas-meta">{selectedInst.processingSpeedLabel}</p>
              </div>
            )}

            {selectedInst?.category === 'cryptocurrency' && (
              <div className="p-3.5 rounded-[10px] bg-[#fff8ec] border border-[#f5dca8] space-y-2 text-[12px] text-[#8a5708]">
                <div className="flex items-center gap-1.5 font-semibold">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Irreversible Cryptocurrency Transfer Notice
                </div>
                <p>
                  Asset: <strong>{selectedAccount?.cryptoAsset || 'USDT'}</strong> · Network:{' '}
                  <strong>{selectedAccount?.cryptoNetwork || 'TRC20'}</strong>. Sending funds to the wrong network or wallet cannot be reversed.
                </p>
                <label className="flex items-start gap-2 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={cryptoAck}
                    onChange={(e) => setCryptoAck(e.target.checked)}
                    className="mt-0.5"
                  />
                  I confirm the asset, network, and public deposit address are accurate and understand blockchain transfers are irreversible.
                </label>
              </div>
            )}

            {needsWithdrawalPolicyConsent && withdrawalPolicy && (
              <div className="p-3.5 rounded-[10px] bg-[#f4f8ff] border border-[#b7cff0] space-y-2 text-[12px] text-[#172b46]">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-[#102b50]">
                    {withdrawalPolicyState?.needsRenewal
                      ? `Updated Withdrawal Policy (v${withdrawalPolicy.version}) Renewal Required`
                      : `Withdrawal Policy (v${withdrawalPolicy.version}) Acceptance Required`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setReaderPolicy(withdrawalPolicy)}
                    className="text-[#1265c8] font-semibold hover:underline cursor-pointer shrink-0"
                  >
                    Read Policy
                  </button>
                </div>
                <label className="flex items-start gap-2 cursor-pointer text-[#2a3f5d]">
                  <input
                    type="checkbox"
                    checked={policyAcceptedTick}
                    onChange={(e) => setPolicyAcceptedTick(e.target.checked)}
                    className="mt-0.5 rounded border-[#dce5f0]"
                  />
                  <span>
                    I have read and actively accept the{' '}
                    <button
                      type="button"
                      onClick={() => setReaderPolicy(withdrawalPolicy)}
                      className="text-[#1265c8] font-semibold hover:underline cursor-pointer"
                    >
                      {withdrawalPolicy.title}
                    </button>{' '}
                    (v{withdrawalPolicy.version}, effective {withdrawalPolicy.effectiveDate}).
                  </span>
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={!selectedAccount || availableBalance < (selectedInst?.minWithdrawal || 1)}
              className="w-full py-2.5 swas-btn-primary swas-btn-text rounded-[9px] disabled:opacity-50 cursor-pointer"
            >
              Review Withdrawal Summary
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-[11px] bg-[#e9f2ff] border border-[#b7cff0] space-y-2 text-[13px]">
              <h4 className="font-bold text-[#102b50]">Confirm Payout Request</h4>
              <p className="text-[#42556f]">
                Institution: <strong className="text-[#172b46]">{selectedInst?.name}</strong>
              </p>
              <p className="text-[#42556f]">
                Destination:{' '}
                <strong className="text-[#172b46]">
                  {selectedAccount?.accountHolderName} ({selectedAccount?.maskedAccount})
                </strong>
              </p>
              <p className="text-[#42556f]">
                Gross Amount:{' '}
                <strong className="tabular-nums text-[#172b46]">
                  {formatCurrency(numericAmount, wdCurrency)}
                </strong>
              </p>
              <p className="text-[#42556f]">
                Fee:{' '}
                <strong className="tabular-nums text-[#172b46]">
                  {formatCurrency(breakdown.feeAmount, wdCurrency)}
                </strong>
              </p>
              <p className="text-[#15966b] font-bold">
                Final Net Payout:{' '}
                <span className="tabular-nums">
                  {formatCurrency(breakdown.netAmount, wdCurrency)}
                </span>
              </p>
              <p className="swas-meta">{selectedInst?.processingInstructions}</p>
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                disabled={busy}
                onClick={() => setStepConfirm(false)}
                className="flex-1 py-2.5 rounded-[9px] bg-[#f3f6fa] border border-[#dce5f0] text-[#42556f] swas-btn-text cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleConfirmSubmit()}
                className="flex-1 py-2.5 rounded-[9px] swas-btn-primary swas-btn-text disabled:opacity-50 cursor-pointer"
              >
                {busy ? 'Submitting...' : 'Confirm & Submit'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Withdrawal Tracking List */}
      <div className="lg:col-span-7 swas-card rounded-[14px] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="swas-heading-section">Withdrawal Requests & Live Tracking</h3>
            <p className="swas-desc mt-0.5">
              Track verification, approval, provider dispatch, and settled receipts.
            </p>
          </div>
        </div>

        {withdrawals.length === 0 ? (
          <p className="swas-body text-[#75869d]">No withdrawal requests submitted yet.</p>
        ) : (
          <div className="space-y-3">
            {withdrawals.map((w) => {
              const cur = w.currency || 'KES';
              const canCancel =
                w.status === 'requested' ||
                w.status === 'pending_verification' ||
                w.status === 'PENDING_ADMIN_APPROVAL';
              return (
                <div
                  key={w.id}
                  className="p-4 rounded-[11px] bg-[#f9fbfe] border border-[#e1e8f2] space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[14px] font-bold text-[#172b46]">
                        {w.institutionName || w.method} · {w.maskedDestination || w.destination}
                      </p>
                      <p className="swas-meta">
                        Ref: {w.reference || w.id} ·{' '}
                        {w.createdAt?.toDate ? w.createdAt.toDate().toLocaleString('en-KE') : 'Recently'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="block text-[15px] font-bold text-[#172b46] tabular-nums">
                        {formatCurrency(w.amountKes, cur)}
                      </span>
                      <span className={`text-[12px] font-semibold ${WithdrawalStatusColor(w.status)}`}>
                        {WITHDRAWAL_STATUS_LABELS[w.status] || w.status}
                      </span>
                    </div>
                  </div>

                  {(typeof w.feeAmount === 'number' || w.providerReference || w.txHash || w.reviewNotes) && (
                    <div className="pt-2 border-t border-[#e8eef6] flex flex-wrap items-center justify-between gap-2 text-[12px] text-[#42556f]">
                      <div className="space-y-0.5">
                        {typeof w.netAmount === 'number' && (
                          <span>
                            Fee: {formatCurrency(w.feeAmount || 0, cur)} · Net:{' '}
                            <strong>{formatCurrency(w.netAmount, cur)}</strong>
                          </span>
                        )}
                        {w.providerReference && (
                          <p className="swas-meta">Provider Ref: {w.providerReference}</p>
                        )}
                        {w.txHash && <p className="swas-meta">Tx Hash: {w.txHash}</p>}
                        {w.reviewNotes && (
                          <p className="text-[12px] text-[#42556f]">Note: {w.reviewNotes}</p>
                        )}
                      </div>

                      {canCancel && (
                        <button
                          type="button"
                          onClick={() => void handleCancel(w)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[7px] bg-white border border-[#e7c0c4] text-[#d34552] text-[12px] font-semibold hover:bg-[#fff0f0] cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Cancel
                        </button>
                      )}
                    </div>
                  )}

                  {canCancel && typeof w.feeAmount !== 'number' && !w.reviewNotes && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => void handleCancel(w)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[7px] bg-white border border-[#e7c0c4] text-[#d34552] text-[12px] font-semibold hover:bg-[#fff0f0] cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Cancel Request
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <PolicyReaderModal
        policy={readerPolicy}
        onClose={() => setReaderPolicy(null)}
        acceptedRecord={withdrawalPolicyState?.latestAcceptedRecord || null}
        acceptedCurrentVersion={Boolean(withdrawalPolicyState?.acceptedCurrentVersion)}
        onAcceptPolicy={
          firebaseUser && readerPolicy
            ? async (pol) => {
                await recordPolicyAcceptances(firebaseUser.uid, [
                  { policy: pol, context: 'withdrawal_request' },
                ]);
                setPolicyAcceptedTick(true);
                setReaderPolicy(null);
              }
            : undefined
        }
      />
    </div>
  );
}

function TransactionsLedgerSection({
  route,
  transactions,
}: {
  route: 'transactions' | 'payment-history';
  transactions: LedgerTransaction[];
}) {
  const [txFilter, setTxFilter] = useState<'all' | 'pending_confirmation' | 'verified_settled'>('all');

  const filteredTx = useMemo(() => {
    if (txFilter === 'all') return transactions;
    return transactions.filter((t) => t.status === txFilter);
  }, [transactions, txFilter]);

  return (
    <div className="swas-card rounded-[14px] p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="swas-heading-section">
            {route === 'payment-history' ? 'Assignment Payment History' : 'Financial Ledger'}
          </h3>
          <p className="swas-desc mt-0.5">
            Append-only financial records across earnings, payments, withdrawal requests, and settlements.
          </p>
        </div>
        <div className="flex gap-1.5">
          {(['all', 'pending_confirmation', 'verified_settled'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setTxFilter(f)}
              className={`px-3 py-1.5 swas-btn-text rounded-[8px] cursor-pointer ${
                txFilter === f
                  ? 'bg-[#1265c8] text-white'
                  : 'bg-[#f3f6fa] text-[#42556f] hover:bg-[#e9f2ff]'
              }`}
            >
              {f === 'all' ? 'All' : f === 'pending_confirmation' ? 'Pending' : 'Settled'}
            </button>
          ))}
        </div>
      </div>

      {filteredTx.length === 0 ? (
        <p className="swas-body text-center py-6 text-[#75869d]">
          No ledger entries match this filter yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse swas-table">
            <thead>
              <tr className="border-b border-[#e1e8f2] text-[#75869d]">
                <th className="py-2.5 pr-4 font-semibold">Reference</th>
                <th className="py-2.5 pr-4 font-semibold">Description</th>
                <th className="py-2.5 pr-4 font-semibold">Type</th>
                <th className="py-2.5 pr-4 font-semibold">Amount</th>
                <th className="py-2.5 pr-4 font-semibold">Status</th>
                <th className="py-2.5 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e1e8f2]">
              {filteredTx.map((tx) => {
                const cur = tx.currency || 'KES';
                return (
                  <tr key={tx.id}>
                    <td className="py-3 pr-4 font-medium text-[#172b46]">
                      <div>{tx.reference}</div>
                      {tx.providerReference && (
                        <div className="swas-meta">Prov: {tx.providerReference}</div>
                      )}
                    </td>
                    <td className="py-3 pr-4 font-medium text-[#42556f]">
                      <div>{tx.taskTitle}</div>
                      {tx.auditNote && <div className="swas-meta">{tx.auditNote}</div>}
                    </td>
                    <td className="py-3 pr-4 capitalize text-[#42556f]">
                      {tx.kind.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3 pr-4 font-semibold text-[#172b46] tabular-nums">
                      {formatCurrency(tx.amountKes, cur)}
                    </td>
                    <td className="py-3 pr-4 font-semibold">
                      <span
                        className={
                          tx.status === 'verified_settled' ? 'text-[#15966b]' : 'text-[#d99527]'
                        }
                      >
                        {tx.status === 'verified_settled' ? 'Verified Settled' : 'Pending Confirmation'}
                      </span>
                    </td>
                    <td className="py-3 text-[#75869d] tabular-nums">
                      {tx.createdAt?.toDate ? tx.createdAt.toDate().toLocaleDateString('en-KE') : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
