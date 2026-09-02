import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

let state;
vi.mock('../../../store/useAuthStore.js', () => ({
  useAuthStore: Object.assign((sel) => (sel ? sel(state) : state), {
    getState: () => state, setState: (p) => { state = { ...state, ...p }; },
  }),
  isPaid: (s) => s.plan !== 'free',
}));
global.fetch = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  state = {
    user: { getIdToken: async () => 'tok' }, plan: 'free',
    signInWithGoogle: vi.fn(),
  };
});

describe('LicenseModal upsell', () => {
  it('chave válida → seta plano e chama onActivated', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ plan: 'pro' }) });
    const onActivated = vi.fn();
    const { default: LicenseModal } = await import('../LicenseModal.jsx');
    render(<LicenseModal reason="x" onClose={() => {}} onActivated={onActivated} />);
    await userEvent.type(screen.getByPlaceholderText(/VSM-/), 'VSM-AAAA-BBBB');
    await userEvent.click(screen.getByRole('button', { name: /ativar/i }));
    expect(global.fetch).toHaveBeenCalledWith('/api/claim-plan', expect.objectContaining({ method: 'POST' }));
    expect(onActivated).toHaveBeenCalled();
  });

  it('sem login mostra CTA de entrar', async () => {
    state.user = null;
    const { default: LicenseModal } = await import('../LicenseModal.jsx');
    render(<LicenseModal onClose={() => {}} onActivated={() => {}} />);
    expect(screen.getByText(/entre primeiro/i)).toBeInTheDocument();
  });
});
