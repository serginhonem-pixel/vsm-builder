import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'node:crypto';

const pendingSet = vi.fn();
const db = { doc: vi.fn(() => ({ set: pendingSet })) };
vi.mock('../_firebaseAdmin.js', () => ({
  getAdmin: () => ({ db }),
  sha256Email: (e) => `hash(${e})`,
}));

const SECRET = 'whsec_test';
function signed(bodyObj) {
  const body = JSON.stringify(bodyObj);
  const sig = crypto.createHmac('sha256', SECRET).update(body).digest('hex');
  return { body, sig };
}
function mockReqRes(bodyStr, sig) {
  const req = { method: 'POST', headers: { 'x-cartpanda-signature': sig }, rawBody: bodyStr, body: JSON.parse(bodyStr) };
  const res = { statusCode: 200, body: null,
    status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; },
    end() { return this; } };
  return { req, res };
}

beforeEach(() => { vi.clearAllMocks(); process.env.CARTPANDA_WEBHOOK_SECRET = SECRET; });

describe('cartpanda-webhook', () => {
  it('405 método errado', async () => {
    const { default: handler } = await import('../cartpanda-webhook.js');
    const res = { statusCode: 200, status(c){this.statusCode=c;return this;}, json(){return this;}, end(){return this;} };
    await handler({ method: 'GET', headers: {} }, res);
    expect(res.statusCode).toBe(405);
  });

  it('401 assinatura inválida', async () => {
    const { default: handler } = await import('../cartpanda-webhook.js');
    const { req, res } = mockReqRes(JSON.stringify({ event: 'order.paid' }), 'deadbeef');
    await handler(req, res);
    expect(res.statusCode).toBe(401);
    expect(pendingSet).not.toHaveBeenCalled();
  });

  it('pedido pago → grava pendingPlans', async () => {
    const { body, sig } = signed({
      event: 'order.paid',
      order: { id: 'ord_123', customer: { email: 'buyer@x.com' } },
    });
    const { default: handler } = await import('../cartpanda-webhook.js');
    const { req, res } = mockReqRes(body, sig);
    await handler(req, res);
    expect(pendingSet).toHaveBeenCalledWith(expect.objectContaining({
      email: 'buyer@x.com', plan: 'pro', source: 'cartpanda', orderId: 'ord_123',
    }));
    expect(res.statusCode).toBe(200);
  });

  it('evento não-pago → ignora, 200', async () => {
    const { body, sig } = signed({ event: 'order.created', order: { id: 'x' } });
    const { default: handler } = await import('../cartpanda-webhook.js');
    const { req, res } = mockReqRes(body, sig);
    await handler(req, res);
    expect(pendingSet).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });
});
