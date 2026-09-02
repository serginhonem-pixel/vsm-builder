import { Joyride, ACTIONS, EVENTS, STATUS } from 'react-joyride';
import { useState, useCallback } from 'react';

// ─────────────────────────────────────────────
// Passos do tour (índice → descrição)
//  0  welcome
//  1  file-actions
//  2  state-toggle
//  3  kpi-chips
//  4  menu-toggle
//  5  sidebar-producao   ← abre drawer
//  6  sidebar-turnos
//  7  sidebar-processos
//  8  supplier           ← fecha drawer
//  9  pcp
// 10  customer
// 11  proc-first
// 12  props-oee          ← abre painel de props
// 13  props-prog
// 14  wip-first          ← fecha painel de props
// 15  timeline
// 16  btn-shingo
// 17  btn-yamazumi
// 18  done
// ─────────────────────────────────────────────
const SIDEBAR_OPEN_AT  = 5;
const SIDEBAR_CLOSE_AT = 8;
const PROPS_OPEN_AT    = 12;
const PROPS_CLOSE_AT   = 14;

const STEPS = [
  {
    target: 'body',
    placement: 'center',
    title: 'Bem-vindo ao VSM Builder',
    content:
      'Este tour vai mostrar as principais funcionalidades para mapear e analisar o seu fluxo de valor. Clique em Próximo → para começar.',
  },
  {
    target: '[data-tour="file-actions"]',
    placement: 'bottom-start',
    title: 'Ações do fluxo',
    content:
      'Clique em "Novo fluxo" pra começar do zero, dê um nome no campo ao lado, salve pra continuar depois e gere um relatório completo em PDF com o VSM e os KPIs.',
  },
  {
    target: '[data-tour="state-toggle"]',
    placement: 'bottom',
    title: 'Estado Atual / Futuro',
    content:
      'Alterne entre o estado atual e o estado futuro. O futuro é uma cópia independente onde você planeja melhorias e adiciona Kaizen Bursts.',
  },
  {
    target: '[data-tour="kpi-chips"]',
    placement: 'bottom',
    title: 'Indicadores em tempo real',
    content:
      'Takt Time, Pitch, Lead Time total, Tempo de Processo e Eficiência do Fluxo recalculados automaticamente a cada edição no mapa.',
  },
  {
    target: '[data-tour="menu-toggle"]',
    placement: 'bottom-start',
    title: 'Menu lateral',
    content:
      'O menu lateral dá acesso às configurações de produção, turnos de trabalho, paleta de ícones VSM e gerenciamento de processos.',
  },
  {
    target: '[data-tour="sidebar-producao"]',
    placement: 'right',
    title: 'Configurações de produção',
    content:
      'Defina a demanda do cliente (peças/dia) e o lote de saída (pack-out). O Takt Time e o Pitch são calculados a partir desses valores.',
  },
  {
    target: '[data-tour="sidebar-turnos"]',
    placement: 'right',
    title: 'Turnos de trabalho',
    content:
      'Configure até 3 turnos. O tempo disponível total é somado automaticamente e usado como base para o cálculo do Takt Time.',
  },
  {
    target: '[data-tour="sidebar-processos"]',
    placement: 'right',
    title: 'Lista de processos',
    content:
      'Visualize e selecione processos. Arraste ⠿ para reordenar a sequência no mapa. Use "+ Adicionar processo" para inserir novos.',
  },
  {
    target: '[data-tour="supplier"]',
    placement: 'right',
    title: 'Fornecedor',
    content:
      'Clique para editar nome, produto, frequência de entrega e tipo de pedido. A seta de material liga o fornecedor ao primeiro estoque.',
  },
  {
    target: '[data-tour="pcp"]',
    placement: 'bottom',
    title: 'PCP / MRP',
    content:
      'Central de planejamento de produção. Os arcos eletrônicos mostram o fluxo de informação entre PCP, fornecedor e cliente.',
  },
  {
    target: '[data-tour="customer"]',
    placement: 'left',
    title: 'Cliente',
    content:
      'Exibe demanda, frequência de pedidos e prazo de entrega. Clique para editar. O card mostra os dados de consumo diário.',
  },
  {
    target: '[data-tour="proc-first"]',
    placement: 'bottom',
    title: 'Cartão de processo',
    content:
      'Exibe TC, OEE, operadores e turnos. Gargalos são marcados com ⚠ GARGALO e o Pacemaker com ⬡. Clique em Próximo para ver as configurações.',
  },
  // ── Passos com o painel de propriedades aberto ──
  {
    target: '[data-tour="props-oee"]',
    placement: 'left',
    title: 'OEE — Eficiência Global do Equipamento',
    content:
      'OEE = Disponibilidade × Desempenho × Qualidade. Abaixo de 65%: processo em crise. Entre 65–85%: margem típica de melhoria. Acima de 85%: classe mundial. O TC efetivo no card já desconta o OEE automaticamente.',
  },
  {
    target: '[data-tour="props-prog"]',
    placement: 'left',
    title: 'Como o processo é programado',
    content:
      'MRP/ERP = produção empurrada (push) por previsão. Kanban/FIFO = puxada (pull) pelo consumo real. Heijunka = nivelamento de mix. Esta escolha define o tipo de seta de informação desenhada no mapa.',
  },
  // ── Volta ao canvas ──
  {
    target: '[data-tour="wip-first"]',
    placement: 'bottom',
    title: 'Estoque entre processos (WIP)',
    content:
      'Registre a quantidade em estoque. O tipo pode ser Push ▷, Supermercado ▦, FIFO ou Kanban — configure no painel de propriedades.',
  },
  {
    target: '[data-tour="timeline"]',
    placement: 'top',
    title: 'Linha do tempo — Lead Time',
    content:
      'Barras altas = espera (estoque), barras baixas = valor agregado. O resumo LT / VA à direita mostra os totais usados para calcular a eficiência do fluxo.',
  },
  {
    target: '[data-tour="btn-shingo"]',
    placement: 'bottom',
    title: 'Diagrama de Fluxo de Processo (Shingo)',
    content:
      'Gera o diagrama analítico de processo estilo Shingo com operações, tempos, distâncias e marcador VA / NVA para cada etapa.',
  },
  {
    target: '[data-tour="btn-yamazumi"]',
    placement: 'bottom',
    title: 'Yamazumi — Balanceamento de carga',
    content:
      'Gráfico de barras comparando o TC efetivo de cada processo com o Takt Time. Identifica desequilíbrios de carga entre operadores.',
  },
  {
    target: 'body',
    placement: 'center',
    title: 'Pronto para mapear!',
    content:
      'Você conhece agora as principais funcionalidades do VSM Builder. Clique em qualquer elemento do mapa para abrir o painel de propriedades e começar a editar.',
  },
];

