# Landing Page — VSM Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static, industrial-styled landing page at `/` that sells the VSM Builder editor and links to it at `/app`, without touching the existing editor's behavior.

**Architecture:** A new `src/pages/Landing.jsx` (+ `Landing.css`) composed of Header/Hero/Features/CTA/Footer sections, plus a standalone `src/pages/VsmMockup.jsx` SVG illustration. `src/App.jsx` is split into a lightweight path-based router: the existing editor body is renamed to `EditorApp`, and a new top-level `App` component picks `Landing` or `EditorApp` based on `window.location.pathname`. No new dependencies.

**Tech Stack:** React 18, plain CSS (existing `App.css` custom properties reused), no router library, no test framework (see Global Constraints).

## Global Constraints

- No new npm dependencies (spec: "Sem `react-router-dom` ou qualquer lib nova").
- Zero UI libraries / pure CSS, consistent with the rest of the project.
- Landing page is 100% static: no Zustand, no `useVsmStore`, no I/O.
- `/` → Landing; `/app` (and any other path) → the existing editor.
- This project has no automated test framework configured (no vitest/jest in `package.json`). Verification for every task in this plan is: (1) `npm run build` must succeed (catches syntax/import errors), and (2) manual visual check via `npm run dev` at the URLs under test. This mirrors how UI work is already verified elsewhere in this codebase.
- Out of scope (per spec): no lead-capture form, no pricing section, no FAQ, no real screenshots.

---

### Task 1: Routing split — `/` vs `/app`

**Files:**
- Modify: `src/App.jsx` (full file)
- Create: `src/pages/Landing.jsx` (placeholder body, expanded in Task 4)

**Interfaces:**
- Produces: `Landing` default export from `src/pages/Landing.jsx`, a zero-prop component — consumed by `src/App.jsx`.
- Produces: `EditorApp`, a zero-prop component inside `src/App.jsx` containing exactly the JSX/logic that `App` used to return — no later task depends on its internals, only on it still rendering the editor at `/app`.

- [ ] **Step 1: Create the Landing placeholder**

```jsx
// src/pages/Landing.jsx
export default function Landing() {
  return (
    <div className="landing-page">
      <p>Landing page placeholder</p>
    </div>
  );
}
```

- [ ] **Step 2: Rewrite `src/App.jsx` to route between Landing and the editor**

Replace the full contents of `src/App.jsx` with:

```jsx
import { useState } from 'react';
import Header from './components/Layout/Header.jsx';
import Sidebar from './components/Layout/Sidebar.jsx';
import VsmLayout from './components/VsmLayout/VsmLayout.jsx';
import PropertiesPanel from './components/PropertiesPanel/PropertiesPanel.jsx';
import ShingoDiagram from './components/ShingoDiagram/ShingoDiagram.jsx';
import GuidedTour from './components/GuidedTour/GuidedTour.jsx';
import { useVsmStore } from './store/useVsmStore.js';
import Landing from './pages/Landing.jsx';

function EditorApp() {
  const [view, setView]         = useState('vsm');
  const [drawerOpen, setDrawer] = useState(false);
  const [tourRunning, setTour]  = useState(false);
  const selectedId  = useVsmStore((s) => s.selectedId);
  const setSelected = useVsmStore((s) => s.setSelected);

  return (
    <div className="app-shell">
      <Header
        onOpenShingo={() => setView('shingo')}
        onBackToVsm={() => setView('vsm')}
        activeView={view}
        drawerOpen={drawerOpen}
        onToggleDrawer={() => setDrawer((v) => !v)}
        onStartTour={() => { setDrawer(false); setView('vsm'); setTour(true); }}
      />

      {tourRunning && (
        <GuidedTour
          onClose={() => setTour(false)}
          onOpenDrawer={() => setDrawer(true)}
          onCloseDrawer={() => setDrawer(false)}
          onSelectFirstProcess={() => {
            const procs = useVsmStore.getState().processes;
            if (procs[0]) useVsmStore.getState().setSelected('proc-' + procs[0].id);
          }}
          onDeselectProcess={() => useVsmStore.getState().setSelected(null)}
        />
      )}

      {view === 'vsm' ? (
        <div className="app-body">
          <VsmLayout />

          {/* Sidebar drawer */}
          {drawerOpen && (
            <div className="drawer-backdrop" onClick={() => setDrawer(false)} />
          )}
          <div className={`sidebar-drawer${drawerOpen ? ' drawer-open' : ''}`}>
            <div className="drawer-header">
              <span className="drawer-title">Menu</span>
              <button className="drawer-close" onClick={() => setDrawer(false)}>✕</button>
            </div>
            <Sidebar />
          </div>

          {/* Properties float */}
          {selectedId && (
            <div data-tour="props-float" className="props-float">
              <PropertiesPanel onClose={() => setSelected(null)} />
            </div>
          )}
        </div>
      ) : (
        <ShingoDiagram onBack={() => setView('vsm')} />
      )}
    </div>
  );
}

export default function App() {
  const isLanding = window.location.pathname === '/' || window.location.pathname === '';
  return isLanding ? <Landing /> : <EditorApp />;
}
```

