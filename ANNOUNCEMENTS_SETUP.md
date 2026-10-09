# Announcements and user notifications

Admin Profile → Announcements shows all published messages, newest first. Choose Create new announcement → enter title and message → Preview → Send to all users. Update opens a prefilled form; preview and confirm the changes. Delete requires confirmation before removing the message for all users.

The app writes one `announcements/{id}` document. All signed-in, unblocked users can view it from the Home notification bell. Updates preserve its ID, original author/date and users' read status. Deletions remove it from the live inbox and unread count; existing private read receipts are ignored. The bell updates live with an unread count. Opening an individual announcement writes a private `users/{uid}/announcementReads/{id}` receipt; opening the inbox alone does not mark everything read. Read status also persists across sessions/devices.

These are in-app notifications. No phone push notification or background alert is sent. No new native modules or development build are required.

## Firebase activation

The client code is ready, but the new Firestore permissions must be published in the TasteTrail Firebase project before live sending/reading works:

1. Open Firebase Console → Firestore Database → Rules.
2. Merge the `/announcements/{announcementId}` match from [firestore.rules](firestore.rules) into the database match. It allows authenticated, unblocked reads and trusted-admin-only creates, updates and deletes, with title/message limits and server timestamps. Updates may only change title, message, updatedAt and updatedBy.
3. Merge `/announcementReads/{announcementId}` inside the existing `/users/{userId}` match. It uses the existing `isOwner()` and `accountAccessAllowed()` helpers and grants access only to that user's receipts.
4. Preserve all other collection permissions in the deployed file. Do not replace additional deployed recipe or other collection rules with the repository's default-deny block.
5. Publish, then send a test announcement from an admin account. Sign in with two member accounts; verify both receive it, reading it on one account does not mark it read for the other, updates appear in both inboxes, and deletion removes it from both. Verify a non-admin cannot create, update or delete announcements.

Admin retry uses the same announcement ID to avoid duplicate sends when a commit succeeds but the response is lost. Failed sends keep the form contents. Messages also remain available to users who were offline and to future sign-ins.

## Checks

`node scripts/announcement-check.cjs` tests publishing, retries, read receipts, listener updates/account switching, form behavior, and the bell/inbox flow using mocks. `npx tsc --noEmit` checks types. No real announcement is sent by these checks; deployed rules and device UI need verification after activation.
