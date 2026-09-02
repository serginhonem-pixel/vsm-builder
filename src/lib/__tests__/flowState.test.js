import { describe, it, expect } from 'vitest';
import { serializeFlowState, hydrateFlowState, SCHEMA_VERSION } from '../flowState.js';

const fullStore = {
  supplier: { name: 'F' }, customer: { name: 'C' }, pcp: { name: 'PCP' },
  processes: [{ id: 'p1' }], wips: [{ id: 'w0' }], elements: [], shingoSteps: [],
  demand: 300, available: 500, lote: 5,
  shifts: [{ id: 's1', name: 'T1', available: 500 }],
  activeState: 'atual', savedStates: { atual: null, futuro: null },
  selectedId: 'p1', // NÃO deve ser serializado
};

describe('serializeFlowState', () => {
  it('inclui demanda/disponível/lote/turnos/futuro', () => {
    const s = serializeFlowState(fullStore);
    expect(s.demand).toBe(300);
    expect(s.available).toBe(500);
    expect(s.lote).toBe(5);
    expect(s.shifts).toHaveLength(1);
    expect(s.savedStates).toEqual({ atual: null, futuro: null });
  });
  it('não serializa estado de UI', () => {
    const s = serializeFlowState(fullStore);
    expect(s).not.toHaveProperty('selectedId');
  });
});

describe('hydrateFlowState', () => {
  it('preenche defaults para mapa antigo sem demanda', () => {
    const patch = hydrateFlowState({ supplier: { name: 'F' }, processes: [], wips: [] });
    expect(patch.demand).toBe(200);
    expect(patch.available).toBe(480);
    expect(patch.lote).toBe(1);
    expect(patch.shifts).toEqual([{ id: 's1', name: 'Turno 1', available: 480 }]);
    expect(patch.selectedId).toBe(null);
  });
  it('round-trip preserva dados', () => {
    const patch = hydrateFlowState(serializeFlowState(fullStore));
    expect(patch.demand).toBe(300);
    expect(patch.processes).toEqual([{ id: 'p1' }]);
  });
});

it('SCHEMA_VERSION é 1', () => { expect(SCHEMA_VERSION).toBe(1); });
