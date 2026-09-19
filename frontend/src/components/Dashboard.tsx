import { TrendingUp, DollarSign, Package, Download, ShoppingBag, Lock } from 'lucide-react';
import { api } from '../store';
import type { DashboardData, PacaOut } from '../types';

interface DashboardProps {
  dashboard: DashboardData | null;
  pacas: PacaOut[];
  isAdmin: boolean;
  onRequestUnlock: () => void;
  loading: boolean;
  error?: string | null;
  onRefresh: () => void;
  onNavigate: (view: any) => void;
}

function formatCordobas(value: number): string {
  return `C$ ${value.toLocaleString('es-NI', { minimumFractionDigits: 2 })}`;
}

function MetricCard({ icon: Icon, label, value, color }: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl p-5 border border-border hover-lift">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={20} className="text-white" />
        </div>
        <span className="text-xs font-semibold text-secondary uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-bold text-primary tabular-nums">{value}</p>
    </div>
  );
}

function ProgressBar({ progress }: { progress: number }) {
  const p = Math.max(0, Math.min(100, progress));
  return (
    <div className="w-full h-2 bg-surface rounded-full overflow-hidden mt-2">
      <div
        className="h-full rounded-full transition-all duration-300 ease-out"
        style={{
          width: `${p}%`,
          backgroundColor: p >= 100 ? '#22C55E' : p >= 60 ? '#EAB308' : '#0066FF',
        }}
      />
    </div>
  );
}

