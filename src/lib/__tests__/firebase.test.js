import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({ name: 'app' })),
  getApps: vi.fn(() => []),
}));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(() => ({ type: 'auth' })) }));
vi.mock('firebase/firestore', () => ({
  initializeFirestore: vi.fn(() => ({ type: 'db' })),
  persistentLocalCache: vi.fn(() => 'cache'),
  persistentMultipleTabManager: vi.fn(() => 'tabs'),
}));

beforeEach(() => { vi.resetModules(); });

describe('getFirebase', () => {
  it('inicializa uma vez e memoiza', async () => {
    const { initializeApp } = await import('firebase/app');
    const { getFirebase } = await import('../firebase.js');
    const a = await getFirebase();
    const b = await getFirebase();
    expect(a).toBe(b);
    expect(initializeApp).toHaveBeenCalledTimes(1);
    expect(a).toHaveProperty('auth');
    expect(a).toHaveProperty('db');
  });
});

describe('isFirebaseConfigured', () => {
  it('false quando faltam envs', async () => {
    const { isFirebaseConfigured } = await import('../firebase.js');
    expect(isFirebaseConfigured()).toBe(false);
  });
});
