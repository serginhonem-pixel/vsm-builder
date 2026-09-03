import { describe, it, expect, vi, beforeEach } from 'vitest';

const storeState = { processes: [{ id: 'p1' }], wips: [], setState: vi.fn(), getState: null };
const listeners = new Set();
const useVsmStore = {
  getState: () => storeState,
  setState: (patch) => Object.assign(storeState, patch),
  subscribe: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
};
vi.mock('../../store/useVsmStore.js', () => ({ useVsmStore }));

let paid = false;
vi.mock('../../store/useAuthStore.js', () => ({
  useAuthStore: { getState: () => ({ plan: paid ? 'pro' : 'free' }) },
  isPaid: (s) => s.plan !== 'free',
}));

vi.mock('../flowState.js', () => ({
  serializeFlowState: (s) => ({ processes: s.processes, wips: s.wips }),
  hydrateFlowState: (s) => ({ ...s, selectedId: null }),
  SCHEMA_VERSION: 1,
}));

beforeEach(() => { vi.resetModules(); vi.clearAllMocks(); sessionStorage.clear(); paid = false; vi.useFakeTimers(); listeners.clear(); storeState.processes = [{ id: 'p1' }]; storeState.wips = []; });

describe('initSessionPersist', () => {
  it('hidrata do sessionStorage quando free', async () => {
    sessionStorage.setItem('vsm-draft', JSON.stringify({ processes: [{ id: 'x9' }], wips: [] }));
    const spy = vi.spyOn(useVsmStore, 'setState');
    const { initSessionPersist } = await import('../sessionPersist.js');
    initSessionPersist();
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ processes: [{ id: 'x9' }] }));
  });

  it('grava no sessionStorage após mudança (debounced)', async () => {
    const { initSessionPersist } = await import('../sessionPersist.js');
    initSessionPersist();
    listeners.forEach((fn) => fn(storeState));
    vi.advanceTimersByTime(900);
    expect(JSON.parse(sessionStorage.getItem('vsm-draft')).processes).toEqual([{ id: 'p1' }]);
  });

  it('não grava quando pago', async () => {
    paid = true;
    const { initSessionPersist } = await import('../sessionPersist.js');
    initSessionPersist();
    listeners.forEach((fn) => fn(storeState));
    vi.advanceTimersByTime(900);
    expect(sessionStorage.getItem('vsm-draft')).toBe(null);
  });
});
