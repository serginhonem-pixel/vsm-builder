# Backend Firebase — Fase 1 (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Usuário pago faz login com Google e salva/abre seus mapas VSM na nuvem (Firestore) de qualquer dispositivo; usuário free usa o editor com persistência efêmera em `sessionStorage`.

**Architecture:** SPA React/Vite na Vercel. Firebase Auth (só Google) + Firestore no cliente, com `persistentLocalCache`. Operações privilegiadas (reconhecer compra, webhook CartPanda) em funções serverless da Vercel usando `firebase-admin`. Sem plano Blaze, sem Cloud Functions, sem Firebase Hosting. Uma fachada (`src/lib/flowsRepo.js`) isola o resto do app de onde os mapas moram.

**Tech Stack:** React 18, Vite 5, Zustand 4, `firebase` (Web SDK v10+, modular), `firebase-admin` (funções), Vitest (novo), `@firebase/rules-unit-testing` (novo, dev).

**Spec:** `docs/superpowers/specs/2026-09-02-firebase-backend-design.md` — ler junto com este plano.

## Global Constraints

- **Firebase plano Spark (grátis).** Nada que exija Blaze (Cloud Functions, scheduled functions).
- **BD é exclusivo do pago.** `plan` ∈ `{'free','pro','team'}`; só `'pro'`/`'team'` criam/editam `flows/*`. Free = zero acesso ao Firestore.
- **Free persiste só em `sessionStorage`** (sobrevive a refresh, some ao fechar aba). Export PDF/JSON continua no free.
- **`plan`, `planSource`, `teamId`, `role` em `users/{uid}` são imutáveis pelo cliente** — só o admin SDK escreve.
- **Save do editor é debounced 3–5 s** para usuário pago; nunca escrita por tecla. Botão "Salvar" força imediato.
- **SDK do Firebase é lazy-loaded** — `import()` dinâmico, só quando o usuário aciona login.
- **Idioma da UI: pt-BR.** Copiar tom dos textos existentes (`LicenseModal`, `Header`).
- **`schemaVersion: 1`** em todo doc `flows/*`.
- **Nunca logar/retornar valores de segredos.** `FIREBASE_SERVICE_ACCOUNT`, `CARTPANDA_WEBHOOK_SECRET` só via `process.env` nas funções.
- **Deploy continua 100% Vercel.** Regras do Firestore publicadas à parte (`firebase deploy --only firestore`).
- Persistência real hoje vive em `src/store/useVsmStore.js` (`saveFlow`/`loadFlow`/`listFlows`, chave `localStorage['vsm-flows']`). `src/utils/storage.js` e `src/components/Canvas/*` são **código morto**.

---

## File Structure

**Novos — cliente**
- `src/lib/firebase.js` — init lazy do Firebase (app, auth, firestore). Uma responsabilidade: entregar handles configurados.
- `src/lib/flowsRepo.js` — fachada de persistência de mapas. Roteia free↔pago.
- `src/lib/flowState.js` — serialização/hidratação do estado completo do VSM (blob `state`).
- `src/lib/sessionPersist.js` — espelha o estado do editor em `sessionStorage` (free).
- `src/store/useAuthStore.js` — Zustand: `user`, `plan`, `status`, `signIn`, `signOut`.
- `src/components/Auth/AuthMenu.jsx` (+ `Auth.css`) — botão "Entrar" ↔ avatar + menu.
- `src/components/Auth/SavePromptBanner.jsx` — faixa fixa para não-pago.
- `src/components/Auth/MigrationModal.jsx` — migração única local→nuvem (pago).

**Novos — servidor**
- `api/_firebaseAdmin.js` — init compartilhado do `firebase-admin`.
- `api/claim-plan.js` — reconhece compra (e-mail) ou chave manual → seta `plan`.
- `api/cartpanda-webhook.js` — recebe webhook de venda → grava `pendingPlans`.

**Novos — config/infra**
- `firestore.rules` — regras de segurança.
- `firestore.indexes.json` — índices.
- `firebase.json` — aponta rules/indexes p/ deploy.
- `vitest.config.js` — config de teste.
- `src/test/setup.js` — setup global de teste (jsdom, mocks).
- `.env.example` — documenta todas as chaves.
- `tests/rules/flows.rules.test.js` — testes das regras no emulador.

**Modificados**
- `src/store/useVsmStore.js` — extrair `serialize()`/`hydrate()` p/ `flowState.js`; incluir `demand/available/lote/shifts/savedStates`; remover `saveFlow`/`loadFlow`/`listFlows` (migram p/ `flowsRepo`).
- `src/components/Layout/Header.jsx` — usar `flowsRepo` + `useAuthStore`; integrar `AuthMenu`; save debounced.
- `src/components/License/LicenseModal.jsx` — vira modal de upsell + chave via `/api/claim-plan`.
- `src/App.jsx` — inicializa `onAuthStateChanged`; monta `SavePromptBanner`, `MigrationModal`.
- `src/utils/license.js` — **removido**; usos → `useAuthStore`.
- `src/utils/storage.js` — **removido** (código morto).
- `src/components/Canvas/*`, `src/hooks/useDrag.js`, `src/hooks/useConnect.js` — **removidos** (código morto; confirmar zero imports).
- `package.json` — deps + scripts `test`, `test:rules`.
- `README.md` — seção "Backend Firebase: setup".

---

## Pré-requisito manual (fora do código) — o worker PARA e pede ao usuário

Antes da Task 2 rodar de verdade em produção, o **usuário** precisa:

1. Criar projeto no [Firebase Console](https://console.firebase.google.com) (plano Spark).
2. **Authentication → Sign-in method → Google → ativar.**
3. **Authentication → Settings → Authorized domains →** adicionar `vsm.betinistudio.com.br` e `localhost`.
4. **Firestore Database → criar** (modo produção, região `southamerica-east1`).
5. **Project Settings → General → Your apps → Web app →** copiar o `firebaseConfig`.
6. **Project Settings → Service accounts → Generate new private key →** baixar o JSON.
7. Na Vercel, adicionar env vars (Task 17 lista todas).

O worker implementa e testa tudo com **mocks e o emulador**; o projeto real só é necessário para o teste manual final e o deploy.

---

## Task 1: Infra de testes (Vitest)

**Files:**
- Create: `vitest.config.js`, `src/test/setup.js`, `src/lib/__tests__/smoke.test.js`
- Modify: `package.json`

**Interfaces:**
- Produces: comando `npm test` (Vitest, ambiente jsdom); helper de setup global.

- [ ] **Step 1: Instalar deps de teste**

```bash
npm i -D vitest@^2 jsdom@^25 @testing-library/react@^16 @testing-library/jest-dom@^6 @testing-library/user-event@^14
```

- [ ] **Step 2: Escrever `vitest.config.js`**

```js
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    globals: true,
    include: ['src/**/*.{test,spec}.{js,jsx}'],
  },
});
```

- [ ] **Step 3: Escrever `src/test/setup.js`**

```js
import '@testing-library/jest-dom/vitest';

// jsdom não tem matchMedia; alguns componentes tocam nisso
if (!window.matchMedia) {
  window.matchMedia = () => ({
    matches: false, addListener() {}, removeListener() {},
    addEventListener() {}, removeEventListener() {},
  });
}
```

- [ ] **Step 4: Escrever `src/lib/__tests__/smoke.test.js`**

```js
import { describe, it, expect } from 'vitest';

describe('vitest', () => {
  it('roda', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Adicionar scripts ao `package.json`**

```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:rules": "vitest run --config vitest.rules.config.js"
}
```

- [ ] **Step 6: Rodar e verificar**

Run: `npm test`
Expected: 1 arquivo, 1 teste, PASS.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vitest.config.js src/test/ src/lib/__tests__/
git commit -m "test: infra de testes com Vitest"
```

---

## Task 2: Init lazy do Firebase — `src/lib/firebase.js`

**Files:**
- Create: `src/lib/firebase.js`, `src/lib/__tests__/firebase.test.js`
- Modify: `package.json` (dep `firebase`)

**Interfaces:**
- Produces:
  - `async getFirebase(): Promise<{ app, auth, db }>` — resolve os handles, inicializando uma única vez (memoizado). `db` já com `persistentLocalCache`.
  - `firebaseConfig` (objeto lido de `import.meta.env.VITE_FIREBASE_*`).
  - `isFirebaseConfigured(): boolean` — todas as chaves presentes.

- [ ] **Step 1: Instalar o SDK**

```bash
npm i firebase@^10
```

- [ ] **Step 2: Escrever o teste `src/lib/__tests__/firebase.test.js`**

```js
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
```

- [ ] **Step 3: Rodar — deve falhar**

Run: `npm test -- firebase`
Expected: FAIL ("Cannot find module '../firebase.js'").

