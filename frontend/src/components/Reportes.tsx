import React, { useState, useEffect } from 'react';
import { Download, Search, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import { api } from '../store';
import type { VentaOut } from '../types';

interface ReportesProps {
  isAdmin?: boolean;
  onRequestUnlock?: () => void;
  initialDesde?: string;
  initialHasta?: string;
  onDatesChange?: (desde: string, hasta: string) => void;
}

export function Reportes({
  isAdmin,
  onRequestUnlock,
  initialDesde,
  initialHasta,
  onDatesChange,
}: ReportesProps) {
  const [desde, setDesde] = useState(initialDesde || '');
  const [hasta, setHasta] = useState(initialHasta || '');
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [ventas, setVentas] = useState<VentaOut[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const fetchVentas = async () => {
    if (desde && hasta && desde > hasta) {
      setRangeError('La fecha "Desde" no puede ser posterior a "Hasta"');
      return;
    }
    setRangeError(null);
    setFetchError(null);
    setLoading(true);

    if (onDatesChange) {
      onDatesChange(desde, hasta);
    }

    try {
      const data = await api.getVentas(desde || undefined, hasta || undefined);
      setVentas(data);
    } catch {
      setFetchError('No se pudieron cargar las ventas. Revisa la conexión.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVentas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleExpand = (id: number) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const handleDownload = async () => {
    if (!isAdmin && onRequestUnlock) {
      onRequestUnlock();
      return;
    }
    try {
      await api.downloadExcel();
    } catch (err: any) {
      if (onRequestUnlock && err?.message?.toLowerCase().includes('pin')) {
        onRequestUnlock();
      } else {
        alert(err?.message || 'Error al exportar Excel');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-primary">Reportes</h1>
          <p className="text-sm text-secondary mt-1">Historial de ventas y reportes</p>
        </div>
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-border rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer"
          title={isAdmin ? 'Descargar reporte Excel' : 'Requiere PIN de Administrador'}
        >
          {isAdmin ? <Download size={16} /> : <Lock size={15} className="text-gray-500" />}
          <span className="hidden sm:inline">Exportar Excel</span>
        </button>
      </div>

      <div className="bg-white rounded-xl p-5 border border-border">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-xs font-semibold tracking-wider text-gray-500 uppercase mb-1.5">Desde</label>
            <input
              type="date"
              value={desde}
              onChange={e => {
                setDesde(e.target.value);
                setRangeError(null);
              }}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
          <div className="flex-1 w-full">
            <label className="block text-xs font-semibold tracking-wider text-gray-500 uppercase mb-1.5">Hasta</label>
            <input
              type="date"
              value={hasta}
              onChange={e => {
                setHasta(e.target.value);
                setRangeError(null);
              }}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
          <button
            onClick={fetchVentas}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-6 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors w-full sm:w-auto h-[38px] cursor-pointer"
          >
            <Search size={16} />
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </div>
        {rangeError && (
          <div className="mt-3 text-xs text-red-600 font-semibold bg-red-50 p-2.5 rounded-lg border border-red-200 animate-in fade-in">
            {rangeError}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4 text-center">Items</th>
                <th className="px-6 py-4 text-right">Total</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ventas.map(venta => (
                <React.Fragment key={venta.id}>
                  <tr className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => toggleExpand(venta.id)}>
                    <td className="px-6 py-4 font-medium tabular-nums">#{venta.id}</td>
                    <td className="px-6 py-4 text-gray-600 tabular-nums">
                      {new Date(venta.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center text-gray-600 tabular-nums">
                      {venta.items.reduce((acc, i) => acc + i.cantidad, 0)}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-primary tabular-nums">
                      C$ {venta.total.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-600">
                      <button
                        type="button"
                        aria-expanded={expandedId === venta.id}
                        aria-label={`${expandedId === venta.id ? 'Colapsar' : 'Expandir'} venta #${venta.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(venta.id);
                        }}
                        className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                      >
                        {expandedId === venta.id ? (
                          <ChevronUp size={18} />
                        ) : (
                          <ChevronDown size={18} />
                        )}
                      </button>
                    </td>
                  </tr>
                  {expandedId === venta.id && (
                    <tr className="bg-gray-50/50">
                      <td colSpan={5} className="px-6 py-4">
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                          <table className="w-full text-xs">
                            <thead className="bg-gray-100 text-gray-500">
                              <tr>
                                <th className="px-4 py-2 text-left font-medium">Cat ID</th>
                                <th className="px-4 py-2 text-center font-medium">Cantidad</th>
                                <th className="px-4 py-2 text-right font-medium">Precio Unit.</th>
                                <th className="px-4 py-2 text-right font-medium">Subtotal</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                              {venta.items.map(item => (
                                <tr key={item.id}>
                                  <td className="px-4 py-2 tabular-nums">{item.paca_categoria_id}</td>
                                  <td className="px-4 py-2 text-center tabular-nums">{item.cantidad}</td>
                                  <td className="px-4 py-2 text-right tabular-nums">C$ {item.precio_unitario.toFixed(2)}</td>
                                  <td className="px-4 py-2 text-right font-medium tabular-nums">C$ {item.subtotal.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}

              {/* F4 error state */}
              {fetchError && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-red-600 bg-red-50/50">
                    <p className="font-semibold text-sm mb-2">{fetchError}</p>
                    <button
                      onClick={fetchVentas}
                      className="px-4 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-semibold hover:bg-black transition-colors cursor-pointer"
                    >
                      Reintentar
                    </button>
                  </td>
                </tr>
              )}

              {/* Empty state when not loading and no error */}
              {ventas.length === 0 && !loading && !fetchError && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No se encontraron ventas en este período.
                  </td>
                </tr>
              )}

              {/* Loading state only when there is nothing to show yet (F8) */}
              {loading && ventas.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    Cargando...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
