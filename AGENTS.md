# Project Rules and Guidelines for Earnwise

## ⚠️ CRITICAL: NEVER TOUCH OR RESET THE USER BALANCE
1. **No Balance Reset**: Under no circumstances should any code change, migration, initialization script, or cleanup logic reset, modify, or overwrite a user's wallet balance, withdrawable balance, or referral balance, unless it is a valid transactional debit/credit initiated by the user.
2. **Offline Connection Guards**: 
   - Never write fallback/self-healing profiles when the Firestore client is offline or cannot reach the backend server.
   - Any check for profile existence must fetch directly from the server (`getDoc` with server verification) and abort immediately upon any error or connection timeout, rather than assuming a document does not exist and writing a fresh profile with `balance: 0`.
3. **Firestore Security**: All balance modifications must be performed atomically via server-authoritative routes or Firestore atomic increments (`increment(...)`). Never write hardcoded client-side sets to the balance property.

## 🤖 AI USAGE POLICY
1. **Daily Limits**: Users on plans with costs from ₦1,000 to ₦7,000 are limited to 3 AI queries per day (WAT timezone). Plans ₦10,000 and above have unlimited AI access.
2. **Course Override**: Users who have purchased any course in the Academy have unlimited AI access (including within the course player).
3. **Server Authoritative**: AI limits must be enforced on the backend (server.ts) and tracked in the `aiQueries` collection.

## 💸 WITHDRAWAL & WALLET RULES
1. **Dual-Wallet System**: Separate balances for Task earnings and Referral earnings.
2. **Payout Schedule**: 
   - Referral Payouts: Saturdays (8:00 AM – 6:00 PM Lagos Time).
   - Task Payouts: Monthly on the 30th (Midnight Window).
3. **Processing Fee**: A tiered processing fee applies: 10% for Task withdrawals and 0% (Free) for Referral withdrawals.
4. **Window Caps**: Withdrawals are capped per window based on the user's plan (Elite: ₦3k, Starter: ₦6k, Pro: ₦9k, Bronze: ₦15k, Diamond: ₦21k, Silver: ₦30k, Platinum: ₦45k, Golden: ₦75k).
5. **Payout Receipt**: A digital receipt modal with a "Share Proof" button must be shown after every successful withdrawal request.