- [ ] **Step 3: Verify build succeeds**

Run: `npm run build`
Expected: build completes with no errors (no leftover references to the old `App` body, imports resolve).

- [ ] **Step 4: Verify routing manually**

Run: `npm run dev`, then in a browser:
- Visit `http://localhost:5173/` → should show "Landing page placeholder".
- Visit `http://localhost:5173/app` → should show the existing VSM editor (header, canvas, sidebar toggle all present as before).

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx src/pages/Landing.jsx
git commit -m "feat: split App into path-based router for landing vs editor"
```

---

### Task 2: VSM mockup illustration (SVG)

**Files:**
- Create: `src/pages/VsmMockup.jsx`

**Interfaces:**
- Produces: `VsmMockup`, a zero-prop default-exported component rendering a self-contained `<svg>` — consumed by `Landing.jsx` in Task 4 as `<VsmMockup />` inside the hero section.

- [ ] **Step 1: Create the mockup component**

This draws a simplified Fornecedor → Processo → Cliente flow using the project's approved "electronic flow arrow" kink formula (see `docs` memory: `K=8`, kink at 52%/44% of the segment, offset along the perpendicular). Coordinates are pre-computed for two fixed horizontal segments, so the formula doesn't need to run at render time.

```jsx
// src/pages/VsmMockup.jsx

