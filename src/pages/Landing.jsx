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
        <div className="landing-screenshot-frame">
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