// Opções visuais (v3: prop 'options', separada dos 'styles')
const TOUR_OPTIONS = {
  primaryColor: '#ec3013',
  backgroundColor: '#ffffff',
  overlayColor: 'rgba(0,0,0,0.54)',
  textColor: '#111111',
  arrowColor: '#ffffff',
  zIndex: 10000,
  showProgress: true,
  skipBeacon: true,
  skipScroll: true,
  overlayClickAction: '',
  dismissKeyAction: '',
  buttons: ['back', 'close', 'primary', 'skip'],
  width: 360,
  spotlightRadius: 10,
  spotlightPadding: 8,
};

// Estilos dos elementos do tooltip (v3: buttonPrimary, não buttonNext)
const TOUR_STYLES = {
  tooltip: {
    borderRadius: 14,
    boxShadow: '0 8px 40px rgba(0,0,0,0.22)',
    padding: '20px 22px 16px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  tooltipTitle: {
    fontSize: 15,
    fontWeight: 800,
    marginBottom: 8,
    color: '#111',
  },
  tooltipContent: {
    fontSize: 13,
    lineHeight: 1.65,
    color: '#374151',
    padding: 0,
  },
  tooltipFooter: {
    marginTop: 16,
  },
  buttonPrimary: {
    backgroundColor: '#ec3013',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    padding: '7px 18px',
    color: '#fff',
  },
  buttonBack: {
    color: '#5a5f66',
    fontSize: 13,
    fontWeight: 500,
    marginRight: 6,
  },
  buttonSkip: {
    color: '#9ca3af',
    fontSize: 12,
  },
  buttonClose: {
    color: '#9ca3af',
    width: 14,
    height: 14,
    top: 12,
    right: 12,
  },
};

export default function GuidedTour({
  onClose,
  onOpenDrawer,
  onCloseDrawer,
  onSelectFirstProcess,
  onDeselectProcess,
}) {
  const [stepIndex, setStepIndex] = useState(0);

  const handleEvent = useCallback((data) => {
    const { action, index, type, status } = data;

    if (
      type === EVENTS.TOUR_END ||
      status === STATUS.FINISHED ||
      status === STATUS.SKIPPED
    ) {
      onCloseDrawer();
      onDeselectProcess();
      onClose();
      return;
    }

    if (type === EVENTS.STEP_AFTER) {
      if (action === ACTIONS.CLOSE || action === ACTIONS.SKIP) {
        onCloseDrawer();
        onDeselectProcess();
        onClose();
        return;
      }

      const next = index + (action === ACTIONS.PREV ? -1 : 1);

      const enteringSidebar = next >= SIDEBAR_OPEN_AT && next < SIDEBAR_CLOSE_AT;
      const leavingSidebar  = index >= SIDEBAR_OPEN_AT && index < SIDEBAR_CLOSE_AT && !enteringSidebar;
      const enteringProps   = next >= PROPS_OPEN_AT   && next < PROPS_CLOSE_AT;
      const leavingProps    = index >= PROPS_OPEN_AT  && index < PROPS_CLOSE_AT  && !enteringProps;
      const wasOutsideSidebar = index < SIDEBAR_OPEN_AT || index >= SIDEBAR_CLOSE_AT;
      const wasOutsideProps   = index < PROPS_OPEN_AT  || index >= PROPS_CLOSE_AT;

      if (enteringSidebar && wasOutsideSidebar) {
        onOpenDrawer();
        setTimeout(() => setStepIndex(next), 280);
      } else if (leavingSidebar) {
        onCloseDrawer();
        setTimeout(() => setStepIndex(next), 220);
      } else if (enteringProps && wasOutsideProps) {
        onSelectFirstProcess();
        setTimeout(() => setStepIndex(next), 300);
      } else if (leavingProps) {
        onDeselectProcess();
        setTimeout(() => setStepIndex(next), 150);
      } else {
        setStepIndex(next);
      }
    }

    if (type === EVENTS.TARGET_NOT_FOUND) {
      setStepIndex((prev) => {
        const next = prev + 1;
        return next < STEPS.length ? next : prev;
      });
    }
  }, [onOpenDrawer, onCloseDrawer, onSelectFirstProcess, onDeselectProcess, onClose]);

  return (
    <Joyride
      steps={STEPS}
      stepIndex={stepIndex}
      run
      continuous
      options={TOUR_OPTIONS}
      styles={TOUR_STYLES}
      onEvent={handleEvent}
      locale={{
        back: '← Voltar',
        close: 'Fechar',
        last: 'Concluir ✓',
        next: 'Próximo →',
        nextWithProgress: 'Próximo ({current}/{total})',
        skip: 'Pular tour',
      }}
    />
  );
}
