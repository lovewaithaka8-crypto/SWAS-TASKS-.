import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
  type Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from './firebase';
import { cleanText } from './validation';
import { dispatchPlatformEmail } from './emailService';
import { DEFAULT_POLICY_CATEGORIES, DEFAULT_POLICY_DOCUMENTS } from './policies';
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

export function sanitizeFirestoreId(raw: string, fallback = 'item'): string {
  const cleaned = raw
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 120);
  return cleaned || fallback;
}

function buildBaselineRevisions(): PolicyRevision[] {
  return DEFAULT_POLICY_DOCUMENTS.map((p) => ({
    id: sanitizeFirestoreId(`baseline_${p.id}_v_${p.version}`),
    policyId: p.id,
    policyTitle: p.title,
    categoryTitle: p.categoryTitle,
    version: p.version,
    status: p.status,
    effectiveDate: p.effectiveDate,
    changeReason: p.changeSummary || 'Initial published SWAS TASKS governance baseline.',
    materialChange: false,
    requiresReacceptance: false,
    summarySnapshot: p.summary,
    sectionsSnapshot: p.sections,
    editorId: 'swas_system_baseline',
  }));
}

export const BASELINE_POLICY_REVISIONS: PolicyRevision[] = buildBaselineRevisions();

export function subscribePolicyCategories(
  isAdmin: boolean,
  onData: (items: PolicyCategory[]) => void
): Unsubscribe {
  const ref = isAdmin
    ? collection(db, 'policyCategories')
    : query(collection(db, 'policyCategories'), where('enabled', '==', true));

  return onSnapshot(
    ref,
    (snap) => {
      onData(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<PolicyCategory, 'id'> & { updatedAt?: Timestamp }),
        }))
      );
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'policyCategories')
  );
}

export function subscribePolicies(
  isAdmin: boolean,
  onData: (items: PolicyDocument[]) => void
): Unsubscribe {
  const ref = isAdmin
    ? collection(db, 'policies')
    : query(collection(db, 'policies'), where('status', 'in', ['published', 'updated']));

  return onSnapshot(
    ref,
    (snap) => {
      onData(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<PolicyDocument, 'id'>),
        }))
      );
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'policies')
  );
}

export function subscribePolicyRegistry(
  onData: (manifest: PolicyRegistryManifest | null) => void
): Unsubscribe {
  const q = query(collection(db, 'policyRegistry'), where('public', '==', true));
  return onSnapshot(
    q,
    (snap) => {
      const manifestDoc = snap.docs.find((d) => d.id === 'manifest') || snap.docs[0];
      if (!manifestDoc) {
        onData(null);
        return;
      }
      onData({
        id: manifestDoc.id,
        ...(manifestDoc.data() as Omit<PolicyRegistryManifest, 'id'>),
      });
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'policyRegistry')
  );
}

export function subscribePolicyRevisions(
  isAdmin: boolean,
  onData: (items: PolicyRevision[]) => void
): Unsubscribe {
  const ref = isAdmin
    ? collection(db, 'policyRevisions')
    : query(collection(db, 'policyRevisions'), where('status', 'in', ['published', 'updated']));

  return onSnapshot(
    ref,
    (snap) => {
      onData(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<PolicyRevision, 'id'>),
        }))
      );
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'policyRevisions')
  );
}

export function subscribeUserPolicyAcceptances(
  uid: string,
  onData: (items: PolicyAcceptanceRecord[]) => void
): Unsubscribe {
  const q = query(collection(db, 'policyAcceptances'), where('userId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<PolicyAcceptanceRecord, 'id'>),
      }));
      items.sort(
        (a, b) => (b.acceptedAt?.toMillis?.() ?? 0) - (a.acceptedAt?.toMillis?.() ?? 0)
      );
      onData(items);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'policyAcceptances')
  );
}

export function subscribeAllPolicyAcceptances(
  onData: (items: PolicyAcceptanceRecord[]) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, 'policyAcceptances'),
    (snap) => {
      const items = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<PolicyAcceptanceRecord, 'id'>),
      }));
      items.sort(
        (a, b) => (b.acceptedAt?.toMillis?.() ?? 0) - (a.acceptedAt?.toMillis?.() ?? 0)
      );
      onData(items);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'policyAcceptances')
  );
}

export function subscribeRegisteredUsersForAdmin(
  onData: (items: UserPrivate[]) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, 'users'),
    (snap) => {
      onData(snap.docs.map((d) => d.data() as UserPrivate));
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'users')
  );
}

