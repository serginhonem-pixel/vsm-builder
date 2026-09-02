import { useEffect, useState } from 'react';

/**
 * Botão "Instalar app". Só aparece quando o browser oferece a instalação
 * (evento beforeinstallprompt) e some depois de instalado ou quando o app
 * já está rodando como PWA (display-mode: standalone).
 */
export default function PwaInstallButton() {
  const [promptEvent, setPromptEvent] = useState(null);

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    if (standalone) return;

    const onPrompt = (e) => {
      e.preventDefault();
      setPromptEvent(e);
    };
    const onInstalled = () => setPromptEvent(null);

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (!promptEvent) return null;

  const install = async () => {
    promptEvent.prompt();
    await promptEvent.userChoice;
    setPromptEvent(null);
  };

  return (
    <button type="button" className="hbtn btn-install" onClick={install} title="Instalar o VSM Builder no dispositivo">
      ↓ Instalar app
    </button>
  );
}
