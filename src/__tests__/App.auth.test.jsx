import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

const initAuth = vi.fn(() => vi.fn());
vi.mock('../store/useAuthStore.js', () => ({
  useAuthStore: Object.assign((sel) => (sel ? sel({ user: null, plan: 'free', status: 'ready' }) : { user: null, plan: 'free', status: 'ready' }),
    { getState: () => ({ user: null, plan: 'free' }) }),
  isPaid: () => false,
  initAuth,
}));
vi.mock('../lib/firebase.js', () => ({ isFirebaseConfigured: () => true, getFirebase: vi.fn() }));
vi.mock('../lib/sessionPersist.js', () => ({ initSessionPersist: () => () => {} }));
vi.mock('../components/VsmLayout/VsmLayout.jsx', () => ({ default: () => null }));
vi.mock('../components/Layout/Header.jsx', () => ({ default: () => null }));
vi.mock('../components/Layout/Sidebar.jsx', () => ({ default: () => null }));
vi.mock('../components/PropertiesPanel/PropertiesPanel.jsx', () => ({ default: () => null }));
vi.mock('../components/ShingoDiagram/ShingoDiagram.jsx', () => ({ default: () => null }));
vi.mock('../components/GuidedTour/GuidedTour.jsx', () => ({ default: () => null }));
vi.mock('../components/Auth/MigrationModal.jsx', () => ({ default: () => null }));
vi.mock('../pages/Landing.jsx', () => ({ default: () => null }));
vi.mock('@vercel/analytics/react', () => ({ Analytics: () => null }));

beforeEach(() => { vi.clearAllMocks(); window.history.pushState({}, '', '/app'); });

it('chama initAuth uma vez no editor', async () => {
  const { default: App } = await import('../App.jsx');
  render(<App />);
  expect(initAuth).toHaveBeenCalledTimes(1);
});
