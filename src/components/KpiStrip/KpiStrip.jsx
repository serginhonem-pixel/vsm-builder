import { useVsmStore } from '../../store/useVsmStore.js';
import './KpiStrip.css';

export default function KpiStrip() {
  const processes  = useVsmStore((s) => s.processes);
  const wips       = useVsmStore((s) => s.wips);
  const demand     = useVsmStore((s) => s.demand);
  const available  = useVsmStore((s) => s.available);
  const setDemand    = useVsmStore((s) => s.setDemand);
  const setAvailable = useVsmStore((s) => s.setAvailable);

  const takt = demand > 0 ? available / demand : 0;

  // Converte CT para minutos conforme unidade
  const ctToMin = (p) => {
    const v = parseFloat(String(p.ct).replace(',', '.')) || 0;
    if (p.ctUnit === 'Seg') return v / 60;
    if (p.ctUnit === 'H')   return v * 60;
    return v; // Min (padrão)
  };

  const totalTC = processes.reduce((sum, p) => sum + ctToMin(p), 0);

  const totalWait = wips.reduce((sum, w) => {
    return sum + (parseFloat(w.qty) || 0) * (takt || 1);
  }, 0);

  const lt  = totalTC + totalWait;
  const eff = lt > 0 ? (totalTC / lt) * 100 : 0;

  return (
    <div className="kpi-strip">
      <div className="kpi-inputs">
        <label>
          Demanda
          <input type="number" value={demand} min="1"
            onChange={(e) => setDemand(Number(e.target.value))} />
          pç/dia
        </label>
        <label>
          Disponível
          <input type="number" value={available} min="1"
            onChange={(e) => setAvailable(Number(e.target.value))} />
          min/dia
        </label>
      </div>
      <div className="kpi kpi-b">
        <div className="kpi-l">Takt Time</div>
        <div className="kpi-v">{takt.toFixed(1)}<small> min/pç</small></div>
      </div>
      <div className="kpi kpi-r">
        <div className="kpi-l">Lead Time</div>
        <div className="kpi-v">{lt.toFixed(0)}<small> min</small></div>
      </div>
      <div className="kpi kpi-y">
        <div className="kpi-l">Tempo de Processo</div>
        <div className="kpi-v">{totalTC.toFixed(1)}<small> min</small></div>
      </div>
      <div className="kpi kpi-g">
        <div className="kpi-l">Eficiência do Fluxo</div>
        <div className="kpi-v">{eff.toFixed(0)}<small> %</small></div>
        <div className="eff-bar">
          <div className="eff-fill" style={{ width: `${Math.min(eff, 100)}%` }} />
        </div>
      </div>
    </div>
  );
}
