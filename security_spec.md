# SWAS TASKS — Phase 0 Payload-First Security Specification

## 1. Data Invariants

1. **Identity & PII Isolation (`users/{userId}` vs `publicProfiles/{userId}`)**:
   - `users/{userId}` holds email and phone/M-Pesa contact details; only the owning verified user (`request.auth.uid == userId`) or a bootstrapped admin may read or write it.
   - `publicProfiles/{userId}` holds only non-PII fields (`uid`, `displayName`, `role`, `bio`, `createdAt`, `updatedAt`).
2. **Task Ownership & Initial Integrity (`tasks/{taskId}`)**:
   - A task can only be created with `clientId == request.auth.uid`, `slotsFilled == 0`, `status == 'open'`, `rewardKsh >= 50`, and `slotsTotal >= 1`.
   - Only the owning client (or admin) may update or close a task, and `clientId` and `createdAt` are immutable.
3. **Submission Relational & Economic Integrity (`submissions/{submissionId}`)**:
   - A submission cannot exist without an existing `open` parent task (`exists()` + `get()` on `/tasks/{taskId}`).
   - A worker cannot submit to their own task (`workerId != task.clientId`).
   - `submissions.clientId` and `submissions.rewardKsh` must strictly match the parent task's `clientId` and `rewardKsh` at creation time.
   - Initial submission `status` must be `'pending'`.
   - Only the parent task's `clientId` may transition `status` from `'pending'` to `'approved'` or `'rejected'`, modifying strictly `['status', 'reviewNote', 'updatedAt']`. Once `'approved'` or `'rejected'`, the submission is terminal and locked.
4. **Wallet Ledger Integrity (`walletEvents/{eventId}`)**:
   - Immutable append-only deposit/withdrawal records owned by `userId == request.auth.uid` with `amountKsh >= 50` and `status == 'recorded'`.
5. **Temporal Integrity**:
   - All `createdAt` on create and `updatedAt` on update must equal `request.time`.
6. **Account Lifecycle & Activation Gate (`users/{userId}`, `usernames/{username}`, `accountApplications/{id}`)**:
   - Newly registered non-admin accounts start in `EMAIL_VERIFICATION_PENDING` or `PENDING_ADMIN_APPROVAL` and cannot self-promote `accountStatus` to `ACTIVE`. Only backend Admin SDK or verified `isAdmin()` transitions `accountStatus`.
   - `ACTIVE` status is enforced on task claiming, work submission, and withdrawal creation.
7. **Server-Authoritative 90-Minute Review Engine & Immutable Financial Ledger (`taskSubmissions`, `taskApprovalTimers`, `walletLedger`, `earnings`)**:
   - Clients cannot write directly to `walletLedger`, `earnings`, `taskApprovalTimers`, `taskReviews`, `taskVersions`, `taskSourceImports`, `auditLogs`, or `securityEvents`.
   - Wallet balance mutations (`availableKes`, `availableBalance`, `pendingEarnings`, `reservedWithdrawalFunds`, `totalEarned`, `totalWithdrawn`) execute strictly inside atomic backend Admin SDK transactions with idempotency keys (`auto_${submissionId}`, `admin_${submissionId}`, `wd_${withdrawalId}`).
8. **Withdrawal Fund Reservation & Release (`withdrawals/{withdrawalId}`)**:
   - Withdrawals are created atomically via `/api/withdrawals/request`, reserving `availableBalance` into `reservedWithdrawalFunds` with initial status `PENDING_ADMIN_APPROVAL`. No withdrawal is auto-paid; rejecting or cancelling releases reserved funds back atomically.

## 2. The "Dirty Dozen" Adversarial Payloads

| # | Target Collection | Attack Vector | Expected Result |
|---|-------------------|---------------|-----------------|
| 1 | `users/{otherUid}` | Cross-user `get` or `update` on another user's private PII doc | `PERMISSION_DENIED` |
| 2 | `users/{uid}` | Shadow field injection (`isAdmin: true` or `walletBalance: 999999`) | `PERMISSION_DENIED` |
| 3 | `tasks/{badId}` | Oversized/invalid document ID (`../admin` or 200-char string) | `PERMISSION_DENIED` |
| 4 | `tasks/{taskId}` | Identity spoofing (`clientId: "victim_uid"`) on create | `PERMISSION_DENIED` |
| 5 | `tasks/{taskId}` | Pre-filled slots or negative reward (`slotsFilled: 5`, `rewardKsh: -100`) | `PERMISSION_DENIED` |
| 6 | `tasks/{taskId}` | Non-owner closing or editing another client's task | `PERMISSION_DENIED` |
| 7 | `submissions/{subId}` | Self-dealing (client submitting to their own task to farm metrics) | `PERMISSION_DENIED` |
| 8 | `submissions/{subId}` | Reward inflation (`rewardKsh: 500000` on a `500` KSh task) | `PERMISSION_DENIED` |
| 9 | `submissions/{subId}` | State shortcutting (worker creating submission directly with `status: "approved"`) | `PERMISSION_DENIED` |
| 10 | `submissions/{subId}` | Worker self-approving their own pending submission via update | `PERMISSION_DENIED` |
| 11 | `submissions/{subId}` | Client modifying `approved` submission back to `pending` (terminal lock bypass) | `PERMISSION_DENIED` |
| 12 | `walletEvents/{id}` | Forged timestamp (`createdAt: "2020-01-01"`) or negative amount | `PERMISSION_DENIED` |
