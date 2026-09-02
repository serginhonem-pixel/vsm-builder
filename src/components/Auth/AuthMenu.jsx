import { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore.js';
import './Auth.css';

const PLAN_LABEL = { free: 'Grátis', pro: 'Pro', team: 'Time' };

export default function AuthMenu() {
  const user = useAuthStore((s) => s.user);
  const plan = useAuthStore((s) => s.plan);
  const status = useAuthStore((s) => s.status);
  const signIn = useAuthStore((s) => s.signInWithGoogle);
  const signOut = useAuthStore((s) => s.signOut);
  const [open, setOpen] = useState(false);

  if (!user) {
    return (
      <button type="button" className="hbtn auth-signin" onClick={signIn}
        disabled={status === 'loading'}>
        {status === 'loading' ? 'Entrando…' : 'Entrar'}
      </button>
    );
  }

  const initial = (user.displayName || user.email || '?').charAt(0).toUpperCase();
  return (
    <div className="auth-menu">
      <button type="button" className="auth-avatar" onClick={() => setOpen((v) => !v)}
        aria-label={user.displayName || 'Conta'}>
        {user.photoURL
          ? <img src={user.photoURL} alt="" width="26" height="26" />
          : <span className="auth-avatar-fallback">{initial}</span>}
      </button>
      {open && (
        <>
          <div className="auth-backdrop" onClick={() => setOpen(false)} />
          <div className="auth-pop">
            <div className="auth-pop-name">{user.displayName}</div>
            <div className="auth-pop-email">{user.email}</div>
            <div className="auth-pop-plan">Plano: <strong>{PLAN_LABEL[plan]}</strong></div>
            <button type="button" className="auth-pop-signout"
              onClick={() => { setOpen(false); signOut(); }}>Sair</button>
          </div>
        </>
      )}
    </div>
  );
}
