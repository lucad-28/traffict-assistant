import admin from 'firebase-admin';

if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;
  const privateKey = privateKeyRaw ? privateKeyRaw.replace(/\\n/g, '\n') : undefined;

  if (projectId && clientEmail && privateKey) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        } as any),
      });
      console.log('[Firebase Admin] initialized');
    } catch (err) {
      console.warn('[Firebase Admin] initialization error', err);
    }
  } else {
    console.warn('[Firebase Admin] Missing env vars: FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY');
  }
}

export const adminFirestore = admin.apps.length ? admin.firestore() : null;
export default admin;
