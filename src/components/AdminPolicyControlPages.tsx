import React, { useMemo, useState } from 'react';
import {
  Archive,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Edit3,
  Eye,
  FilePlus2,
  GitCompare,
  Layers,
  RotateCcw,
  Search,
  Send,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  BASELINE_POLICY_REVISIONS,
  reorderPolicyCategories,
  sanitizeFirestoreId,
  savePolicyCategory,
  savePolicyDocumentWithRevision,
} from '../lib/policyService';
import type {
  PolicyAcceptanceRecord,
  PolicyCategory,
  PolicyDocument,
  PolicyRegistryManifest,
  PolicyRevision,
  PolicySection,
  PolicyStatus,
  UserPrivate,
} from '../types/marketplace';

interface AdminPolicyControlPagesProps {
  categories: PolicyCategory[];
  policies: PolicyDocument[];
  revisions: PolicyRevision[];
  manifest: PolicyRegistryManifest | null;
  allAcceptances: PolicyAcceptanceRecord[];
  registeredUsers: UserPrivate[];
}

type AdminTab = 'policies' | 'categories' | 'revisions' | 'acceptances';

function bumpMinorVersion(ver: string): string {
  const parts = ver.split('.');
  if (parts.length === 2 && !Number.isNaN(Number(parts[1]))) {
    return `${parts[0]}.${Number(parts[1]) + 1}`;
  }
  return `${ver}.1`;
}

