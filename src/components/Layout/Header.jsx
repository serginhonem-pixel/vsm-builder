import { useEffect, useRef, useState } from 'react';
import { useVsmStore } from '../../store/useVsmStore.js';
import Yamazumi from '../Yamazumi/Yamazumi.jsx';
import ReportPdf from '../ReportPdf/ReportPdf.jsx';
import ComparisonView from '../Comparison/ComparisonView.jsx';
import LicenseModal from '../License/LicenseModal.jsx';
import PwaInstallButton from '../PwaInstall/PwaInstallButton.jsx';
import { ctToMin } from '../../utils/kpi.js';
import { isLicensed } from '../../utils/license.js';
import './Layout.css';

function KpiChips() {
  const processes = useVsmStore((s) => s.processes);
  const wips      = useVsmStore((s) => s.wips);
  const demand    = useVsmStore((s) => s.demand);
  const available = useVsmStore((s) => s.available);
  const lote      = useVsmStore((s) => s.lote);

  const takt = demand > 0 ? available / demand : 0;
  const totalTC   = processes.reduce((sum, p) => sum + ctToMin(p), 0);
  const totalWait = wips.reduce((sum, w) => {
    const qty = parseFloat(w.qty) || 0;
    const cd  = parseFloat(w.consumoDiario);
    const wait = cd > 0 ? (qty / cd) * available : qty * (parseFloat(w.factor) || 1) * takt;
    return sum + wait;
  }, 0);
  const lt  = totalTC + totalWait;
  const eff = lt > 0 ? (totalTC / lt) * 100 : 0;

  const fmtMin = (v) => {
    if (v >= 60)  return `${(v/60).toFixed(1)}h`;
    if (v < 1)    return `${(v*60).toFixed(0)}s`;
    return `${v.toFixed(1)}m`;
  };

  return (
    <div className="header-kpis">
      <div className="hkpi"><span className="hkpi-l">Takt</span><span className="hkpi-v kpi-blue">{fmtMin(takt)}</span></div>
      <div className="hkpi"><span className="hkpi-l">Pitch</span><span className="hkpi-v kpi-blue">{fmtMin(takt * (lote || 1))}</span></div>
      <div className="hkpi"><span className="hkpi-l">Lead Time</span><span className="hkpi-v kpi-red">{fmtMin(lt)}</span></div>
      <div className="hkpi"><span className="hkpi-l">Proc.</span><span className="hkpi-v kpi-orange">{fmtMin(totalTC)}</span></div>
      <div className="hkpi"><span className="hkpi-l">Efic.</span><span className="hkpi-v kpi-green">{eff.toFixed(0)}%</span></div>
    </div>
  );
}

async function exportPdf(name, reportEl) {
  if (!reportEl) return;
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  // 1. Canvas do VSM
  const vsmCanvas = document.querySelector('.vsm-canvas');
  let vsmImgData = null, vsmAspect = 1;
  if (vsmCanvas) {
    const shot = await html2canvas(vsmCanvas, { scale: 2, useCORS: true, backgroundColor: '#fff' });
    vsmImgData = shot.toDataURL('image/png');
    vsmAspect  = shot.height / shot.width;
  }

  // 2. Relatório
  const rpt = await html2canvas(reportEl, { scale: 2, useCORS: true, backgroundColor: '#fff' });
  const rptData = rpt.toDataURL('image/png');

  const PAGE_W = 210, PAGE_H = 297; // A4 mm
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Página 1 — VSM canvas
  if (vsmImgData) {
    const drawW = PAGE_W - 20;
    const drawH = Math.min(drawW * vsmAspect, PAGE_H - 20);
    pdf.addImage(vsmImgData, 'PNG', 10, 10, drawW, drawH);
    pdf.addPage();
  }

  // Página 2 — Relatório
  const rptW = PAGE_W - 20;
  const rptH = (rpt.height / rpt.width) * rptW;
  const pages = Math.ceil(rptH / (PAGE_H - 20));
  for (let i = 0; i < pages; i++) {
    if (i > 0) pdf.addPage();
    pdf.addImage(rptData, 'PNG', 10, 10 - i * (PAGE_H - 20), rptW, rptH);
  }

  pdf.save(`${name || 'vsm-flow'}.pdf`);
}

