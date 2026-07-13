
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config();

// Initialize Firebase Admin (assuming default credentials or env var)
initializeApp();

const db = getFirestore();

async function checkSubmissions() {
    const snap = await db.collection('offer_submissions').limit(5).get();
    snap.forEach(doc => {
        console.log('Doc ID:', doc.id, 'Data:', doc.data());
    });
}

checkSubmissions().catch(console.error);