export function Dashboard({
  dashboard,
  pacas,
  isAdmin,
  onRequestUnlock,
  loading,
  error,
  onRefresh,
  onNavigate,
}: DashboardProps) {
  if (!isAdmin) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-gray-200 max-w-md mx-auto mt-12 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 border border-blue-100">
          <Lock size={28} />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Panel Administrativo</h2>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          Las métricas de inversión, márgenes de ganancia y costos de pacas están protegidas por PIN.
        </p>
        <button
          onClick={onRequestUnlock}
          className="w-full py-3 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-black transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs"
        >
          <Lock size={16} />
          <span>Ingresar PIN de Administrador</span>
        </button>
      </div>
    );
  }

  if (!dashboard && error) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-red-200 text-red-700 max-w-lg mx-auto mt-8 shadow-sm">
        <h3 className="font-bold text-base mb-1 text-red-800">No se pudieron cargar los datos. Revisa la conexión.</h3>
        {error && <p className="text-xs text-gray-600 mb-4">{error}</p>}
        <button
          onClick={onRefresh}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg text-xs font-semibold hover:bg-black transition-colors cursor-pointer"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!dashboard && loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div>
            <div className="h-7 w-36 bg-gray-200 rounded-lg mb-2"></div>
            <div className="h-4 w-28 bg-gray-100 rounded"></div>
          </div>
          <div className="h-9 w-32 bg-gray-200 rounded-lg"></div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="bg-white rounded-xl p-5 border border-border">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-gray-200"></div>
                <div className="h-3 w-20 bg-gray-200 rounded"></div>
              </div>
              <div className="h-8 w-28 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl p-5 border border-border h-24"></div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="p-12 text-center text-secondary">
        <div className="inline-block w-7 h-7 border-2 border-gray-300 border-t-black rounded-full animate-spin mb-3"></div>
        <p className="text-sm font-medium">Cargando métricas...</p>
      </div>
    );
  }

  const inventarioProgress = dashboard.total_prendas > 0 
    ? (dashboard.prendas_vendidas / dashboard.total_prendas) * 100 
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-primary">Dashboard</h1>
          <p className="text-sm text-secondary mt-1">Resumen de actividad</p>
        </div>
        <button
          onClick={() => api.downloadExcel()}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-border rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          <Download size={16} />
          <span className="hidden sm:inline">Exportar Excel</span>
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={DollarSign}
          label="Ventas Hoy"
          value={formatCordobas(dashboard.ventas_hoy)}
          color="bg-accent"
        />
        <MetricCard
          icon={DollarSign}
          label="Ventas Semana"
          value={formatCordobas(dashboard.ventas_semana)}
          color="bg-accent"
        />
        <MetricCard
          icon={Package}
          label="Inversión Total"
          value={formatCordobas(dashboard.inversion_total)}
          color="bg-secondary"
        />
        <MetricCard
          icon={TrendingUp}
          label="Ganancia Neta"
          value={formatCordobas(dashboard.ganancia_neta)}
          color={dashboard.ganancia_neta >= 0 ? 'bg-success' : 'bg-error'}
        />
      </div>

      <div className="bg-white rounded-xl p-5 border border-border">
        <div className="flex items-center gap-2 mb-4">
          <ShoppingBag size={20} className="text-primary" />
          <h2 className="text-lg font-semibold text-primary">Inventario Global</h2>
        </div>
        <div className="flex justify-between text-sm mb-2">
          <span className="text-secondary">Total prendas: {dashboard.total_prendas}</span>
          <span className="text-secondary">Vendidas: {dashboard.prendas_vendidas}</span>
          <span className="text-primary font-medium">Disponibles: {dashboard.prendas_disponibles}</span>
        </div>
        <ProgressBar progress={inventarioProgress} />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-primary mb-4">Pacas Activas</h2>
        <div className="space-y-4">
          {pacas.map(paca => {
            const totalPrendasPaca = paca.categorias.reduce((sum, c) => sum + c.cantidad_total, 0);
            const costoPromedio = totalPrendasPaca > 0 ? paca.costo / totalPrendasPaca : 0;
            const valorPotencial = paca.categorias.reduce((sum, c) => sum + (c.cantidad_total * c.precio_venta), 0);

            return (
              <div key={paca.id} className="bg-white rounded-xl p-5 border border-border hover-lift">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 gap-2">
                  <div>
                    <h3 className="font-medium text-primary text-lg">{paca.descripcion}</h3>
                    <p className="text-xs text-secondary mt-0.5">
                      Costo: {formatCordobas(paca.costo)} · {paca.peso_lbs} lbs
                    </p>
                  </div>
                  <div className="text-left sm:text-right bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                    <span className="text-xs font-semibold text-gray-800 block">
                      {totalPrendasPaca} prendas ({costoPromedio > 0 ? `C$ ${costoPromedio.toFixed(1)} c/u` : 'sin clasificar'})
                    </span>
                    <span className="text-xs text-blue-700 font-medium block">
                      Venta est.: {formatCordobas(valorPotencial)}
                    </span>
                  </div>
                </div>
              
              <div className="space-y-3">
                {paca.categorias.map(cat => {
                  const progress = cat.cantidad_total > 0 
                    ? ((cat.cantidad_total - cat.cantidad_disponible) / cat.cantidad_total) * 100 
                    : 0;
                  return (
                    <div key={cat.id} className="text-sm">
                      <div className="flex justify-between mb-1">
                        <span className="font-medium">{cat.nombre}</span>
                        <span className="text-secondary">
                          {cat.cantidad_disponible} / {cat.cantidad_total} disp. · {formatCordobas(cat.precio_venta)} c/u
                        </span>
                      </div>
                      <ProgressBar progress={progress} />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {pacas.length === 0 && (
          <div className="p-8 text-center bg-white rounded-2xl border border-border max-w-md mx-auto my-6 shadow-xs">
            <Package size={32} className="mx-auto text-gray-400 mb-3" />
            <p className="text-secondary text-sm mb-4">
              No tienes pacas todavía — registra la primera para empezar.
            </p>
            <button
              onClick={() => onNavigate('inventory')}
              className="px-4 py-2.5 bg-primary text-white rounded-xl text-xs font-semibold hover:bg-black transition-colors cursor-pointer"
            >
              Registrar paca
            </button>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
