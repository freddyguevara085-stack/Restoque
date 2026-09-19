import { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Inventory } from './components/Inventory';
import { POS } from './components/POS';
import { Reportes } from './components/Reportes';
import { PinModal } from './components/PinModal';
import { useStore } from './store';
import { parseHashString, serializeHash } from './cart';
import type { View } from './types';

export default function App() {
  const [initialState] = useState(() => parseHashString(window.location.hash));
  const [view, setView] = useState<View>(initialState.view);
  const [reportesDates, setReportesDates] = useState<{ desde?: string; hasta?: string }>({
    desde: initialState.desde,
    hasta: initialState.hasta,
  });
  const [showPinModal, setShowPinModal] = useState(false);
  const store = useStore();

  useEffect(() => {
    const onHashChange = () => {
      const parsed = parseHashString(window.location.hash);
      setView(parsed.view);
      if (parsed.view === 'reportes') {
        setReportesDates({ desde: parsed.desde, hasta: parsed.hasta });
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const handleNavigate = (newView: View) => {
    const newHash = serializeHash(newView, reportesDates);
    window.history.replaceState(null, '', newHash);
    setView(newView);
  };

  const handleReportesDatesChange = (desde: string, hasta: string) => {
    setReportesDates({ desde, hasta });
    const p = new URLSearchParams();
    if (desde) p.set('desde', desde);
    if (hasta) p.set('hasta', hasta);
    const qs = p.toString();
    window.history.replaceState(null, '', qs ? `#reportes&${qs}` : '#reportes');
  };

  const handleRequestUnlock = () => {
    setShowPinModal(true);
  };

  return (
    <>
      <Layout
        currentView={view}
        onNavigate={handleNavigate}
        isAdmin={store.isAdmin}
        onOpenPinModal={handleRequestUnlock}
        onLogoutAdmin={store.logoutAdmin}
      >
        {view === 'dashboard' && (
          <Dashboard
            dashboard={store.dashboard}
            pacas={store.pacas}
            isAdmin={store.isAdmin}
            onRequestUnlock={handleRequestUnlock}
            loading={store.loading}
            error={store.error}
            onRefresh={store.refresh}
            onNavigate={handleNavigate}
          />
        )}
        {view === 'inventory' && (
          <Inventory
            pacas={store.pacas}
            loading={store.loading}
            isAdmin={store.isAdmin}
            onRequestUnlock={handleRequestUnlock}
            onAddPaca={store.addPaca}
            onDeletePaca={store.deletePaca}
            onAddPrendas={store.addPrendas}
          />
        )}
        {view === 'pos' && (
          <POS
            pacas={store.pacas}
            loading={store.loading}
            onNavigate={handleNavigate}
            onSell={store.sellItems}
            error={store.error}
          />
        )}
        {view === 'reportes' && (
          <Reportes
            isAdmin={store.isAdmin}
            onRequestUnlock={handleRequestUnlock}
            initialDesde={reportesDates.desde}
            initialHasta={reportesDates.hasta}
            onDatesChange={handleReportesDatesChange}
          />
        )}
      </Layout>

      <PinModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onVerify={store.loginAdmin}
      />
    </>
  );
}