- [ ] **Step 4: Implementar `src/lib/firebase.js`**

```js
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export { firebaseConfig };

export function isFirebaseConfigured() {
  return Object.values(firebaseConfig).every(Boolean);
}

let handles = null;

export async function getFirebase() {
  if (handles) return handles;
  const [{ initializeApp, getApps }, { getAuth }, fs] = await Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
    import('firebase/firestore'),
  ]);
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = fs.initializeFirestore(app, {
    localCache: fs.persistentLocalCache({
      tabManager: fs.persistentMultipleTabManager(),
    }),
  });
  handles = { app, auth, db };
  return handles;
}
```

- [ ] **Step 5: Rodar — deve passar**

Run: `npm test -- firebase`
Expected: PASS.

- [ ] **Step 6: Verificar que o build não quebra e o chunk é separado**

Run: `npm run build`
Expected: build OK; `firebase` não aparece no chunk de entrada (só em chunk sob demanda). Se aparecer no entry, revisar imports estáticos.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/lib/firebase.js src/lib/__tests__/firebase.test.js
git commit -m "feat: init lazy do Firebase client"
```

---

## Task 3: Serialização do estado completo — `src/lib/flowState.js`

**Files:**
- Create: `src/lib/flowState.js`, `src/lib/__tests__/flowState.test.js`
- Modify: `src/store/useVsmStore.js`

**Interfaces:**
- Consumes: forma do estado de `useVsmStore` (§3.1 do spec).
- Produces:
  - `serializeFlowState(storeState): object` — extrai `{ supplier, customer, pcp, processes, wips, elements, shingoSteps, demand, available, lote, shifts, activeState, savedStates }`.
  - `hydrateFlowState(state): object` — devolve um patch para `useVsmStore.setState`, com defaults para campos ausentes (retrocompat com mapas antigos que não têm `demand` etc).
  - `SCHEMA_VERSION = 1`.

- [ ] **Step 1: Escrever `src/lib/__tests__/flowState.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { serializeFlowState, hydrateFlowState, SCHEMA_VERSION } from '../flowState.js';

const fullStore = {
  supplier: { name: 'F' }, customer: { name: 'C' }, pcp: { name: 'PCP' },
  processes: [{ id: 'p1' }], wips: [{ id: 'w0' }], elements: [], shingoSteps: [],
  demand: 300, available: 500, lote: 5,
  shifts: [{ id: 's1', name: 'T1', available: 500 }],
  activeState: 'atual', savedStates: { atual: null, futuro: null },
  selectedId: 'p1', // NÃO deve ser serializado
};

describe('serializeFlowState', () => {
  it('inclui demanda/disponível/lote/turnos/futuro', () => {
    const s = serializeFlowState(fullStore);
    expect(s.demand).toBe(300);
    expect(s.available).toBe(500);
    expect(s.lote).toBe(5);
    expect(s.shifts).toHaveLength(1);
    expect(s.savedStates).toEqual({ atual: null, futuro: null });
  });
  it('não serializa estado de UI', () => {
    const s = serializeFlowState(fullStore);
    expect(s).not.toHaveProperty('selectedId');
  });
});

describe('hydrateFlowState', () => {
  it('preenche defaults para mapa antigo sem demanda', () => {
    const patch = hydrateFlowState({ supplier: { name: 'F' }, processes: [], wips: [] });
    expect(patch.demand).toBe(200);
    expect(patch.available).toBe(480);
    expect(patch.lote).toBe(1);
    expect(patch.shifts).toEqual([{ id: 's1', name: 'Turno 1', available: 480 }]);
    expect(patch.selectedId).toBe(null);
  });
  it('round-trip preserva dados', () => {
    const patch = hydrateFlowState(serializeFlowState(fullStore));
    expect(patch.demand).toBe(300);
    expect(patch.processes).toEqual([{ id: 'p1' }]);
  });
});

it('SCHEMA_VERSION é 1', () => { expect(SCHEMA_VERSION).toBe(1); });
```

- [ ] **Step 2: Rodar — deve falhar**

Run: `npm test -- flowState`
Expected: FAIL (módulo não existe).

- [ ] **Step 3: Implementar `src/lib/flowState.js`**

```js
export const SCHEMA_VERSION = 1;

const SERIALIZED_KEYS = [
  'supplier', 'customer', 'pcp',
  'processes', 'wips', 'elements', 'shingoSteps',
  'demand', 'available', 'lote', 'shifts',
  'activeState', 'savedStates',
];

export function serializeFlowState(store) {
  const out = {};
  for (const k of SERIALIZED_KEYS) out[k] = store[k];
  return JSON.parse(JSON.stringify(out)); // sem refs, sem undefined
}

export function hydrateFlowState(state = {}) {
  return {
    supplier: state.supplier || { name: 'FORNECEDOR', product: 'MATÉRIA-PRIMA' },
    customer: state.customer || { name: 'CLIENTE' },
    pcp: state.pcp || { name: 'PCP\nMRP' },
    processes: state.processes || [],
    wips: state.wips || [{ id: 'w0', qty: '0', unit: 'pç' }],
    elements: state.elements || [],
    shingoSteps: state.shingoSteps || [],
    demand: state.demand ?? 200,
    available: state.available ?? 480,
    lote: state.lote ?? 1,
    shifts: state.shifts || [{ id: 's1', name: 'Turno 1', available: 480 }],
    activeState: state.activeState || 'atual',
    savedStates: state.savedStates || { atual: null, futuro: null },
    selectedId: null,
  };
}
```

- [ ] **Step 4: Rodar — deve passar**

Run: `npm test -- flowState`
Expected: PASS.

- [ ] **Step 5: Remover `saveFlow`/`loadFlow`/`listFlows` de `useVsmStore.js`**

Deletar as três funções (linhas ~217–244). O `Header.jsx` ainda as referencia — vai quebrar o build; a Task 9 conserta. Para não deixar `main` quebrada entre tasks, adicionar stubs temporários que lançam:

```js
saveFlow: () => { throw new Error('use flowsRepo (Task 9)'); },
loadFlow: () => { throw new Error('use flowsRepo (Task 9)'); },
listFlows: () => [],
```

- [ ] **Step 6: Rodar suíte + build**

Run: `npm test && npm run build`
Expected: testes PASS; build PASS (stubs mantêm compilando).

- [ ] **Step 7: Commit**

```bash
git add src/lib/flowState.js src/lib/__tests__/flowState.test.js src/store/useVsmStore.js
git commit -m "feat: serialização do estado completo do VSM (flowState)"
```

---

## Task 4: Auth store — `src/store/useAuthStore.js`

**Files:**
- Create: `src/store/useAuthStore.js`, `src/store/__tests__/useAuthStore.test.js`

**Interfaces:**
- Consumes: `getFirebase` de `src/lib/firebase.js`.
- Produces:
  - `useAuthStore` (Zustand) com `{ user, plan, status, error }`.
    - `user`: `{ uid, email, displayName, photoURL } | null`
    - `plan`: `'free' | 'pro' | 'team'` (default `'free'`)
    - `status`: `'idle' | 'loading' | 'ready'`
  - `initAuth(): () => void` — assina `onAuthStateChanged`, garante `users/{uid}`, chama `/api/claim-plan`; devolve unsubscribe.
  - `signInWithGoogle(): Promise<void>`
  - `signOut(): Promise<void>`
  - selector helper `isPaid(state)` → `state.plan === 'pro' || state.plan === 'team'`.

- [ ] **Step 1: Escrever `src/store/__tests__/useAuthStore.test.js`**

```js
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
    await Promise.resolve();
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
```

- [ ] **Step 2: Rodar — deve falhar**

Run: `npm test -- useAuthStore`
Expected: FAIL.

- [ ] **Step 3: Implementar `src/store/useAuthStore.js`**

```js
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
    const { doc, getDoc, setDoc, serverTimestamp } = await import('firebase/firestore');
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
```

- [ ] **Step 4: Rodar — deve passar**

Run: `npm test -- useAuthStore`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/store/useAuthStore.js src/store/__tests__/useAuthStore.test.js
git commit -m "feat: useAuthStore (login Google, doc do usuário, claim de plano)"
```

---

## Task 5: Admin SDK compartilhado — `api/_firebaseAdmin.js`

**Files:**
- Create: `api/_firebaseAdmin.js`, `api/__tests__/firebaseAdmin.test.js`
- Modify: `package.json` (dep `firebase-admin`)

**Interfaces:**
- Produces:
  - `getAdmin(): { auth, db, FieldValue }` — init memoizado do `firebase-admin` a partir de `process.env.FIREBASE_SERVICE_ACCOUNT` (JSON em base64).
  - `sha256Email(email): string` — normaliza (`trim().toLowerCase()`) e devolve hex SHA-256.