export default function Header({ onOpenShingo, onBackToVsm, activeView, drawerOpen, onToggleDrawer, onStartTour }) {
  const [name, setName]         = useState('Meu fluxo');
  const [loadName, setLoadName] = useState('');
  const [saved, setSaved]       = useState([]);
  const [showYamazumi, setShowYamazumi] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [licenseReason, setLicenseReason] = useState(null);
  const reportRef  = useRef(null);

  const saveFlow       = useVsmStore((s) => s.saveFlow);
  const loadFlow       = useVsmStore((s) => s.loadFlow);
  const listFlows      = useVsmStore((s) => s.listFlows);
  const clearCanvas    = useVsmStore((s) => s.clearCanvas);
  const activeState    = useVsmStore((s) => s.activeState);
  const switchToState  = useVsmStore((s) => s.switchToState);

  const refresh = () => setSaved(listFlows());
  useEffect(refresh, []);

  const handleSalvar = () => {
    if (!isLicensed()) {
      setLicenseReason('Pra manter suas alterações salvas entre sessões, ative sua licença.');
      return;
    }
    saveFlow(name.trim());
    refresh();
  };

  return (
    <header className="app-header">
      <button type="button" data-tour="menu-toggle" className={`hbtn panel-toggle${drawerOpen ? ' active' : ''}`} onClick={onToggleDrawer} title="Menu">
        ☰
      </button>
      <div className="brand">
        <img className="brand-mark" src="/betini-simbolo.svg" alt="" width="18" height="18" />
        <span className="brand-name">VSM Builder</span>
      </div>

      <div className="header-row">
        <div data-tour="file-actions" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button type="button" className="hbtn" onClick={clearCanvas}>Novo fluxo</button>
          <button type="button" className="hbtn" onClick={handleSalvar}>Salvar</button>
          <button type="button" className="hbtn hbtn-pdf" onClick={() => exportPdf(name.trim(), reportRef.current)}>Exportar PDF</button>
        </div>
        {activeView === 'shingo' ? (
          <button type="button" className="hbtn" onClick={onBackToVsm}>← Voltar ao VSM</button>
        ) : (
          <button type="button" data-tour="btn-shingo" className="hbtn btn-shingo" onClick={onOpenShingo}>Fluxo de Shingo</button>
        )}
        <button type="button" data-tour="btn-yamazumi" className="hbtn btn-yamazumi" onClick={() => setShowYamazumi(true)}>
          Yamazumi
        </button>
        <button type="button" className="hbtn btn-tour" onClick={onStartTour}>
          ▶ Tour
        </button>
        <PwaInstallButton />

        <div className="header-sep" />

        {/* Estado Atual / Futuro */}
        <div data-tour="state-toggle" className="state-toggle">
          <button type="button"
            className={`state-btn${activeState === 'atual' ? ' active' : ''}`}
            onClick={() => switchToState('atual')}>
            Atual
          </button>
          <button type="button"
            className={`state-btn${activeState === 'futuro' ? ' active' : ''}`}
            onClick={() => switchToState('futuro')}>
            Futuro
          </button>
        </div>
        <button type="button" className="hbtn" onClick={() => setShowComparison(true)}>
          Comparar Atual x Futuro
        </button>

        <div className="header-sep" />

        <label className="hlabel">
          Nome do fluxo
          <input className="hinput" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Carrinho, Telha..." />
        </label>
        <label className="hlabel">
          Abrir fluxo salvo
          <select className="hinput" value={loadName} onChange={(e) => setLoadName(e.target.value)}>
            <option value="">Selecione</option>
            {saved.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <button type="button" className="hbtn" onClick={() => loadFlow(loadName)} disabled={!loadName}>↩</button>

        <div className="header-sep" />
        <div data-tour="kpi-chips"><KpiChips /></div>
      </div>


      {showYamazumi && <Yamazumi onClose={() => setShowYamazumi(false)} />}
      {showComparison && <ComparisonView onClose={() => setShowComparison(false)} />}
      {licenseReason && (
        <LicenseModal
          reason={licenseReason}
          onClose={() => setLicenseReason(null)}
          onActivated={() => setLicenseReason(null)}
        />
      )}

      {/* Relatório oculto capturado pelo html2canvas */}
      <div style={{ position: 'fixed', left: '-9999px', top: 0, pointerEvents: 'none' }}>
        <ReportPdf ref={reportRef} />
      </div>
    </header>
  );
}
