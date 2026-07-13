import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };

async function run() {
  console.log("Initializing Firebase Admin SDK...");
  let firebaseApp;
  try {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: firebaseConfig.projectId
    });
  } catch (err) {
    console.warn("Application default credentials failed, trying applicationDefault fallback...", err);
    firebaseApp = admin.initializeApp({
      projectId: firebaseConfig.projectId
    });
  }

  const dbAdmin = getFirestore(firebaseApp);
  console.log("Connected to Firestore database:", firebaseConfig.projectId);

  // 1. Check user wiseking7890@gmail.com
  console.log("\n--- USER CHECKS ---");
  const emailToSearch = 'wiseking7890@gmail.com';
  const usersSnap = await dbAdmin.collection('users').get();
  console.log(`Total users in collection: ${usersSnap.size}`);

  let foundUser = null;
  usersSnap.forEach(doc => {
    const data = doc.data();
    if (data.email && data.email.toLowerCase() === emailToSearch) {
      foundUser = { id: doc.id, ...data };
    }
  });

  if (foundUser) {
    console.log(`Found user matching ${emailToSearch}:`);
    console.log(JSON.stringify(foundUser, null, 2));
  } else {
    console.log(`User with email ${emailToSearch} NOT found in users collection!`);
  }

  // 2. Count other collections
  console.log("\n--- COLLECTION COUNTS ---");
  const collections = ['users', 'offer_submissions', 'completions', 'tasks', 'withdrawals', 'appeals'];
  for (const coll of collections) {
    try {
      const snap = await dbAdmin.collection(coll).get();
      console.log(`Collection '${coll}': ${snap.size} documents`);
      if (snap.size > 0 && (coll === 'offer_submissions' || coll === 'completions')) {
        console.log(`Sample document from '${coll}':`);
        console.log(JSON.stringify({ id: snap.docs[0].id, ...snap.docs[0].data() }, null, 2));
      }
    } catch (err: any) {
      console.error(`Error querying collection '${coll}':`, err.message);
    }
  }

  process.exit(0);
}

run().catch(err => {
  console.error("Diagnostic script failed:", err);
  process.exit(1);
});