- [ ] **Step 1: Instalar**

```bash
npm i firebase-admin@^12
```

- [ ] **Step 2: Escrever `api/__tests__/firebaseAdmin.test.js`**

```js
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
```

- [ ] **Step 3: Rodar — deve falhar**

Run: `npm test -- firebaseAdmin`
Expected: FAIL.

- [ ] **Step 4: Implementar `api/_firebaseAdmin.js`**

```js
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
```

- [ ] **Step 5: Rodar — deve passar**

Run: `npm test -- firebaseAdmin`
Expected: PASS.

- [ ] **Step 6: Garantir que `api/` fica fora do bundle Vite**

Confirmar que nada em `src/` importa de `api/`. Run: `npm run build` → PASS.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json api/_firebaseAdmin.js api/__tests__/firebaseAdmin.test.js
git commit -m "feat: init compartilhado do firebase-admin + sha256Email"
```

---

## Task 6: `api/claim-plan.js`

**Files:**
- Create: `api/claim-plan.js`, `api/__tests__/claim-plan.test.js`

**Interfaces:**
- Consumes: `getAdmin`, `sha256Email` de `api/_firebaseAdmin.js`.
- Produces: handler default (Vercel). `POST` com `Authorization: Bearer <idToken>`.
  - body `{}` → tenta casar compra pendente por e-mail.
  - body `{ key }` → valida contra `process.env.VALID_LICENSES` (fallback legado).
  - Resposta `200 { plan }`. Erros: `401` sem token, `405` método errado.
  - Idempotente.

- [ ] **Step 1: Escrever `api/__tests__/claim-plan.test.js`**

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';

const verifyIdToken = vi.fn();
const userUpdate = vi.fn();
const pendingGet = vi.fn();
const pendingDelete = vi.fn();

const db = {
  doc: vi.fn((path) => ({
    _path: path,
    get: path.startsWith('pendingPlans/') ? pendingGet : vi.fn(),
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
  verifyIdToken.mockResolvedValue({ uid: 'u1', email: 'buyer@x.com' });
});

describe('claim-plan', () => {
  it('401 sem Authorization', async () => {
    const { default: handler } = await import('../claim-plan.js');
    const res = mockRes();
    await handler({ method: 'POST', headers: {}, body: {} }, res);
    expect(res.statusCode).toBe(401);
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
});
```

- [ ] **Step 2: Rodar — deve falhar**

Run: `npm test -- claim-plan`
Expected: FAIL.

- [ ] **Step 3: Implementar `api/claim-plan.js`**

```js
import { getAdmin, sha256Email } from './_firebaseAdmin.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const authz = req.headers.authorization || '';
  const token = authz.startsWith('Bearer ') ? authz.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'no_token' });

  const { auth, db } = getAdmin();

  let decoded;
  try {
    decoded = await auth.verifyIdToken(token);
  } catch {
    return res.status(401).json({ error: 'bad_token' });
  }

  const userRef = db.doc(`users/${decoded.uid}`);
  const now = new Date();

  // 1. Compra pendente por e-mail
  const hash = sha256Email(decoded.email);
  const pendingRef = db.doc(`pendingPlans/${hash}`);
  const pending = await pendingRef.get();
  if (pending.exists) {
    const p = pending.data();
    await userRef.update({ plan: p.plan, planSource: p.source, planUpdatedAt: now });
    await pendingRef.delete();
    return res.status(200).json({ plan: p.plan });
  }

  // 2. Chave manual (fallback legado)
  const key = (req.body && req.body.key ? String(req.body.key) : '').trim();
  if (key) {
    const valid = (process.env.VALID_LICENSES || '')
      .split(',').map((k) => k.trim()).filter(Boolean);
    if (valid.includes(key)) {
      await userRef.update({ plan: 'pro', planSource: 'manual', planUpdatedAt: now });
      return res.status(200).json({ plan: 'pro' });
    }
    return res.status(200).json({ plan: 'free', error: 'invalid_key' });
  }

  // 3. Nada a fazer
  const snap = await userRef.get();
  return res.status(200).json({ plan: (snap.exists && snap.data().plan) || 'free' });
}
```

- [ ] **Step 4: Rodar — deve passar**

Run: `npm test -- claim-plan`
Expected: PASS (4 testes).

- [ ] **Step 5: Commit**

```bash
git add api/claim-plan.js api/__tests__/claim-plan.test.js
git commit -m "feat: /api/claim-plan (compra pendente + chave manual)"
```

---

## Task 7: `api/cartpanda-webhook.js`

> **BLOQUEIO PARCIAL:** o mapeamento de campos (`email`, `orderId`) e o esquema de assinatura da CartPanda precisam de um **payload real**. Este task implementa contra a estrutura documentada da CartPanda (evento de pedido pago com `event` + `order`/`data`) e um HMAC-SHA256 do corpo com header `x-cartpanda-signature`. **Step 6 é a verificação com payload real** — ajustar os seletores de campo ali se necessário. O resto da Fase 1 não depende deste task.

**Files:**
- Create: `api/cartpanda-webhook.js`, `api/__tests__/cartpanda-webhook.test.js`

**Interfaces:**
- Consumes: `getAdmin`, `sha256Email`.
- Produces: handler default. `POST` cru. Valida assinatura HMAC (`CARTPANDA_WEBHOOK_SECRET`); em evento de pagamento aprovado grava `pendingPlans/{sha256Email}`. Sempre responde rápido (`200`), exceto assinatura inválida (`401`) / método (`405`).

- [ ] **Step 1: Escrever `api/__tests__/cartpanda-webhook.test.js`**

```js
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
```

- [ ] **Step 2: Rodar — deve falhar**

Run: `npm test -- cartpanda-webhook`
Expected: FAIL.

- [ ] **Step 3: Implementar `api/cartpanda-webhook.js`**

```js
import crypto from 'node:crypto';
import { getAdmin, sha256Email } from './_firebaseAdmin.js';

// Vercel: precisamos do corpo cru p/ validar a assinatura.
export const config = { api: { bodyParser: false } };

async function readRaw(req) {
  if (typeof req.rawBody === 'string') return req.rawBody;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return Buffer.concat(chunks).toString('utf8');
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

  // AJUSTAR com payload real (Step 6):
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
```

- [ ] **Step 4: Rodar — deve passar**