export function mergePolicyCatalog(params: {
  isAdmin: boolean;
  categoryOverrides: PolicyCategory[];
  policyOverrides: PolicyDocument[];
  manifest: PolicyRegistryManifest | null;
}): {
  categories: PolicyCategory[];
  policies: PolicyDocument[];
} {
  const catMap = new Map<string, PolicyCategory>();
  for (const cat of DEFAULT_POLICY_CATEGORIES) {
    catMap.set(cat.id, cat);
  }
  for (const override of params.categoryOverrides) {
    catMap.set(override.id, override);
  }

  const categories = Array.from(catMap.values())
    .filter((c) => params.isAdmin || c.enabled)
    .sort((a, b) => a.order - b.order || a.code.localeCompare(b.code));

  const visibleCategoryIds = new Set(categories.map((c) => c.id));

  const draftSet = new Set(params.manifest?.draftPolicyIds || []);
  const archivedSet = new Set(params.manifest?.archivedPolicyIds || []);

  const policyMap = new Map<string, PolicyDocument>();
  for (const base of DEFAULT_POLICY_DOCUMENTS) {
    let status = base.status;
    if (draftSet.has(base.id)) status = 'draft';
    if (archivedSet.has(base.id)) status = 'archived';
    policyMap.set(base.id, { ...base, status });
  }
  for (const override of params.policyOverrides) {
    policyMap.set(override.id, override);
  }

  const policies = Array.from(policyMap.values()).filter((docItem) => {
    if (params.isAdmin) return true;
    const isPublicStatus = docItem.status === 'published' || docItem.status === 'updated';
    const isCategoryEnabled = visibleCategoryIds.has(docItem.categoryId);
    return isPublicStatus && isCategoryEnabled;
  });

  return { categories, policies };
}

export function mergePolicyRevisions(
  firestoreRevisions: PolicyRevision[],
  isAdmin: boolean
): PolicyRevision[] {
  const merged = [...firestoreRevisions];
  merged.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
  if (isAdmin) return merged;
  return merged.filter((rev) => rev.status === 'published' || rev.status === 'updated');
}

export function getPolicyAcceptanceState(
  policy: PolicyDocument,
  userAcceptances: PolicyAcceptanceRecord[]
): {
  acceptedCurrentVersion: boolean;
  latestAcceptedRecord: PolicyAcceptanceRecord | null;
  needsRenewal: boolean;
  needsInitialAcceptance: boolean;
} {
  const matching = userAcceptances.filter(
    (rec) => rec.policyId === policy.id || rec.policySlug === policy.slug
  );
  if (matching.length === 0) {
    return {
      acceptedCurrentVersion: false,
      latestAcceptedRecord: null,
      needsRenewal: false,
      needsInitialAcceptance: policy.requiresAcceptance,
    };
  }
  const latestAcceptedRecord = matching[0];
  const acceptedCurrentVersion = matching.some(
    (rec) => rec.policyVersion.trim() === policy.version.trim()
  );
  return {
    acceptedCurrentVersion,
    latestAcceptedRecord,
    needsRenewal: !acceptedCurrentVersion && policy.requiresAcceptance,
    needsInitialAcceptance: false,
  };
}

export async function recordPolicyAcceptances(
  uid: string,
  items: { policy: PolicyDocument; context: string }[]
): Promise<void> {
  if (!uid || items.length === 0) return;
  const batch = writeBatch(db);
  for (const { policy, context } of items) {
    const docId = sanitizeFirestoreId(`${uid}__${policy.id}__v${policy.version}`);
    const ref = doc(db, 'policyAcceptances', docId);
    const statement = cleanText(
      `I have read and actively accept ${policy.title} (v${policy.version}, effective ${policy.effectiveDate}).`,
      300
    );
    batch.set(ref, {
      userId: uid,
      policyId: sanitizeFirestoreId(policy.id),
      policySlug: sanitizeFirestoreId(policy.slug),
      policyTitle: cleanText(policy.title, 140),
      policyVersion: cleanText(policy.version, 24),
      presentedEffectiveDate: cleanText(policy.effectiveDate, 24),
      acceptanceContext: cleanText(context, 64) || 'policy_centre',
      consentStatement: statement,
      acceptedAt: serverTimestamp(),
    });
  }
  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'policyAcceptances');
  }
}

