import crypto from 'node:crypto';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

let cached = null;

export function getAdmin() {
  if (cached) return cached;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT ausente');
  const sa = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
  const app = getApps().length ? getApps()[0] : initializeApp({ credential: cert(sa) });
  cached = { auth: getAuth(app), db: getFirestore(app), FieldValue };
  return cached;
}

export function sha256Email(email) {
  return crypto.createHash('sha256')
    .update(String(email).trim().toLowerCase())
    .digest('hex');
}
