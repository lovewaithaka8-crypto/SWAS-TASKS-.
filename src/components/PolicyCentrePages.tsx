import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  History,
  Printer,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { resolvePolicyBySlug } from '../lib/policies';
import {
  BASELINE_POLICY_REVISIONS,
  getPolicyAcceptanceState,
  recordPolicyAcceptances,
} from '../lib/policyService';
import type {
  PolicyAcceptanceRecord,
  PolicyCategory,
  PolicyDocument,
  PolicyRevision,
} from '../types/marketplace';

function formatTimestamp(ts?: { toDate?: () => Date }): string {
  if (!ts?.toDate) return 'Baseline';
  return ts.toDate().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function statusLabel(status: PolicyDocument['status']): {
  text: string;
  classes: string;
} {
  switch (status) {
    case 'updated':
      return { text: 'Updated', classes: 'text-[#1265c8] bg-[#e9f2ff] border-[#b7cff0]' };
    case 'draft':
      return { text: 'Draft', classes: 'text-[#9a6700] bg-[#fff8e6] border-[#f0d590]' };
    case 'archived':
      return { text: 'Archived', classes: 'text-[#5b6d85] bg-[#f1f4f9] border-[#dce5f0]' };
    default:
      return { text: 'Published', classes: 'text-[#15966b] bg-[#ebf9f4] border-[#b8e6d5]' };
  }
}

interface PolicyReaderModalProps {
  policy: PolicyDocument | null;
  onClose: () => void;
  onAcceptPolicy?: (policy: PolicyDocument) => Promise<void>;
  acceptedRecord?: PolicyAcceptanceRecord | null;
  acceptedCurrentVersion?: boolean;
}

export function PolicyReaderModal({
  policy,
  onClose,
  onAcceptPolicy,
  acceptedRecord,
  acceptedCurrentVersion,
}: PolicyReaderModalProps) {
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!policy) return null;

  const badge = statusLabel(policy.status);

  const handleAccept = async () => {
    if (!onAcceptPolicy || !checked) return;
    setBusy(true);
    setErr(null);
    try {
      await onAcceptPolicy(policy);
      setChecked(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Unable to save policy acceptance.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b203d]/65 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="policy-modal-title"
    >
      <div className="bg-white border border-[#dce5f0] rounded-[16px] shadow-[0_24px_64px_rgba(11,32,61,0.3)] max-w-3xl w-full max-h-[88vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-[#dce5f0] flex items-start justify-between gap-4 bg-[#f8fbff]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-[12px] text-[#5b6d85] tabular-nums">
              <span className={`px-2 py-0.5 rounded border text-[11px] font-semibold ${badge.classes}`}>
                {badge.text}
              </span>
              <span>Version {policy.version}</span>
              <span>·</span>
              <span>Effective {policy.effectiveDate}</span>
              <span>·</span>
              <span>{policy.categoryTitle}</span>
            </div>
            <h2 id="policy-modal-title" className="mt-1.5 font-display text-[20px] font-bold text-[#102b50]">
              {policy.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close policy reader"
            className="p-2 rounded-[9px] border border-[#dce5f0] text-[#42556f] hover:bg-[#e9f2ff] hover:text-[#1265c8] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <p className="text-[14px] text-[#172b46] bg-[#f3f6fa] border border-[#dce5f0] rounded-[10px] p-4 leading-relaxed">
            {policy.summary}
          </p>

          {policy.pendingAdminReviewItems.length > 0 && (
            <div className="p-4 rounded-[10px] bg-[#fffaf0] border border-[#eed497] space-y-1.5">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-[#8a5d00]">
                Administrator Review Items
              </p>
              <p className="text-[13px] text-[#5c430d]">
                The items below are explicitly flagged pending final platform legal or business configuration:
              </p>
              <ul className="list-disc pl-5 text-[13px] text-[#5c430d] space-y-1">
                {policy.pendingAdminReviewItems.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {policy.sections.map((section) => (
            <section key={section.id} className="space-y-2">
              <h3 className="text-[16px] font-semibold text-[#102b50]">{section.heading}</h3>
              {section.paragraphs.map((p, idx) => (
                <p key={idx} className="text-[14px] text-[#2a3f5d] leading-relaxed">
                  {p}
                </p>
              ))}
              {section.bullets && section.bullets.length > 0 && (
                <ul className="list-disc pl-5 space-y-1.5 text-[13px] text-[#2a3f5d] leading-relaxed">
                  {section.bullets.map((b, idx) => (
                    <li key={idx}>{b}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <div className="px-6 py-4 border-t border-[#dce5f0] bg-[#f8fbff] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {acceptedCurrentVersion && acceptedRecord ? (
            <div className="flex items-center gap-2 text-[13px] font-medium text-[#15966b]">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                Accepted v{acceptedRecord.policyVersion} ({formatTimestamp(acceptedRecord.acceptedAt)})
              </span>
            </div>
          ) : onAcceptPolicy ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
              <label className="flex items-start gap-2.5 text-[13px] text-[#172b46] cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => setChecked(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-[#b8c7da] text-[#1265c8]"
                />
                <span>
                  I have read and accept <strong>{policy.title}</strong> (v{policy.version}).
                </span>
              </label>
              {err && <span className="text-[12px] text-[#d34552]">{err}</span>}
              <button
                type="button"
                disabled={!checked || busy}
                onClick={handleAccept}
                className="px-4 py-2 rounded-[9px] swas-btn-primary swas-btn-text disabled:opacity-50 cursor-pointer shrink-0"
              >
                {busy ? 'Saving...' : 'Accept Policy'}
              </button>
            </div>
          ) : (
            <span className="text-[12px] text-[#5b6d85]">
              SWAS TASKS Official Governance · swastaskorg@gmail.com
            </span>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-[9px] border border-[#dce5f0] bg-white text-[13px] font-semibold text-[#172b46] hover:bg-[#f3f6fa] cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

interface PolicyCentreViewProps {
  categories: PolicyCategory[];
  policies: PolicyDocument[];
  revisions: PolicyRevision[];
  userAcceptances: PolicyAcceptanceRecord[];
  activeSlug: string | null;
  onOpenPolicy: (slug: string) => void;
  onBackToLibrary: () => void;
  onGoSignIn: () => void;
  initialTab?: 'library' | 'updates';
}

export function PolicyCentreView({
  categories,
  policies,
  revisions,
  userAcceptances,
  activeSlug,
  onOpenPolicy,
  onBackToLibrary,
  onGoSignIn,
  initialTab = 'library',
}: PolicyCentreViewProps) {
  const { firebaseUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'updated'>('all');
  const [activeTab, setActiveTab] = useState<'library' | 'updates'>(initialTab);
  const [consentChecked, setConsentChecked] = useState(false);
  const [acceptBusy, setAcceptBusy] = useState(false);
  const [acceptFeedback, setAcceptFeedback] = useState<string | null>(null);

  const selectedPolicy = useMemo(
    () => resolvePolicyBySlug(policies, activeSlug),
    [policies, activeSlug]
  );

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of policies) {
      counts.set(p.categoryId, (counts.get(p.categoryId) || 0) + 1);
    }
    return counts;
  }, [policies]);

  const filteredPolicies = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return policies.filter((p) => {
      if (selectedCategoryId !== 'all' && p.categoryId !== selectedCategoryId) return false;
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (!q) return true;
      if (
        p.title.toLowerCase().includes(q) ||
        p.summary.toLowerCase().includes(q) ||
        p.categoryTitle.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q)
      ) {
        return true;
      }
      return p.sections.some(
        (s) =>
          s.heading.toLowerCase().includes(q) ||
          s.paragraphs.some((para) => para.toLowerCase().includes(q)) ||
          (s.bullets && s.bullets.some((b) => b.toLowerCase().includes(q)))
      );
    });
  }, [policies, selectedCategoryId, statusFilter, searchTerm]);

  const groupedPolicies = useMemo(() => {
    const map = new Map<string, PolicyDocument[]>();
    for (const p of filteredPolicies) {
      const list = map.get(p.categoryId) || [];
      list.push(p);
      map.set(p.categoryId, list);
    }
    return categories
      .map((cat) => ({
        category: cat,
        items: map.get(cat.id) || [],
      }))
      .filter((entry) => entry.items.length > 0);
  }, [categories, filteredPolicies]);

  const updateFeed = useMemo(() => {
    const combined =
      revisions.length > 0
        ? revisions
        : BASELINE_POLICY_REVISIONS.filter((r) =>
            ['terms-and-conditions', 'privacy', 'user-conduct', 'earnings', 'withdrawals', 'appeals', 'staff-conduct'].includes(
              r.policyId
            )
          );
    return combined.slice(0, 40);
  }, [revisions]);

  // Individual Document Reader
  if (activeSlug) {
    if (!selectedPolicy) {
      return (
        <div className="max-w-[960px] mx-auto px-5 py-12">
          <button
            type="button"
            onClick={onBackToLibrary}
            className="inline-flex items-center gap-2 text-[14px] font-semibold text-[#1265c8] hover:text-[#0d4fa5] cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to SWAS TASKS Policy Centre
          </button>
          <div className="mt-6 swas-card rounded-[14px] p-8 space-y-3">
            <h1 className="swas-heading-page">Policy Document Not Found</h1>
            <p className="swas-body">
              The requested policy document ({activeSlug}) is unavailable, drafted, or archived. Browse all active platform rules in the Policy Centre library.
            </p>
            <button
              type="button"
              onClick={onBackToLibrary}
              className="px-4 py-2 rounded-[9px] swas-btn-primary swas-btn-text cursor-pointer"
            >
              Browse All Policies
            </button>
          </div>
        </div>
      );
    }

    const badge = statusLabel(selectedPolicy.status);
    const acceptanceState = getPolicyAcceptanceState(selectedPolicy, userAcceptances);
    const policyRevs = revisions.filter((r) => r.policyId === selectedPolicy.id);
    const relatedDocs = selectedPolicy.relatedPolicySlugs
      .map((slug) => resolvePolicyBySlug(policies, slug))
      .filter((d): d is PolicyDocument => Boolean(d));

    const handleAcceptCurrent = async () => {
      if (!firebaseUser || !consentChecked) return;
      setAcceptBusy(true);
      setAcceptFeedback(null);
      try {
        await recordPolicyAcceptances(firebaseUser.uid, [
          { policy: selectedPolicy, context: 'policy_document_reader' },
        ]);
        setConsentChecked(false);
        setAcceptFeedback(`Recorded your acceptance of ${selectedPolicy.title} v${selectedPolicy.version}.`);
      } catch (e) {
        setAcceptFeedback(e instanceof Error ? e.message : 'Could not save acceptance record.');
      } finally {
        setAcceptBusy(false);
      }
    };

    const scrollToSection = (sectionId: string) => {
      const el = document.getElementById(`sec-${sectionId}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
      <div className="max-w-[1160px] mx-auto px-5 py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-[13px] text-[#5b6d85]">
            <button
              type="button"
              onClick={onBackToLibrary}
              className="inline-flex items-center gap-1.5 font-semibold text-[#1265c8] hover:text-[#0d4fa5] cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Policy Centre
            </button>
            <span>/</span>
            <span>{selectedPolicy.categoryTitle}</span>
            <span>/</span>
            <span className="text-[#172b46] font-medium">{selectedPolicy.title}</span>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border border-[#dce5f0] bg-white text-[13px] font-medium text-[#42556f] hover:text-[#1265c8] cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Print Document
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Table of Contents Sidebar */}
          <aside className="lg:col-span-4 lg:sticky lg:top-24 space-y-4">
            <div className="swas-card rounded-[14px] p-5 space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5b6d85]">
                Table of Contents
              </p>
              <nav className="space-y-1">
                {selectedPolicy.sections.map((sec) => (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => scrollToSection(sec.id)}
                    className="w-full text-left px-2.5 py-1.5 rounded-[8px] text-[13px] text-[#42556f] hover:bg-[#e9f2ff] hover:text-[#1265c8] transition-colors cursor-pointer"
                  >
                    {sec.heading}
                  </button>
                ))}
              </nav>
            </div>

            {relatedDocs.length > 0 && (
              <div className="swas-card rounded-[14px] p-5 space-y-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5b6d85]">
                  Related Policies
                </p>
                <div className="space-y-1.5">
                  {relatedDocs.map((rel) => (
                    <button
                      key={rel.id}
                      type="button"
                      onClick={() => onOpenPolicy(rel.slug)}
                      className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-[8px] bg-[#f8fbff] border border-[#e3ebf5] text-left text-[13px] font-medium text-[#172b46] hover:border-[#1265c8] hover:text-[#1265c8] cursor-pointer"
                    >
                      <span className="truncate">{rel.title}</span>
                      <ChevronRight className="w-4 h-4 shrink-0 text-[#75869d]" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </aside>

          {/* Main Policy Article */}
          <article className="lg:col-span-8 space-y-5">
            <div className="swas-card rounded-[16px] p-6 md:p-8 space-y-5">
              <div className="space-y-3 border-b border-[#dce5f0] pb-5">
                <div className="flex flex-wrap items-center gap-2 text-[12px] text-[#5b6d85] tabular-nums">
                  <span className={`px-2 py-0.5 rounded border text-[11px] font-semibold ${badge.classes}`}>
                    {badge.text}
                  </span>
                  <span>Version {selectedPolicy.version}</span>
                  <span>·</span>
                  <span>Effective: {selectedPolicy.effectiveDate}</span>
                  <span>·</span>
                  <span>Last Updated: {selectedPolicy.lastUpdatedDate}</span>
                </div>

                <h1 className="font-display text-[26px] md:text-[30px] font-bold text-[#102b50] leading-tight">
                  {selectedPolicy.title}
                </h1>

                <p className="text-[15px] text-[#2a3f5d] leading-relaxed">
                  {selectedPolicy.summary}
                </p>

                {selectedPolicy.changeSummary && (
                  <div className="text-[13px] text-[#42556f] bg-[#f3f6fa] border border-[#dce5f0] rounded-[9px] px-3.5 py-2.5">
                    <strong className="text-[#102b50]">Revision Summary:</strong> {selectedPolicy.changeSummary}
                  </div>
                )}
              </div>

              {selectedPolicy.pendingAdminReviewItems.length > 0 && (
                <div className="p-4 rounded-[12px] bg-[#fffaf0] border border-[#eed497] space-y-2">
                  <div className="flex items-center gap-2 text-[#8a5d00]">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span className="text-[12px] font-semibold uppercase tracking-wide">
                      Items Requiring Formal Administrator Confirmation
                    </span>
                  </div>
                  <ul className="list-disc pl-5 text-[13px] text-[#5c430d] space-y-1">
                    {selectedPolicy.pendingAdminReviewItems.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-7">
                {selectedPolicy.sections.map((section) => (
                  <section key={section.id} id={`sec-${section.id}`} className="scroll-mt-24 space-y-3">
                    <h2 className="text-[18px] font-semibold text-[#102b50]">{section.heading}</h2>
                    {section.paragraphs.map((para, idx) => (
                      <p key={idx} className="text-[14px] text-[#2a3f5d] leading-[1.7]">
                        {para}
                      </p>
                    ))}
                    {section.bullets && section.bullets.length > 0 && (
                      <ul className="list-disc pl-5 space-y-2 text-[14px] text-[#2a3f5d] leading-[1.65]">
                        {section.bullets.map((b, idx) => (
                          <li key={idx}>{b}</li>
                        ))}
                      </ul>
                    )}
                  </section>
                ))}
              </div>

              {/* Active Acceptance Box */}
              <div className="mt-6 pt-6 border-t border-[#dce5f0] space-y-3">
                <h3 className="text-[15px] font-semibold text-[#102b50]">
                  Policy Acceptance Record
                </h3>

                {!firebaseUser ? (
                  <div className="p-4 rounded-[10px] bg-[#f8fbff] border border-[#dce5f0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <p className="text-[13px] text-[#42556f]">
                      Sign in to record or verify your personal acceptance status for this policy version.
                    </p>
                    <button
                      type="button"
                      onClick={onGoSignIn}
                      className="px-4 py-2 rounded-[9px] swas-btn-primary swas-btn-text cursor-pointer shrink-0"
                    >
                      Sign In
                    </button>
                  </div>
                ) : acceptanceState.acceptedCurrentVersion && acceptanceState.latestAcceptedRecord ? (
                  <div className="p-4 rounded-[10px] bg-[#ebf9f4] border border-[#b8e6d5] flex items-center gap-3 text-[13px] text-[#116b4c]">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <div>
                      <p className="font-semibold">
                        You accepted the current version (v{selectedPolicy.version}) on{' '}
                        {formatTimestamp(acceptanceState.latestAcceptedRecord.acceptedAt)}.
                      </p>
                      <p className="text-[12px] opacity-90">
                        Context recorded: {acceptanceState.latestAcceptedRecord.acceptanceContext}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-[10px] bg-[#f8fbff] border border-[#cfe0f5] space-y-3">
                    {acceptanceState.latestAcceptedRecord && (
                      <p className="text-[13px] text-[#9a6700] font-medium">
                        You previously accepted v{acceptanceState.latestAcceptedRecord.policyVersion}. This policy is now at v{selectedPolicy.version} and requires renewed acceptance.
                      </p>
                    )}
                    <label className="flex items-start gap-2.5 text-[13px] text-[#172b46] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={consentChecked}
                        onChange={(e) => setConsentChecked(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded border-[#b8c7da] text-[#1265c8]"
                      />
                      <span>
                        I have read and actively agree to <strong>{selectedPolicy.title}</strong> (Version {selectedPolicy.version}, Effective {selectedPolicy.effectiveDate}).
                      </span>
                    </label>
                    {acceptFeedback && (
                      <p className="text-[13px] text-[#1265c8] font-medium">{acceptFeedback}</p>
                    )}
                    <button
                      type="button"
                      disabled={!consentChecked || acceptBusy}
                      onClick={handleAcceptCurrent}
                      className="px-4 py-2 rounded-[9px] swas-btn-primary swas-btn-text disabled:opacity-50 cursor-pointer"
                    >
                      {acceptBusy ? 'Recording Acceptance...' : 'Record Active Acceptance'}
                    </button>
                  </div>
                )}
              </div>

              {/* Document Revision History */}
              <div className="pt-5 border-t border-[#dce5f0] space-y-3">
                <div className="flex items-center gap-2 text-[#102b50]">
                  <History className="w-4 h-4 text-[#1265c8]" />
                  <h3 className="text-[15px] font-semibold">Revision History</h3>
                </div>
                {policyRevs.length === 0 ? (
                  <p className="text-[13px] text-[#5b6d85] tabular-nums">
                    v{selectedPolicy.version} · Effective {selectedPolicy.effectiveDate} · Initial published governance baseline.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {policyRevs.map((rev) => (
                      <div
                        key={rev.id}
                        className="p-3 rounded-[9px] bg-[#f8fbff] border border-[#dce5f0] text-[13px] space-y-1"
                      >
                        <div className="flex flex-wrap items-center gap-2 font-semibold text-[#102b50] tabular-nums">
                          <span>Version {rev.version}</span>
                          <span>·</span>
                          <span>Effective {rev.effectiveDate}</span>
                          {rev.materialChange && (
                            <span className="text-[#1265c8]">· Material Change</span>
                          )}
                        </div>
                        <p className="text-[#42556f]">{rev.changeReason}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </article>
        </div>
      </div>
    );
  }

  // Policy Centre Library Home
  return (
    <div className="max-w-[1160px] mx-auto px-5 py-8 space-y-7">
      <div className="swas-card rounded-[16px] p-6 md:p-8 bg-gradient-to-br from-[#102b50] to-[#163a6b] text-white border-0">
        <div className="max-w-3xl space-y-3">
          <div className="flex items-center gap-2 text-[#a8cbff] text-[12px] font-semibold uppercase tracking-[0.08em]">
            <ShieldCheck className="w-4 h-4" />
            <span>SWAS TASKS Legal & Governance</span>
          </div>
          <h1 className="font-display text-[26px] md:text-[32px] font-bold leading-tight text-white">
            Legal, Policies, Rules & Compliance Centre
          </h1>
          <p className="text-[14px] md:text-[15px] text-[#dce7f5] leading-relaxed">
            Explore {policies.length} published governance documents across {categories.length} categories covering platform conduct, registration, tasks, financial centres, workplaces, fraud protection, appeals, privacy, staff oversight, and legal dispute resolution. Official compliance inquiries: swastaskorg@gmail.com.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveTab('library')}
              className={`px-4 py-2 rounded-[9px] text-[13px] font-semibold cursor-pointer ${
                activeTab === 'library'
                  ? 'bg-white text-[#102b50]'
                  : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              Policy Library ({policies.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('updates')}
              className={`px-4 py-2 rounded-[9px] text-[13px] font-semibold cursor-pointer ${
                activeTab === 'updates'
                  ? 'bg-white text-[#102b50]'
                  : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              Policy Updates & Announcements
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'updates' ? (
        <div className="swas-card rounded-[14px] p-6 space-y-4">
          <div className="flex items-center justify-between gap-3 border-b border-[#dce5f0] pb-4">
            <div>
              <h2 className="swas-heading-section">Recent Policy Updates & Version Announcements</h2>
              <p className="swas-desc">
                Chronological publication log of policy revisions and newly effective governance standards.
              </p>
            </div>
          </div>
          <div className="divide-y divide-[#e3ebf5]">
            {updateFeed.map((rev) => (
              <div
                key={rev.id}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-[12px] text-[#5b6d85] tabular-nums">
                    <span className="font-semibold text-[#1265c8]">v{rev.version}</span>
                    <span>·</span>
                    <span>Effective {rev.effectiveDate}</span>
                    <span>·</span>
                    <span>{rev.categoryTitle}</span>
                    {rev.requiresReacceptance && (
                      <>
                        <span>·</span>
                        <span className="text-[#9a6700] font-semibold">Re-acceptance Required</span>
                      </>
                    )}
                  </div>
                  <p className="text-[15px] font-semibold text-[#102b50]">{rev.policyTitle}</p>
                  <p className="text-[13px] text-[#42556f]">{rev.changeReason}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenPolicy(rev.policyId)}
                  className="px-3.5 py-2 rounded-[8px] border border-[#dce5f0] bg-[#f8fbff] text-[13px] font-semibold text-[#1265c8] hover:bg-[#e9f2ff] cursor-pointer shrink-0"
                >
                  Read Policy
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Category Filter Rail */}
          <aside className="lg:col-span-4 space-y-3">
            <div className="swas-card rounded-[14px] p-4 space-y-3">
              <label className="block swas-label">Search All Policies</label>
              <div className="relative">
                <Search className="w-4 h-4 text-[#75869d] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search rules, fees, appeals, crypto..."
                  className="w-full pl-9 pr-3 py-2 swas-input bg-[#f8fbff] border border-[#dce5f0] rounded-[9px]"
                />
              </div>

              <div className="flex items-center gap-1.5 pt-1">
                {(['all', 'published', 'updated'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-[7px] text-[12px] font-semibold capitalize cursor-pointer ${
                      statusFilter === st
                        ? 'bg-[#1265c8] text-white'
                        : 'bg-[#f3f6fa] text-[#42556f] hover:bg-[#e9f2ff]'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div className="swas-card rounded-[14px] p-3 space-y-1">
              <button
                type="button"
                onClick={() => setSelectedCategoryId('all')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-[9px] text-[13px] font-medium cursor-pointer ${
                  selectedCategoryId === 'all'
                    ? 'bg-[#e9f2ff] text-[#1265c8] font-semibold'
                    : 'text-[#42556f] hover:bg-[#f3f6fa]'
                }`}
              >
                <span>All Categories</span>
                <span className="tabular-nums text-[12px]">{policies.length}</span>
              </button>

              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-[9px] text-left text-[13px] font-medium cursor-pointer ${
                    selectedCategoryId === cat.id
                      ? 'bg-[#e9f2ff] text-[#1265c8] font-semibold'
                      : 'text-[#42556f] hover:bg-[#f3f6fa]'
                  }`}
                >
                  <span className="truncate">
                    {cat.code}. {cat.title}
                  </span>
                  <span className="tabular-nums text-[12px] shrink-0">
                    {categoryCounts.get(cat.id) || 0}
                  </span>
                </button>
              ))}
            </div>
          </aside>

          {/* Categorized Policy Cards */}
          <div className="lg:col-span-8 space-y-6">
            {groupedPolicies.length === 0 ? (
              <div className="swas-card rounded-[14px] p-8 text-center space-y-2">
                <p className="text-[15px] font-semibold text-[#102b50]">No matching policies found</p>
                <p className="swas-desc">Try clearing your search keywords or switching category filters.</p>
              </div>
            ) : (
              groupedPolicies.map(({ category, items }) => (
                <section key={category.id} className="swas-card rounded-[14px] p-5 md:p-6 space-y-4">
                  <div className="border-b border-[#dce5f0] pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="swas-heading-section">
                        {category.code}. {category.title}
                      </h2>
                      <span className="text-[12px] font-medium text-[#5b6d85] tabular-nums">
                        {items.length} {items.length === 1 ? 'document' : 'documents'}
                      </span>
                    </div>
                    <p className="mt-1 swas-desc">{category.description}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {items.map((policy) => {
                      const badge = statusLabel(policy.status);
                      return (
                        <button
                          key={policy.id}
                          type="button"
                          onClick={() => onOpenPolicy(policy.slug)}
                          className="text-left p-4 rounded-[11px] border border-[#dce5f0] bg-[#fcfdff] hover:border-[#1265c8] hover:bg-[#f7fbff] transition-colors flex flex-col justify-between gap-2.5 cursor-pointer"
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2 text-[11px] text-[#5b6d85] tabular-nums">
                              <span className={`px-1.5 py-0.5 rounded border font-semibold ${badge.classes}`}>
                                {badge.text}
                              </span>
                              <span>v{policy.version} · {policy.effectiveDate}</span>
                            </div>
                            <h3 className="text-[14px] font-semibold text-[#102b50] leading-snug">
                              {policy.title}
                            </h3>
                            <p className="text-[12px] text-[#5b6d85] line-clamp-2 leading-relaxed">
                              {policy.summary}
                            </p>
                          </div>

                          <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#1265c8]">
                            Read full policy <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface WorkspacePoliciesPageProps {
  mode: 'my-policies' | 'policy-updates';
  policies: PolicyDocument[];
  revisions: PolicyRevision[];
  userAcceptances: PolicyAcceptanceRecord[];
  onOpenPublicPolicy: (slug: string) => void;
}

export function WorkspacePoliciesPage({
  mode,
  policies,
  revisions,
  userAcceptances,
  onOpenPublicPolicy,
}: WorkspacePoliciesPageProps) {
  const { firebaseUser } = useAuth();
  const [readerPolicy, setReaderPolicy] = useState<PolicyDocument | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [checkedIds, setCheckedIds] = useState<Record<string, boolean>>({});
  const [notice, setNotice] = useState<string | null>(null);

  const policyStates = useMemo(() => {
    return policies.map((policy) => ({
      policy,
      state: getPolicyAcceptanceState(policy, userAcceptances),
    }));
  }, [policies, userAcceptances]);

  const updatedRequiringRenewal = useMemo(
    () => policyStates.filter((item) => item.state.needsRenewal),
    [policyStates]
  );

  const awaitingInitial = useMemo(
    () => policyStates.filter((item) => item.state.needsInitialAcceptance),
    [policyStates]
  );

  const handleAcceptSingle = async (policy: PolicyDocument, context = 'my_accepted_policies') => {
    if (!firebaseUser) return;
    setBusyId(policy.id);
    setNotice(null);
    try {
      await recordPolicyAcceptances(firebaseUser.uid, [{ policy, context }]);
      setCheckedIds((prev) => ({ ...prev, [policy.id]: false }));
      setNotice(`Recorded acceptance for ${policy.title} (v${policy.version}).`);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Unable to save acceptance.');
    } finally {
      setBusyId(null);
    }
  };

  if (mode === 'policy-updates') {
    const feed =
      revisions.length > 0
        ? revisions
        : BASELINE_POLICY_REVISIONS.filter((r) =>
            ['terms-and-conditions', 'privacy', 'user-conduct', 'earnings', 'withdrawals', 'appeals'].includes(
              r.policyId
            )
          );
    return (
      <div className="space-y-6">
        <div className="swas-card rounded-[14px] p-6 space-y-2">
          <h2 className="swas-heading-section">Platform Policy Updates & Changelog</h2>
          <p className="swas-desc">
            Review recent revisions to SWAS TASKS rules, financial terms, workplace governance, and legal policies.
          </p>
        </div>

        <div className="swas-card rounded-[14px] divide-y divide-[#e3ebf5]">
          {feed.map((rev) => {
            const matchingPolicy = resolvePolicyBySlug(policies, rev.policyId);
            return (
              <div
                key={rev.id}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-[12px] text-[#5b6d85] tabular-nums">
                    <span className="font-semibold text-[#1265c8]">v{rev.version}</span>
                    <span>·</span>
                    <span>Effective {rev.effectiveDate}</span>
                    <span>·</span>
                    <span>{rev.categoryTitle}</span>
                    {rev.requiresReacceptance && (
                      <>
                        <span>·</span>
                        <span className="text-[#9a6700] font-semibold">Renewal Required</span>
                      </>
                    )}
                  </div>
                  <p className="text-[15px] font-semibold text-[#102b50]">{rev.policyTitle}</p>
                  <p className="text-[13px] text-[#42556f]">{rev.changeReason}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {matchingPolicy && (
                    <button
                      type="button"
                      onClick={() => setReaderPolicy(matchingPolicy)}
                      className="px-3.5 py-2 rounded-[8px] border border-[#dce5f0] bg-white text-[13px] font-semibold text-[#172b46] hover:border-[#1265c8] cursor-pointer"
                    >
                      Quick Read
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onOpenPublicPolicy(rev.policyId)}
                    className="px-3.5 py-2 rounded-[8px] swas-btn-primary swas-btn-text cursor-pointer"
                  >
                    Open Full Page
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <PolicyReaderModal
          policy={readerPolicy}
          onClose={() => setReaderPolicy(null)}
          onAcceptPolicy={(p) => handleAcceptSingle(p, 'policy_updates_modal')}
          acceptedRecord={
            readerPolicy
              ? getPolicyAcceptanceState(readerPolicy, userAcceptances).latestAcceptedRecord
              : null
          }
          acceptedCurrentVersion={
            readerPolicy
              ? getPolicyAcceptanceState(readerPolicy, userAcceptances).acceptedCurrentVersion
              : false
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="swas-card rounded-[14px] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="swas-heading-section">My Accepted Policies & Compliance Status</h2>
          <p className="swas-desc">
            Track the exact policy versions you have accepted and renew consent whenever material updates take effect.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onOpenPublicPolicy('')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-[9px] border border-[#dce5f0] bg-white text-[13px] font-semibold text-[#1265c8] hover:bg-[#e9f2ff] cursor-pointer shrink-0"
        >
          <BookOpen className="w-4 h-4" />
          Browse All {policies.length} Policies
        </button>
      </div>

      {notice && (
        <div className="p-3.5 rounded-[10px] bg-[#ebf9f4] border border-[#b8e6d5] text-[13px] text-[#116b4c] font-medium">
          {notice}
        </div>
      )}

      {/* 1. Updated Policies Requiring Renewed Consent */}
      {updatedRequiringRenewal.length > 0 && (
        <section className="swas-card rounded-[14px] p-6 border-[#f0d590] bg-[#fffdf7] space-y-4">
          <div className="flex items-center gap-2 text-[#8a5d00]">
            <Clock className="w-5 h-5" />
            <h3 className="text-[16px] font-semibold">
              Updated Policies Requiring Renewed Acceptance ({updatedRequiringRenewal.length})
            </h3>
          </div>
          <div className="space-y-3">
            {updatedRequiringRenewal.map(({ policy, state }) => (
              <div
                key={policy.id}
                className="p-4 rounded-[11px] bg-white border border-[#eed497] space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <p className="text-[15px] font-semibold text-[#102b50]">{policy.title}</p>
                    <p className="text-[12px] text-[#5b6d85] tabular-nums">
                      Previously accepted v{state.latestAcceptedRecord?.policyVersion} · New Version v{policy.version} (Effective {policy.effectiveDate})
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReaderPolicy(policy)}
                    className="text-[13px] font-semibold text-[#1265c8] hover:underline cursor-pointer self-start"
                  >
                    Read Updated Document
                  </button>
                </div>
                <p className="text-[13px] text-[#42556f]">{policy.changeSummary}</p>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <label className="flex items-start gap-2.5 text-[13px] text-[#172b46] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(checkedIds[policy.id])}
                      onChange={(e) =>
                        setCheckedIds((prev) => ({ ...prev, [policy.id]: e.target.checked }))
                      }
                      className="mt-0.5 w-4 h-4 rounded border-[#b8c7da] text-[#1265c8]"
                    />
                    <span>I have reviewed the updated terms and accept v{policy.version}.</span>
                  </label>
                  <button
                    type="button"
                    disabled={!checkedIds[policy.id] || busyId === policy.id}
                    onClick={() => handleAcceptSingle(policy, 'material_update_renewal')}
                    className="px-4 py-2 rounded-[9px] swas-btn-primary swas-btn-text disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    {busyId === policy.id ? 'Saving...' : 'Accept Update'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 2. Required Policies Awaiting Acceptance */}
      {awaitingInitial.length > 0 && (
        <section className="swas-card rounded-[14px] p-6 space-y-4">
          <div className="flex items-center justify-between gap-3 border-b border-[#dce5f0] pb-3">
            <div>
              <h3 className="text-[16px] font-semibold text-[#102b50]">
                Policies Awaiting Your Acceptance ({awaitingInitial.length})
              </h3>
              <p className="swas-desc">
                Core policies without an active acceptance record on your account for the current version.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {awaitingInitial.map(({ policy }) => (
              <div
                key={policy.id}
                className="p-4 rounded-[11px] bg-[#f8fbff] border border-[#dce5f0] space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <p className="text-[15px] font-semibold text-[#102b50]">{policy.title}</p>
                    <p className="text-[12px] text-[#5b6d85] tabular-nums">
                      Version {policy.version} · Effective {policy.effectiveDate} · {policy.categoryTitle}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReaderPolicy(policy)}
                    className="text-[13px] font-semibold text-[#1265c8] hover:underline cursor-pointer self-start"
                  >
                    Read Full Policy
                  </button>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <label className="flex items-start gap-2.5 text-[13px] text-[#172b46] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(checkedIds[policy.id])}
                      onChange={(e) =>
                        setCheckedIds((prev) => ({ ...prev, [policy.id]: e.target.checked }))
                      }
                      className="mt-0.5 w-4 h-4 rounded border-[#b8c7da] text-[#1265c8]"
                    />
                    <span>I have read and accept {policy.title} (v{policy.version}).</span>
                  </label>
                  <button
                    type="button"
                    disabled={!checkedIds[policy.id] || busyId === policy.id}
                    onClick={() => handleAcceptSingle(policy, 'my_accepted_policies')}
                    className="px-4 py-2 rounded-[9px] swas-btn-primary swas-btn-text disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    {busyId === policy.id ? 'Saving...' : 'Accept Policy'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. Accepted Policies History */}
      <section className="swas-card rounded-[14px] p-6 space-y-4">
        <div className="flex items-center gap-2 text-[#102b50] border-b border-[#dce5f0] pb-3">
          <FileText className="w-5 h-5 text-[#1265c8]" />
          <h3 className="text-[16px] font-semibold">
            Recorded Policy Acceptances ({userAcceptances.length})
          </h3>
        </div>

        {userAcceptances.length === 0 ? (
          <p className="text-[13px] text-[#5b6d85]">
            No policy acceptance records have been saved on this account yet. Review the policies above or open any policy document to record active acceptance.
          </p>
        ) : (
          <div className="divide-y divide-[#e3ebf5]">
            {userAcceptances.map((rec) => {
              const currentDoc = resolvePolicyBySlug(policies, rec.policySlug || rec.policyId);
              const isOutdated = currentDoc && currentDoc.version !== rec.policyVersion;
              return (
                <div
                  key={rec.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[14px] font-semibold text-[#102b50]">{rec.policyTitle}</span>
                      <span className="text-[12px] font-medium text-[#15966b] tabular-nums">
                        Accepted v{rec.policyVersion}
                      </span>
                      {isOutdated && (
                        <span className="text-[12px] font-semibold text-[#9a6700] tabular-nums">
                          · Superseded by v{currentDoc.version}
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-[#5b6d85] tabular-nums">
                      Date: {formatTimestamp(rec.acceptedAt)} · Context: {rec.acceptanceContext} · Effective Date Shown: {rec.presentedEffectiveDate}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {currentDoc && (
                      <button
                        type="button"
                        onClick={() => setReaderPolicy(currentDoc)}
                        className="px-3 py-1.5 rounded-[8px] border border-[#dce5f0] text-[12px] font-semibold text-[#1265c8] hover:bg-[#e9f2ff] cursor-pointer"
                      >
                        View Policy
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <PolicyReaderModal
        policy={readerPolicy}
        onClose={() => setReaderPolicy(null)}
        onAcceptPolicy={(p) => handleAcceptSingle(p, 'my_accepted_policies_modal')}
        acceptedRecord={
          readerPolicy
            ? getPolicyAcceptanceState(readerPolicy, userAcceptances).latestAcceptedRecord
            : null
        }
        acceptedCurrentVersion={
          readerPolicy
            ? getPolicyAcceptanceState(readerPolicy, userAcceptances).acceptedCurrentVersion
            : false
        }
      />
    </div>
  );
}
