import { create } from 'zustand';

const uid = () => Math.random().toString(36).slice(2, 7);

const defaultProcesses = [
  { id: 'p1', name: 'PROCESSO 01', ct: '30', ctUnit: 'Seg', setup: '0', ops: '1', turnos: '1', uptime: '95%', performance: '100%', quality: '100%', info: 'PI', infoFlow: 'electronic', pushDir: 'push', infoFlowDir: 'from-pcp', progType: '', progFreq: '', progSistema: '' },
  { id: 'p2', name: 'PROCESSO 02', ct: '30', ctUnit: 'Seg', setup: '0', ops: '1', turnos: '1', uptime: '95%', performance: '100%', quality: '100%', info: 'PI', infoFlow: 'electronic', pushDir: 'push', infoFlowDir: 'from-pcp', progType: '', progFreq: '', progSistema: '' },
  { id: 'p3', name: 'PROCESSO 03', ct: '30', ctUnit: 'Seg', setup: '0', ops: '1', turnos: '1', uptime: '95%', performance: '100%', quality: '100%', info: 'PI', infoFlow: 'electronic', pushDir: 'push', infoFlowDir: 'from-pcp', progType: '', progFreq: '', progSistema: '' },
  { id: 'p4', name: 'PROCESSO 04', ct: '30', ctUnit: 'Seg', setup: '0', ops: '1', turnos: '1', uptime: '95%', performance: '100%', quality: '100%', info: 'PI', infoFlow: 'electronic', pushDir: 'push', infoFlowDir: 'from-pcp', progType: '', progFreq: '', progSistema: '' },
];

const defaultWips = [
  { id: 'w0', qty: '200', unit: 'pç', flowType: 'push', material: 'BOBINA',    factor: '1', consumoDiario: '' },
  { id: 'w1', qty: '150', unit: 'pç', flowType: 'push', material: 'BLANK',     factor: '1', consumoDiario: '' },
  { id: 'w2', qty: '80',  unit: 'pç', flowType: 'push', material: 'ESTAMPADA', factor: '1', consumoDiario: '' },
  { id: 'w3', qty: '50',  unit: 'pç', flowType: 'push', material: 'RECORTADA', factor: '1', consumoDiario: '' },
  { id: 'w4', qty: '0',   unit: 'pç', flowType: 'push', material: 'DEBRUADA',  factor: '1', consumoDiario: '' },
];

