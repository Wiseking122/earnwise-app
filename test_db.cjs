const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");
const firebaseConfig = require("./firebase-applet-config.json");
const app = admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: firebaseConfig.projectId
});
const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
const dbAdmin = getFirestore(app, dbId);
dbAdmin.collection('users').limit(1).get().then(() => {
  console.log("Success with ", dbId);
}).catch(e => {
  console.error("Failed with ", dbId, e);
  const fallback = getFirestore(app);
  fallback.collection('users').limit(1).get().then(() => console.log("Success with default")).catch(e => console.error("Failed default ", e));
});
