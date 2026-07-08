import { useRef, useState } from 'react';
import { useVsmStore } from '../../store/useVsmStore.js';
import VsmIconPalette from '../VsmIconPalette/VsmIconPalette.jsx';
import './Layout.css';

export default function Sidebar() {
  const addProcess     = useVsmStore((s) => s.addProcess);
  const reorderProcess = useVsmStore((s) => s.reorderProcess);
  const processes      = useVsmStore((s) => s.processes);
  const selectedId     = useVsmStore((s) => s.selectedId);
  const setSelected    = useVsmStore((s) => s.setSelected);
  const demand         = useVsmStore((s) => s.demand);
  const setDemand      = useVsmStore((s) => s.setDemand);
  const lote           = useVsmStore((s) => s.lote);
  const setLote        = useVsmStore((s) => s.setLote);
  const shifts         = useVsmStore((s) => s.shifts);
  const updateShift    = useVsmStore((s) => s.updateShift);
  const addShift       = useVsmStore((s) => s.addShift);
  const removeShift    = useVsmStore((s) => s.removeShift);
  const dragIdx        = useRef(null);
  const [dragOver, setDragOver] = useState(null);

  return (
    <aside className="sidebar-panel">

      {/* ── Produção ── */}
      <div data-tour="sidebar-producao" className="panel-block">
        <div className="panel-title">Produção</div>
        <div className="side-kpi-inputs">
          <label className="side-kpi-label">
            <span>Demanda</span>
            <div className="side-kpi-row">
              <input type="number" value={demand} min="1"
                onChange={(e) => setDemand(Number(e.target.value))} />
              <span className="side-kpi-unit">pç/dia</span>
            </div>
          </label>
          <label className="side-kpi-label">
            <span>Lote (pack-out)</span>
            <div className="side-kpi-row">
              <input type="number" value={lote} min="1"
                onChange={(e) => setLote(Number(e.target.value))} />
              <span className="side-kpi-unit">pç</span>
            </div>
          </label>
        </div>
      </div>

      {/* ── Turnos ── */}
      <div data-tour="sidebar-turnos" className="panel-block">
        <div className="panel-title">Turnos</div>
        <div className="side-kpi-inputs">
          {shifts.map((sh) => (
            <div key={sh.id} className="shift-row">
              <input className="shift-name-inp"
                value={sh.name}
                onChange={(e) => updateShift(sh.id, { name: e.target.value })} />
              <input className="shift-avail-inp" type="number" min="1"
                value={sh.available}
                onChange={(e) => updateShift(sh.id, { available: Number(e.target.value) })} />
              <span className="side-kpi-unit">min</span>
              {shifts.length > 1 && (
                <button className="shift-remove-btn" onClick={() => removeShift(sh.id)}>✕</button>
              )}
            </div>
          ))}
          {shifts.length < 3 && (
            <button className="palette-button" onClick={addShift}>+ Adicionar turno</button>
          )}
        </div>
      </div>

      {/* ── Ícones VSM ── */}
      <VsmIconPalette />

      {/* ── Processos ── */}
      <div data-tour="sidebar-processos" className="panel-block">
        <div className="panel-title">Processos</div>
        <button type="button" className="palette-button" onClick={addProcess}>
          + Adicionar processo
        </button>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {processes.map((p, i) => (
            <div
              key={p.id}
              className={`proc-list-item ${selectedId === `proc-${p.id}` ? 'selected' : ''} ${dragOver === i ? 'drag-over' : ''}`}
              draggable
              onDragStart={() => { dragIdx.current = i; }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(i); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => {
                if (dragIdx.current !== null && dragIdx.current !== i) {
                  reorderProcess(dragIdx.current, i);
                }
                dragIdx.current = null;
                setDragOver(null);
              }}
              onDragEnd={() => { dragIdx.current = null; setDragOver(null); }}
              onClick={() => setSelected(`proc-${p.id}`)}
            >
              <span className="proc-list-drag">⠿</span>
              <span className="proc-list-num">{i + 1}</span>
              <span className="proc-list-name">{p.name}</span>
            </div>
          ))}
        </div>
      </div>

    </aside>
  );
}
