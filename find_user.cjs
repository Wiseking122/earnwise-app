const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");
const firebaseConfig = require("./firebase-applet-config.json");

const app = admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: firebaseConfig.projectId
});

const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
const dbAdmin = getFirestore(app, dbId);

async function run() {
  try {
    const userSnap = await dbAdmin.collection('users')
      .where('email', '==', 'wiseking7890@gmail.com')
      .limit(1)
      .get();
      
    if (userSnap.empty) {
      console.log("No user found with email wiseking7890@gmail.com");
      return;
    }
    
    const userDoc = userSnap.docs[0];
    const userData = userDoc.data();
    console.log("=== USER PROFILE ===");
    console.log(JSON.stringify(userData, null, 2));
    
    const refCode = userData.referralCode;
    console.log(`\nUser Referral Code: ${refCode}`);
    
    if (refCode) {
      const referredSnap = await dbAdmin.collection('users')
        .where('referredBy', '==', refCode)
        .get();
        
      console.log(`\n=== REFERRED USERS (${referredSnap.size}) ===`);
      referredSnap.forEach(doc => {
        const d = doc.data();
        console.log(`- ID: ${doc.id}, Name: ${d.displayName}, Plan: ${d.plan}, hasReceivedReferralBonus: ${d.hasReceivedReferralBonus}, createdAt: ${d.createdAt?.toDate?.() || d.createdAt}`);
      });
    }
  } catch (error) {
    console.error("Error executing script:", error);
  }
  process.exit(0);
}

run();