export const useVsmStore = create((set, get) => ({
  supplier: { name: 'FORNECEDOR', product: 'MATÉRIA-PRIMA', infoFlow: 'electronic', infoFlowDir: 'from-pcp', leadTime: '', freqEntrega: '', tipoPedido: '', codigo: '10644' },
  customer: { name: 'CLIENTE', product: 'CACAMBA CONSTRUTOR GALVANIZADO', infoFlow: 'electronic', infoFlowDir: 'to-pcp', freqPedidos: '', prazoEntrega: '', codigo: '02665' },
  pcp:      { name: 'PCP\nMRP', sistema: '', horizonte: '', freqOrdens: '' },
  processes: defaultProcesses,
  wips:      defaultWips,
  demand:    200,
  available: 480,
  lote:      1,
  shifts: [{ id: 's1', name: 'Turno 1', available: 480 }],
  selectedId: null,
  elements: [],

  // ── Estado Atual / Futuro ──
  activeState: 'atual',
  savedStates: { atual: null, futuro: null },

  switchToState: (key) => set((s) => {
    if (s.activeState === key) return {};
    const snapshot = {
      supplier: s.supplier, customer: s.customer, pcp: s.pcp,
      processes: s.processes, wips: s.wips, elements: s.elements,
      shingoSteps: s.shingoSteps, demand: s.demand, available: s.available,
    };
    const target = s.savedStates[key]
      ?? (key === 'futuro' ? JSON.parse(JSON.stringify(snapshot)) : null);
    if (!target) return {};
    return {
      ...target,
      activeState: key,
      savedStates: { ...s.savedStates, [s.activeState]: snapshot },
      selectedId: null,
    };
  }),

  setSelected:    (id) => set({ selectedId: id }),

  getSnapshot: (key) => {
    const s = get();
    if (key === s.activeState) {
      return {
        supplier: s.supplier, customer: s.customer, pcp: s.pcp,
        processes: s.processes, wips: s.wips, elements: s.elements,
        demand: s.demand, available: s.available,
      };
    }
    return s.savedStates[key];
  },

  addElement: (type) => set((s) => ({
    elements: [...s.elements, {
      id: 'el-' + uid(), type, x: 200, y: 150, label: '',
      ...(type === 'kaizen' ? { processId: null } : {}),
    }],
  })),
  updateElement: (id, patch) => set((s) => ({
    elements: s.elements.map((e) => (e.id === id ? { ...e, ...patch } : e)),
  })),
  removeElement: (id) => set((s) => ({
    elements: s.elements.filter((e) => e.id !== id),
    selectedId: s.selectedId === id ? null : s.selectedId,
  })),
  updateSupplier: (patch) => set((s) => ({ supplier: { ...s.supplier, ...patch } })),
  updateCustomer: (patch) => set((s) => ({ customer: { ...s.customer, ...patch } })),
  updatePcp:      (patch) => set((s) => ({ pcp:      { ...s.pcp,      ...patch } })),

  updateProcess: (id, patch) => set((s) => ({
    processes: s.processes.map((p) => (p.id === id ? { ...p, ...patch } : p)),
  })),

  setPacemaker: (id) => set((s) => ({
    processes: s.processes.map((p) => ({ ...p, pacemaker: p.id === id ? !p.pacemaker : false })),
  })),

  addAcao: (procId) => set((s) => ({
    processes: s.processes.map((p) => p.id === procId ? {
      ...p, acoes: [...(p.acoes || []), { id: Math.random().toString(36).slice(2,7), oQue: '', quem: '', quando: '' }]
    } : p),
  })),
  updateAcao: (procId, acaoId, patch) => set((s) => ({
    processes: s.processes.map((p) => p.id === procId ? {
      ...p, acoes: (p.acoes || []).map((a) => a.id === acaoId ? { ...a, ...patch } : a)
    } : p),
  })),
  removeAcao: (procId, acaoId) => set((s) => ({
    processes: s.processes.map((p) => p.id === procId ? {
      ...p, acoes: (p.acoes || []).filter((a) => a.id !== acaoId)
    } : p),
  })),

  updateWip: (id, patch) => set((s) => ({
    wips: s.wips.map((w) => (w.id === id ? { ...w, ...patch } : w)),
  })),

  reorderProcess: (fromIdx, toIdx) => set((s) => {
    if (fromIdx === toIdx) return {};
    const procs = [...s.processes];
    const [p] = procs.splice(fromIdx, 1);
    procs.splice(toIdx, 0, p);
    return { processes: procs };
  }),

  addProcess: () => set((s) => ({
    processes: [...s.processes, {
      id: 'p-' + uid(),
      name: 'PROCESSO ' + String(s.processes.length + 1).padStart(2, '0'),
      ct: '30', ctUnit: 'Seg', setup: '0', ops: '1', turnos: '1', uptime: '95%', performance: '100%', quality: '100%', info: '', infoFlow: 'electronic', pushDir: 'push', infoFlowDir: 'from-pcp', progType: '', progFreq: '', progSistema: '',
    }],
    wips: [...s.wips, { id: 'w-' + uid(), qty: '0', unit: 'pç', flowType: 'push', material: '', factor: '1', consumoDiario: '' }],
  })),

  removeProcess: (id) => set((s) => {
    const idx = s.processes.findIndex((p) => p.id === id);
    if (idx === -1 || s.processes.length <= 1) return {};
    const newWips = s.wips.filter((_, i) => i !== idx + 1);
    return {
      processes: s.processes.filter((p) => p.id !== id),
      wips: newWips,
      selectedId: null,
    };
  }),

  // ── Diagrama de Fluxo de Shingo (por produto/VSM) ──
  shingoSteps: [],

  initShingoFromVsm: () => set((s) => ({
    shingoSteps: s.processes.map((p) => ({
      id: 'sh-' + uid(),
      name: p.name,
      type: 'op',
      time: p.ct,
      timeUnit: p.ctUnit || 'Seg',
      dist: '',
      va: true,
      notes: p.info || '',
    })),
  })),

  addShingoStep: () => set((s) => ({
    shingoSteps: [...s.shingoSteps, { id: 'sh-' + uid(), name: '', type: 'op', time: '0', timeUnit: 'Seg', dist: '', va: true, notes: '' }],
  })),

  insertShingoStepAt: (afterIndex) => set((s) => {
    const newStep = { id: 'sh-' + uid(), name: '', type: 'op', time: '0', timeUnit: 'Seg', dist: '', va: true, notes: '' };
    const steps = [...s.shingoSteps];
    steps.splice(afterIndex + 1, 0, newStep);
    return { shingoSteps: steps };
  }),

  removeShingoStep: (id) => set((s) => ({
    shingoSteps: s.shingoSteps.filter((st) => st.id !== id),
  })),

  updateShingoStep: (id, patch) => set((s) => ({
    shingoSteps: s.shingoSteps.map((st) => (st.id === id ? { ...st, ...patch } : st)),
  })),

  clearShingo: () => set({ shingoSteps: [] }),

  setDemand: (v) => set({ demand: v }),
  setAvailable: (v) => set({ available: v }),
  setLote: (v) => set({ lote: v }),

  updateShift: (id, patch) => set((s) => {
    const shifts = s.shifts.map((sh) => sh.id === id ? { ...sh, ...patch } : sh);
    return { shifts, available: shifts.reduce((sum, sh) => sum + (Number(sh.available) || 0), 0) };
  }),
  addShift: () => set((s) => {
    if (s.shifts.length >= 3) return {};
    const n = s.shifts.length + 1;
    const shifts = [...s.shifts, { id: 's' + n, name: `Turno ${n}`, available: 480 }];
    return { shifts, available: shifts.reduce((sum, sh) => sum + (Number(sh.available) || 0), 0) };
  }),
  removeShift: (id) => set((s) => {
    if (s.shifts.length <= 1) return {};
    const shifts = s.shifts.filter((sh) => sh.id !== id);
    return { shifts, available: shifts.reduce((sum, sh) => sum + (Number(sh.available) || 0), 0) };
  }),

  clearCanvas: () => set({
    processes: [],
    wips: [{ id: 'w-' + uid(), qty: '0', unit: 'pç' }],
    elements: [],
    selectedId: null,
  }),

  importFromData: (data) => set({
    supplier:    data.supplier    || { name: 'FORNECEDOR', product: 'PRODUTO' },
    customer:    data.customer    || { name: 'CLIENTE' },
    pcp:         data.pcp         || { name: 'PCP\nMRP' },
    processes:   data.processes   || [],
    wips:        data.wips        || [{ id: 'w0', qty: '0', unit: 'pç' }],
    shingoSteps: data.shingoSteps || [],
    elements:    data.elements    || [],
    selectedId:  null,
  }),

}));