Run: `npm test -- cartpanda-webhook`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add api/cartpanda-webhook.js api/__tests__/cartpanda-webhook.test.js
git commit -m "feat: /api/cartpanda-webhook (pendingPlans na venda) [payload a confirmar]"
```

- [ ] **Step 6: VERIFICAÇÃO COM PAYLOAD REAL (quando disponível)**

Fazer uma compra de teste na CartPanda (ou pegar um payload de exemplo do painel deles). No handler, temporariamente logar `console.log(JSON.stringify(payload))` num deploy de preview, disparar, ler em `vercel logs`. Conferir:
- nome do header de assinatura e algoritmo (pode ser `sha256=` prefixado, ou base64);
- caminho do e-mail e do id do pedido;
- valor exato do campo de evento para "pago".

Ajustar seletores + teste, recomeçar do Step 4. Commitar como `fix: mapear payload real da CartPanda`.

---

## Task 8: Fachada de persistência — `src/lib/flowsRepo.js`

**Files:**
- Create: `src/lib/flowsRepo.js`, `src/lib/__tests__/flowsRepo.test.js`

**Interfaces:**
- Consumes: `getFirebase`, `useAuthStore` + `isPaid`, `serializeFlowState`/`hydrateFlowState`/`SCHEMA_VERSION`.
- Produces:
  - `canPersist(): boolean` — `isPaid(useAuthStore.getState())`.
  - `listFlows(): Promise<Array<{ id, name, updatedAt }>>` — `[]` se `!canPersist()`.
  - `loadFlow(id): Promise<object|null>` — devolve o patch de `hydrateFlowState`, ou `null`.
  - `saveFlow(id|null, { name, storeState }): Promise<{ id }>` — rejeita `Error('not-allowed')` se `!canPersist()`. `id===null` → cria (+ `flowCount` +1). Senão → atualiza.
  - `deleteFlow(id): Promise<void>` — (+ `flowCount` −1).

- [ ] **Step 1: Escrever `src/lib/__tests__/flowsRepo.test.js`**

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';

const addDoc = vi.fn(async () => ({ id: 'new1' }));
const setDoc = vi.fn();
const updateDoc = vi.fn();
const deleteDoc = vi.fn();
const getDoc = vi.fn();
const getDocs = vi.fn();
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => 'col'), doc: vi.fn(() => ({ id: 'd' })),
  addDoc: (...a) => addDoc(...a), setDoc: (...a) => setDoc(...a),
  updateDoc: (...a) => updateDoc(...a), deleteDoc: (...a) => deleteDoc(...a),
  getDoc: (...a) => getDoc(...a), getDocs: (...a) => getDocs(...a),
  query: vi.fn(() => 'q'), where: vi.fn(() => 'w'),
  serverTimestamp: () => 'ts', increment: (n) => ({ __inc: n }),
}));
vi.mock('../firebase.js', () => ({ getFirebase: async () => ({ db: {} }) }));

let planState;
vi.mock('../../store/useAuthStore.js', () => ({
  useAuthStore: { getState: () => planState },
  isPaid: (s) => s.plan === 'pro' || s.plan === 'team',
}));

beforeEach(() => { vi.clearAllMocks(); planState = { plan: 'free', user: { uid: 'u1' } }; });

describe('canPersist', () => {
  it('false p/ free, true p/ pro', async () => {
    const m = await import('../flowsRepo.js');
    expect(m.canPersist()).toBe(false);
    planState.plan = 'pro';
    expect(m.canPersist()).toBe(true);
  });
});

describe('saveFlow', () => {
  it('rejeita se não pode persistir', async () => {
    const m = await import('../flowsRepo.js');
    await expect(m.saveFlow(null, { name: 'x', storeState: {} })).rejects.toThrow('not-allowed');
  });

  it('cria doc novo e incrementa flowCount', async () => {
    planState.plan = 'pro';
    const m = await import('../flowsRepo.js');
    const r = await m.saveFlow(null, { name: 'Meu VSM', storeState: { processes: [], wips: [] } });
    expect(r.id).toBe('new1');
    expect(addDoc).toHaveBeenCalledWith('col', expect.objectContaining({
      ownerUid: 'u1', name: 'Meu VSM', schemaVersion: 1,
    }));
    expect(updateDoc).toHaveBeenCalledWith(expect.anything(), { flowCount: { __inc: 1 } });
  });

  it('atualiza doc existente sem mexer em flowCount', async () => {
    planState.plan = 'pro';
    const m = await import('../flowsRepo.js');
    await m.saveFlow('abc', { name: 'x', storeState: { processes: [], wips: [] } });
    expect(updateDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ name: 'x' }));
    expect(updateDoc).not.toHaveBeenCalledWith(expect.anything(), { flowCount: expect.anything() });
  });
});

describe('listFlows', () => {
  it('[] quando free', async () => {
    const m = await import('../flowsRepo.js');
    expect(await m.listFlows()).toEqual([]);
  });
  it('mapeia docs quando pro', async () => {
    planState.plan = 'pro';
    getDocs.mockResolvedValue({ docs: [
      { id: 'f1', data: () => ({ name: 'A', updatedAt: { toMillis: () => 10 } }) },
    ]});
    const m = await import('../flowsRepo.js');
    expect(await m.listFlows()).toEqual([{ id: 'f1', name: 'A', updatedAt: 10 }]);
  });
});
```

- [ ] **Step 2: Rodar — deve falhar**

Run: `npm test -- flowsRepo`
Expected: FAIL.

- [ ] **Step 3: Implementar `src/lib/flowsRepo.js`**

```js
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
  return hydrateFlowState(snap.data().state);
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
```

- [ ] **Step 4: Rodar — deve passar**

Run: `npm test -- flowsRepo`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/flowsRepo.js src/lib/__tests__/flowsRepo.test.js
git commit -m "feat: fachada flowsRepo (roteia free x pago)"
```

---

## Task 9: Persistência efêmera do free — `src/lib/sessionPersist.js`

**Files:**
- Create: `src/lib/sessionPersist.js`, `src/lib/__tests__/sessionPersist.test.js`
- Modify: `src/App.jsx` (ativar)

**Interfaces:**
- Consumes: `useVsmStore`, `serializeFlowState`/`hydrateFlowState`, `useAuthStore` + `isPaid`.
- Produces:
  - `initSessionPersist(): () => void` — na 1ª chamada: se há `sessionStorage['vsm-draft']` **e** o usuário não é pago, hidrata o store; depois assina o store e grava (debounced 800 ms) em `sessionStorage` enquanto `!isPaid`. Devolve unsubscribe.
  - `clearSessionDraft(): void`.

- [ ] **Step 1: Escrever `src/lib/__tests__/sessionPersist.test.js`**

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';

const storeState = { processes: [{ id: 'p1' }], wips: [], setState: vi.fn(), getState: null };
const listeners = new Set();
const useVsmStore = {
  getState: () => storeState,
  setState: (patch) => Object.assign(storeState, patch),
  subscribe: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
};
vi.mock('../../store/useVsmStore.js', () => ({ useVsmStore }));

let paid = false;
vi.mock('../../store/useAuthStore.js', () => ({
  useAuthStore: { getState: () => ({ plan: paid ? 'pro' : 'free' }) },
  isPaid: (s) => s.plan !== 'free',
}));

vi.mock('../flowState.js', () => ({
  serializeFlowState: (s) => ({ processes: s.processes, wips: s.wips }),
  hydrateFlowState: (s) => ({ ...s, selectedId: null }),
  SCHEMA_VERSION: 1,
}));

beforeEach(() => { vi.clearAllMocks(); sessionStorage.clear(); paid = false; vi.useFakeTimers(); });

describe('initSessionPersist', () => {
  it('hidrata do sessionStorage quando free', async () => {
    sessionStorage.setItem('vsm-draft', JSON.stringify({ processes: [{ id: 'x9' }], wips: [] }));
    const spy = vi.spyOn(useVsmStore, 'setState');
    const { initSessionPersist } = await import('../sessionPersist.js');
    initSessionPersist();
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ processes: [{ id: 'x9' }] }));
  });

  it('grava no sessionStorage após mudança (debounced)', async () => {
    const { initSessionPersist } = await import('../sessionPersist.js');
    initSessionPersist();
    listeners.forEach((fn) => fn(storeState));
    vi.advanceTimersByTime(900);
    expect(JSON.parse(sessionStorage.getItem('vsm-draft')).processes).toEqual([{ id: 'p1' }]);
  });

  it('não grava quando pago', async () => {
    paid = true;
    const { initSessionPersist } = await import('../sessionPersist.js');
    initSessionPersist();
    listeners.forEach((fn) => fn(storeState));
    vi.advanceTimersByTime(900);
    expect(sessionStorage.getItem('vsm-draft')).toBe(null);
  });
});
```

- [ ] **Step 2: Rodar — deve falhar**

Run: `npm test -- sessionPersist`
Expected: FAIL.

- [ ] **Step 3: Implementar `src/lib/sessionPersist.js`**

```js
import { useVsmStore } from '../store/useVsmStore.js';
import { useAuthStore, isPaid } from '../store/useAuthStore.js';
import { serializeFlowState, hydrateFlowState } from './flowState.js';

const KEY = 'vsm-draft';
let started = false;

export function clearSessionDraft() {
  try { sessionStorage.removeItem(KEY); } catch { /* modo privado */ }
}

export function initSessionPersist() {
  if (started) return () => {};
  started = true;

  const paidNow = () => isPaid(useAuthStore.getState());

  // hidratação inicial (só free)
  if (!paidNow()) {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (raw) useVsmStore.setState(hydrateFlowState(JSON.parse(raw)));
    } catch { /* ignora */ }
  }

  let t = null;
  const unsub = useVsmStore.subscribe((s) => {
    if (paidNow()) return;
    clearTimeout(t);
    t = setTimeout(() => {
      try {
        sessionStorage.setItem(KEY, JSON.stringify(serializeFlowState(s)));
      } catch { /* quota / modo privado */ }
    }, 800);
  });

  return () => { started = false; clearTimeout(t); unsub(); };
}
```

- [ ] **Step 4: Rodar — deve passar**

Run: `npm test -- sessionPersist`
Expected: PASS.

- [ ] **Step 5: Ativar em `src/App.jsx`**

Dentro de `EditorApp`, adicionar:

```jsx
import { initSessionPersist } from './lib/sessionPersist.js';
// ...
useEffect(() => initSessionPersist(), []);
```

- [ ] **Step 6: Rodar suíte + build**

