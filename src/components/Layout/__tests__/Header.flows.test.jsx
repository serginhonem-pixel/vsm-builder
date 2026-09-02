import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const canPersist = vi.fn();
const saveFlow = vi.fn(async () => ({ id: 'f1' }));
const listFlows = vi.fn(async () => []);
const loadFlow = vi.fn(async () => ({ name: 'Meu fluxo', patch: { processes: [], selectedId: null } }));
vi.mock('../../../lib/flowsRepo.js', () => ({ canPersist, saveFlow, listFlows, loadFlow, deleteFlow: vi.fn() }));

const vsmState = { processes: [], wips: [], demand: 200, available: 480, lote: 1 };
vi.mock('../../../store/useVsmStore.js', () => ({
  useVsmStore: Object.assign((sel) => (sel ? sel(vsmState) : vsmState), {
    getState: () => vsmState, setState: vi.fn(), subscribe: () => () => {},
  }),
}));
let authState = { user: { uid: 'u1' }, plan: 'free' };
vi.mock('../../../store/useAuthStore.js', () => ({
  useAuthStore: Object.assign((sel) => (sel ? sel(authState) : authState),
    { getState: () => authState }),
  isPaid: (s) => s.plan !== 'free',
}));
vi.mock('../../Yamazumi/Yamazumi.jsx', () => ({ default: () => null }));
vi.mock('../../Comparison/ComparisonView.jsx', () => ({ default: () => null }));
vi.mock('../../ReportPdf/ReportPdf.jsx', () => ({ default: () => null }));
vi.mock('../../PwaInstall/PwaInstallButton.jsx', () => ({ default: () => null }));

beforeEach(() => {
  vi.clearAllMocks();
  canPersist.mockReturnValue(false);
  authState = { user: { uid: 'u1' }, plan: 'free' };
  listFlows.mockResolvedValue([]);
});

describe('Header — salvar', () => {
  it('free: "Salvar" abre o modal de upsell', async () => {
    const { default: Header } = await import('../Header.jsx');
    render(<Header activeView="vsm" onToggleDrawer={() => {}} onStartTour={() => {}}
      onOpenShingo={() => {}} onBackToVsm={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: /^salvar$/i }));
    expect(screen.getByText(/assine o vsm builder pro/i)).toBeInTheDocument();
    expect(saveFlow).not.toHaveBeenCalled();
  });

  it('pago: "Salvar" grava via flowsRepo', async () => {
    canPersist.mockReturnValue(true);
    const { default: Header } = await import('../Header.jsx');
    render(<Header activeView="vsm" onToggleDrawer={() => {}} onStartTour={() => {}}
      onOpenShingo={() => {}} onBackToVsm={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: /^salvar$/i }));
    expect(saveFlow).toHaveBeenCalledWith(null, expect.objectContaining({ storeState: vsmState }));
  });
});

describe('Header — lista de mapas salvos (free→pro)', () => {
  it('recarrega listFlows quando o plano vira pro e mostra o mapa no select', async () => {
    const { default: Header } = await import('../Header.jsx');
    const props = {
      activeView: 'vsm', onToggleDrawer: () => {}, onStartTour: () => {},
      onOpenShingo: () => {}, onBackToVsm: () => {},
    };
    const { rerender } = render(<Header {...props} />);
    // free: listFlows chamado, retorna []
    expect(listFlows).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('option', { name: 'Linha A' })).toBeNull();

    // plano vira pro
    canPersist.mockReturnValue(true);
    listFlows.mockResolvedValue([{ id: 'f1', name: 'Linha A', updatedAt: 1 }]);
    await act(async () => {
      authState = { ...authState, plan: 'pro' };
      rerender(<Header {...props} />);
    });

    expect(listFlows).toHaveBeenCalledTimes(2);
    expect(await screen.findByRole('option', { name: 'Linha A' })).toBeInTheDocument();
  });
});
