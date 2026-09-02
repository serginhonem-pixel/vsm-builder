import { describe, it, expect, vi, beforeEach } from 'vitest';

const verifyIdToken = vi.fn();
const userUpdate = vi.fn();
const userGet = vi.fn();
const pendingGet = vi.fn();
const pendingDelete = vi.fn();

const db = {
  doc: vi.fn((path) => ({
    _path: path,
    get: path.startsWith('pendingPlans/') ? pendingGet : userGet,
    update: userUpdate,
    delete: pendingDelete,
  })),
};

vi.mock('../_firebaseAdmin.js', () => ({
  getAdmin: () => ({ auth: { verifyIdToken }, db, FieldValue: {} }),
  sha256Email: (e) => `hash(${e})`,
}));

function mockRes() {
  return { statusCode: 200, body: null,
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; } };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.VALID_LICENSES = 'VSM-AAAA-BBBB';
  verifyIdToken.mockResolvedValue({ uid: 'u1', email: 'buyer@x.com', email_verified: true });
  userGet.mockResolvedValue({ exists: true, data: () => ({ plan: 'free' }) });
});

describe('claim-plan', () => {
  it('401 sem Authorization', async () => {
    const { default: handler } = await import('../claim-plan.js');
    const res = mockRes();
    await handler({ method: 'POST', headers: {}, body: {} }, res);
    expect(res.statusCode).toBe(401);
  });

  it('405 método errado', async () => {
    const { default: handler } = await import('../claim-plan.js');
    const res = mockRes();
    await handler({ method: 'GET', headers: {}, body: {} }, res);
    expect(res.statusCode).toBe(405);
  });

  it('400 se e-mail não verificado', async () => {
    verifyIdToken.mockResolvedValue({ uid: 'u1', email: 'buyer@x.com', email_verified: false });
    const { default: handler } = await import('../claim-plan.js');
    const res = mockRes();
    await handler({ method: 'POST', headers: { authorization: 'Bearer tok' }, body: {} }, res);
    expect(res.statusCode).toBe(400);
  });

  it('casa compra pendente por e-mail → plan pro', async () => {
    pendingGet.mockResolvedValue({ exists: true, data: () => ({ plan: 'pro', source: 'cartpanda' }) });
    const { default: handler } = await import('../claim-plan.js');
    const res = mockRes();
    await handler({ method: 'POST', headers: { authorization: 'Bearer tok' }, body: {} }, res);
    expect(userUpdate).toHaveBeenCalledWith(expect.objectContaining({ plan: 'pro', planSource: 'cartpanda' }));
    expect(pendingDelete).toHaveBeenCalled();
    expect(res.body).toEqual({ plan: 'pro' });
  });

  it('sem pendência e sem chave → mantém free', async () => {
    pendingGet.mockResolvedValue({ exists: false });
    const { default: handler } = await import('../claim-plan.js');
    const res = mockRes();
    await handler({ method: 'POST', headers: { authorization: 'Bearer tok' }, body: {} }, res);
    expect(userUpdate).not.toHaveBeenCalled();
    expect(res.body).toEqual({ plan: 'free' });
  });

  it('chave manual válida → plan pro / manual', async () => {
    pendingGet.mockResolvedValue({ exists: false });
    const { default: handler } = await import('../claim-plan.js');
    const res = mockRes();
    await handler({ method: 'POST', headers: { authorization: 'Bearer tok' }, body: { key: 'VSM-AAAA-BBBB' } }, res);
    expect(userUpdate).toHaveBeenCalledWith(expect.objectContaining({ plan: 'pro', planSource: 'manual' }));
    expect(res.body).toEqual({ plan: 'pro' });
  });

  it('chave manual inválida → free + error', async () => {
    pendingGet.mockResolvedValue({ exists: false });
    const { default: handler } = await import('../claim-plan.js');
    const res = mockRes();
    await handler({ method: 'POST', headers: { authorization: 'Bearer tok' }, body: { key: 'NOPE' } }, res);
    expect(userUpdate).not.toHaveBeenCalled();
    expect(res.body).toEqual({ plan: 'free', error: 'invalid_key' });
  });
});
