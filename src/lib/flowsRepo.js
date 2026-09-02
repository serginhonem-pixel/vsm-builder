import { getFirebase } from './firebase.js';
import { useAuthStore, isPaid } from '../store/useAuthStore.js';
import { serializeFlowState, hydrateFlowState, SCHEMA_VERSION } from './flowState.js';

export function canPersist() {
  return isPaid(useAuthStore.getState());
}

function uid() {
  return useAuthStore.getState().user?.uid;
}

export async function listFlows() {
  if (!canPersist()) return [];
  const { db } = await getFirebase();
  const fs = await import('firebase/firestore');
  const q = fs.query(fs.collection(db, 'flows'), fs.where('ownerUid', '==', uid()));
  const snap = await fs.getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    name: d.data().name,
    updatedAt: d.data().updatedAt?.toMillis?.() ?? 0,
  }));
}

export async function loadFlow(id) {
  if (!canPersist()) return null;
  const { db } = await getFirebase();
  const fs = await import('firebase/firestore');
  const snap = await fs.getDoc(fs.doc(db, 'flows', id));
  if (!snap.exists()) return null;
  return { name: snap.data().name, patch: hydrateFlowState(snap.data().state) };
}

export async function saveFlow(id, { name, storeState }) {
  if (!canPersist()) throw new Error('not-allowed');
  const { db } = await getFirebase();
  const fs = await import('firebase/firestore');
  const state = serializeFlowState(storeState);

  if (id) {
    await fs.updateDoc(fs.doc(db, 'flows', id), {
      name, state, schemaVersion: SCHEMA_VERSION, updatedAt: fs.serverTimestamp(),
    });
    return { id };
  }

  const ref = await fs.addDoc(fs.collection(db, 'flows'), {
    ownerUid: uid(), teamId: null, name, state,
    schemaVersion: SCHEMA_VERSION,
    share: { mode: 'private', token: null },
    createdAt: fs.serverTimestamp(), updatedAt: fs.serverTimestamp(),
  });
  await fs.updateDoc(fs.doc(db, 'users', uid()), { flowCount: fs.increment(1) });
  return { id: ref.id };
}

export async function deleteFlow(id) {
  if (!canPersist()) throw new Error('not-allowed');
  const { db } = await getFirebase();
  const fs = await import('firebase/firestore');
  await fs.deleteDoc(fs.doc(db, 'flows', id));
  await fs.updateDoc(fs.doc(db, 'users', uid()), { flowCount: fs.increment(-1) });
}
