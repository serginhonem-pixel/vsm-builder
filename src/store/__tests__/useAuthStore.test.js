import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAuth = {};
const onAuthStateChanged = vi.fn();
const signInWithPopup = vi.fn();
const fbSignOut = vi.fn();
const getDoc = vi.fn();
const setDoc = vi.fn();
const doc = vi.fn(() => ({ path: 'users/u1' }));

vi.mock('../../lib/firebase.js', () => ({
  getFirebase: vi.fn(async () => ({ auth: mockAuth, db: {} })),
}));
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (...a) => onAuthStateChanged(...a),
  signInWithPopup: (...a) => signInWithPopup(...a),
  signOut: (...a) => fbSignOut(...a),
  GoogleAuthProvider: class {},
}));
vi.mock('firebase/firestore', () => ({
  doc: (...a) => doc(...a), getDoc: (...a) => getDoc(...a), setDoc: (...a) => setDoc(...a),
  serverTimestamp: () => 'ts',
}));
global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ plan: 'pro' }) }));

beforeEach(() => {
  vi.clearAllMocks();
  getDoc.mockResolvedValue({ exists: () => false });
});

describe('initAuth', () => {
  it('cria users/{uid} no primeiro login e busca o plano', async () => {
    const { useAuthStore, initAuth } = await import('../useAuthStore.js');
    let cb;
    onAuthStateChanged.mockImplementation((_a, fn) => { cb = fn; return () => {}; });
    initAuth();
    // aguarda a IIFE async de initAuth registrar o listener
    for (let i = 0; i < 50 && !cb; i++) await new Promise((r) => setTimeout(r, 0));
    await cb({ uid: 'u1', email: 'a@b.com', displayName: 'A', photoURL: 'p', getIdToken: async () => 'tok' });
    await new Promise((r) => setTimeout(r, 0));
    expect(setDoc).toHaveBeenCalled();          // criou o doc
    expect(global.fetch).toHaveBeenCalledWith('/api/claim-plan', expect.objectContaining({ method: 'POST' }));
    expect(useAuthStore.getState().plan).toBe('pro');
    expect(useAuthStore.getState().user.uid).toBe('u1');
  });

  it('logout zera user e volta plan pra free', async () => {
    const { useAuthStore } = await import('../useAuthStore.js');
    useAuthStore.setState({ user: { uid: 'u1' }, plan: 'pro' });
    await useAuthStore.getState().signOut();
    expect(fbSignOut).toHaveBeenCalled();
  });
});
