import { create } from 'zustand';
import { getFirebase } from '../lib/firebase.js';

export const isPaid = (s) => s.plan === 'pro' || s.plan === 'team';

export const useAuthStore = create((set, get) => ({
  user: null,
  plan: 'free',
  status: 'idle',
  error: null,

  signInWithGoogle: async () => {
    set({ status: 'loading', error: null });
    try {
      const { auth } = await getFirebase();
      const { signInWithPopup, GoogleAuthProvider } = await import('firebase/auth');
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (e) {
      set({ status: 'ready', error: e.code || 'sign-in-failed' });
    }
  },

  signOut: async () => {
    const { auth } = await getFirebase();
    const { signOut } = await import('firebase/auth');
    await signOut(auth);
    set({ user: null, plan: 'free' });
  },
}));

let unsub = null;

export function initAuth() {
  if (unsub) return unsub;
  let cancelled = false;
  (async () => {
    const { auth, db } = await getFirebase();
    const { onAuthStateChanged } = await import('firebase/auth');
    if (cancelled) return;
    unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        useAuthStore.setState({ user: null, plan: 'free', status: 'ready' });
        return;
      }
      const user = {
        uid: fbUser.uid, email: fbUser.email,
        displayName: fbUser.displayName, photoURL: fbUser.photoURL,
      };
      useAuthStore.setState({ user, status: 'loading' });

      const { doc, getDoc, setDoc, serverTimestamp } = await import('firebase/firestore');
      const ref = doc(db, 'users', fbUser.uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          email: user.email, displayName: user.displayName, photoURL: user.photoURL,
          plan: 'free', planSource: null, flowCount: 0, teamId: null, role: null,
          createdAt: serverTimestamp(),
        });
      }

      let plan = snap.exists() ? (snap.data().plan || 'free') : 'free';
      try {
        const token = await fbUser.getIdToken();
        const res = await fetch('/api/claim-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({}),
        });
        if (res.ok) plan = (await res.json()).plan || plan;
      } catch { /* offline: mantém o plano do doc */ }

      useAuthStore.setState({ plan, status: 'ready' });
    });
  })();
  return () => { cancelled = true; if (unsub) unsub(); unsub = null; };
}
