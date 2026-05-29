import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
// @ts-ignore - firestoreDatabaseId is dynamically added by the platform
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  host: "firestore.googleapis.com", 
  }, firebaseConfig.firestoreDatabaseId || '(default)');
export const auth = getAuth();
let analytics: any = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      try {
        analytics = getAnalytics(app);
      } catch (e) {
        console.warn("Firebase Analytics could not be initialized:", e);
      }
    }
  }).catch((e) => {
    console.warn("Firebase Analytics is not supported in this environment:", e);
  });
}
export { analytics };

// Test connection
async function testConnection() {
  try {
    // We attempt to read a doc - if it fails with 'offline', it's usually a config/network mismatch
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error: any) {
    console.warn("Connection test warning:", error.message);
    if(error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration or internet connection. (Project ID: " + firebaseConfig.projectId + ")");
    }
  }
}
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  
  if (errInfo.error.includes('insufficient permissions')) {
    throw new Error(`Permission Denied: You don't have access to ${path}.`);
  }
  
  if (errInfo.error.includes('failed-precondition') && errInfo.error.includes('index')) {
    const indexUrl = errInfo.error.match(/https:\/\/console\.firebase\.google\.com[^\s]*/)?.[0];
    throw new Error(`Indexing Required: This query needs a composite index. ${indexUrl ? 'Click here to create it: ' + indexUrl : 'Please check your Firebase console.'}`);
  }
  
  throw new Error(errInfo.error);
}
