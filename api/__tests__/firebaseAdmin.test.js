import { describe, it, expect, vi, beforeEach } from 'vitest';

const initializeApp = vi.fn(() => ({}));
const cert = vi.fn((x) => x);
const getApps = vi.fn(() => []);
vi.mock('firebase-admin/app', () => ({ initializeApp, cert, getApps }));
vi.mock('firebase-admin/auth', () => ({ getAuth: vi.fn(() => ({ t: 'auth' })) }));
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({ t: 'db' })),
  FieldValue: { increment: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
  const sa = Buffer.from(JSON.stringify({ project_id: 'p', client_email: 'x', private_key: 'k' })).toString('base64');
  process.env.FIREBASE_SERVICE_ACCOUNT = sa;
});

describe('sha256Email', () => {
  it('normaliza antes de hashear', async () => {
    const { sha256Email } = await import('../_firebaseAdmin.js');
    expect(sha256Email('  A@B.COM ')).toBe(sha256Email('a@b.com'));
    expect(sha256Email('a@b.com')).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('getAdmin', () => {
  it('inicializa com o service account do env', async () => {
    const { getAdmin } = await import('../_firebaseAdmin.js');
    getAdmin();
    expect(initializeApp).toHaveBeenCalledTimes(1);
  });
});