Run: `npm test && npm run build`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/sessionPersist.js src/lib/__tests__/sessionPersist.test.js src/App.jsx
git commit -m "feat: persistência efêmera em sessionStorage para o tier free"
```

---

## Task 10: `AuthMenu` + `SavePromptBanner`

**Files:**
- Create: `src/components/Auth/AuthMenu.jsx`, `src/components/Auth/SavePromptBanner.jsx`, `src/components/Auth/Auth.css`
- Create: `src/components/Auth/__tests__/AuthMenu.test.jsx`

**Interfaces:**
- Consumes: `useAuthStore` (`user`, `plan`, `status`, `signInWithGoogle`, `signOut`).
- Produces:
  - `<AuthMenu />` — sem `user`: botão "Entrar". Com `user`: avatar (foto/inicial) que abre menu com nome, e-mail, plano (`Grátis`/`Pro`/`Time`) e "Sair".
  - `<SavePromptBanner onLogin={fn} />` — renderiza só quando `!user` **ou** `plan === 'free'`; texto "Entre para salvar seu trabalho na nuvem" + botão que chama `onLogin` (ou `signInWithGoogle`). Dispensável (✕) por sessão (`sessionStorage['vsm-saveprompt-hidden']`).

- [ ] **Step 1: Escrever `src/components/Auth/__tests__/AuthMenu.test.jsx`**

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const signInWithGoogle = vi.fn();
const signOut = vi.fn();
let state = { user: null, plan: 'free', status: 'ready', signInWithGoogle, signOut };
vi.mock('../../../store/useAuthStore.js', () => ({
  useAuthStore: (sel) => (sel ? sel(state) : state),
  isPaid: (s) => s.plan !== 'free',
}));

beforeEach(() => { vi.clearAllMocks(); state = { user: null, plan: 'free', status: 'ready', signInWithGoogle, signOut }; });

describe('AuthMenu', () => {
  it('deslogado mostra "Entrar" e chama signIn', async () => {
    const { default: AuthMenu } = await import('../AuthMenu.jsx');
    render(<AuthMenu />);
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }));
    expect(signInWithGoogle).toHaveBeenCalled();
  });

  it('logado mostra o nome e permite sair', async () => {
    state = { ...state, user: { displayName: 'Sergio', email: 's@x.com' }, plan: 'pro' };
    const { default: AuthMenu } = await import('../AuthMenu.jsx');
    render(<AuthMenu />);
    await userEvent.click(screen.getByRole('button', { name: /sergio/i }));
    await userEvent.click(screen.getByRole('button', { name: /sair/i }));
    expect(signOut).toHaveBeenCalled();
  });
});

describe('SavePromptBanner', () => {
  it('some quando pago', async () => {
    state = { ...state, user: { displayName: 'S' }, plan: 'pro' };
    const { default: SavePromptBanner } = await import('../SavePromptBanner.jsx');
    const { container } = render(<SavePromptBanner />);
    expect(container).toBeEmptyDOMElement();
  });
  it('aparece p/ free', async () => {
    const { default: SavePromptBanner } = await import('../SavePromptBanner.jsx');
    render(<SavePromptBanner />);
    expect(screen.getByText(/salvar seu trabalho/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar — deve falhar**

Run: `npm test -- AuthMenu`
Expected: FAIL.

- [ ] **Step 3: Implementar os 3 arquivos**

`src/components/Auth/AuthMenu.jsx`:

```jsx
import { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore.js';
import './Auth.css';

const PLAN_LABEL = { free: 'Grátis', pro: 'Pro', team: 'Time' };

export default function AuthMenu() {
  const user = useAuthStore((s) => s.user);
  const plan = useAuthStore((s) => s.plan);
  const status = useAuthStore((s) => s.status);
  const signIn = useAuthStore((s) => s.signInWithGoogle);
  const signOut = useAuthStore((s) => s.signOut);
  const [open, setOpen] = useState(false);

  if (!user) {
    return (
      <button type="button" className="hbtn auth-signin" onClick={signIn}
        disabled={status === 'loading'}>
        {status === 'loading' ? 'Entrando…' : 'Entrar'}
      </button>
    );
  }

  const initial = (user.displayName || user.email || '?').charAt(0).toUpperCase();
  return (
    <div className="auth-menu">
      <button type="button" className="auth-avatar" onClick={() => setOpen((v) => !v)}
        aria-label={user.displayName || 'Conta'}>
        {user.photoURL
          ? <img src={user.photoURL} alt="" width="26" height="26" />
          : <span className="auth-avatar-fallback">{initial}</span>}
      </button>
      {open && (
        <>
          <div className="auth-backdrop" onClick={() => setOpen(false)} />
          <div className="auth-pop">
            <div className="auth-pop-name">{user.displayName}</div>
            <div className="auth-pop-email">{user.email}</div>
            <div className="auth-pop-plan">Plano: <strong>{PLAN_LABEL[plan]}</strong></div>
            <button type="button" className="auth-pop-signout"
              onClick={() => { setOpen(false); signOut(); }}>Sair</button>
          </div>
        </>
      )}
    </div>
  );
}
```

`src/components/Auth/SavePromptBanner.jsx`:

```jsx
import { useState } from 'react';
import { useAuthStore, isPaid } from '../../store/useAuthStore.js';
import './Auth.css';

const HIDE_KEY = 'vsm-saveprompt-hidden';

export default function SavePromptBanner() {
  const state = useAuthStore();
  const [hidden, setHidden] = useState(() => {
    try { return sessionStorage.getItem(HIDE_KEY) === '1'; } catch { return false; }
  });

  if (isPaid(state) || hidden) return null;

  const dismiss = () => {
    try { sessionStorage.setItem(HIDE_KEY, '1'); } catch { /* ignora */ }
    setHidden(true);
  };

  return (
    <div className="save-prompt">
      <span>Seu trabalho não está sendo salvo. <strong>Entre para salvar seu trabalho na nuvem.</strong></span>
      <button type="button" className="save-prompt-cta" onClick={state.signInWithGoogle}>Entrar</button>
      <button type="button" className="save-prompt-x" onClick={dismiss} aria-label="Dispensar">✕</button>
    </div>
  );
}
```

`src/components/Auth/Auth.css` — estilos seguindo os tokens existentes (`--accent`, `--ink`, `--gray-*`). Faixa `save-prompt` no mesmo padrão visual de `.mobile-hint` (fundo `#fff4e5`, borda inferior). Popup `auth-pop` absoluto, `z-index: 60`, sombra suave. (Escrever ~40 linhas de CSS coerentes com `Layout.css`.)

- [ ] **Step 4: Rodar — deve passar**

Run: `npm test -- AuthMenu`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/Auth/
git commit -m "feat: AuthMenu + SavePromptBanner"
```

---

## Task 11: `LicenseModal` vira upsell + chave via claim-plan

**Files:**
- Modify: `src/components/License/LicenseModal.jsx`
- Delete: `src/utils/license.js`
- Create: `src/components/License/__tests__/LicenseModal.test.jsx`

**Interfaces:**
- Consumes: `useAuthStore` (para `user`, e para re-buscar plano após ativar chave).
- Produces: `<LicenseModal reason onClose onActivated />` — inalterado por fora. Por dentro: `handleActivate` chama `POST /api/claim-plan` com `Authorization: Bearer <idToken>` + `{ key }`; se `plan !== 'free'` → `useAuthStore.setState({ plan })` + `onActivated()`. Sem `user` logado → mostra "Entre primeiro para ativar sua licença" + botão de login.

- [ ] **Step 1: Escrever `src/components/License/__tests__/LicenseModal.test.jsx`**

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

let state;
vi.mock('../../../store/useAuthStore.js', () => ({
  useAuthStore: Object.assign((sel) => (sel ? sel(state) : state), {
    getState: () => state, setState: (p) => { state = { ...state, ...p }; },
  }),
  isPaid: (s) => s.plan !== 'free',
}));
global.fetch = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  state = {
    user: { getIdToken: async () => 'tok' }, plan: 'free',
    signInWithGoogle: vi.fn(),
  };
});

describe('LicenseModal upsell', () => {
  it('chave válida → seta plano e chama onActivated', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ plan: 'pro' }) });
    const onActivated = vi.fn();
    const { default: LicenseModal } = await import('../LicenseModal.jsx');
    render(<LicenseModal reason="x" onClose={() => {}} onActivated={onActivated} />);
    await userEvent.type(screen.getByPlaceholderText(/VSM-/), 'VSM-AAAA-BBBB');
    await userEvent.click(screen.getByRole('button', { name: /ativar/i }));
    expect(global.fetch).toHaveBeenCalledWith('/api/claim-plan', expect.objectContaining({ method: 'POST' }));
    expect(onActivated).toHaveBeenCalled();
  });

  it('sem login mostra CTA de entrar', async () => {
    state.user = null;
    const { default: LicenseModal } = await import('../LicenseModal.jsx');
    render(<LicenseModal onClose={() => {}} onActivated={() => {}} />);
    expect(screen.getByText(/entre primeiro/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar — deve falhar**

Run: `npm test -- LicenseModal`
Expected: FAIL.

- [ ] **Step 3: Reescrever `src/components/License/LicenseModal.jsx`**

```jsx
import { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore.js';
import './License.css';

export default function LicenseModal({ reason, onClose, onActivated }) {
  const user = useAuthStore((s) => s.user);
  const signIn = useAuthStore((s) => s.signInWithGoogle);
  const [key, setKey] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const handleActivate = async () => {
    setStatus('loading'); setError('');
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/claim-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ key: key.trim() }),
      });
      const data = res.ok ? await res.json() : {};
      if (data.plan && data.plan !== 'free') {
        useAuthStore.setState({ plan: data.plan });
        onActivated();
        return;
      }
      setStatus('error');
      setError('Chave inválida. Confira e tente de novo.');
    } catch {
      setStatus('error');
      setError('Não foi possível validar agora. Tente de novo em instantes.');
    }
  };

  return (
    <div className="license-backdrop" onClick={onClose}>
      <div className="license-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="license-close" onClick={onClose}>✕</button>
        <h2>Assine o VSM Builder Pro</h2>
        {reason && <p className="license-reason">{reason}</p>}
        <p>Salve seus mapas na nuvem e abra de qualquer dispositivo.</p>
        {/* TODO produto: botão de compra CartPanda aqui */}

        {!user ? (
          <>
            <p className="license-reason">Entre primeiro para ativar sua licença ou assinatura.</p>
            <button type="button" className="license-activate-btn" onClick={signIn}>Entrar com Google</button>
          </>
        ) : (
          <>
            <label className="license-label">
              Já tem uma chave?
              <input className="license-input" value={key}
                onChange={(e) => setKey(e.target.value)} placeholder="VSM-XXXX-XXXX" />
            </label>
            {status === 'error' && <p className="license-error">{error}</p>}
            <button type="button" className="license-activate-btn"
              onClick={handleActivate} disabled={status === 'loading' || !key.trim()}>
              {status === 'loading' ? 'Validando…' : 'Ativar'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Apagar `src/utils/license.js` e ajustar imports**

Run: `grep -rn "utils/license" src/`
Para cada uso: trocar `isLicensed()` por `isPaid(useAuthStore.getState())` (ou selector). Provável uso em `Header.jsx` — resolvido na Task 12.

- [ ] **Step 5: Rodar — deve passar + build**

Run: `npm test -- LicenseModal && npm run build`
Expected: testes PASS. Build pode falhar por `Header.jsx` ainda referenciar `isLicensed` — se for só isso, seguir p/ Task 12; senão consertar aqui.

- [ ] **Step 6: Commit**

```bash
git add src/components/License/ && git rm src/utils/license.js
git commit -m "feat: LicenseModal vira upsell; plano vem do useAuthStore"
```

---

## Task 12: Integração no Header — save/load via flowsRepo

**Files:**
- Modify: `src/components/Layout/Header.jsx`, `src/components/Layout/Layout.css`
- Create: `src/components/Layout/__tests__/Header.flows.test.jsx`

**Interfaces:**
- Consumes: `flowsRepo` (`canPersist`, `listFlows`, `loadFlow`, `saveFlow`), `useAuthStore`, `useVsmStore` (estado inteiro via `getState`), `hydrateFlowState`.
- Produces: comportamento —
  - "Salvar": se `!canPersist()` → abre `LicenseModal` (reason "Salvar na nuvem"). Se `canPersist()` → `saveFlow(currentFlowId, { name, storeState: useVsmStore.getState() })`, guarda `currentFlowId`.
  - "Abrir": `<select>` populado por `listFlows()` (async, no mount + após salvar). Selecionar → `loadFlow(id)` → `useVsmStore.setState(patch)`.
  - `AuthMenu` renderizado no header.
  - Autosave debounced 4 s quando `canPersist()` e há `currentFlowId` (assina `useVsmStore`).

- [ ] **Step 1: Escrever `src/components/Layout/__tests__/Header.flows.test.jsx`**

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const canPersist = vi.fn();
const saveFlow = vi.fn(async () => ({ id: 'f1' }));
const listFlows = vi.fn(async () => []);
const loadFlow = vi.fn(async () => ({ processes: [], selectedId: null }));
vi.mock('../../../lib/flowsRepo.js', () => ({ canPersist, saveFlow, listFlows, loadFlow, deleteFlow: vi.fn() }));

const vsmState = { processes: [], wips: [], demand: 200 };
vi.mock('../../../store/useVsmStore.js', () => ({
  useVsmStore: Object.assign((sel) => (sel ? sel(vsmState) : vsmState), {
    getState: () => vsmState, setState: vi.fn(), subscribe: () => () => {},
  }),
}));
vi.mock('../../../store/useAuthStore.js', () => ({
  useAuthStore: Object.assign((sel) => (sel ? sel({ user: null, plan: 'free' }) : { user: null, plan: 'free' }),
    { getState: () => ({ user: null, plan: 'free' }) }),
  isPaid: (s) => s.plan !== 'free',
}));
// mocks leves p/ os modais pesados que o Header importa:
vi.mock('../../Yamazumi/Yamazumi.jsx', () => ({ default: () => null }));
vi.mock('../../Comparison/ComparisonView.jsx', () => ({ default: () => null }));
vi.mock('../../ReportPdf/ReportPdf.jsx', () => ({ default: () => null }));
vi.mock('../../PwaInstall/PwaInstallButton.jsx', () => ({ default: () => null }));

beforeEach(() => { vi.clearAllMocks(); canPersist.mockReturnValue(false); });

describe('Header — salvar', () => {
  it('free: "Salvar" abre o modal de upsell', async () => {
    const { default: Header } = await import('../Header.jsx');
    render(<Header activeView="vsm" onToggleDrawer={() => {}} onStartTour={() => {}}
      onOpenShingo={() => {}} onBackToVsm={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }));
    expect(screen.getByText(/assine o vsm builder pro/i)).toBeInTheDocument();
    expect(saveFlow).not.toHaveBeenCalled();
  });

  it('pago: "Salvar" grava via flowsRepo', async () => {
    canPersist.mockReturnValue(true);
    const { default: Header } = await import('../Header.jsx');
    render(<Header activeView="vsm" onToggleDrawer={() => {}} onStartTour={() => {}}
      onOpenShingo={() => {}} onBackToVsm={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }));
    expect(saveFlow).toHaveBeenCalledWith(null, expect.objectContaining({
      storeState: vsmState,
    }));
  });
});
```

- [ ] **Step 2: Rodar — deve falhar**

Run: `npm test -- Header.flows`
Expected: FAIL.

- [ ] **Step 3: Editar `src/components/Layout/Header.jsx`**

Mudanças pontuais:
1. Remover imports/uso de `isLicensed` e dos métodos `saveFlow/loadFlow/listFlows` do `useVsmStore`.
2. Importar `canPersist, saveFlow, listFlows, loadFlow` de `../../lib/flowsRepo.js`, `hydrateFlowState` já é aplicado dentro do `loadFlow` (retorna patch), então `loadFlow(id)` → `useVsmStore.setState(patch)`.
3. Estado local: `currentFlowId` (`useState(null)`), `saved` (lista de `{id,name}`).
4. `refresh` → `listFlows().then(setSaved)`.
5. `handleSalvar`:

```js
const handleSalvar = async () => {
  if (!canPersist()) { setLicenseReason('Salve seus mapas na nuvem para abrir de qualquer lugar.'); return; }
  const { id } = await saveFlow(currentFlowId, {
    name: name.trim() || 'Meu fluxo',
    storeState: useVsmStore.getState(),
  });
  setCurrentFlowId(id);
  refresh();
};
```

6. "Abrir": `<select>` de `saved`; `onChange` → `const patch = await loadFlow(id); useVsmStore.setState(patch); setCurrentFlowId(id);`.
7. Renderizar `<AuthMenu />` na `.hdr-primary`.
8. Autosave:

```js
useEffect(() => {
  if (!canPersist() || !currentFlowId) return;
  let t;
  const unsub = useVsmStore.subscribe(() => {
    clearTimeout(t);
    t = setTimeout(() => {
      saveFlow(currentFlowId, { name: name.trim() || 'Meu fluxo', storeState: useVsmStore.getState() });
    }, 4000);
  });
  return () => { clearTimeout(t); unsub(); };
}, [currentFlowId, name]);
```

- [ ] **Step 4: Rodar — deve passar**

Run: `npm test -- Header.flows`
Expected: PASS.

- [ ] **Step 5: Rodar suíte inteira + build**

Run: `npm test && npm run build`
Expected: tudo PASS. Corrigir qualquer import órfão de `license.js`/`storage.js`.

- [ ] **Step 6: Commit**

```bash
git add src/components/Layout/
git commit -m "feat: Header salva/abre mapas via flowsRepo + AuthMenu"
```

---

## Task 13: `MigrationModal` — trazer mapas locais legados

**Files:**
- Create: `src/components/Auth/MigrationModal.jsx`, `src/components/Auth/__tests__/MigrationModal.test.jsx`
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `flowsRepo.saveFlow`, `useAuthStore` (`user`, `plan`), `hydrateFlowState`, `isPaid`.
- Produces:
  - `readLegacyFlows(): Array<{ name, state }>` — lê `localStorage['vsm-flows']` (formato do store antigo) **e** `localStorage['vsm_builder_flows']` (formato do `storage.js` morto, por garantia); `[]` se nada.
  - `<MigrationModal />` — monta quando: `isPaid` **e** há mapas legados **e** não migrado nesta sessão (`sessionStorage['vsm-migration-done']`). Botões "Trazer N mapas" (chama `saveFlow(null, …)` p/ cada, renomeia a chave p/ `…__migrated_backup`, seta flag) e "Agora não" (só seta flag).

- [ ] **Step 1: Escrever `src/components/Auth/__tests__/MigrationModal.test.jsx`**

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const saveFlow = vi.fn(async () => ({ id: 'x' }));
vi.mock('../../../lib/flowsRepo.js', () => ({ saveFlow }));
let auth = { user: { uid: 'u1' }, plan: 'pro' };
vi.mock('../../../store/useAuthStore.js', () => ({
  useAuthStore: (sel) => (sel ? sel(auth) : auth),
  isPaid: (s) => s.plan !== 'free',
}));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear(); sessionStorage.clear();
  auth = { user: { uid: 'u1' }, plan: 'pro' };
  localStorage.setItem('vsm-flows', JSON.stringify({
    'Linha A': { supplier: { name: 'F' }, processes: [], wips: [], savedAt: 1 },
  }));
});

describe('MigrationModal', () => {
  it('pago com mapas legados: mostra o modal e migra', async () => {
    const { default: MigrationModal } = await import('../MigrationModal.jsx');
    render(<MigrationModal />);
    await userEvent.click(screen.getByRole('button', { name: /trazer/i }));
    expect(saveFlow).toHaveBeenCalledTimes(1);
    expect(saveFlow).toHaveBeenCalledWith(null, expect.objectContaining({ name: 'Linha A' }));
    expect(localStorage.getItem('vsm-flows')).toBe(null);
    expect(localStorage.getItem('vsm-flows__migrated_backup')).toBeTruthy();
  });

  it('free: não renderiza', async () => {
    auth = { user: null, plan: 'free' };
    const { default: MigrationModal } = await import('../MigrationModal.jsx');
    const { container } = render(<MigrationModal />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Rodar — deve falhar**

Run: `npm test -- MigrationModal`
Expected: FAIL.

- [ ] **Step 3: Implementar `src/components/Auth/MigrationModal.jsx`**

```jsx
import { useState } from 'react';
import { useAuthStore, isPaid } from '../../store/useAuthStore.js';
import { saveFlow } from '../../lib/flowsRepo.js';
import './Auth.css';

const DONE_KEY = 'vsm-migration-done';
const LEGACY_KEYS = ['vsm-flows', 'vsm_builder_flows'];

export function readLegacyFlows() {
  const out = [];
  for (const key of LEGACY_KEYS) {
    let obj;
    try { obj = JSON.parse(localStorage.getItem(key) || '{}'); } catch { obj = {}; }
    for (const [name, state] of Object.entries(obj)) {
      out.push({ name, state, __key: key });
    }
  }
  return out;
}

export default function MigrationModal() {
  const state = useAuthStore();
  const [legacy] = useState(readLegacyFlows);
  const [done, setDone] = useState(() => {
    try { return sessionStorage.getItem(DONE_KEY) === '1'; } catch { return false; }
  });
  const [busy, setBusy] = useState(false);

  if (!isPaid(state) || done || legacy.length === 0) return null;

  const finish = () => {
    try { sessionStorage.setItem(DONE_KEY, '1'); } catch { /* ignora */ }
    setDone(true);
  };

  const migrate = async () => {
    setBusy(true);
    for (const item of legacy) {
      await saveFlow(null, { name: item.name, storeState: item.state });
    }
    for (const key of LEGACY_KEYS) {
      const v = localStorage.getItem(key);
      if (v) { localStorage.setItem(`${key}__migrated_backup`, v); localStorage.removeItem(key); }
    }
    finish();
  };

  return (
    <div className="license-backdrop">
      <div className="license-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Trazer seus mapas para a conta</h2>
        <p>Você tem <strong>{legacy.length}</strong> mapa(s) salvos neste navegador. Levar para a sua conta na nuvem?</p>
        <button type="button" className="license-activate-btn" onClick={migrate} disabled={busy}>
          {busy ? 'Enviando…' : `Trazer ${legacy.length} mapa(s)`}
        </button>
        <button type="button" className="license-close-text" onClick={finish} disabled={busy}>Agora não</button>
      </div>
    </div>
  );
}
```

> Nota: `saveFlow` recebe `storeState` cru; `serializeFlowState` dentro dele já normaliza campos faltantes de mapas antigos via `JSON.parse(JSON.stringify(...))` — os defaults entram no `loadFlow`/`hydrateFlowState`. OK.

- [ ] **Step 4: Rodar — deve passar**

Run: `npm test -- MigrationModal`
Expected: PASS.

- [ ] **Step 5: Montar em `src/App.jsx`**

No `EditorApp`, junto de `SavePromptBanner`:

```jsx
import MigrationModal from './components/Auth/MigrationModal.jsx';
// no JSX, dentro de .app-shell:
<MigrationModal />
```

- [ ] **Step 6: Rodar suíte + build**

Run: `npm test && npm run build`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/Auth/MigrationModal.jsx src/components/Auth/__tests__/MigrationModal.test.jsx src/App.jsx
git commit -m "feat: MigrationModal — migração única dos mapas locais legados"
```

---

## Task 14: App.jsx — inicializar auth + montar banner

**Files:**
- Modify: `src/App.jsx`
- Create: `src/__tests__/App.auth.test.jsx`

**Interfaces:**
- Consumes: `initAuth` de `useAuthStore`, `isFirebaseConfigured` de `firebase.js`.
- Produces: no mount do `EditorApp` (e do `Landing`? só editor), chama `initAuth()` uma vez se `isFirebaseConfigured()`; cleanup no unmount. `<SavePromptBanner />` montado logo abaixo do `<Header>`.

- [ ] **Step 1: Escrever `src/__tests__/App.auth.test.jsx`**

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

const initAuth = vi.fn(() => vi.fn());
vi.mock('../store/useAuthStore.js', () => ({
  useAuthStore: Object.assign((sel) => (sel ? sel({ user: null, plan: 'free', status: 'ready' }) : { user: null, plan: 'free', status: 'ready' }),
    { getState: () => ({ user: null, plan: 'free' }) }),
  isPaid: () => false,
  initAuth,
}));
vi.mock('../lib/firebase.js', () => ({ isFirebaseConfigured: () => true, getFirebase: vi.fn() }));
vi.mock('../lib/sessionPersist.js', () => ({ initSessionPersist: () => () => {} }));
// stubs de módulos pesados
vi.mock('../components/VsmLayout/VsmLayout.jsx', () => ({ default: () => null }));
vi.mock('../components/Layout/Header.jsx', () => ({ default: () => null }));
vi.mock('@vercel/analytics/react', () => ({ Analytics: () => null }));

beforeEach(() => { vi.clearAllMocks(); window.history.pushState({}, '', '/app'); });

it('chama initAuth uma vez no editor', async () => {
  const { default: App } = await import('../App.jsx');
  render(<App />);
  expect(initAuth).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Rodar — deve falhar**

Run: `npm test -- App.auth`
Expected: FAIL.

- [ ] **Step 3: Editar `src/App.jsx`**

```jsx
import { initAuth } from './store/useAuthStore.js';
import { isFirebaseConfigured } from './lib/firebase.js';
import SavePromptBanner from './components/Auth/SavePromptBanner.jsx';
// ...
useEffect(() => {
  if (!isFirebaseConfigured()) return;
  const cleanup = initAuth();
  return cleanup;
}, []);
// no JSX, logo após <Header .../>:
<SavePromptBanner />
```

- [ ] **Step 4: Rodar — deve passar + suíte + build**

Run: `npm test && npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx src/__tests__/App.auth.test.jsx
git commit -m "feat: App inicializa auth e monta SavePromptBanner"
```

---

## Task 15: Regras do Firestore + config de deploy

**Files:**
- Create: `firestore.rules`, `firestore.indexes.json`, `firebase.json`, `vitest.rules.config.js`, `tests/rules/flows.rules.test.js`
- Modify: `package.json` (dep `@firebase/rules-unit-testing`, `firebase-tools` opcional)

**Interfaces:**
- Produces: regras que implementam §4 do spec. Testes rodam contra o emulador do Firestore.

- [ ] **Step 1: Escrever `firestore.rules`**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function signedIn() { return request.auth != null; }
    function userDoc() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }
    function isPaid() {
      return signedIn() && (userDoc().plan == 'pro' || userDoc().plan == 'team');
    }

    match /users/{uid} {
      allow read: if signedIn() && request.auth.uid == uid;
      allow create: if signedIn() && request.auth.uid == uid
                    && request.resource.data.plan == 'free'
                    && request.resource.data.flowCount == 0;
      allow update: if signedIn() && request.auth.uid == uid
                    && request.resource.data.plan == resource.data.plan
                    && request.resource.data.planSource == resource.data.planSource
                    && request.resource.data.teamId == resource.data.teamId
                    && request.resource.data.flowCount >= resource.data.flowCount - 1
                    && request.resource.data.flowCount <= resource.data.flowCount + 1;
      allow delete: if false;
    }

    match /flows/{flowId} {
      function isOwner() { return signedIn() && resource.data.ownerUid == request.auth.uid; }
      allow read:   if isOwner();
      allow create: if signedIn() && isPaid()
                    && request.resource.data.ownerUid == request.auth.uid
                    && request.resource.data.schemaVersion == 1
                    && request.resource.data.share.mode == 'private';
      allow update: if isOwner() && isPaid()
                    && request.resource.data.ownerUid == resource.data.ownerUid;
      allow delete: if isOwner();
    }

    match /pendingPlans/{doc} { allow read, write: if false; } // só admin SDK
    match /{document=**} { allow read, write: if false; }
  }
}
```

- [ ] **Step 2: `firestore.indexes.json`**

```json
{ "indexes": [
  { "collectionGroup": "flows", "queryScope": "COLLECTION",
    "fields": [ { "fieldPath": "ownerUid", "order": "ASCENDING" } ] }
], "fieldOverrides": [] }
```

- [ ] **Step 3: `firebase.json`**

```json
{
  "firestore": { "rules": "firestore.rules", "indexes": "firestore.indexes.json" },
  "emulators": { "firestore": { "port": 8080 }, "ui": { "enabled": false } }
}
```

- [ ] **Step 4: Instalar tooling de teste de regras**

```bash
npm i -D @firebase/rules-unit-testing@^3 firebase-tools@^13
```

- [ ] **Step 5: `vitest.rules.config.js`**

```js
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { include: ['tests/rules/**/*.test.js'], testTimeout: 20000, fileParallelism: false },
});
```

- [ ] **Step 6: Escrever `tests/rules/flows.rules.test.js`**

```js
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
```

- [ ] **Step 7: Rodar com o emulador**

Run: `npx firebase emulators:exec --only firestore "npm run test:rules"`
Expected: 5 testes PASS. (Requer Java 11+ instalado — se faltar, documentar e seguir; não bloquear o resto.)

- [ ] **Step 8: Commit**

```bash
git add firestore.rules firestore.indexes.json firebase.json vitest.rules.config.js tests/rules/ package.json package-lock.json
git commit -m "feat: regras de segurança do Firestore + testes no emulador"
```

---

## Task 16: Limpeza de código morto

**Files:**
- Delete: `src/utils/storage.js`, `src/components/Canvas/` (todo), `src/hooks/useDrag.js`, `src/hooks/useConnect.js`, `src/components/Canvas/Canvas.css`, `src/components/Ports/` (se só o Canvas usa)
- Modify: `src/store/useVsmStore.js` (remover os stubs da Task 3)

**Interfaces:** nenhuma nova. Remoção pura.

- [ ] **Step 1: Confirmar que é código morto**

Run:
```bash
grep -rn "components/Canvas\|hooks/useDrag\|hooks/useConnect\|utils/storage\|components/Ports" src/ --include=*.jsx --include=*.js | grep -v "src/components/Canvas/" | grep -v "src/components/Ports/"
```
Expected: zero linhas (fora auto-referências). Se algo aparecer, **não apagar** aquele arquivo.

- [ ] **Step 2: Apagar**

```bash
git rm -r src/components/Canvas src/hooks/useDrag.js src/hooks/useConnect.js src/utils/storage.js
# src/components/Ports só se o grep confirmou que nada além do Canvas usa
```

- [ ] **Step 3: Remover stubs de `useVsmStore.js`**

Apagar `saveFlow`/`loadFlow`/`listFlows` stubs adicionados na Task 3.

- [ ] **Step 4: Suíte + build**

Run: `npm test && npm run build`
Expected: PASS. Nenhum import quebrado.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove código morto (Canvas, useDrag/useConnect, storage.js)"
```

