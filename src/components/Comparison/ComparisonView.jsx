import { useVsmStore } from '../../store/useVsmStore.js';
import VsmLayout from '../VsmLayout/VsmLayout.jsx';
import { computeKpis } from '../../utils/kpi.js';
import './ComparisonView.css';

function fmtMin(v) {
  if (v >= 60) return `${(v / 60).toFixed(1)}h`;
  if (v < 1)   return `${(v * 60).toFixed(0)}s`;
  return `${v.toFixed(1)}m`;
}

function KpiDeltaRow({ label, atual, futuro, fmt, lowerIsBetter }) {
  const delta = futuro - atual;
  const pct = atual !== 0 ? (delta / atual) * 100 : 0;
  const improved = lowerIsBetter ? delta < 0 : delta > 0;
  const deltaSign = delta > 0 ? '+' : '';
  return (
    <div className="cmp-kpi-row">
      <span className="cmp-kpi-label">{label}</span>
      <span className="cmp-kpi-val">{fmt(atual)}</span>
      <span className="cmp-kpi-val">{fmt(futuro)}</span>
      <span className={`cmp-kpi-delta${delta === 0 ? '' : improved ? ' cmp-delta-good' : ' cmp-delta-bad'}`}>
        {delta === 0 ? '—' : `${deltaSign}${pct.toFixed(0)}%`}
      </span>
    </div>
  );
}

export default function ComparisonView({ onClose }) {
  const getSnapshot   = useVsmStore((s) => s.getSnapshot);
  const switchToState = useVsmStore((s) => s.switchToState);
  const activeState    = useVsmStore((s) => s.activeState);

  const atualData  = getSnapshot('atual');
  const futuroData = getSnapshot('futuro');

  const criarFuturo = () => {
    const back = activeState;
    switchToState('futuro');
    switchToState(back);
  };

  const kpisAtual  = atualData  ? computeKpis(atualData)  : null;
  const kpisFuturo = futuroData ? computeKpis(futuroData) : null;

  return (
    <div className="cmp-page">
      <div className="cmp-modal">
        <div className="cmp-header">
          <h2>Comparativo Atual x Futuro</h2>
          <button className="cmp-close" onClick={onClose}>✕</button>
        </div>

        {!futuroData ? (
          <div className="cmp-empty">
            <p>Ainda não existe um Estado Futuro salvo.</p>
            <button type="button" className="hbtn" onClick={criarFuturo}>Criar Estado Futuro a partir do Atual</button>
          </div>
        ) : (
          <>
            <div className="cmp-kpi-table">
              <div className="cmp-kpi-row cmp-kpi-head">
                <span></span><span>Atual</span><span>Futuro</span><span>Delta</span>
              </div>
              <KpiDeltaRow label="Takt Time"  atual={kpisAtual.takt}    futuro={kpisFuturo.takt}    fmt={fmtMin} lowerIsBetter />
              <KpiDeltaRow label="Lead Time"  atual={kpisAtual.lt}      futuro={kpisFuturo.lt}      fmt={fmtMin} lowerIsBetter />
              <KpiDeltaRow label="T. Processo" atual={kpisAtual.totalTC} futuro={kpisFuturo.totalTC} fmt={fmtMin} lowerIsBetter />
              <KpiDeltaRow label="Eficiência" atual={kpisAtual.eff}     futuro={kpisFuturo.eff}     fmt={(v) => `${v.toFixed(0)}%`} lowerIsBetter={false} />
            </div>

            <div className="cmp-diagrams">
              <div className="cmp-diagram-block">
                <div className="cmp-diagram-title">Estado Atual</div>
                <VsmLayout data={atualData} idPrefix="cmp-atual-" readOnly isFuturo={false} />
              </div>
              <div className="cmp-diagram-block">
                <div className="cmp-diagram-title">Estado Futuro</div>
                <VsmLayout data={futuroData} idPrefix="cmp-futuro-" readOnly isFuturo />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