// Kink points below are pre-computed with the project's approved formula:
// dx = x2-x1, dy = y2-y1, len = hypot(dx,dy), n = perpendicular unit vector, K = 8
// k1 = (x1 + dx*0.52 + nx*K, y1 + dy*0.52 + ny*K)
// k2 = (x1 + dx*0.44 - nx*K, y1 + dy*0.44 - ny*K)
// polyline: start -> k1 -> k2 -> end
export default function VsmMockup() {
  return (
    <svg
      className="vsm-mockup-svg"
      viewBox="0 0 640 220"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Diagrama simplificado de mapeamento de fluxo de valor"
    >
      <defs>
        <marker id="mockup-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 Z" fill="var(--gray-600)" />
        </marker>
      </defs>

      {/* Fornecedor */}
      <rect x="20" y="70" width="140" height="80" rx="4" className="mockup-box" />
      <text x="90" y="105" textAnchor="middle" className="mockup-box-title">Fornecedor</text>
      <text x="90" y="126" textAnchor="middle" className="mockup-box-sub">Matéria-prima</text>

      {/* Processo */}
      <rect x="250" y="60" width="140" height="100" rx="4" className="mockup-box mockup-box-process" />
      <text x="320" y="100" textAnchor="middle" className="mockup-box-title">Processo</text>
      <text x="320" y="121" textAnchor="middle" className="mockup-box-sub">T/C 45s</text>
      <text x="320" y="138" textAnchor="middle" className="mockup-box-sub">T/R 10min</text>

      {/* Cliente */}
      <rect x="480" y="70" width="140" height="80" rx="4" className="mockup-box" />
      <text x="550" y="105" textAnchor="middle" className="mockup-box-title">Cliente</text>
      <text x="550" y="126" textAnchor="middle" className="mockup-box-sub">Produto acabado</text>

      {/* Seta eletrônica: Fornecedor -> Processo */}
      <polyline points="160,110 206.8,118 199.6,102 250,110" className="mockup-arrow" markerEnd="url(#mockup-arrow)" />

      {/* Seta eletrônica: Processo -> Cliente */}
      <polyline points="390,110 436.8,118 429.6,102 480,110" className="mockup-arrow" markerEnd="url(#mockup-arrow)" />

      {/* Estoque (WIP) sob cada seta */}
      <polygon points="195,150 215,150 205,168" className="mockup-stock" />
      <text x="205" y="182" textAnchor="middle" className="mockup-stock-label">WIP</text>

      <polygon points="425,150 445,150 435,168" className="mockup-stock" />
      <text x="435" y="182" textAnchor="middle" className="mockup-stock-label">WIP</text>
    </svg>
  );
}
```

- [ ] **Step 2: Verify build succeeds**

Run: `npm run build`
Expected: no errors (component isn't imported anywhere yet, so this only checks it's syntactically valid — Vite will tree-shake it, that's fine).

- [ ] **Step 3: Commit**

```bash
git add src/pages/VsmMockup.jsx
git commit -m "feat: add static SVG VSM mockup for landing hero"
```

---

### Task 3: Landing styles (`Landing.css`)

**Files:**
- Create: `src/pages/Landing.css`

**Interfaces:**
- Produces: class names consumed by `Landing.jsx` (Task 4) and `VsmMockup.jsx` (Task 2): `.landing-page`, `.landing-header`, `.landing-header-inner`, `.landing-brand`, `.landing-btn`, `.landing-btn-primary`, `.landing-btn-ghost`, `.landing-hero`, `.landing-hero-text`, `.landing-hero-mockup`, `.landing-features`, `.landing-features-grid`, `.landing-feature-card`, `.landing-cta`, `.landing-footer`, `.vsm-mockup-svg`, `.mockup-box`, `.mockup-box-process`, `.mockup-box-title`, `.mockup-box-sub`, `.mockup-arrow`, `.mockup-stock`, `.mockup-stock-label`.
- Consumes: global CSS custom properties already defined in `src/App.css` (`--black`, `--white`, `--gray-100`, `--gray-200`, `--gray-300`, `--gray-600`, `--orange`), loaded globally via `src/main.jsx`.

- [ ] **Step 1: Write the stylesheet**

```css
/* src/pages/Landing.css */

.landing-page {
  --landing-dark: #1c2126;
  --landing-dark-2: #262c33;
  --landing-accent: var(--orange);

  min-height: 100vh;
  background: var(--white);
  color: var(--black);
}

/* Header */
.landing-header {
  border-bottom: 1px solid var(--gray-200);
  background: var(--white);
}

