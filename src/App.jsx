import { useState } from 'react';
import Header from './components/Layout/Header.jsx';
import Sidebar from './components/Layout/Sidebar.jsx';
import VsmLayout from './components/VsmLayout/VsmLayout.jsx';
import PropertiesPanel from './components/PropertiesPanel/PropertiesPanel.jsx';
import ShingoDiagram from './components/ShingoDiagram/ShingoDiagram.jsx';
import GuidedTour from './components/GuidedTour/GuidedTour.jsx';
import { useVsmStore } from './store/useVsmStore.js';

export default function App() {
  const [view, setView]         = useState('vsm');
  const [drawerOpen, setDrawer] = useState(false);
  const [tourRunning, setTour]  = useState(false);
  const selectedId  = useVsmStore((s) => s.selectedId);
  const setSelected = useVsmStore((s) => s.setSelected);

  return (
    <div className="app-shell">
      <Header
        onOpenShingo={() => setView('shingo')}
        onBackToVsm={() => setView('vsm')}
        activeView={view}
        drawerOpen={drawerOpen}
        onToggleDrawer={() => setDrawer((v) => !v)}
        onStartTour={() => { setDrawer(false); setView('vsm'); setTour(true); }}
      />

      {tourRunning && (
        <GuidedTour
          onClose={() => setTour(false)}
          onOpenDrawer={() => setDrawer(true)}
          onCloseDrawer={() => setDrawer(false)}
          onSelectFirstProcess={() => {
            const procs = useVsmStore.getState().processes;
            if (procs[0]) useVsmStore.getState().setSelected('proc-' + procs[0].id);
          }}
          onDeselectProcess={() => useVsmStore.getState().setSelected(null)}
        />
      )}

      {view === 'vsm' ? (
        <div className="app-body">
          <VsmLayout />

          {/* Sidebar drawer */}
          {drawerOpen && (
            <div className="drawer-backdrop" onClick={() => setDrawer(false)} />
          )}
          <div className={`sidebar-drawer${drawerOpen ? ' drawer-open' : ''}`}>
            <div className="drawer-header">
              <span className="drawer-title">Menu</span>
              <button className="drawer-close" onClick={() => setDrawer(false)}>✕</button>
            </div>
            <Sidebar />
          </div>

          {/* Properties float */}
          {selectedId && (
            <div data-tour="props-float" className="props-float">
              <PropertiesPanel onClose={() => setSelected(null)} />
            </div>
          )}
        </div>
      ) : (
        <ShingoDiagram onBack={() => setView('vsm')} />
      )}
    </div>
  );
}
