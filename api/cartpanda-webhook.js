import crypto from 'node:crypto';
import { getAdmin, sha256Email } from './_firebaseAdmin.js';

// NOTE: @vercel/node parses JSON bodies and does not honor `config.api.bodyParser`
// (that is a Next.js convention; this project is a Vite SPA). Getting the exact raw
// bytes for HMAC is not reliable here. This path is NOT production-verified —
// see Task 7 Step 6 pendency (real CartPanda payload + signature scheme).
async function readRaw(req) {
  if (typeof req.rawBody === 'string') return req.rawBody;
  if (typeof req.body === 'string') return req.body;
  try {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    if (chunks.length) return Buffer.concat(chunks).toString('utf8');
  } catch { /* stream already consumed */ }
  return req.body ? JSON.stringify(req.body) : '';
}

const PAID_EVENTS = new Set(['order.paid', 'order.approved', 'payment.approved']);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const raw = await readRaw(req);
  const secret = process.env.CARTPANDA_WEBHOOK_SECRET || '';
  const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
  const got = req.headers['x-cartpanda-signature'] || '';
  if (!secret || got.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(got), Buffer.from(expected))) {
    return res.status(401).json({ error: 'bad_signature' });
  }

  let payload;
  try { payload = JSON.parse(raw); } catch { return res.status(200).end(); }

  const event = payload.event || payload.type;
  if (!PAID_EVENTS.has(event)) return res.status(200).end();

  // AJUSTAR com payload real depois (não é seu escopo agora):
  const order = payload.order || payload.data || {};
  const email = order.customer?.email || order.email || payload.customer?.email;
  const orderId = order.id || order.order_id || payload.id;
  if (!email) return res.status(200).end();

  const { db } = getAdmin();
  await db.doc(`pendingPlans/${sha256Email(email)}`).set({
    email: String(email).trim().toLowerCase(),
    plan: 'pro', source: 'cartpanda', orderId: String(orderId || ''),
    createdAt: new Date(),
  });

  return res.status(200).json({ ok: true });
}
