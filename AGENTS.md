# Project Rules and Guidelines for Earnwise

## ⚠️ CRITICAL: NEVER TOUCH OR RESET THE USER BALANCE
1. **No Balance Reset**: Under no circumstances should any code change, migration, initialization script, or cleanup logic reset, modify, or overwrite a user's wallet balance, withdrawable balance, or referral balance, unless it is a valid transactional debit/credit initiated by the user.
2. **Offline Connection Guards**: 
   - Never write fallback/self-healing profiles when the Firestore client is offline or cannot reach the backend server.
   - Any check for profile existence must fetch directly from the server (`getDoc` with server verification) and abort immediately upon any error or connection timeout, rather than assuming a document does not exist and writing a fresh profile with `balance: 0`.
3. **Firestore Security**: All balance modifications must be performed atomically via server-authoritative routes or Firestore atomic increments (`increment(...)`). Never write hardcoded client-side sets to the balance property.