.landing-header-inner {
  max-width: 1080px;
  margin: 0 auto;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.landing-brand {
  font-weight: 700;
  font-size: 17px;
  letter-spacing: 0.01em;
}

.landing-btn {
  display: inline-block;
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: 600;
  font-size: 14px;
  text-decoration: none;
  border: 1px solid transparent;
  cursor: pointer;
}

.landing-btn-primary {
  background: var(--landing-accent);
  color: var(--white);
}
.landing-btn-primary:hover { opacity: 0.92; }

.landing-btn-ghost {
  background: transparent;
  border-color: var(--gray-300);
  color: var(--black);
}
.landing-btn-ghost:hover { background: var(--gray-100); }

/* Hero */
.landing-hero {
  background: var(--landing-dark);
  color: var(--white);
  padding: 64px 24px;
}

.landing-hero > .landing-hero-text,
.landing-hero > .landing-hero-mockup {
  max-width: 1080px;
  margin: 0 auto;
}

.landing-hero {
  display: flex;
  flex-direction: column;
  gap: 40px;
  align-items: center;
}

.landing-hero-text {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
}

.landing-hero-text h1 {
  font-size: 34px;
  line-height: 1.25;
  margin: 0;
  max-width: 720px;
}

.landing-hero-text p {
  font-size: 16px;
  line-height: 1.6;
  color: var(--gray-300);
  margin: 0;
  max-width: 560px;
}

.landing-hero-mockup {
  width: 100%;
}

.vsm-mockup-svg {
  width: 100%;
  height: auto;
  max-width: 720px;
  display: block;
  margin: 0 auto;
  background: var(--landing-dark-2);
  border: 1px solid #3a4149;
  border-radius: 8px;
}

.mockup-box {
  fill: var(--white);
  stroke: var(--black);
  stroke-width: 2;
}
.mockup-box-process {
  fill: #fff7ed;
  stroke: var(--landing-accent);
}
.mockup-box-title {
  font-size: 15px;
  font-weight: 700;
  fill: var(--black);
}
.mockup-box-sub {
  font-size: 11px;
  fill: var(--gray-600);
}
.mockup-arrow {
  fill: none;
  stroke: var(--gray-300);
  stroke-width: 2;
}
.mockup-stock {
  fill: none;
  stroke: var(--gray-300);
  stroke-width: 2;
}
.mockup-stock-label {
  font-size: 10px;
  fill: var(--gray-300);
}

/* Features */
.landing-features {
  padding: 56px 24px;
  background: var(--gray-100);
}

.landing-features-grid {
  max-width: 1080px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

.landing-feature-card {
  background: var(--white);
  border: 1px solid var(--gray-200);
  border-radius: 8px;
  padding: 20px;
}

.landing-feature-card h3 {
  font-size: 15px;
  margin: 0 0 8px;
}

.landing-feature-card p {
  font-size: 13px;
  line-height: 1.55;
  color: var(--gray-600);
  margin: 0;
}

/* CTA banner */
.landing-cta {
  background: var(--landing-dark);
  color: var(--white);
  padding: 48px 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.landing-cta h2 {
  margin: 0;
  font-size: 24px;
}

/* Footer */
.landing-footer {
  padding: 20px 24px;
  text-align: center;
  font-size: 12px;
  color: var(--gray-600);
  border-top: 1px solid var(--gray-200);
}

/* Responsive */
@media (max-width: 720px) {
  .landing-hero-text h1 { font-size: 26px; }
  .landing-features-grid { grid-template-columns: 1fr; }
}

@media (min-width: 900px) {
  .landing-hero {
    flex-direction: row;
    align-items: center;
    text-align: left;
  }
  .landing-hero-text {
    text-align: left;
    align-items: flex-start;
    flex: 1;
  }
  .landing-hero-mockup {
    flex: 1;
  }
}
```

- [ ] **Step 2: Verify build succeeds**

Run: `npm run build`
Expected: no errors (CSS isn't imported by any component yet — this only checks the file itself is valid CSS that Vite can process once referenced; confirm no typos by eyeballing the diff).

- [ ] **Step 3: Commit**

```bash
git add src/pages/Landing.css
git commit -m "feat: add landing page stylesheet"
```

---

### Task 4: Wire up the full Landing page

**Files:**
- Modify: `src/pages/Landing.jsx` (replace placeholder from Task 1 with full content)

**Interfaces:**
- Consumes: `VsmMockup` default export from `./VsmMockup.jsx` (Task 2), class names from `./Landing.css` (Task 3).
- Produces: same `Landing` default export signature as Task 1 (zero props) — no change needed in `App.jsx`.

- [ ] **Step 1: Replace `src/pages/Landing.jsx` with the full page**

```jsx
// src/pages/Landing.jsx
import VsmMockup from './VsmMockup.jsx';
import './Landing.css';

const FEATURES = [
  {
    title: 'Editor visual drag-and-drop',
    desc: 'Monte o mapa arrastando processos, estoques e caixas de informação direto na tela, sem escrever código.',
  },
  {
    title: 'Símbolos ASME e Shingo',
    desc: 'Ícones padronizados de operação, inspeção, transporte, espera e estoque — mais o diagrama de Shingo completo.',
  },
  {
    title: 'KPIs e Yamazumi',
    desc: 'Takt time, lead time e eficiência calculados automaticamente, com gráfico de balanceamento Yamazumi.',
  },
  {
    title: 'Exportação PDF/JSON, sem backend',
    desc: 'Gere relatórios em PDF ou exporte o fluxo em JSON — tudo roda no seu navegador, sem depender de servidor.',
  },
];

function LandingHeader() {
  return (
    <header className="landing-header">
      <div className="landing-header-inner">
        <span className="landing-brand">VSM Builder</span>
        <a className="landing-btn landing-btn-ghost" href="/app">Abrir editor</a>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="landing-hero">
      <div className="landing-hero-text">
        <h1>Mapeie o fluxo de valor da sua fábrica, direto no navegador</h1>
        <p>
          Editor visual de Value Stream Mapping para engenharia de produção: monte o
          estado atual e futuro, calcule KPIs automaticamente e exporte relatórios —
          sem instalar nada e sem depender de servidor.
        </p>
        <a className="landing-btn landing-btn-primary" href="/app">Começar agora</a>
      </div>
      <div className="landing-hero-mockup">
        <VsmMockup />
      </div>
    </section>
  );
}

function Features() {
  return (
    <section className="landing-features">
      <div className="landing-features-grid">
        {FEATURES.map((f) => (
          <div className="landing-feature-card" key={f.title}>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function CtaBanner() {
  return (
    <section className="landing-cta">
      <h2>Pronto para mapear o seu fluxo?</h2>
      <a className="landing-btn landing-btn-primary" href="/app">Abrir editor</a>
    </section>
  );
}

function Footer() {
  return (
    <footer className="landing-footer">
      <span>VSM Builder — {new Date().getFullYear()}</span>
    </footer>
  );
}

export default function Landing() {
  return (
    <div className="landing-page">
      <LandingHeader />
      <Hero />
      <Features />
      <CtaBanner />
      <Footer />
    </div>
  );
}
```

- [ ] **Step 2: Verify build succeeds**

Run: `npm run build`
Expected: build completes with no errors.

- [ ] **Step 3: Verify manually in the browser**

Run: `npm run dev`, then visit `http://localhost:5173/`:
- Header shows "VSM Builder" and an "Abrir editor" button.
- Hero shows title, paragraph, "Começar agora" button, and the SVG mockup (Fornecedor / Processo / Cliente boxes connected by kinked arrows, with small WIP triangles below each arrow).
- Both "Abrir editor" and "Começar agora" links navigate to `/app` and correctly show the editor.
- Features section shows all 4 cards.
- CTA banner and footer render at the bottom.
- Resize the window below ~720px width: hero stacks vertically, features grid becomes a single column, no horizontal scrollbar appears.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Landing.jsx
git commit -m "feat: build full landing page (hero, features, CTA, footer)"
```

---

## Self-Review Notes

- **Spec coverage:** Header+CTA (Task 4), Hero+mockup (Tasks 2 & 4), Features 4-card grid (Task 4), CTA final (Task 4), Footer (Task 4), routing `/` vs `/app` (Task 1), industrial visual style + responsive (Task 3), no new deps (verified: no `package.json` changes in any task) — all spec sections have a task.
- **Placeholder scan:** no TBD/TODO; the only "placeholder" is the intentional, temporary one in Task 1 Step 1, which Task 4 explicitly replaces.
- **Type/name consistency:** `Landing` default export used identically in `App.jsx` (Task 1) and unchanged through Task 4; `VsmMockup` default export name matches its usage in `Landing.jsx`; all CSS class names used in `Landing.jsx`/`VsmMockup.jsx` are defined in `Landing.css`.