---

## Task 17: `.env.example` + README + fim da Fase 1

**Files:**
- Create: `.env.example`
- Modify: `README.md`, `vite.config.js` (nada — Vite já expõe `VITE_*`)

- [ ] **Step 1: Escrever `.env.example`**

```
# ── Firebase Web (público — restringir domínio no console) ──
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# ── Funções Vercel (SEGREDO) ──
# JSON do service account do Firebase, em base64: base64 -w0 serviceAccount.json
FIREBASE_SERVICE_ACCOUNT=
# HMAC secret do webhook da CartPanda
CARTPANDA_WEBHOOK_SECRET=
# legado — chaves manuais, fallback
VALID_LICENSES=
```

- [ ] **Step 2: Seção no `README.md`**

Documentar: os 7 passos do "Pré-requisito manual" no topo deste plano; como rodar `npm test` e `npm run test:rules` (com Java); como publicar as regras: `npx firebase deploy --only firestore --project <id>`; lembrete de adicionar as env vars na Vercel (Production + Preview).

- [ ] **Step 3: Rodar tudo**

Run: `npm test && npm run build`
Expected: PASS.

- [ ] **Step 4: Teste manual E2E (com projeto Firebase real configurado)**

Roteiro:
1. `npm run dev`, abrir `/app` deslogado → editar, dar F5 → estado preservado (sessionStorage). Fechar aba, reabrir → estado zerado.
2. "Salvar" deslogado → modal de upsell.
3. "Entrar com Google" → login. Como não há compra, plano = Grátis; "Salvar" ainda abre upsell.
4. Via console do Firebase, setar `users/{uid}.plan = 'pro'` na mão. Recarregar.
5. Se houver mapas em `localStorage['vsm-flows']` → `MigrationModal` aparece → "Trazer" → confere no console do Firebase que os docs `flows/*` surgiram.
6. "Salvar" → cria `flows/*`; editar → autosave após ~4 s (ver `updatedAt` mudar).
7. Abrir em outro navegador logado na mesma conta → "Abrir" lista o mapa → carrega igual.
8. `SavePromptBanner` some quando pago.

