import { LayoutDashboard, Package, ShoppingCart, FileSpreadsheet, Lock, Unlock } from 'lucide-react';
import type { View } from '../types';

interface LayoutProps {
  currentView: View;
  onNavigate: (view: View) => void;
  isAdmin: boolean;
  onOpenPinModal: () => void;
  onLogoutAdmin: () => void;
  children: React.ReactNode;
}

const NAV_ITEMS: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'inventory', label: 'Inventario', icon: Package },
  { id: 'pos', label: 'POS', icon: ShoppingCart },
  { id: 'reportes', label: 'Reportes', icon: FileSpreadsheet },
];

export function Layout({
  currentView,
  onNavigate,
  isAdmin,
  onOpenPinModal,
  onLogoutAdmin,
  children,
}: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Sidebar — desktop only */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-primary text-white">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            <ShoppingCart size={18} />
          </div>
          <span className="text-lg font-bold tracking-tight">Restoque</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const active = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
                  active
                    ? 'bg-accent text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon size={20} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Admin status in desktop sidebar */}
        <div className="p-4 border-t border-white/10 mt-auto">
          {isAdmin ? (
            <div className="flex items-center justify-between bg-white/5 rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-xs font-semibold text-white tracking-wide">Modo Admin</span>
              </div>
              <button
                onClick={onLogoutAdmin}
                className="text-white/60 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                title="Bloquear y volver a modo cajero"
                aria-label="Bloquear modo admin"
              >
                <Lock size={15} />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenPinModal}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-white/10 hover:bg-white/15 text-white text-xs font-medium rounded-xl transition-all cursor-pointer border border-white/5 hover:border-white/20"
            >
              <Lock size={14} />
              <span>Desbloquear Admin</span>
            </button>
          )}
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden bg-white/95 backdrop-blur border-b border-border px-4 py-3 sticky top-0 z-40 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gray-900 flex items-center justify-center text-white">
            <ShoppingCart size={15} />
          </div>
          <span className="font-bold text-base tracking-tight text-gray-900">Restoque</span>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin ? (
            <button
              onClick={onLogoutAdmin}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium cursor-pointer"
              title="Tocar para bloquear modo admin"
              aria-label="Cerrar sesión de administrador"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>Admin</span>
              <Unlock size={12} className="ml-0.5 text-emerald-600" />
            </button>
          ) : (
            <button
              onClick={onOpenPinModal}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 text-xs font-medium transition-colors cursor-pointer"
              aria-label="Desbloquear modo administrador con PIN"
            >
              <Lock size={12} />
              <span>PIN Admin</span>
            </button>
          )}
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 uppercase tracking-wide">
            {currentView}
          </span>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 lg:ml-64 pb-24 lg:pb-8">
        <div className="max-w-5xl mx-auto px-4 py-5 lg:px-8">
          {children}
        </div>
      </main>

      {/* Bottom nav — mobile only */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-border z-50">
        <div className="flex justify-around py-2">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const active = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors duration-200 ${
                  active ? 'text-accent' : 'text-secondary'
                }`}
              >
                <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
                <span className={`text-xs font-medium ${active ? 'text-accent' : 'text-secondary'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
