import { TrendingUp, DollarSign, Package, Download, ShoppingBag, Lock, Sparkles, Clock, ArrowRight } from 'lucide-react';
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

function formatCordobas(value?: number | null): string {
  const num = typeof value === 'number' && !isNaN(value) ? value : 0;
  return `C$ ${num.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function MetricCard({
  icon: Icon,
  label,
  value,
  subtitle,
  color,
  badge,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  subtitle?: string;
  color: string;
  badge?: string;
}) {
  return (
    <div className="bg-white rounded-xl p-4 sm:p-5 border border-border hover-lift shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center ${color} shrink-0`}>
              <Icon size={18} className="text-white sm:w-5 sm:h-5" />
            </div>
            <span className="text-xs font-semibold text-secondary uppercase tracking-wider line-clamp-1">{label}</span>
          </div>
          {badge && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0 tabular-nums">
              {badge}
            </span>
          )}
        </div>
        <p className="text-xl sm:text-2xl font-bold text-primary tabular-nums tracking-tight">{value}</p>
      </div>
      {subtitle && (
        <p className="text-xs text-secondary mt-2 tabular-nums truncate">{subtitle}</p>
      )}
    </div>
  );
}

function ProgressBar({ progress, color }: { progress: number; color?: string }) {
  const p = Math.max(0, Math.min(100, progress));
  return (
    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-300 ease-out ${color || (p >= 100 ? 'bg-emerald-500' : p >= 60 ? 'bg-amber-500' : 'bg-blue-600')}`}
        style={{ width: `${p}%` }}
      />
    </div>
  );
}

export function Dashboard({
  dashboard,
  pacas: _pacas,
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="bg-white rounded-xl p-5 border border-border h-28"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-5 border border-border h-64"></div>
          <div className="bg-white rounded-xl p-5 border border-border h-64"></div>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-gray-200 max-w-md mx-auto mt-8 shadow-xs">
        <h3 className="font-bold text-base mb-2 text-gray-800">No se pudieron cargar las métricas</h3>
        <p className="text-xs text-gray-500 mb-4">Revisa la conexión o intenta refrescar.</p>
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg text-xs font-semibold hover:bg-black transition-colors cursor-pointer"
          >
            Reintentar
          </button>
          {onRequestUnlock && (
            <button
              onClick={onRequestUnlock}
              className="px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold hover:bg-blue-100 transition-colors cursor-pointer"
            >
              Reingresar PIN
            </button>
          )}
        </div>
      </div>
    );
  }

  const inventarioProgress = dashboard.total_prendas > 0 
    ? (dashboard.prendas_vendidas / dashboard.total_prendas) * 100 
    : 0;

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">Dashboard</h1>
          <p className="text-sm text-secondary mt-0.5">Control comercial y financiero</p>
        </div>
        <button
          onClick={() => api.downloadExcel()}
          className="flex items-center gap-2 px-3.5 py-2 bg-white border border-border rounded-xl text-xs sm:text-sm font-semibold hover:bg-gray-50 transition-colors shadow-xs cursor-pointer"
        >
          <Download size={15} />
          <span className="hidden sm:inline">Exportar Excel</span>
        </button>
      </div>

      {/* Tarjetas Principales: 2x2 en móviles, 4 cols en desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          icon={DollarSign}
          label="Ventas Hoy"
          value={formatCordobas(dashboard.ventas_hoy)}
          subtitle={`Semana: ${formatCordobas(dashboard.ventas_semana)}`}
          color="bg-black"
        />
        <MetricCard
          icon={TrendingUp}
          label="Margen Bruto"
          value={formatCordobas(dashboard.margen_bruto_realizado)}
          subtitle="Ganancia real de lo vendido"
          badge={`${dashboard.porcentaje_margen_bruto ?? 0}%`}
          color="bg-emerald-600"
        />
        <MetricCard
          icon={ShoppingBag}
          label="Inventario Tienda"
          value={formatCordobas(dashboard.valor_inventario_remanente)}
          subtitle={`${dashboard.prendas_disponibles ?? 0} prendas listas`}
          color="bg-blue-600"
        />
        <MetricCard
          icon={Sparkles}
          label="Ganancia Proyectada"
          value={`+${formatCordobas(dashboard.ganancia_proyectada_inventario)}`}
          subtitle="Al vender stock actual"
          color="bg-indigo-600"
        />
      </div>

      {/* Resumen de Flujo de Caja y Capital (Psicología sin alarmas rojas para amortización normal) */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-border shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Package size={18} className="text-gray-700" />
            <span className="text-sm font-bold text-gray-900">Estado de Capital y Flujo de Caja</span>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full w-fit ${dashboard.ganancia_neta >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
            {dashboard.ganancia_neta >= 0 ? '✓ Capital Total Recuperado' : 'En período de amortización'}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center sm:text-left">
          <div>
            <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider block mb-0.5">Inversión Pacas</span>
            <span className="text-sm sm:text-base font-bold text-gray-900 tabular-nums">{formatCordobas(dashboard.inversion_total)}</span>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider block mb-0.5">Total Cobrado</span>
            <span className="text-sm sm:text-base font-bold text-gray-900 tabular-nums">
              {formatCordobas(dashboard.inversion_total + dashboard.ganancia_neta)}
            </span>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider block mb-0.5">Flujo Neto</span>
            <span className={`text-sm sm:text-base font-bold tabular-nums ${dashboard.ganancia_neta >= 0 ? 'text-emerald-700' : 'text-gray-700'}`}>
              {dashboard.ganancia_neta >= 0 ? `+${formatCordobas(dashboard.ganancia_neta)}` : formatCordobas(dashboard.ganancia_neta)}
            </span>
          </div>
        </div>
      </div>

      {/* Grid Principal: Amortización de Pacas (ROI) y Actividad Reciente */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Semáforo de Amortización por Paca */}
        <div className="bg-white rounded-xl p-5 border border-border shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-emerald-600" />
              <h2 className="text-base font-bold text-primary">Amortización por Paca (ROI)</h2>
            </div>
            <button
              onClick={() => onNavigate('inventory')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
            >
              <span>Ver Pacas</span>
              <ArrowRight size={13} />
            </button>
          </div>

          <div className="space-y-3.5">
            {dashboard.roi_pacas && dashboard.roi_pacas.length > 0 ? (
              dashboard.roi_pacas.map(paca => {
                const isRecovered = paca.estado === 'recuperada';
                const isExhausted = paca.estado === 'agotada';
                const falta = Math.max(0, paca.costo - paca.ingresos_recaudados);

                return (
                  <div key={paca.id} className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/70 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-900">Paca #{paca.id}</span>
                          <span className="text-xs font-medium text-gray-600 truncate max-w-[140px] sm:max-w-[200px]">
                            {paca.descripcion}
                          </span>
                        </div>
                        <span className="text-[11px] text-gray-500 tabular-nums block mt-0.5">
                          Costo: {formatCordobas(paca.costo)} · {paca.peso_lbs} lbs
                        </span>
                      </div>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                        isRecovered
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : isExhausted
                          ? 'bg-gray-200 text-gray-700'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {isRecovered ? '✓ 100% Recuperada' : isExhausted ? 'Agotada' : `${paca.porcentaje_recuperado}%`}
                      </span>
                    </div>

                    <ProgressBar
                      progress={paca.porcentaje_recuperado}
                      color={isRecovered ? 'bg-emerald-500' : 'bg-amber-500'}
                    />

                    <div className="flex items-center justify-between text-[11px] text-gray-600 tabular-nums pt-0.5">
                      <span>Recaudado: <strong className="text-gray-900">{formatCordobas(paca.ingresos_recaudados)}</strong></span>
                      {isRecovered ? (
                        <span className="text-emerald-700 font-bold">+{formatCordobas(paca.ganancia_neta_paca)} ganancia</span>
                      ) : (
                        <span className="text-amber-800 font-medium">Faltan {formatCordobas(falta)}</span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-6 text-secondary text-xs">
                No hay pacas registradas aún.
              </div>
            )}
          </div>
        </div>

        {/* Actividad Reciente (Últimas Ventas) */}
        <div className="bg-white rounded-xl p-5 border border-border shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-gray-700" />
              <h2 className="text-base font-bold text-primary">Últimas Ventas Realizadas</h2>
            </div>
            <button
              onClick={() => onNavigate('reportes')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
            >
              <span>Ver Historial</span>
              <ArrowRight size={13} />
            </button>
          </div>

          <div className="space-y-2.5">
            {dashboard.actividad_reciente && dashboard.actividad_reciente.length > 0 ? (
              dashboard.actividad_reciente.map(venta => (
                <div
                  key={venta.id}
                  className="p-3 rounded-xl border border-gray-100 bg-white hover:bg-gray-50/80 transition-colors flex items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-900">Venta #{venta.id}</span>
                      <span className="text-[11px] text-gray-500 tabular-nums">
                        {new Date(venta.created_at).toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit' })} · {new Date(venta.created_at).toLocaleDateString('es-NI', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 truncate mt-0.5">
                      {venta.resumen}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-sm font-bold text-gray-900 tabular-nums block">
                      {formatCordobas(venta.total)}
                    </span>
                    <span className="text-[10px] text-gray-500 tabular-nums block">
                      {venta.items_count} {venta.items_count === 1 ? 'prenda' : 'prendas'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-secondary text-xs">
                Aún no se han registrado ventas hoy.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Inventario Global */}
      <div className="bg-white rounded-xl p-5 border border-border shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShoppingBag size={18} className="text-primary" />
            <h2 className="text-base font-bold text-primary">Rotación de Inventario Total</h2>
          </div>
          <span className="text-xs font-bold text-gray-900 tabular-nums">
            {inventarioProgress.toFixed(1)}% vendido
          </span>
        </div>
        <div className="flex justify-between text-xs text-secondary mb-2 tabular-nums">
          <span>Total ingresado: <strong className="text-gray-900">{dashboard.total_prendas}</strong> prendas</span>
          <span>Vendidas: <strong className="text-emerald-700">{dashboard.prendas_vendidas}</strong></span>
          <span>En tienda: <strong className="text-blue-700">{dashboard.prendas_disponibles}</strong></span>
        </div>
        <ProgressBar progress={inventarioProgress} color="bg-emerald-500" />
      </div>
    </div>
  );
}
