import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const canPersist = vi.fn();
const saveFlow = vi.fn(async () => ({ id: 'f1' }));
const listFlows = vi.fn(async () => []);
const loadFlow = vi.fn(async () => ({ processes: [], selectedId: null }));
vi.mock('../../../lib/flowsRepo.js', () => ({ canPersist, saveFlow, listFlows, loadFlow, deleteFlow: vi.fn() }));

const vsmState = { processes: [], wips: [], demand: 200, available: 480, lote: 1 };
vi.mock('../../../store/useVsmStore.js', () => ({
  useVsmStore: Object.assign((sel) => (sel ? sel(vsmState) : vsmState), {
    getState: () => vsmState, setState: vi.fn(), subscribe: () => () => {},
  }),
}));
vi.mock('../../../store/useAuthStore.js', () => ({
  useAuthStore: Object.assign((sel) => (sel ? sel({ user: null, plan: 'free' }) : { user: null, plan: 'free' }),
    { getState: () => ({ user: null, plan: 'free' }) }),
  isPaid: (s) => s.plan !== 'free',
}));
vi.mock('../../Yamazumi/Yamazumi.jsx', () => ({ default: () => null }));
vi.mock('../../Comparison/ComparisonView.jsx', () => ({ default: () => null }));
vi.mock('../../ReportPdf/ReportPdf.jsx', () => ({ default: () => null }));
vi.mock('../../PwaInstall/PwaInstallButton.jsx', () => ({ default: () => null }));

beforeEach(() => { vi.clearAllMocks(); canPersist.mockReturnValue(false); });

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
