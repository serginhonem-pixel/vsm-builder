# Landing Page — VSM Builder

**Data:** 2026-08-06
**Status:** Aprovado

## Objetivo

Criar uma landing page de venda direta para o VSM Builder: apresenta o produto e leva o visitante a abrir o editor (`/app`). Sem captação de leads, sem pricing, sem backend.

## Arquitetura

- Novo componente `src/pages/Landing.jsx` + `src/pages/Landing.css`, seguindo o padrão do projeto (CSS puro, sem libs de UI).
- Roteamento leve caseiro (sem `react-router-dom`, mantendo o projeto "zero libs" de UI/roteamento):
  - `src/App.jsx` passa a checar `window.location.pathname`.
  - `/` → renderiza `Landing`.
  - `/app` (e qualquer outro path) → renderiza o editor atual (o que hoje é a raiz de `App.jsx`).
  - Navegação entre as duas telas via `<a href="/app">`/`<a href="/">` normais (recarrega a página — aceitável para um MVP estático, sem necessidade de estado compartilhado entre landing e editor).
- Página é 100% estática: sem Zustand, sem `useVsmStore`, sem I/O.

## Conteúdo / Seções

1. **Header**
   - Nome "VSM Builder" à esquerda.
   - Botão CTA "Abrir editor" à direita, linkando para `/app`.

2. **Hero**
   - Título de impacto: proposta de valor central (mapear fluxo de valor direto no navegador).
   - Subtítulo curto explicando o produto (editor visual de VSM industrial, sem instalação, sem backend).
   - Botão CTA primário grande → `/app`.
   - Mockup visual ao lado/abaixo: mini-diagrama VSM construído em CSS/SVG (Fornecedor → Processo → Cliente), reaproveitando visualmente a linguagem do editor real (caixa de processo, seta eletrônica com kink central conforme fórmula aprovada em `geometry.js`, símbolo de estoque triangular invertido). É um elemento estático e simplificado — não reutiliza os componentes reais do canvas (que dependem do store), apenas a linguagem visual.

3. **Features** — grid de 4 cards, sem ícones externos (podem usar símbolos/SVGs inline simples):
   - Editor visual drag-and-drop
   - Símbolos padrão ASME / diagrama de Shingo
   - KPIs e gráfico Yamazumi
   - Exportação em PDF/JSON, sem necessidade de backend

4. **CTA final** — faixa de destaque repetindo o botão "Abrir editor".

5. **Footer** — nome do produto + ano, minimalista.

## Estilo Visual

Industrial/técnico sério:
- Paleta sóbria: base grafite/cinza-escuro, um acento azul-aço ou laranja industrial.
- Tipografia: system font stack com pesos fortes nos títulos (mesma linha do resto do app).
- Grid alinhado, cantos retos ou levemente arredondados.
- Sem gradientes coloridos, sem ilustrações "soft SaaS".
- Responsivo (mobile-first básico: hero empilha verticalmente, grid de features vira coluna única).

## Fora de escopo

- Sem formulário de captação/waitlist.
- Sem seção de pricing.
- Sem FAQ.
- Sem screenshots reais do app (mockup CSS/SVG no lugar; pode ser substituído por imagem real depois).
- Sem `react-router-dom` ou qualquer lib nova.
