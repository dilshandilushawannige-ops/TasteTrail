# Temporary user blocks

The admin Users page offers a one-week (7-day) or one-month (30-day) block. It writes only `blockedAt`, `blockDurationDays`, and `blockedBy` on the existing user document. `blockedAt` uses Firebase server time. No account or user content is deleted.

The app displays a blocked-access screen until the period expires. Firestore rules also deny protected data access during that period, using `request.time` rather than the phone's clock. This restricts app access; it does not disable the Firebase Authentication account.

## Activate the rules

Open the TasteTrail project in Firebase Console → Firestore Database → Rules. Compare the deployed rules with [firestore.rules](firestore.rules) before publishing. If the deployed file contains additional collection permissions, preserve them and merge these block-related additions:

1. Add `accountAccessAllowed()` inside the database match.
2. Add its condition to the existing restaurant permissions and owner profile writes/deletes and favourites permissions, as shown in the file.
3. Add its condition to `isUserAdmin()`, and add the admin-only user update clause that permits only the three block fields. The blocked user's own profile must remain readable so the app can display their expiry.
4. For other protected collections present in the deployed rules, add the same condition to their existing authenticated access clauses. Preserve their other validation conditions. An overlapping unconditional allow clause would bypass a block.
5. Publish and verify with a test member account: choose 1 week or 1 month from an admin account, confirm the block, and check that the member sees the expiry screen. Also verify a regular user cannot write block metadata.

Blocking your own account is rejected. Admin privileges come from trusted authentication claims, not an editable profile role. A failed block stays in the dialog with an error and can be retried. There is no scheduled unblocking job: app and rule checks automatically allow access after the expiry.

Blocked cards also offer **Unblock**. After confirmation, an admin clears `blockedAt` to `null` and `blockDurationDays` to `0`, keeping all profile data. The account-access screen updates from its live listener and restores app access immediately. Publish the updated admin rule's unblock alternative (`blockedAt == null` and `blockDurationDays == 0`) as well as the block clause; users cannot clear their own blocks.

## Local checks

Run `node scripts/user-block-check.cjs` and `npx tsc --noEmit`. The script uses mocked Firebase operations and does not block live accounts. Deployed security rules have not been verified by these mocks.
