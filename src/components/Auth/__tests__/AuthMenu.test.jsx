import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const signInWithGoogle = vi.fn();
const signOut = vi.fn();
let state = { user: null, plan: 'free', status: 'ready', signInWithGoogle, signOut };
vi.mock('../../../store/useAuthStore.js', () => ({
  useAuthStore: (sel) => (sel ? sel(state) : state),
  isPaid: (s) => s.plan !== 'free',
}));

let fbConfigured = true;
vi.mock('../../../lib/firebase.js', () => ({ isFirebaseConfigured: () => fbConfigured }));

beforeEach(() => { vi.clearAllMocks(); sessionStorage.clear(); fbConfigured = true; state = { user: null, plan: 'free', status: 'ready', signInWithGoogle, signOut }; });

describe('AuthMenu', () => {
  it('deslogado mostra "Entrar" e chama signIn', async () => {
    const { default: AuthMenu } = await import('../AuthMenu.jsx');
    render(<AuthMenu />);
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }));
    expect(signInWithGoogle).toHaveBeenCalled();
  });

  it('logado mostra o nome e permite sair', async () => {
    state = { ...state, user: { displayName: 'Sergio', email: 's@x.com' }, plan: 'pro' };
    const { default: AuthMenu } = await import('../AuthMenu.jsx');
    render(<AuthMenu />);
    await userEvent.click(screen.getByRole('button', { name: /sergio/i }));
    await userEvent.click(screen.getByRole('button', { name: /sair/i }));
    expect(signOut).toHaveBeenCalled();
  });
});

describe('SavePromptBanner', () => {
  it('some quando pago', async () => {
    state = { ...state, user: { displayName: 'S' }, plan: 'pro' };
    const { default: SavePromptBanner } = await import('../SavePromptBanner.jsx');
    const { container } = render(<SavePromptBanner />);
    expect(container).toBeEmptyDOMElement();
  });
  it('aparece p/ free', async () => {
    const { default: SavePromptBanner } = await import('../SavePromptBanner.jsx');
    render(<SavePromptBanner />);
    expect(screen.getByText(/salvar seu trabalho/i)).toBeInTheDocument();
  });
  it('some quando Firebase não configurado', async () => {
    fbConfigured = false;
    const { default: SavePromptBanner } = await import('../SavePromptBanner.jsx');
    const { container } = render(<SavePromptBanner />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('AuthMenu', () => {
  it('some quando Firebase não configurado', async () => {
    fbConfigured = false;
    const { default: AuthMenu } = await import('../AuthMenu.jsx');
    const { container } = render(<AuthMenu />);
    expect(container).toBeEmptyDOMElement();
  });
});
