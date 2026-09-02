import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  initializeTestEnvironment, assertFails, assertSucceeds,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

let env;
beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'vsm-rules-test',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
afterAll(() => env.cleanup());
beforeEach(() => env.clearFirestore());

async function seedUser(uid, plan) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'users', uid), {
      email: `${uid}@x.com`, plan, planSource: null, flowCount: 0, teamId: null, role: null,
    });
  });
}

describe('flows rules', () => {
  it('free NÃO cria flow', async () => {
    await seedUser('free1', 'free');
    const db = env.authenticatedContext('free1').firestore();
    await assertFails(setDoc(doc(db, 'flows', 'f1'), {
      ownerUid: 'free1', schemaVersion: 1, share: { mode: 'private', token: null },
    }));
  });

  it('pro cria e lê o próprio flow', async () => {
    await seedUser('pro1', 'pro');
    const db = env.authenticatedContext('pro1').firestore();
    await assertSucceeds(setDoc(doc(db, 'flows', 'f1'), {
      ownerUid: 'pro1', teamId: null, name: 'A', state: {}, schemaVersion: 1,
      share: { mode: 'private', token: null },
    }));
    await assertSucceeds(getDoc(doc(db, 'flows', 'f1')));
  });

  it('outro usuário NÃO lê flow alheio', async () => {
    await seedUser('pro1', 'pro'); await seedUser('pro2', 'pro');
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'flows', 'f1'), { ownerUid: 'pro1', schemaVersion: 1, share: { mode: 'private', token: null } });
    });
    const db = env.authenticatedContext('pro2').firestore();
    await assertFails(getDoc(doc(db, 'flows', 'f1')));
  });

  it('cliente NÃO consegue escalar o próprio plano', async () => {
    await seedUser('u1', 'free');
    const db = env.authenticatedContext('u1').firestore();
    await assertFails(updateDoc(doc(db, 'users', 'u1'), { plan: 'pro' }));
  });

  it('ninguém lê pendingPlans', async () => {
    const db = env.authenticatedContext('u1').firestore();
    await assertFails(getDoc(doc(db, 'pendingPlans', 'abc')));
  });
});
