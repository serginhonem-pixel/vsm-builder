# Backend Firebase — contas, mapas na nuvem, compartilhamento e time

**Data:** 2026-09-02
**Status:** desenho aprovado, aguardando revisão do spec antes do plano de implementação
**Abordagem escolhida:** Firebase Auth + Firestore no cliente; funções da Vercel (com `firebase-admin`) para operações privilegiadas. **Sem plano Blaze, sem Cloud Functions, sem Firebase Hosting.**

---

## 1. Contexto e objetivo

Hoje o VSM Builder é 100% client-side:

- Mapas salvos em `localStorage` (`vsm_builder_flows`), via `src/utils/storage.js`.
- "Licença" = uma chave vendida na CartPanda, adicionada à mão no env var `VALID_LICENSES` e validada por `api/validate-license.js`. Destrava o botão **Salvar**. Não há conta de usuário.
- App é SPA Vite/React na Vercel, já PWA (offline via Workbox, `vite-plugin-pwa`).

**Objetivo:** introduzir persistência em nuvem com contas reais, mantendo o uso anônimo intacto.

### Modelo de tier (decidido — 2026-09-02)

**O banco de dados é exclusivo do usuário pago.** O free não persiste nada.

| Tier | O que pode fazer | Persistência |
|---|---|---|
| **Free / anônimo** | Usar o editor completo, exportar PDF/JSON, abrir link compartilhado (só leitura) | **Nenhuma.** O trabalho vive só na sessão e some ao sair/recarregar. |
| **Pago (Pro)** | Tudo do free + salvar/abrir mapas na nuvem, de qualquer dispositivo | Firestore |
| **Pago (Time)** | Tudo do Pro + assentos e mapas compartilhados na equipe | Firestore |

Consequências:
- Não há limite de "N mapas free" — free é **zero** persistência.
- O `localStorage` de mapas (`vsm_builder_flows`) **deixa de ser usado** para salvar. Fica só para a migração única de usuários da versão atual (§5.4).
- Só quem paga cria documentos no Firestore → uso do Spark fica folgadíssimo.
- Login sem compra correspondente = conta `plan: 'free'` → vê upsell, não salva nada.

### Escopo (decidido)

| Capacidade | Fase |
|---|---|
| Login Google + conta real (substitui a chave solta) | 1 |
| Mapas do próprio usuário **pago** na nuvem (qualquer dispositivo) | 1 |
| Migração única dos mapas locais de usuários da versão atual | 1 |
| Ligação da compra CartPanda à conta (por e-mail) | 1 |
| Free = sessão efêmera, sem persistência | 1 |
| Compartilhar mapa por link (ver / editar) | 2 |
| Plano time/consultoria (assentos, mapas da equipe) | 3 |

**O spec desenha o modelo de dados inteiro (users/flows/teams/shares).** A implementação é faseada: Fase 1 primeiro, Fases 2 e 3 depois (cada uma vira seu próprio plano de implementação).

### Login: **somente Google**

`signInWithPopup(GoogleAuthProvider)`. Sem e-mail/senha, sem link mágico. Aceito que exclui quem não tem conta Google. Login só faz sentido para usuário pago (ou quem está prestes a pagar).

### Persistência por tier

- **Free / anônimo:** trabalho persiste em **`sessionStorage`** (decidido 2026-09-02) — sobrevive a um refresh acidental, é apagado ao fechar a aba / nova sessão. Banner fixo "Entre para salvar seu trabalho".
  - Export PDF e JSON **continuam disponíveis no free** (válvula de escape).
- **Pago:** mapas vivem no Firestore com `persistentLocalCache` ligado. O SDK cacheia e enfileira escritas sozinho ("funciona no avião"). Conflito = last-write-wins (aceitável: 1 usuário no próprio mapa).
- Sem sync bidirecional localStorage ↔ nuvem. A migração (§5.4) é evento único.

---

## 2. Arquitetura

```
Browser (SPA na Vercel)
├─ Firebase Auth (Google)          ← lazy-load só quando o usuário clica "Entrar"
├─ Firestore SDK                    ← persistentLocalCache; lê/escreve os próprios
│                                     mapas direto, guardado por Security Rules
└─ chama Funções Vercel para ops privilegiadas:
     POST /api/cartpanda-webhook   CartPanda → grava pendingPlans/{hash}
     POST /api/claim-plan          no login: verifica ID token, casa e-mail → seta plan
     GET  /api/share/resolve       token → snapshot do mapa (fase 2, anônimo-friendly)
     POST /api/share/save          escrita via link "edit" (fase 2)
     POST /api/team/invite|join    fase 3
        ↑ todas usam firebase-admin com service account em env secreto
```

