import { describe, it, expect, vi, beforeEach } from 'vitest';

const addDoc = vi.fn(async () => ({ id: 'new1' }));
const setDoc = vi.fn();
const updateDoc = vi.fn();
const deleteDoc = vi.fn();
const getDoc = vi.fn();
const getDocs = vi.fn();
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => 'col'), doc: vi.fn(() => ({ id: 'd' })),
  addDoc: (...a) => addDoc(...a), setDoc: (...a) => setDoc(...a),
  updateDoc: (...a) => updateDoc(...a), deleteDoc: (...a) => deleteDoc(...a),
  getDoc: (...a) => getDoc(...a), getDocs: (...a) => getDocs(...a),
  query: vi.fn(() => 'q'), where: vi.fn(() => 'w'),
  serverTimestamp: () => 'ts', increment: (n) => ({ __inc: n }),
}));
vi.mock('../firebase.js', () => ({ getFirebase: async () => ({ db: {} }) }));

let planState;
vi.mock('../../store/useAuthStore.js', () => ({
  useAuthStore: { getState: () => planState },
  isPaid: (s) => s.plan === 'pro' || s.plan === 'team',
}));

beforeEach(() => { vi.clearAllMocks(); planState = { plan: 'free', user: { uid: 'u1' } }; });

describe('canPersist', () => {
  it('false p/ free, true p/ pro', async () => {
    const m = await import('../flowsRepo.js');
    expect(m.canPersist()).toBe(false);
    planState.plan = 'pro';
    expect(m.canPersist()).toBe(true);
  });
});

describe('saveFlow', () => {
  it('rejeita se não pode persistir', async () => {
    const m = await import('../flowsRepo.js');
    await expect(m.saveFlow(null, { name: 'x', storeState: {} })).rejects.toThrow('not-allowed');
  });

  it('cria doc novo e incrementa flowCount', async () => {
    planState.plan = 'pro';
    const m = await import('../flowsRepo.js');
    const r = await m.saveFlow(null, { name: 'Meu VSM', storeState: { processes: [], wips: [] } });
    expect(r.id).toBe('new1');
    expect(addDoc).toHaveBeenCalledWith('col', expect.objectContaining({
      ownerUid: 'u1', name: 'Meu VSM', schemaVersion: 1,
    }));
    expect(updateDoc).toHaveBeenCalledWith(expect.anything(), { flowCount: { __inc: 1 } });
  });

  it('atualiza doc existente sem mexer em flowCount', async () => {
    planState.plan = 'pro';
    const m = await import('../flowsRepo.js');
    await m.saveFlow('abc', { name: 'x', storeState: { processes: [], wips: [] } });
    expect(updateDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ name: 'x' }));
    expect(updateDoc).not.toHaveBeenCalledWith(expect.anything(), { flowCount: expect.anything() });
  });
});

describe('listFlows', () => {
  it('[] quando free', async () => {
    const m = await import('../flowsRepo.js');
    expect(await m.listFlows()).toEqual([]);
  });
  it('mapeia docs quando pro', async () => {
    planState.plan = 'pro';
    getDocs.mockResolvedValue({ docs: [
      { id: 'f1', data: () => ({ name: 'A', updatedAt: { toMillis: () => 10 } }) },
    ]});
    const m = await import('../flowsRepo.js');
    expect(await m.listFlows()).toEqual([{ id: 'f1', name: 'A', updatedAt: 10 }]);
  });
});

describe('loadFlow', () => {
  it('devolve name + patch quando pro', async () => {
    planState.plan = 'pro';
    getDoc.mockResolvedValue({ exists: () => true, data: () => ({ name: 'Linha A', state: { processes: [{ id: 'p9' }] } }) });
    const m = await import('../flowsRepo.js');
    const r = await m.loadFlow('f1');
    expect(r.name).toBe('Linha A');
    expect(r.patch.processes).toEqual([{ id: 'p9' }]);
    expect(r.patch.selectedId).toBe(null);
  });
  it('null quando free', async () => {
    const m = await import('../flowsRepo.js');
    expect(await m.loadFlow('f1')).toBe(null);
  });
});
