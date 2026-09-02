import vsmScreenshot from '../assets/vsm-screenshot.png';
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

const STEPS = [
  {
    n: '01',
    title: 'Monte o fluxo',
    desc: 'Arraste fornecedor, processos, estoques e caixas de informação para montar o mapa do estado atual.',
  },
  {
    n: '02',
    title: 'Calcule os KPIs',
    desc: 'Takt time, lead time, eficiência e balanceamento Yamazumi são calculados automaticamente conforme você preenche os dados.',
  },
  {
    n: '03',
    title: 'Exporte e compartilhe',
    desc: 'Gere o relatório em PDF ou exporte o JSON para continuar depois — sem servidor, sem login.',
  },
];

const EXCEL_CONS = [
  'Setas e caixas desalinham a cada edição',
  'KPIs calculados na mão, fácil de errar',
  'Sem padrão ASME/Shingo — cada engenheiro desenha do seu jeito',
  'Difícil comparar estado atual x futuro',
];

const VSM_PROS = [
  'Layout se ajusta sozinho ao editar',
  'Takt, lead time e eficiência calculados em tempo real',
  'Símbolos ASME e diagrama de Shingo padronizados',
  'Alterna entre Atual e Futuro com um clique',
];

function LandingHeader() {
  return (
    <header className="landing-header">
      <div className="landing-header-inner">
        <span className="landing-brand">
          <img src="/betini-simbolo.svg" alt="" width="20" height="20" />
          VSM Builder
        </span>
        <a className="landing-btn landing-btn-ghost" href="/app">Abrir editor</a>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="landing-hero">
      <div className="landing-hero-text">
        <span className="landing-eyebrow">Mapeamento de Fluxo de Valor</span>
        <h1>Mapeie o fluxo de valor da sua fábrica, direto no navegador</h1>
        <p>
          Editor visual de Value Stream Mapping para engenharia de produção: monte o
          estado atual e futuro, calcule KPIs automaticamente e exporte relatórios —
          sem instalar nada e sem depender de servidor.
        </p>
        <a className="landing-btn landing-btn-primary" href="/app">Começar agora</a>
      </div>
      <div className="landing-hero-mockup">
        <div className="landing-screenshot-frame">
          <span className="landing-tick landing-tick-tl" aria-hidden="true" />
          <span className="landing-tick landing-tick-tr" aria-hidden="true" />
          <span className="landing-tick landing-tick-bl" aria-hidden="true" />
          <span className="landing-tick landing-tick-br" aria-hidden="true" />
          <img
            className="landing-screenshot"
            src={vsmScreenshot}
            alt="Tela do VSM Builder mostrando um mapa de fluxo de valor com fornecedor, PCP/MRP, processos e cliente"
          />
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="landing-steps">
      <div className="landing-steps-inner">
        <h2 className="landing-section-title">Como funciona</h2>
        <div className="landing-steps-grid">
          {STEPS.map((s) => (
            <div className="landing-step" key={s.n}>
              <span className="landing-step-n">{s.n}</span>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
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

function Comparison() {
  return (
    <section className="landing-comparison">
      <h2 className="landing-section-title">Por que não continuar no Excel ou PowerPoint?</h2>
      <div className="landing-comparison-grid">
        <div className="landing-comparison-col landing-comparison-bad">
          <span className="landing-comparison-label">Excel / PowerPoint</span>
          <ul>
            {EXCEL_CONS.map((item) => (
              <li key={item}><span className="landing-mark landing-mark-bad">✕</span>{item}</li>
            ))}
          </ul>
        </div>
        <div className="landing-comparison-col landing-comparison-good">
          <span className="landing-comparison-label">VSM Builder</span>
          <ul>
            {VSM_PROS.map((item) => (
              <li key={item}><span className="landing-mark landing-mark-good">✓</span>{item}</li>
            ))}
          </ul>
        </div>
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
      <span>
        <img src="/betini-simbolo.svg" alt="" width="14" height="14" />
        VSM Builder — um produto
        <a
          className="landing-footer-link"
          href="https://betinistudio.com"
          target="_blank"
          rel="noopener"
        >
          Betini Studio
        </a>
        · {new Date().getFullYear()}
      </span>
    </footer>
  );
}

export default function Landing() {
  return (
    <div className="landing-page">
      <LandingHeader />
      <Hero />
      <HowItWorks />
      <Features />
      <Comparison />
      <CtaBanner />
      <Footer />
    </div>
  );
}