- **Firebase:** projeto no plano **Spark (grátis)**. Auth + Firestore apenas.
- **Deploy:** continua 100% Vercel. Firebase é só dados + auth.
- **Regras do Firestore + índices:** versionados no repo (`firestore.rules`, `firestore.indexes.json`), publicados via `firebase deploy --only firestore` (CI ou manual — documentar no README).

### Por que funções da Vercel em vez de Cloud Functions

Cloud Functions do Firebase exigem plano Blaze. Colocar a lógica de servidor nas funções da Vercel com `firebase-admin`:

- mantém tudo no mesmo repo e no free tier do Firebase;
- reaproveita o padrão que já existe (`api/validate-license.js`);
- o custo é não ter triggers reativos do Firestore (ex: contar mapas automaticamente) — contornado com reconciliação no login.

---

## 3. Modelo de dados (Firestore)

### `users/{uid}`

| Campo | Tipo | Notas |
|---|---|---|
| `email` | string | do provedor Google |
| `displayName` | string | |
| `photoURL` | string | |
| `plan` | `'free' \| 'pro' \| 'team'` | **imutável pelo cliente** — só admin SDK escreve |
| `planSource` | `'cartpanda' \| 'stripe' \| 'manual' \| 'team'` | |
| `planUpdatedAt` | timestamp | |
| `teamId` | string \| null | fase 3 |
| `role` | `'owner' \| 'member' \| null` | papel dentro do time, fase 3 |
| `flowCount` | number | mantido pelo cliente nas escritas; reconciliado por função no login |
| `createdAt` | timestamp | |

Criado no 1º login com `plan: 'free'`, `flowCount: 0`. Um usuário `free` logado não cria nenhum `flows/*` — a conta existe só para receber o upgrade quando a compra for reconhecida.

### `pendingPlans/{emailHash}`

Escrito **apenas** pelo `/api/cartpanda-webhook`. Lido e apagado pelo `/api/claim-plan`.

| Campo | Tipo |
|---|---|
| `email` | string (normalizado, lowercase, trim) |
| `plan` | `'pro'` |
| `source` | `'cartpanda'` |
| `orderId` | string |
| `createdAt` | timestamp |

`emailHash` = SHA-256 do e-mail normalizado (evita e-mail em claro como ID de documento).

### `flows/{flowId}`

| Campo | Tipo | Notas |
|---|---|---|
| `ownerUid` | string | |
| `teamId` | string \| null | se preenchido, mapa é do time (fase 3) |
| `name` | string | |
| `state` | map | **o blob VSM completo** — ver §3.1 |
| `schemaVersion` | number | versão do formato do `state`; começa em `1` |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | `serverTimestamp()` a cada save |
| `share` | map | `{ mode: 'private' \| 'view' \| 'edit', token: string \| null }` — fase 2; default `{ mode: 'private', token: null }` |

`flowId` = ID gerado pelo Firestore (`doc(collection(...))`).

#### 3.1 Formato de `state`

**Fato do código atual (2026-09-02):** a persistência real vive **dentro de `src/store/useVsmStore.js`** (`saveFlow`/`loadFlow`/`listFlows`, chave `localStorage['vsm-flows']`). O `src/utils/storage.js` (chave `vsm_builder_flows`) e o `src/components/Canvas/*` são **código morto** — ninguém os importa. O `Header.jsx` chama os métodos do store.

O `saveFlow` atual serializa só: `supplier, customer, pcp, processes, wips, shingoSteps, elements`. **Não** persiste `demand`, `available`, `lote`, `shifts`, nem o estado futuro (`savedStates`) — limitação pré-existente.

**Decisão:** ao reconstruir a camada de persistência, capturar o **estado completo**:

```
state: {
  supplier, customer, pcp,
  processes: [...], wips: [...], elements: [...], shingoSteps: [...],
  demand, available, lote, shifts: [...],
  activeState: 'atual' | 'futuro',
  savedStates: { atual: {...} | null, futuro: {...} | null }
}
```

`schemaVersion: 1` marca este formato. Tamanho: poucos KB. Um doc só, sem subcoleções.

### `teams/{teamId}` — fase 3

| Campo | Tipo |
|---|---|
| `name` | string |
| `ownerUid` | string |
| `seats` | number |
| `memberUids` | string[] (denormalizado p/ regras) |
| `createdAt` | timestamp |

### `teamInvites/{inviteId}` — fase 3

