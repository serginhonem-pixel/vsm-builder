# Deploy Fase 1 — Firebase — CHECKLIST

Estado em 2026-09-02 (código já mergeado em `master`, deploy Vercel roda no push):

| Passo | Status |
|---|---|
| Projeto Firebase criado (Spark) + Firestore | ✅ feito |
| Authentication → Google ativado | ✅ feito |
| Authorized domains (`vsm.betinistudio.com.br`, `localhost`) | ✅ feito |
| Regras do Firestore publicadas (versão atual do repo) | ✅ feito (2026-09-03, `firebase deploy --only firestore:rules`) |
| **Env vars na Vercel** | ✅ feito (2026-09-03) — redeploy disparado via push no commit `3b7cc25` |
| Login com Google (redirect, custom `authDomain`) | ✅ feito (2026-09-03) — ver seção 3.1, testado ponta a ponta |
| Teste E2E | ⚠️ login confirmado; resto do roteiro (salvar/autosave/migração/chave) ainda não passado |
| Webhook CartPanda verificado | ❌ PENDENTE (chave manual funciona nesse meio-tempo) |

---

## 1. Env vars na Vercel  ← faz isso primeiro

Vercel → projeto → Settings → Environment Variables. Adicionar em **Production E Preview**:

**Cliente (públicos — vêm do console: Project Settings → General → Your apps → Web app → `firebaseConfig`):**
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```
Os 6 precisam estar preenchidos — se faltar um, `isFirebaseConfigured()` retorna `false` e toda a UI de auth se esconde.

**Segredos (funções serverless):**
```
FIREBASE_SERVICE_ACCOUNT=   # console → Project Settings → Service accounts → Generate new private key
                            # depois: base64 -w0 serviceAccount.json  (uma linha só)
VALID_LICENSES=             # chaves manuais separadas por vírgula (é como se ativa Pro hoje)
CARTPANDA_WEBHOOK_SECRET=   # só quando for ligar o webhook automático
```

Depois de salvar: **Deployments → ⋯ → Redeploy** (env var novo não entra num build que já rodou).

## 2. Republicar as regras do Firestore

As regras publicadas antes não têm o modelo de tier / `isPaid()` / bloqueio de `pendingPlans` / hardening de `teamId`. Republicar com o `firestore.rules` do repo:

```bash
git pull                       # pega o firestore.rules do merge
npx firebase login
npx firebase deploy --only firestore --project <seu-project-id>
```
Ou: console → Firestore → Rules → colar o conteúdo de `firestore.rules` → Publish.

(Rodar `npm run test:rules` valida as regras localmente — precisa de Java 11+ e roda via emulador.)

## 3.1 Login com Google — setup que precisa ficar registrado

O login usa `signInWithRedirect` com `authDomain` apontando pro domínio
próprio (`vsm.betinistudio.com.br`), não o padrão `*.firebaseapp.com` —
necessário porque redirect com authDomain de outra origem depende de
storage cross-domain que navegadores atuais bloqueiam em silêncio (sem
erro nenhum, o login só "não faz nada"). Pra isso funcionar, **3 peças
precisam estar sincronizadas** — se alguma quebrar no futuro (troca de
domínio, novo projeto Firebase etc.), refazer as 3:

1. **`vercel.json`** — proxy reverso de `/__/auth/**` pro authDomain
   real do projeto (`vsm-builder.firebaseapp.com`), listado *antes* do
   rewrite catch-all do SPA.
2. **`VITE_FIREBASE_AUTH_DOMAIN`** (env var na Vercel) = domínio
   próprio (`vsm.betinistudio.com.br`), não o `*.firebaseapp.com` que
   o Firebase Console sugere por padrão.
3. **Google Cloud Console** → APIs & Services → Credentials → OAuth
   2.0 Client ID (Web client auto-criado pelo Firebase) →
   **Authorized redirect URIs** precisa incluir
   `https://vsm.betinistudio.com.br/__/auth/handler`, e **Authorized
   JavaScript origins** precisa incluir `https://vsm.betinistudio.com.br`.
   (Isso é separado da lista "Authorized domains" do Firebase Auth —
   dá pra ter uma certa e a outra errada.)

Também: `vite.config.js` → `navigateFallbackDenylist` do Service
Worker exclui `/^\/__\//` (além de `/^\/api\//`) — sem isso o SW
intercepta a navegação do handler OAuth e serve o `index.html` em
cache no lugar, e o login "trava"/"pisca" sem erro nenhum em lugar
nenhum (foi a causa mais difícil de achar nessa depuração).

## 3. Teste E2E

1. Abrir o site em produção, **F5** deslogado → estado preservado (sessionStorage). Fechar aba e reabrir → volta ao mapa inicial.
2. "Salvar" deslogado → modal de upsell (não "em breve" — isso só aparece se os env vars faltarem).
3. "Entrar com Google" → login. Sem compra, plano = Grátis; "Salvar" ainda abre upsell.
4. No console do Firebase, setar `users/{seu-uid}.plan = 'pro'` na mão. Recarregar.
5. Se tiver mapas em `localStorage['vsm-flows']` → `MigrationModal` aparece → "Trazer" → conferir no console que os docs `flows/*` surgiram.
6. "Salvar" → cria `flows/*`; editar → autosave após ~4s (`updatedAt` muda).
7. Abrir em outro navegador logado na mesma conta → "Abrir fluxo salvo" lista o mapa → carrega igual (e mantém o nome).
8. Testar a **chave manual**: pôr uma chave em `VALID_LICENSES`, logar, abrir o modal (via "Salvar"), colar a chave → deve virar Pro.

## 4. Webhook CartPanda (pode ficar pra depois)

`api/cartpanda-webhook.js` ainda **não é production-verified**:
- `export const config` foi removido; `readRaw` é defensivo mas o esquema de assinatura (`x-cartpanda-signature`?) e o mapeamento de campos (`email`, `orderId`, nome do evento "pago") precisam de um **payload real** da CartPanda.
- Ver o comentário `// AJUSTAR com payload real` no arquivo.
- Passos: fazer uma compra de teste (ou pegar exemplo de payload no painel CartPanda), logar `console.log(JSON.stringify(payload))` num deploy de preview, disparar, ler em `vercel logs`, ajustar os seletores + o header/algoritmo da assinatura, ligar `CARTPANDA_WEBHOOK_SECRET`.
- Até isso, ativação de Pro é 100% pela chave manual.

---

## Pendências menores registradas (revisão final — não bloqueiam)

- `initAuth`: `getDoc`/`setDoc` sem try/catch → se o Firestore rejeitar totalmente offline, `status` fica preso em `'loading'` (impacto de UI baixo).
- `deleteFlow` existe no `flowsRepo` mas nenhuma UI chama → mapas na nuvem não têm botão de apagar; `flowCount` só cresce.
- `flowCount` não tem reconciliação no login (spec §9) — inerte na Fase 1 (nada lê `flowCount` ainda).
- `firebase-tools` como devDep incha o `package-lock.json` ~9k linhas (podia ser `npx`).
