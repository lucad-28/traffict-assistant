import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

let db: ReturnType<typeof getFirestore> | null = null;

if (!getApps().length && firebaseConfig.apiKey && firebaseConfig.projectId) {
  try {
    initializeApp(firebaseConfig as any);
    db = getFirestore();
    console.log('[Firebase Client] initialized');
  } catch (err) {
    console.warn('[Firebase Client] initialization error', err);
  }
} else if (getApps().length) {
  try {
    db = getFirestore();
  } catch (err) {
    console.warn('[Firebase Client] getFirestore error', err);
  }
}

export function getClientFirestore() {
  if (!db) throw new Error('Firebase client not initialized. Set NEXT_PUBLIC_FIREBASE_* env variables.');
  return db;
}

export async function addMessageToSession(sessionId: string, message: Record<string, any>) {
  const database = getClientFirestore();
  const col = collection(database, 'sessions', sessionId, 'messages');
  return addDoc(col, { ...message, createdAt: serverTimestamp() });
}

export async function setSessionMeta(sessionId: string, meta: Record<string, any>) {
  const database = getClientFirestore();
  const ref = doc(database, 'sessions', sessionId);
  return setDoc(ref, { ...meta, lastActive: serverTimestamp() }, { merge: true });
}

export async function updateMessageInSession(sessionId: string, messageId: string, data: Record<string, any>) {
  const database = getClientFirestore();
  const ref = doc(database, 'sessions', sessionId, 'messages', messageId);
  return setDoc(ref, { ...data, updatedAt: serverTimestamp() }, { merge: true });
}

export function listenSessionMessages(sessionId: string, callback: (docs: any[]) => void) {
  try {
    const database = getClientFirestore();
    const col = collection(database, 'sessions', sessionId, 'messages');
    const q = query(col, orderBy('createdAt', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      callback(items);
    });
  } catch (err) {
    console.warn('[Firebase Client] listenSessionMessages error', err);
    return () => {};
  }
}