`{ teamId, email, invitedBy, createdAt }`

---

## 4. Regras de segurança (perímetro de segurança real)

Arquivo `firestore.rules`. Testadas com `@firebase/rules-unit-testing` + emulador (não opcional — é a fronteira de segurança).

### `users/{uid}`

- `read`: `request.auth.uid == uid` (fase 3: + dono do time lendo membro)
- `create`: `request.auth.uid == uid` **e** `request.resource.data.plan == 'free'` **e** `request.resource.data.flowCount == 0`
- `update`: `request.auth.uid == uid` **e** campos protegidos inalterados:
  - `request.resource.data.plan == resource.data.plan`
  - `request.resource.data.planSource == resource.data.planSource`
  - `request.resource.data.teamId == resource.data.teamId` (fase 3 muda via função)
  - `flowCount` pode mudar no máximo ±1 por escrita (mitiga trapaça grosseira)
- `delete`: negado

Escrita de `plan` / `teamId` / `role`: **exclusivamente** via admin SDK nas funções.

### `flows/{flowId}`

Helpers:
```
isSignedIn()      = request.auth != null
isOwner()         = isSignedIn() && resource.data.ownerUid == request.auth.uid
isOwnerOnCreate() = isSignedIn() && request.resource.data.ownerUid == request.auth.uid
isTeamMember()    = fase 3: resource.data.teamId != null &&
                    request.auth.uid in get(/teams/$(resource.data.teamId)).data.memberUids
userDoc()         = get(/databases/$(db)/documents/users/$(request.auth.uid)).data
isPaid()          = userDoc().plan == 'pro' || userDoc().plan == 'team'
```

- `read`: `isOwner() || isTeamMember()`
  - **Compartilhamento não usa regra** — link vai por `/api/share/resolve` (admin SDK). Link anônimo nunca ganha acesso direto ao Firestore.
- `create`: `isOwnerOnCreate() && isPaid() && request.resource.data.schemaVersion == 1 && request.resource.data.share.mode == 'private'`
- `update`: `(isOwner() || isTeamMember()) && isPaid()` **e** `ownerUid`/`teamId` inalterados
- `delete`: `isOwner()` (fase 3: `|| isTeamOwner()`)

**Free = zero persistência:** sem `isPaid()`, nenhum `create`/`update` passa. Não há `FREE_LIMIT`.

> **Nota sobre `get()` em regras:** cada `get()` conta como 1 leitura e há limite de 10 `get()`/`getAfter()` por avaliação. O design usa no máximo 1–2 por operação. OK.

### `teams`, `teamInvites` — fase 3

Definidos quando a fase 3 virar plano próprio. Rascunho: `teams` read = membro; write = só função. `teamInvites` read = convidado (por e-mail no token) ou dono; write = função.

---

## 5. Fase 1 — detalhamento

### 5.1 Login

1. Botão **"Entrar com Google"** (Header). `onClick` → `import('../lib/firebase')` (lazy) → `signInWithPopup`.
2. `onAuthStateChanged` no `useAuthStore`:
   - se `users/{uid}` não existe → cria (`plan: 'free'`, `flowCount: 0`).
   - chama `POST /api/claim-plan` com o **ID token** no header `Authorization: Bearer`.
3. `useAuthStore` expõe `{ user, plan, status, signIn, signOut }`.

### 5.2 `/api/claim-plan`

```
1. Verifica ID token (admin.auth().verifyIdToken).
2. email = token.email normalizado; hash = sha256(email).
3. Lê pendingPlans/{hash}.
4. Se existe: users/{uid}.update({ plan: pending.plan, planSource: pending.source,
                                   planUpdatedAt: now }); deleta pendingPlans/{hash}.
5. Também aceita body { key } — chave manual legada: valida contra VALID_LICENSES,
   se ok seta plan 'pro' / planSource 'manual'.
6. Responde { plan }.
```

Idempotente: rodar de novo sem pending não faz nada.

### 5.3 `/api/cartpanda-webhook`

```
1. Valida assinatura/secret (CARTPANDA_WEBHOOK_SECRET) — confirmar mecanismo real da CartPanda.
2. Extrai email + orderId do payload (PRECISA de amostra real do payload).
3. pendingPlans/{sha256(email)}.set({ email, plan: 'pro', source: 'cartpanda',
                                      orderId, createdAt: now }).
4. Responde 200 rápido.
```

> **PENDÊNCIA:** obter um payload real de webhook da CartPanda para parsear `email` e `orderId` e confirmar o esquema de assinatura.

### 5.4 Migração única dos mapas locais

