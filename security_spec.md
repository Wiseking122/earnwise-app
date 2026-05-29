# Security Specification for Notifications

## Data Invariants
- A notification must have a title, message, and timestamp.
- A notification should only be visible to a specific user (if targeted) or all users (if broadcasted).

## The "Dirty Dozen" Payloads
1. Create notification as non-admin -> PERMISSION_DENIED
2. Create notification without title -> PERMISSION_DENIED
3. Create notification without message -> PERMISSION_DENIED
4. Create notification with invalid ID (too long) -> PERMISSION_DENIED
5. Update existing notification -> PERMISSION_DENIED
6. List notifications as signed out user -> PERMISSION_DENIED
7. Delete notification as non-admin -> PERMISSION_DENIED
8. Create notification with malicious payload (e.g., trying to write to other fields) -> PERMISSION_DENIED
9. Create notification with future timestamp -> PERMISSION_DENIED
10. Create notification with empty string title/message -> PERMISSION_DENIED
11. Read notification as signed in user -> ALLOWED
12. Create notification as admin -> ALLOWED

## Test Runner (firestore.rules.test.ts)
(Implementation of test runner would go here)
