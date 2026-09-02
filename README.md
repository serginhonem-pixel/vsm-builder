# VSM Builder

## Backend Firebase (Fase 1)

### Setup manual no Firebase Console

1. Criar projeto (plano Spark grátis).
2. Authentication → Sign-in method → Google → ativar.
3. Authentication → Settings → Authorized domains → adicionar `vsm.betinistudio.com.br` e `localhost`.
4. Firestore Database → criar (modo produção, região `southamerica-east1`).
5. Project Settings → General → Your apps → Web app → copiar o `firebaseConfig` → preencher as `VITE_FIREBASE_*` (ver `.env.example`).
6. Project Settings → Service accounts → Generate new private key → `base64 -w0` do JSON → `FIREBASE_SERVICE_ACCOUNT`.

### Env vars na Vercel

Adicionar todas as chaves do `.env.example` em Production **e** Preview.

### Publicar as regras do Firestore

```bash
npx firebase deploy --only firestore --project <project-id>
```

(requer estar logado: `npx firebase login`)

### Testes

- `npm test` — suíte principal (unit, mocks).
- `npm run test:rules` — regras de segurança; **requer Java 11+** e roda via `npx firebase emulators:exec --only firestore "npm run test:rules"`.

### Pendência conhecida

O `/api/cartpanda-webhook` precisa de um payload real da CartPanda pra confirmar o mapeamento de `email`/`orderId` e o esquema de assinatura (ver `api/cartpanda-webhook.js`, comentário "AJUSTAR com payload real").