Só relevante para usuários da **versão atual** que já acumularam mapas em `localStorage`. Depois do lançamento deixa de acontecer (free não salva mais local).

Após login bem-sucedido **de um usuário pago**, se `localStorage['vsm_builder_flows']` tem entradas:

1. Modal `MigrationModal`: "Você tem N mapas salvos neste navegador. Trazer para a sua conta?"
   - **Trazer:** para cada mapa local → `flows.add({ ownerUid, name, state, schemaVersion: 1, share: {mode:'private', token:null}, createdAt, updatedAt })` + incrementa `flowCount`.
   - Após sucesso: renomeia a chave para `vsm_builder_flows__migrated_backup` (não apaga).
   - **Agora não:** fecha; não pergunta de novo nesta sessão (flag em `sessionStorage`).
2. Se a conta já tem mapas na nuvem, o texto muda para "mesclar" e nunca sobrescreve.
3. Usuário **free** que loga: não migra (não pode criar `flows`). O modal, se houver mapas locais, vira upsell: "Assine para trazer seus N mapas para a nuvem."

### 5.5 Camada de acesso a mapas — `src/lib/flowsRepo.js`

Fachada única que o resto do app usa. Roteia por tier:

```
canPersist():          boolean                 // true só p/ usuário pago
listFlows():           Promise<FlowMeta[]>     // { id, name, updatedAt }  — [] se não pago
loadFlow(id):          Promise<Flow | null>
saveFlow(id|null, {name, state}): Promise<{id}>  // rejeita se !canPersist()
deleteFlow(id):        Promise<void>
```

- **Free / anônimo:** `canPersist() === false`. `saveFlow` rejeita → a UI abre o upsell. `listFlows` → `[]`. Nenhum acesso ao Firestore, nenhuma gravação em localStorage.
- **Pago:** Firestore. `saveFlow` com `id === null` → `addDoc` (+ incrementa `users/{uid}.flowCount`); com `id` → `updateDoc`.
- **Save debounced:** para o usuário pago, `saveFlow` do editor é debounced 3–5 s após a última edição. Botão "Salvar" força imediato.

`src/utils/storage.js` (localStorage) fica **só** a serviço da migração única (§5.4) — ler os mapas antigos. Não é mais destino de escrita.

### 5.6 Substituição da licença

- `src/utils/license.js` → aposentado. `plan` vem do `useAuthStore` (campo `users/{uid}.plan`).
- `isLicensed()` → `plan === 'pro' || plan === 'team'`.
- `LicenseModal` reaproveitado como **modal de upsell**, disparado quando qualquer usuário não-pago tenta salvar/abrir na nuvem ou compartilhar.
- Entrada de chave manual continua existindo dentro do modal como fallback → chama `/api/claim-plan` com `{ key }`.
- **Free / anônimo:** botão "Salvar" → abre o upsell (não salva nada). Banner fixo "Entre para salvar seu trabalho".

### 5.7 Mudanças de UI

| Componente | Mudança |
|---|---|
| `Header.jsx` | novo `AuthMenu` (botão "Entrar" ↔ avatar + menu "Sair"); "Salvar"/"Abrir" só ativos p/ pago, senão abrem upsell |
| novo `AuthMenu` | popup com foto, nome, plano, "Sair" |
| novo `SavePromptBanner` | banner fixo p/ não-pago: "Entre para salvar seu trabalho" |
| novo `MigrationModal` | §5.4 |
| `LicenseModal` | vira modal de upsell + fallback de chave (§5.6) |
| `App.jsx` | efeito que inicializa `onAuthStateChanged` |

### 5.8 Arquivos novos / alterados (Fase 1)

```
src/lib/firebase.js            init lazy (app, auth, getFirestore c/ persistentLocalCache)
src/lib/flowsRepo.js           fachada (§5.5)
src/store/useAuthStore.js      user, plan, status, signIn, signOut
src/utils/storage.js           mantido só p/ LEITURA na migração única
src/utils/license.js           removido; usos migram p/ useAuthStore
src/components/Auth/SavePromptBanner.jsx  novo
src/components/Layout/Header.jsx        integra AuthMenu + badges
src/components/Auth/AuthMenu.jsx        novo
src/components/Auth/MigrationModal.jsx  novo
src/components/License/LicenseModal.jsx refatorado p/ upsell
api/_firebaseAdmin.js          init compartilhado do firebase-admin
api/claim-plan.js              novo
api/cartpanda-webhook.js       novo
api/validate-license.js        mantido p/ compat (ou absorvido pelo claim-plan)
firestore.rules                novo
firestore.indexes.json         novo
firebase.json                  novo (config de deploy só de firestore)
.env.example                   documenta as chaves
README (seção)                 setup Firebase + deploy de regras
```