function sanitizeSections(sections: PolicySection[]): PolicySection[] {
  const cleanList = sections
    .slice(0, 25)
    .map((sec, idx) => ({
      id: sanitizeFirestoreId(sec.id || `section_${idx + 1}`, `section_${idx + 1}`),
      heading: cleanText(sec.heading, 140) || `Section ${idx + 1}`,
      paragraphs: sec.paragraphs
        .map((p) => cleanText(p, 2000))
        .filter(Boolean)
        .slice(0, 12),
      ...(sec.bullets && sec.bullets.length > 0
        ? {
            bullets: sec.bullets
              .map((b) => cleanText(b, 600))
              .filter(Boolean)
              .slice(0, 30),
          }
        : {}),
    }))
    .filter((s) => s.paragraphs.length > 0 || (s.bullets && s.bullets.length > 0));

  if (cleanList.length === 0) {
    return [
      {
        id: 'overview',
        heading: '1. Policy Overview',
        paragraphs: ['SWAS TASKS governance standard awaiting detailed clauses.'],
      },
    ];
  }
  return cleanList;
}

export async function savePolicyDocumentWithRevision(params: {
  adminUser: User;
  policy: PolicyDocument;
  previousVersion?: string;
  changeReason: string;
  materialChange: boolean;
  manifest: PolicyRegistryManifest | null;
  notifyUsers?: boolean;
  sendOfficialEmail?: boolean;
  allUsers?: UserPrivate[];
}): Promise<{ notifiedCount: number; emailedCount: number }> {
  const { adminUser, policy } = params;
  const policyId = sanitizeFirestoreId(policy.id || policy.slug);
  const policySlug = sanitizeFirestoreId(policy.slug || policyId);
  const policyRef = doc(db, 'policies', policyId);

  const existingSnap = await getDoc(policyRef);
  const sections = sanitizeSections(policy.sections);
  const nowIsoDate = new Date().toISOString().slice(0, 10);

  const payload: Record<string, unknown> = {
    slug: policySlug,
    title: cleanText(policy.title, 140),
    categoryId: sanitizeFirestoreId(policy.categoryId),
    categoryTitle: cleanText(policy.categoryTitle, 120),
    summary: cleanText(policy.summary, 600),
    status: policy.status,
    version: cleanText(policy.version, 24),
    effectiveDate: cleanText(policy.effectiveDate || nowIsoDate, 24),
    lastUpdatedDate: cleanText(policy.lastUpdatedDate || nowIsoDate, 24),
    requiresAcceptance: Boolean(policy.requiresAcceptance),
    acceptanceContexts: policy.acceptanceContexts
      .map((c) => cleanText(c, 60))
      .filter(Boolean)
      .slice(0, 10),
    changeSummary: cleanText(params.changeReason || policy.changeSummary, 500),
    sections,
    relatedPolicySlugs: policy.relatedPolicySlugs
      .map((s) => sanitizeFirestoreId(s))
      .filter(Boolean)
      .slice(0, 12),
    pendingAdminReviewItems: policy.pendingAdminReviewItems
      .map((i) => cleanText(i, 300))
      .filter(Boolean)
      .slice(0, 15),
    updatedBy: adminUser.uid,
    createdAt: existingSnap.exists()
      ? existingSnap.data().createdAt || serverTimestamp()
      : serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  // Update registry manifest so non-admins immediately respect drafted/archived status for baseline docs
  const draftSet = new Set(params.manifest?.draftPolicyIds || []);
  const archivedSet = new Set(params.manifest?.archivedPolicyIds || []);
  draftSet.delete(policyId);
  archivedSet.delete(policyId);
  if (policy.status === 'draft') draftSet.add(policyId);
  if (policy.status === 'archived') archivedSet.add(policyId);

  const revId = sanitizeFirestoreId(
    `rev_${policyId}_v${policy.version}_${Date.now().toString(36)}`
  );
  const revisionPayload: Record<string, unknown> = {
    policyId,
    policyTitle: cleanText(policy.title, 140),
    categoryTitle: cleanText(policy.categoryTitle, 120),
    version: cleanText(policy.version, 24),
    ...(params.previousVersion ? { previousVersion: cleanText(params.previousVersion, 24) } : {}),
    status: policy.status,
    effectiveDate: cleanText(policy.effectiveDate || nowIsoDate, 24),
    changeReason: cleanText(params.changeReason, 500) || 'Policy updated by administrator.',
    materialChange: Boolean(params.materialChange),
    requiresReacceptance: Boolean(params.materialChange && policy.requiresAcceptance),
    summarySnapshot: cleanText(policy.summary, 600),
    sectionsSnapshot: sections,
    editorId: adminUser.uid,
    ...(adminUser.email ? { editorEmail: cleanText(adminUser.email, 254) } : {}),
    createdAt: serverTimestamp(),
  };

  const batch = writeBatch(db);
  batch.set(policyRef, payload);
  batch.set(doc(db, 'policyRevisions', revId), revisionPayload);
  batch.set(doc(db, 'policyRegistry', 'manifest'), {
    public: true,
    draftPolicyIds: Array.from(draftSet).slice(0, 500),
    archivedPolicyIds: Array.from(archivedSet).slice(0, 500),
    updatedBy: adminUser.uid,
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `policies/${policyId}`);
  }

  let notifiedCount = 0;
  let emailedCount = 0;

  const shouldBroadcast =
    (policy.status === 'published' || policy.status === 'updated') &&
    params.allUsers &&
    params.allUsers.length > 0;

  if (shouldBroadcast && params.notifyUsers && params.allUsers) {
    const chunkSize = 400;
    const users = params.allUsers;
    for (let i = 0; i < users.length; i += chunkSize) {
      const notifBatch = writeBatch(db);
      const slice = users.slice(i, i + chunkSize);
      for (const targetUser of slice) {
        const nid = sanitizeFirestoreId(
          `pol_${policyId}_v${policy.version}_${targetUser.uid.slice(0, 10)}_${Date.now().toString(36)}`
        );
        notifBatch.set(doc(db, 'notifications', nid), {
          userId: targetUser.uid,
          actorId: adminUser.uid,
          type: 'policy_update',
          title: cleanText(`Policy Update: ${policy.title} (v${policy.version})`, 120),
          body: cleanText(
            `${params.changeReason}${
              params.materialChange && policy.requiresAcceptance
                ? ' Active re-acceptance is requested in My Accepted Policies.'
                : ''
            }`,
            400
          ),
          linkRoute: params.materialChange && policy.requiresAcceptance ? 'my-policies' : 'policy-updates',
          read: false,
          createdAt: serverTimestamp(),
        });
        notifiedCount += 1;
      }
      await notifBatch.commit().catch(() => undefined);
    }
  }

  if (shouldBroadcast && params.sendOfficialEmail && params.allUsers) {
    for (const targetUser of params.allUsers.slice(0, 50)) {
      if (!targetUser.email) continue;
      const res = await dispatchPlatformEmail({
        user: adminUser,
        surface: 'website',
        category: 'general_announcement',
        recipientEmail: targetUser.email,
        subject: `[SWAS TASKS] Policy Update: ${policy.title} (v${policy.version})`,
        bodyText: [
          `Hello ${targetUser.displayName || 'SWAS TASKS Member'},`,
          '',
          `SWAS TASKS has published an update to "${policy.title}" (Version ${policy.version}, effective ${policy.effectiveDate}).`,
          `Summary of change: ${params.changeReason}`,
          params.materialChange && policy.requiresAcceptance
            ? 'Please review and actively accept the updated policy inside My Accepted Policies in your SWAS TASKS workspace.'
            : 'You can read the updated policy anytime inside the SWAS TASKS Policy Centre.',
          '',
          'Official Inquiries: swastaskorg@gmail.com',
        ].join('\n'),
      });
      if (res.sent) emailedCount += 1;
    }
  }

  return { notifiedCount, emailedCount };
}

export async function savePolicyCategory(
  adminUid: string,
  category: PolicyCategory
): Promise<void> {
  const id = sanitizeFirestoreId(category.id || category.slug);
  try {
    await setDoc(doc(db, 'policyCategories', id), {
      code: cleanText(category.code, 8) || 'Z',
      slug: sanitizeFirestoreId(category.slug || id),
      title: cleanText(category.title, 120),
      description: cleanText(category.description, 400),
      order: Number(category.order) || 0,
      enabled: Boolean(category.enabled),
      updatedBy: adminUid,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `policyCategories/${id}`);
  }
}

export async function reorderPolicyCategories(
  adminUid: string,
  orderedCategories: PolicyCategory[]
): Promise<void> {
  const batch = writeBatch(db);
  orderedCategories.forEach((cat, idx) => {
    const id = sanitizeFirestoreId(cat.id || cat.slug);
    batch.set(doc(db, 'policyCategories', id), {
      code: cleanText(cat.code, 8) || 'Z',
      slug: sanitizeFirestoreId(cat.slug || id),
      title: cleanText(cat.title, 120),
      description: cleanText(cat.description, 400),
      order: idx + 1,
      enabled: Boolean(cat.enabled),
      updatedBy: adminUid,
      updatedAt: serverTimestamp(),
    });
  });
  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'policyCategories');
  }
}