- [ ] **Step 5: Commit + tag**

```bash
git add .env.example README.md
git commit -m "docs: setup do backend Firebase (Fase 1 completa)"
git tag fase-1-firebase
```

---

## Self-Review (preenchido pelo autor do plano)

**1. Cobertura do spec:**
- §1 tiers (free efêmero / pago nuvem) → Tasks 8, 9, 10
- §2 arquitetura (client + funções Vercel) → Tasks 2, 5, 6, 7
- §3 modelo `users`/`flows`/`pendingPlans` → Tasks 4, 6, 8, 15
- §3.1 estado completo → Task 3
- §4 regras de segurança → Task 15
- §5.1 login → Task 4
- §5.2 claim-plan → Task 6
- §5.3 webhook → Task 7 (com bloqueio de payload sinalizado)
- §5.4 migração → Task 13
- §5.5 flowsRepo → Task 8
- §5.6 licença→plano → Tasks 4, 11
- §5.7 UI → Tasks 10, 11, 12, 14
- §5.8 arquivos → todas
- §5.9 envs → Task 17
- §8 testes → Task 1 + testes em cada task + Task 15
- `teams`/`share` (Fases 2–3) → **fora do escopo deste plano** (por design)

**2. Placeholders:** o único "TODO" é no JSX do `LicenseModal` (`{/* TODO produto: botão de compra */}`) — intencional, o link de compra CartPanda é decisão de produto/negócio, não de engenharia; não bloqueia a Fase 1. Task 7 tem bloqueio explícito de payload com passo de verificação real (Step 6), não é placeholder de código.

**3. Consistência de tipos:**
- `serializeFlowState(store)` / `hydrateFlowState(state)` — assinaturas idênticas nas Tasks 3, 8, 9, 13. ✓
- `saveFlow(id|null, { name, storeState })` — mesma assinatura nas Tasks 8, 12, 13. ✓
- `canPersist()` — Tasks 8, 12. ✓
- `isPaid(state)` — Tasks 4, 8, 9, 10, 13. ✓
- `initAuth()` retorna cleanup — Tasks 4, 14. ✓
- `getFirebase()` → `{ app, auth, db }` — Tasks 2, 4, 8. ✓
- `getAdmin()` → `{ auth, db, FieldValue }` — Tasks 5, 6, 7. ✓