### 5.9 Variáveis de ambiente

| Nome | Onde | Segredo? |
|---|---|---|
| `VITE_FIREBASE_API_KEY` etc. (config web) | build (cliente) | não (config web do Firebase é pública) |
| `FIREBASE_SERVICE_ACCOUNT` (JSON base64) | funções Vercel | **sim** |
| `CARTPANDA_WEBHOOK_SECRET` | funções Vercel | **sim** |
| `VALID_LICENSES` (legado) | funções Vercel | sim — mantido p/ fallback |

---

## 6. Fase 2 — compartilhamento (desenho)

- Dono (plano pago) abre "Compartilhar" → escolhe `view` ou `edit` → cliente gera `token` (aleatório 20+ chars), grava em `flows/{id}.share`.
- Link: `https://vsm.betinistudio.com.br/s/{token}`.
- Rota `/s/{token}` no app → chama `GET /api/share/resolve?token=` → função (admin SDK) faz `where('share.token','==',token)`, valida `mode != 'private'`, devolve `{ name, state, mode }`.
- `mode === 'view'`: render read-only (já existe `readOnly` no `VsmLayout`).
- `mode === 'edit'`: edições vão por `POST /api/share/save` (a função valida o token e escreve). Sem custom token, sem acesso direto ao Firestore pelo visitante anônimo.
- Revogar = limpar `share`.
- Índice: `flows` em `share.token`.

## 7. Fase 3 — time (desenho)

- Dono cria time (`teams/{teamId}`, `seats` conforme plano). `users/{uid}.teamId`/`role` setados por `/api/team/*`.
- Convite por e-mail → `teamInvites` → convidado loga → `/api/team/join` valida e adiciona a `memberUids`.
- Mapa do time: `flows.teamId` preenchido; regras liberam `read/update` a membros.
- Billing de assentos: fora do escopo do BD — provavelmente Stripe (skill `payments`) num spec separado.

---

## 8. Testes

Não há suíte hoje. Introduzir **Vitest**.

| Alvo | Tipo |
|---|---|
| `flowsRepo` — roteamento anon vs logado, id null vs existente | unit (mock dos dois backends) |
| lógica de gate de plano (`withinPlanLimit` no cliente) | unit |
| transformação da migração (localStorage → docs) | unit |
| `firestore.rules` — dono, não-dono, escalada de `plan`, `FREE_LIMIT`, share | `@firebase/rules-unit-testing` + emulador |
| `/api/claim-plan`, `/api/cartpanda-webhook` — happy path + idempotência | unit (mock admin) |
| fluxo completo login → salvar → abrir em outro navegador; migração; estourar limite | manual |

---

## 9. Riscos e pendências

| # | Item | Encaminhamento |
|---|---|---|
| 1 | Spark = 20k escritas/dia | folgado — só usuário pago escreve; ainda assim save debounced (3–5 s) + botão explícito |
| 2 | `flowCount` mantido pelo cliente pode driftar | função reconcilia (conta `flows` do uid) no login; regra limita a ±1 por escrita |
| 3 | Payload real do webhook CartPanda desconhecido | **bloqueia 5.3** — obter amostra antes de implementar `cartpanda-webhook` |
| 4 | Esquema de assinatura do webhook CartPanda | idem |
| 5 | Login só Google exclui parte dos usuários | aceito pelo usuário |
| 6 | Usuário pago offline criando mapas avalia `flowCount` possivelmente velho | aceitável; reconcilia ao reconectar |
| 7 | Bundle do SDK Firebase (~120 kB gz) | lazy-load só no "Entrar"; code-split |
| 8 | Deploy das regras do Firestore é passo manual/fora da Vercel | documentar; considerar step no CI |
| 9 | Config web do Firebase no cliente | não é segredo, mas restringir domínio no console (Auth → Authorized domains) + regras firmes |
| 10 | Custo de billing de assentos (fase 3) | spec separado com skill `payments`/Stripe |
| 11 | ~~Semântica do free~~ | **RESOLVIDO:** `sessionStorage` (sobrevive ao refresh, some ao fechar aba). |
| 12 | ~~Export no free~~ | **RESOLVIDO:** export PDF/JSON continua no free. |

---

## 10. Próximo passo

Após revisão deste spec: gerar o **plano de implementação da Fase 1** (skill `writing-plans`).