export function AdminPolicyControlPages({
  categories,
  policies,
  revisions,
  manifest,
  allAcceptances,
  registeredUsers,
}: AdminPolicyControlPagesProps) {
  const { firebaseUser } = useAuth();
  const [tab, setTab] = useState<AdminTab>('policies');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PolicyStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [reviewOnly, setReviewOnly] = useState(false);

  // Policy Editor state
  const [editingPolicy, setEditingPolicy] = useState<PolicyDocument | null>(null);
  const [isNewPolicy, setIsNewPolicy] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [changeReason, setChangeReason] = useState('');
  const [materialChange, setMaterialChange] = useState(false);
  const [notifyUsers, setNotifyUsers] = useState(false);
  const [sendOfficialEmail, setSendOfficialEmail] = useState(false);
  const [editorBusy, setEditorBusy] = useState(false);
  const [editorFeedback, setEditorFeedback] = useState<string | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);

  // Category Editor state
  const [catCode, setCatCode] = useState('');
  const [catTitle, setCatTitle] = useState('');
  const [catDescription, setCatDescription] = useState('');
  const [catBusy, setCatBusy] = useState(false);

  // Revision Comparison state
  const [comparePolicyId, setComparePolicyId] = useState<string>(policies[0]?.id || 'terms-and-conditions');
  const [revLeftId, setRevLeftId] = useState<string>('');
  const [revRightId, setRevRightId] = useState<string>('');

  // Acceptance Tracking state
  const [trackingPolicyId, setTrackingPolicyId] = useState<string>('terms-and-conditions');

  const filteredPolicies = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return policies.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && p.categoryId !== categoryFilter) return false;
      if (reviewOnly && p.pendingAdminReviewItems.length === 0) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.summary.toLowerCase().includes(q) ||
        p.categoryTitle.toLowerCase().includes(q)
      );
    });
  }, [policies, statusFilter, categoryFilter, reviewOnly, searchTerm]);

  const counts = useMemo(() => {
    return {
      total: policies.length,
      published: policies.filter((p) => p.status === 'published').length,
      updated: policies.filter((p) => p.status === 'updated').length,
      draft: policies.filter((p) => p.status === 'draft').length,
      archived: policies.filter((p) => p.status === 'archived').length,
      pendingReview: policies.filter((p) => p.pendingAdminReviewItems.length > 0).length,
    };
  }, [policies]);

  const startNewPolicy = () => {
    const firstCat = categories[0];
    const today = new Date().toISOString().slice(0, 10);
    setEditingPolicy({
      id: '',
      slug: '',
      title: '',
      categoryId: firstCat?.id || 'platform-general',
      categoryTitle: firstCat?.title || 'Platform & General Rules',
      summary: '',
      status: 'draft',
      version: '1.0',
      effectiveDate: today,
      lastUpdatedDate: today,
      requiresAcceptance: false,
      acceptanceContexts: ['policy_centre'],
      changeSummary: 'Initial policy draft.',
      sections: [
        {
          id: 'purpose-and-scope',
          heading: '1. Purpose & Scope',
          paragraphs: ['Describe the operational purpose and scope of this policy.'],
          bullets: [],
        },
      ],
      relatedPolicySlugs: ['terms-and-conditions'],
      pendingAdminReviewItems: [],
    });
    setIsNewPolicy(true);
    setPreviewMode(false);
    setChangeReason('Initial policy creation');
    setMaterialChange(false);
    setNotifyUsers(false);
    setSendOfficialEmail(false);
    setEditorError(null);
    setEditorFeedback(null);
  };

  const startEditPolicy = (policy: PolicyDocument) => {
    setEditingPolicy(JSON.parse(JSON.stringify(policy)) as PolicyDocument);
    setIsNewPolicy(false);
    setPreviewMode(false);
    setChangeReason(`Updated ${policy.title}`);
    setMaterialChange(false);
    setNotifyUsers(false);
    setSendOfficialEmail(false);
    setEditorError(null);
    setEditorFeedback(null);
  };

  const handleSavePolicy = async (targetStatus: PolicyStatus) => {
    if (!firebaseUser || !editingPolicy) return;
    setEditorError(null);
    setEditorFeedback(null);

    const slug = sanitizeFirestoreId(editingPolicy.slug || editingPolicy.title.toLowerCase());
    if (!slug || editingPolicy.title.trim().length < 3 || editingPolicy.summary.trim().length < 10) {
      setEditorError('Provide a valid slug, a title (min 3 chars), and summary (min 10 chars).');
      return;
    }

    const cat = categories.find((c) => c.id === editingPolicy.categoryId);
    const today = new Date().toISOString().slice(0, 10);
    const nextPolicy: PolicyDocument = {
      ...editingPolicy,
      id: isNewPolicy ? slug : editingPolicy.id,
      slug,
      categoryTitle: cat?.title || editingPolicy.categoryTitle,
      status: targetStatus,
      lastUpdatedDate: today,
    };

    setEditorBusy(true);
    try {
      const result = await savePolicyDocumentWithRevision({
        adminUser: firebaseUser,
        policy: nextPolicy,
        previousVersion: isNewPolicy ? undefined : editingPolicy.version,
        changeReason: changeReason.trim() || `Status updated to ${targetStatus}`,
        materialChange,
        manifest,
        notifyUsers:
          (targetStatus === 'published' || targetStatus === 'updated') && notifyUsers,
        sendOfficialEmail:
          (targetStatus === 'published' || targetStatus === 'updated') && sendOfficialEmail,
        allUsers: registeredUsers,
      });

      setEditorFeedback(
        `Saved "${nextPolicy.title}" (${targetStatus}, v${nextPolicy.version}).${
          result.notifiedCount > 0 ? ` Sent ${result.notifiedCount} in-app notifications.` : ''
        }${result.emailedCount > 0 ? ` Delivered ${result.emailedCount} official emails.` : ''}`
      );
      setEditingPolicy(null);
    } catch (err) {
      setEditorError(err instanceof Error ? err.message : 'Unable to save policy document.');
    } finally {
      setEditorBusy(false);
    }
  };

  const handleQuickArchiveToggle = async (policy: PolicyDocument) => {
    if (!firebaseUser) return;
    const nextStatus: PolicyStatus = policy.status === 'archived' ? 'published' : 'archived';
    try {
      await savePolicyDocumentWithRevision({
        adminUser: firebaseUser,
        policy: {
          ...policy,
          status: nextStatus,
          lastUpdatedDate: new Date().toISOString().slice(0, 10),
        },
        previousVersion: policy.version,
        changeReason:
          nextStatus === 'archived'
            ? 'Policy archived from public view by Super Admin.'
            : 'Policy restored to active published catalog.',
        materialChange: false,
        manifest,
      });
      setEditorFeedback(`Policy "${policy.title}" is now ${nextStatus}.`);
    } catch (err) {
      setEditorError(err instanceof Error ? err.message : 'Unable to update policy status.');
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !catTitle.trim()) return;
    setCatBusy(true);
    try {
      const slug = sanitizeFirestoreId(catTitle.toLowerCase());
      await savePolicyCategory(firebaseUser.uid, {
        id: slug,
        code: catCode.trim().toUpperCase() || String.fromCharCode(65 + categories.length),
        slug,
        title: catTitle.trim(),
        description: catDescription.trim() || `Governance policies under ${catTitle.trim()}.`,
        order: categories.length + 1,
        enabled: true,
      });
      setCatCode('');
      setCatTitle('');
      setCatDescription('');
    } finally {
      setCatBusy(false);
    }
  };

  const handleMoveCategory = async (index: number, dir: -1 | 1) => {
    if (!firebaseUser) return;
    const target = index + dir;
    if (target < 0 || target >= categories.length) return;
    const next = [...categories];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    await reorderPolicyCategories(firebaseUser.uid, next);
  };

  const handleToggleCategoryEnabled = async (cat: PolicyCategory) => {
    if (!firebaseUser) return;
    await savePolicyCategory(firebaseUser.uid, {
      ...cat,
      enabled: !cat.enabled,
    });
  };

  // Revisions for side-by-side comparison
  const revisionsForSelectedPolicy = useMemo(() => {
    const fsRevs = revisions.filter((r) => r.policyId === comparePolicyId);
    const baseline = BASELINE_POLICY_REVISIONS.filter((r) => r.policyId === comparePolicyId);
    return [...fsRevs, ...baseline];
  }, [revisions, comparePolicyId]);

  const leftRev =
    revisionsForSelectedPolicy.find((r) => r.id === revLeftId) || revisionsForSelectedPolicy[1] || revisionsForSelectedPolicy[0];
  const rightRev =
    revisionsForSelectedPolicy.find((r) => r.id === revRightId) || revisionsForSelectedPolicy[0];

  // Acceptance tracking calculations
  const trackedPolicy = useMemo(
    () => policies.find((p) => p.id === trackingPolicyId) || policies[0],
    [policies, trackingPolicyId]
  );

  const trackingStats = useMemo(() => {
    if (!trackedPolicy) return { acceptedCurrent: [], acceptedOutdated: [], outstandingUsers: [] };
    const policyAccs = allAcceptances.filter(
      (a) => a.policyId === trackedPolicy.id || a.policySlug === trackedPolicy.slug
    );
    const currentByUid = new Map<string, PolicyAcceptanceRecord>();
    const outdatedByUid = new Map<string, PolicyAcceptanceRecord>();

    for (const acc of policyAccs) {
      if (acc.policyVersion === trackedPolicy.version) {
        if (!currentByUid.has(acc.userId)) currentByUid.set(acc.userId, acc);
      } else {
        if (!outdatedByUid.has(acc.userId)) outdatedByUid.set(acc.userId, acc);
      }
    }

    const outstandingUsers = registeredUsers.filter((u) => !currentByUid.has(u.uid));
    return {
      acceptedCurrent: Array.from(currentByUid.values()),
      acceptedOutdated: Array.from(outdatedByUid.values()).filter(
        (rec) => !currentByUid.has(rec.userId)
      ),
      outstandingUsers,
    };
  }, [trackedPolicy, allAcceptances, registeredUsers]);

  return (
    <div className="space-y-6">
      {/* KPI Header */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Policies', value: counts.total },
          { label: 'Published', value: counts.published },
          { label: 'Updated', value: counts.updated },
          { label: 'Drafts', value: counts.draft },
          { label: 'Archived', value: counts.archived },
          { label: 'Admin Review Flags', value: counts.pendingReview },
        ].map((kpi) => (
          <div key={kpi.label} className="swas-card rounded-[12px] p-4">
            <p className="text-[12px] text-[#5b6d85] font-medium">{kpi.label}</p>
            <p className="mt-1 font-display text-[22px] font-bold text-[#102b50] tabular-nums">
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* Navigation Tabs */}
      <div className="swas-card rounded-[14px] p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'policies' as const, label: 'Policies Library & Editor', icon: Edit3 },
            { id: 'categories' as const, label: 'Categories Manager', icon: Layers },
            { id: 'revisions' as const, label: 'Version History & Diff', icon: GitCompare },
            { id: 'acceptances' as const, label: 'Acceptance Tracking', icon: Users },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-[9px] text-[13px] font-semibold cursor-pointer ${
                  tab === item.id
                    ? 'bg-[#1265c8] text-white'
                    : 'bg-[#f3f6fa] text-[#42556f] hover:bg-[#e9f2ff]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => {
            setTab('policies');
            startNewPolicy();
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-[9px] swas-btn-primary swas-btn-text cursor-pointer"
        >
          <FilePlus2 className="w-4 h-4" />
          New Policy Document
        </button>
      </div>

      {editorFeedback && (
        <div className="p-3.5 rounded-[10px] bg-[#ebf9f4] border border-[#b8e6d5] text-[13px] text-[#116b4c] font-medium">
          {editorFeedback}
        </div>
      )}
      {editorError && (
        <div className="p-3.5 rounded-[10px] bg-[#fff0f0] border border-[#f1c7c7] text-[13px] text-[#d34552] font-medium">
          {editorError}
        </div>
      )}

      {/* TAB 1: Policies Library & Editor */}
      {tab === 'policies' && (
        <div className="space-y-5">
          {editingPolicy && (
            <div className="swas-card rounded-[14px] p-6 space-y-5 border-[#1265c8]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dce5f0] pb-4">
                <div>
                  <h3 className="swas-heading-section">
                    {isNewPolicy ? 'Create New Policy Document' : `Editing: ${editingPolicy.title}`}
                  </h3>
                  <p className="swas-desc">
                    Save drafts safely, preview before publishing, or publish a versioned update with optional user notifications.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewMode((v) => !v)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border border-[#dce5f0] bg-white text-[13px] font-semibold text-[#1265c8] cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                    {previewMode ? 'Back to Editor' : 'Preview Document'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingPolicy(null)}
                    className="px-3 py-1.5 rounded-[8px] border border-[#dce5f0] text-[13px] font-semibold text-[#5b6d85] cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>

              {previewMode ? (
                <div className="space-y-4 bg-[#f8fbff] p-6 rounded-[12px] border border-[#dce5f0]">
                  <div className="text-[12px] text-[#5b6d85] tabular-nums">
                    v{editingPolicy.version} · Effective {editingPolicy.effectiveDate} · {editingPolicy.categoryTitle}
                  </div>
                  <h2 className="font-display text-[24px] font-bold text-[#102b50]">{editingPolicy.title}</h2>
                  <p className="text-[14px] text-[#2a3f5d]">{editingPolicy.summary}</p>
                  {editingPolicy.sections.map((sec) => (
                    <div key={sec.id} className="space-y-1.5 pt-2">
                      <h4 className="text-[15px] font-semibold text-[#102b50]">{sec.heading}</h4>
                      {sec.paragraphs.map((p, idx) => (
                        <p key={idx} className="text-[13px] text-[#2a3f5d]">{p}</p>
                      ))}
                      {sec.bullets && sec.bullets.length > 0 && (
                        <ul className="list-disc pl-5 text-[13px] text-[#2a3f5d] space-y-1">
                          {sec.bullets.map((b, idx) => (
                            <li key={idx}>{b}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block swas-label mb-1">Policy Title</label>
                      <input
                        type="text"
                        value={editingPolicy.title}
                        onChange={(e) => {
                          const title = e.target.value;
                          setEditingPolicy((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  title,
                                  slug: isNewPolicy ? sanitizeFirestoreId(title.toLowerCase(), '') : prev.slug,
                                }
                              : prev
                          );
                        }}
                        className="w-full px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
                      />
                    </div>
                    <div>
                      <label className="block swas-label mb-1">URL Slug</label>
                      <input
                        type="text"
                        disabled={!isNewPolicy}
                        value={editingPolicy.slug}
                        onChange={(e) =>
                          setEditingPolicy((prev) =>
                            prev ? { ...prev, slug: e.target.value.toLowerCase() } : prev
                          )
                        }
                        className="w-full px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px] disabled:opacity-65"
                      />
                    </div>
                    <div>
                      <label className="block swas-label mb-1">Category</label>
                      <select
                        value={editingPolicy.categoryId}
                        onChange={(e) => {
                          const cat = categories.find((c) => c.id === e.target.value);
                          setEditingPolicy((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  categoryId: e.target.value,
                                  categoryTitle: cat?.title || prev.categoryTitle,
                                }
                              : prev
                          );
                        }}
                        className="w-full px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
                      >
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.code}. {cat.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block swas-label mb-1">Version</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editingPolicy.version}
                          onChange={(e) =>
                            setEditingPolicy((prev) =>
                              prev ? { ...prev, version: e.target.value } : prev
                            )
                          }
                          className="w-full px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setEditingPolicy((prev) =>
                              prev ? { ...prev, version: bumpMinorVersion(prev.version) } : prev
                            )
                          }
                          className="px-3 py-2 rounded-[8px] border border-[#dce5f0] text-[12px] font-semibold text-[#1265c8] cursor-pointer shrink-0"
                        >
                          Bump
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block swas-label mb-1">Effective Date</label>
                      <input
                        type="date"
                        value={editingPolicy.effectiveDate}
                        onChange={(e) =>
                          setEditingPolicy((prev) =>
                            prev ? { ...prev, effectiveDate: e.target.value } : prev
                          )
                        }
                        className="w-full px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
                      />
                    </div>

                    <div className="flex items-end pb-2">
                      <label className="flex items-center gap-2 text-[13px] font-medium text-[#172b46] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingPolicy.requiresAcceptance}
                          onChange={(e) =>
                            setEditingPolicy((prev) =>
                              prev ? { ...prev, requiresAcceptance: e.target.checked } : prev
                            )
                          }
                          className="w-4 h-4 rounded border-[#b8c7da]"
                        />
                        Requires User Active Acceptance
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block swas-label mb-1">Summary</label>
                    <textarea
                      rows={2}
                      value={editingPolicy.summary}
                      onChange={(e) =>
                        setEditingPolicy((prev) =>
                          prev ? { ...prev, summary: e.target.value } : prev
                        )
                      }
                      className="w-full px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
                    />
                  </div>

                  {/* Sections Editor */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="swas-label">Policy Sections ({editingPolicy.sections.length})</label>
                      <button
                        type="button"
                        onClick={() =>
                          setEditingPolicy((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  sections: [
                                    ...prev.sections,
                                    {
                                      id: `section_${prev.sections.length + 1}`,
                                      heading: `${prev.sections.length + 1}. Additional Provision`,
                                      paragraphs: ['Enter section text.'],
                                      bullets: [],
                                    },
                                  ],
                                }
                              : prev
                          )
                        }
                        className="text-[12px] font-semibold text-[#1265c8] hover:underline cursor-pointer"
                      >
                        + Add Section
                      </button>
                    </div>

                    <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                      {editingPolicy.sections.map((sec: PolicySection, sIdx: number) => (
                        <div
                          key={sec.id + sIdx}
                          className="p-3.5 rounded-[10px] bg-[#f8fbff] border border-[#dce5f0] space-y-2"
                        >
                          <input
                            type="text"
                            value={sec.heading}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditingPolicy((prev) => {
                                if (!prev) return prev;
                                const copy = [...prev.sections];
                                copy[sIdx] = { ...copy[sIdx], heading: val };
                                return { ...prev, sections: copy };
                              });
                            }}
                            className="w-full px-3 py-1.5 text-[13px] font-semibold bg-white border border-[#d7e2ef] rounded-[7px]"
                          />
                          <textarea
                            rows={2}
                            value={sec.paragraphs.join('\n\n')}
                            onChange={(e) => {
                              const paras = e.target.value.split(/\n{2,}/).map((x) => x.trim()).filter(Boolean);
                              setEditingPolicy((prev) => {
                                if (!prev) return prev;
                                const copy = [...prev.sections];
                                copy[sIdx] = { ...copy[sIdx], paragraphs: paras.length ? paras : [''] };
                                return { ...prev, sections: copy };
                              });
                            }}
                            placeholder="Paragraphs separated by blank line"
                            className="w-full px-3 py-1.5 text-[13px] bg-white border border-[#d7e2ef] rounded-[7px]"
                          />
                          <textarea
                            rows={2}
                            value={(sec.bullets || []).join('\n')}
                            onChange={(e) => {
                              const bullets = e.target.value.split('\n').map((x) => x.trim()).filter(Boolean);
                              setEditingPolicy((prev) => {
                                if (!prev) return prev;
                                const copy = [...prev.sections];
                                copy[sIdx] = { ...copy[sIdx], bullets };
                                return { ...prev, sections: copy };
                              });
                            }}
                            placeholder="Bullet points (one per line, optional)"
                            className="w-full px-3 py-1.5 text-[12px] bg-white border border-[#d7e2ef] rounded-[7px]"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Admin Review Items Editor */}
                  <div>
                    <label className="block swas-label mb-1">
                      Items Marked [Administrator Review Required] (one per line)
                    </label>
                    <textarea
                      rows={2}
                      value={editingPolicy.pendingAdminReviewItems.join('\n')}
                      onChange={(e) => {
                        const items = e.target.value.split('\n').map((x) => x.trim()).filter(Boolean);
                        setEditingPolicy((prev) =>
                          prev ? { ...prev, pendingAdminReviewItems: items } : prev
                        );
                      }}
                      placeholder="Clear lines once thresholds/decisions are finalized."
                      className="w-full px-3 py-2 text-[13px] bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
                    />
                  </div>

                  {/* Revision & Notification Controls */}
                  <div className="p-4 rounded-[11px] bg-[#f3f6fa] border border-[#dce5f0] space-y-3">
                    <div>
                      <label className="block swas-label mb-1">Reason for Change / Revision Note</label>
                      <input
                        type="text"
                        value={changeReason}
                        onChange={(e) => setChangeReason(e.target.value)}
                        placeholder="Explain what changed in this version"
                        className="w-full px-3 py-2 swas-input bg-white border border-[#d7e2ef] rounded-[9px]"
                      />
                    </div>
                    <div className="flex flex-wrap gap-5 text-[13px] text-[#172b46]">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={materialChange}
                          onChange={(e) => setMaterialChange(e.target.checked)}
                        />
                        Material change (require renewed user acceptance)
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notifyUsers}
                          onChange={(e) => setNotifyUsers(e.target.checked)}
                        />
                        Send in-app notification to users ({registeredUsers.length} users)
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={sendOfficialEmail}
                          onChange={(e) => setSendOfficialEmail(e.target.checked)}
                        />
                        Send official email via swastaskorg@gmail.com
                      </label>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="button"
                      disabled={editorBusy}
                      onClick={() => handleSavePolicy('draft')}
                      className="px-4 py-2 rounded-[9px] border border-[#dce5f0] bg-white text-[13px] font-semibold text-[#172b46] hover:bg-[#f3f6fa] cursor-pointer"
                    >
                      Save as Draft
                    </button>
                    <button
                      type="button"
                      disabled={editorBusy}
                      onClick={() => handleSavePolicy('published')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[9px] swas-btn-primary swas-btn-text cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      {editorBusy ? 'Publishing...' : 'Publish Policy'}
                    </button>
                    <button
                      type="button"
                      disabled={editorBusy}
                      onClick={() => handleSavePolicy('updated')}
                      className="px-4 py-2 rounded-[9px] bg-[#15966b] text-white text-[13px] font-semibold hover:bg-[#117a57] cursor-pointer"
                    >
                      Publish as Updated
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Filter & Search Bar */}
          <div className="swas-card rounded-[14px] p-4 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-[#75869d] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search policy title, slug, or category..."
                className="w-full pl-9 pr-3 py-2 swas-input bg-[#f8fbff] border border-[#dce5f0] rounded-[9px]"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | PolicyStatus)}
              className="px-3 py-2 swas-input bg-[#f8fbff] border border-[#dce5f0] rounded-[9px]"
            >
              <option value="all">All Statuses</option>
              <option value="published">Published</option>
              <option value="updated">Updated</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 swas-input bg-[#f8fbff] border border-[#dce5f0] rounded-[9px]"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code}. {c.title}
                </option>
              ))}
            </select>

            <label className="flex items-center gap-2 text-[13px] font-medium text-[#42556f] cursor-pointer">
              <input
                type="checkbox"
                checked={reviewOnly}
                onChange={(e) => setReviewOnly(e.target.checked)}
              />
              Review Flags Only ({counts.pendingReview})
            </label>
          </div>

          <div className="swas-card rounded-[14px] overflow-hidden">
            <div className="px-5 py-3 border-b border-[#dce5f0] bg-[#f8fbff] text-[12px] font-semibold text-[#5b6d85] flex justify-between">
              <span>Showing {filteredPolicies.length} policies</span>
              <span>Click Edit to modify, draft, version, or publish</span>
            </div>
            <div className="divide-y divide-[#e3ebf5] max-h-[640px] overflow-y-auto">
              {filteredPolicies.map((p) => (
                <div
                  key={p.id}
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-[#f9fbff]"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-[12px] text-[#5b6d85] tabular-nums">
                      <span className="font-semibold uppercase text-[#1265c8]">{p.status}</span>
                      <span>·</span>
                      <span>v{p.version}</span>
                      <span>·</span>
                      <span>{p.categoryTitle}</span>
                      <span>·</span>
                      <span>/policies/{p.slug}</span>
                      {p.pendingAdminReviewItems.length > 0 && (
                        <>
                          <span>·</span>
                          <span className="text-[#8a5d00] font-semibold">
                            {p.pendingAdminReviewItems.length} Review Item(s)
                          </span>
                        </>
                      )}
                    </div>
                    <p className="text-[14px] font-semibold text-[#102b50]">{p.title}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => startEditPolicy(p)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border border-[#dce5f0] bg-white text-[12px] font-semibold text-[#1265c8] hover:bg-[#e9f2ff] cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickArchiveToggle(p)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border border-[#dce5f0] bg-white text-[12px] font-semibold text-[#42556f] hover:text-[#d34552] cursor-pointer"
                    >
                      {p.status === 'archived' ? (
                        <>
                          <RotateCcw className="w-3.5 h-3.5" />
                          Restore
                        </>
                      ) : (
                        <>
                          <Archive className="w-3.5 h-3.5" />
                          Archive
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Categories Manager */}
      {tab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form onSubmit={handleCreateCategory} className="lg:col-span-4 swas-card rounded-[14px] p-5 space-y-4">
            <h3 className="swas-heading-card">Create Policy Category</h3>
            <div>
              <label className="block swas-label mb-1">Code (e.g. M)</label>
              <input
                type="text"
                maxLength={4}
                value={catCode}
                onChange={(e) => setCatCode(e.target.value)}
                placeholder="M"
                className="w-full px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
              />
            </div>
            <div>
              <label className="block swas-label mb-1">Category Title</label>
              <input
                type="text"
                required
                value={catTitle}
                onChange={(e) => setCatTitle(e.target.value)}
                placeholder="e.g. Regional & Tax Compliance"
                className="w-full px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
              />
            </div>
            <div>
              <label className="block swas-label mb-1">Description</label>
              <textarea
                rows={3}
                value={catDescription}
                onChange={(e) => setCatDescription(e.target.value)}
                className="w-full px-3 py-2 swas-input bg-[#f9fbfe] border border-[#d7e2ef] rounded-[9px]"
              />
            </div>
            <button
              type="submit"
              disabled={catBusy}
              className="w-full py-2 px-4 rounded-[9px] swas-btn-primary swas-btn-text cursor-pointer"
            >
              {catBusy ? 'Saving...' : 'Create Category'}
            </button>
          </form>

          <div className="lg:col-span-8 swas-card rounded-[14px] divide-y divide-[#e3ebf5]">
            {categories.map((cat, idx) => (
              <div key={cat.id} className="p-4 flex items-center justify-between gap-4">
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-bold text-[#1265c8] tabular-nums">
                      #{cat.order} · {cat.code}
                    </span>
                    <p className="text-[14px] font-semibold text-[#102b50] truncate">{cat.title}</p>
                    {!cat.enabled && (
                      <span className="text-[11px] font-semibold text-[#d34552]">Hidden</span>
                    )}
                  </div>
                  <p className="text-[12px] text-[#5b6d85] truncate">{cat.description}</p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => handleMoveCategory(idx, -1)}
                    aria-label="Move category up"
                    className="p-1.5 rounded-[7px] border border-[#dce5f0] disabled:opacity-40 cursor-pointer"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === categories.length - 1}
                    onClick={() => handleMoveCategory(idx, 1)}
                    aria-label="Move category down"
                    className="p-1.5 rounded-[7px] border border-[#dce5f0] disabled:opacity-40 cursor-pointer"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleCategoryEnabled(cat)}
                    className="px-2.5 py-1.5 rounded-[7px] border border-[#dce5f0] text-[12px] font-semibold text-[#42556f] cursor-pointer"
                  >
                    {cat.enabled ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Revision Comparison */}
      {tab === 'revisions' && (
        <div className="space-y-5">
          <div className="swas-card rounded-[14px] p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block swas-label mb-1">Select Policy</label>
              <select
                value={comparePolicyId}
                onChange={(e) => {
                  setComparePolicyId(e.target.value);
                  setRevLeftId('');
                  setRevRightId('');
                }}
                className="w-full px-3 py-2 swas-input bg-[#f8fbff] border border-[#dce5f0] rounded-[9px]"
              >
                {policies.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block swas-label mb-1">Revision A (Older / Left)</label>
              <select
                value={leftRev?.id || ''}
                onChange={(e) => setRevLeftId(e.target.value)}
                className="w-full px-3 py-2 swas-input bg-[#f8fbff] border border-[#dce5f0] rounded-[9px]"
              >
                {revisionsForSelectedPolicy.map((r) => (
                  <option key={r.id} value={r.id}>
                    v{r.version} · {r.effectiveDate} ({r.status})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block swas-label mb-1">Revision B (Newer / Right)</label>
              <select
                value={rightRev?.id || ''}
                onChange={(e) => setRevRightId(e.target.value)}
                className="w-full px-3 py-2 swas-input bg-[#f8fbff] border border-[#dce5f0] rounded-[9px]"
              >
                {revisionsForSelectedPolicy.map((r) => (
                  <option key={r.id} value={r.id}>
                    v{r.version} · {r.effectiveDate} ({r.status})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {[
              { title: 'Revision A', rev: leftRev },
              { title: 'Revision B', rev: rightRev },
            ].map(({ title, rev }) => (
              <div key={title} className="swas-card rounded-[14px] p-5 space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#5b6d85]">
                  {title}
                </p>
                {!rev ? (
                  <p className="swas-desc">No revision snapshot available.</p>
                ) : (
                  <>
                    <div className="text-[13px] font-semibold text-[#102b50] tabular-nums">
                      v{rev.version} · Effective {rev.effectiveDate} · {rev.status}
                    </div>
                    <p className="text-[12px] text-[#1265c8]">{rev.changeReason}</p>
                    <p className="text-[13px] text-[#2a3f5d] bg-[#f8fbff] p-3 rounded-[9px] border border-[#dce5f0]">
                      {rev.summarySnapshot}
                    </p>
                    <div className="space-y-2 max-h-[360px] overflow-y-auto">
                      {rev.sectionsSnapshot.map((s) => (
                        <div key={s.id} className="text-[12px] text-[#42556f] border-t border-[#e3ebf5] pt-2">
                          <p className="font-semibold text-[#102b50]">{s.heading}</p>
                          <p className="mt-1">{s.paragraphs.join(' ')}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: Acceptance Tracking */}
      {tab === 'acceptances' && (
        <div className="space-y-5">
          <div className="swas-card rounded-[14px] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1 max-w-md">
              <label className="block swas-label mb-1">Inspect Policy Acceptance Metrics</label>
              <select
                value={trackedPolicy?.id || ''}
                onChange={(e) => setTrackingPolicyId(e.target.value)}
                className="w-full px-3 py-2 swas-input bg-[#f8fbff] border border-[#dce5f0] rounded-[9px]"
              >
                {policies.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} (v{p.version}) {p.requiresAcceptance ? '· Required' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap gap-6 tabular-nums">
              <div>
                <p className="text-[12px] text-[#5b6d85]">Accepted Current v{trackedPolicy?.version}</p>
                <p className="text-[20px] font-bold text-[#15966b]">
                  {trackingStats.acceptedCurrent.length}
                </p>
              </div>
              <div>
                <p className="text-[12px] text-[#5b6d85]">Outdated Version</p>
                <p className="text-[20px] font-bold text-[#9a6700]">
                  {trackingStats.acceptedOutdated.length}
                </p>
              </div>
              <div>
                <p className="text-[12px] text-[#5b6d85]">Outstanding Users</p>
                <p className="text-[20px] font-bold text-[#d34552]">
                  {trackingStats.outstandingUsers.length}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="swas-card rounded-[14px] p-5 space-y-3">
              <div className="flex items-center gap-2 text-[#15966b]">
                <CheckCircle2 className="w-4 h-4" />
                <h3 className="text-[15px] font-semibold">
                  Users Accepted Current Version ({trackingStats.acceptedCurrent.length})
                </h3>
              </div>
              {trackingStats.acceptedCurrent.length === 0 ? (
                <p className="swas-desc">No acceptance records recorded yet for v{trackedPolicy?.version}.</p>
              ) : (
                <div className="divide-y divide-[#e3ebf5] max-h-[360px] overflow-y-auto">
                  {trackingStats.acceptedCurrent.map((rec) => {
                    const user = registeredUsers.find((u) => u.uid === rec.userId);
                    return (
                      <div key={rec.id} className="py-2.5 text-[13px]">
                        <p className="font-semibold text-[#102b50]">
                          {user?.displayName || rec.userId} {user?.email ? `(${user.email})` : ''}
                        </p>
                        <p className="text-[12px] text-[#5b6d85] tabular-nums">
                          v{rec.policyVersion} · Context: {rec.acceptanceContext}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="swas-card rounded-[14px] p-5 space-y-3">
              <h3 className="text-[15px] font-semibold text-[#102b50]">
                Users Without Current Version Acceptance ({trackingStats.outstandingUsers.length})
              </h3>
              {trackingStats.outstandingUsers.length === 0 ? (
                <p className="swas-desc">All registered verified users have accepted this version.</p>
              ) : (
                <div className="divide-y divide-[#e3ebf5] max-h-[360px] overflow-y-auto">
                  {trackingStats.outstandingUsers.map((u) => (
                    <div key={u.uid} className="py-2.5 flex items-center justify-between text-[13px]">
                      <div>
                        <p className="font-semibold text-[#102b50]">{u.displayName}</p>
                        <p className="text-[12px] text-[#5b6d85]">{u.email} · {u.role}</p>
                      </div>
                      <span className="text-[12px] font-medium text-[#9a6700]">Pending</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
