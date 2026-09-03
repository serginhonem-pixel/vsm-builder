import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const saveFlow = vi.fn(async () => ({ id: 'x' }));
vi.mock('../../../lib/flowsRepo.js', () => ({ saveFlow }));
let auth = { user: { uid: 'u1' }, plan: 'pro' };
vi.mock('../../../store/useAuthStore.js', () => ({
  useAuthStore: (sel) => (sel ? sel(auth) : auth),
  isPaid: (s) => s.plan !== 'free',
}));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear(); sessionStorage.clear();
  auth = { user: { uid: 'u1' }, plan: 'pro' };
  localStorage.setItem('vsm-flows', JSON.stringify({
    'Linha A': { supplier: { name: 'F' }, processes: [], wips: [], savedAt: 1 },
  }));
});

describe('MigrationModal', () => {
  it('pago com mapas legados: mostra o modal e migra', async () => {
    const { default: MigrationModal } = await import('../MigrationModal.jsx');
    render(<MigrationModal />);
    await userEvent.click(screen.getByRole('button', { name: /trazer/i }));
    expect(saveFlow).toHaveBeenCalledTimes(1);
    expect(saveFlow).toHaveBeenCalledWith(null, expect.objectContaining({ name: 'Linha A' }));
    expect(localStorage.getItem('vsm-flows')).toBe(null);
    expect(localStorage.getItem('vsm-flows__migrated_backup')).toBeTruthy();
  });

  it('erro na migração: não renomeia keys, libera o botão', async () => {
    saveFlow.mockRejectedValueOnce(new Error('net'));
    const { default: MigrationModal } = await import('../MigrationModal.jsx');
    render(<MigrationModal />);
    await userEvent.click(screen.getByRole('button', { name: /trazer/i }));
    expect(localStorage.getItem('vsm-flows')).not.toBe(null);
    expect(localStorage.getItem('vsm-flows__migrated_backup')).toBe(null);
    expect(screen.getByRole('button', { name: /trazer/i })).not.toBeDisabled();
  });

  it('free: não renderiza', async () => {
    auth = { user: null, plan: 'free' };
    const { default: MigrationModal } = await import('../MigrationModal.jsx');
    const { container } = render(<MigrationModal />);
    expect(container).toBeEmptyDOMElement();
  });
});
