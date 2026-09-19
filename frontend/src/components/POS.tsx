import { useState, useMemo } from 'react';
import { Check, X, Search, ShoppingCart, Trash2, ArrowRight, Banknote } from 'lucide-react';
import type { PacaOut, CategoriaOut, View } from '../types';
import {
  addToCart as addCartHelper,
  removeFromCart as removeCartHelper,
  updateCartQuantity,
  decrementCartItem,
  calculateCartTotal,
  calculateChange,
  type CartItem,
} from '../cart';

interface POSProps {
  pacas: PacaOut[];
  loading?: boolean;
  onNavigate?: (view: View) => void;
  onSell: (items: { paca_categoria_id: number; cantidad: number }[]) => Promise<void>;
  error: string | null;
}

const COMMON_DENOMINATIONS = [100, 200, 500, 1000];

export function POS({ pacas, loading, onNavigate, onSell, error }: POSProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [lastSaleSuccess, setLastSaleSuccess] = useState<string | null>(null);

  // Filtro y búsqueda rápida
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPacaFilter, setSelectedPacaFilter] = useState<string>('all');

  // BottomSheet de Calculadora de Vuelto Express
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [paidInput, setPaidInput] = useState('');

  // Catálogo de prendas disponibles; la paca solo conserva el origen.
  const allCategories = useMemo(() => {
    const list: (CategoriaOut & { paca_desc: string; paca_id: number })[] = [];
    pacas.forEach(paca => {
      paca.categorias.forEach(cat => {
        if (cat.cantidad_disponible > 0) {
          list.push({ ...cat, paca_desc: paca.descripcion, paca_id: paca.id });
        }
      });
    });
    return list;
  }, [pacas]);

  // Orígenes disponibles para un filtro secundario.
  const pacaOptions = useMemo(() => {
    const map = new Map<number, string>();
    allCategories.forEach(c => map.set(c.paca_id, c.paca_desc));
    return Array.from(map.entries()).map(([id, desc]) => ({ id, desc }));
  }, [allCategories]);

  // Prendas filtradas por nombre, precio u origen.
  const filteredCategories = useMemo(() => {
    return allCategories.filter(cat => {
      if (selectedPacaFilter !== 'all' && cat.paca_id.toString() !== selectedPacaFilter) {
        return false;
      }
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesName = cat.nombre.toLowerCase().includes(query);
        const matchesPaca = cat.paca_desc.toLowerCase().includes(query);
        const matchesPrice = cat.precio_venta.toString().includes(query);
        return matchesName || matchesPaca || matchesPrice;
      }
      return true;
    });
  }, [allCategories, selectedPacaFilter, searchTerm]);

  // One-Tap Add: suma al carrito de inmediato sin confirmación
  const addToCart = (cat: CategoriaOut & { paca_desc: string }) => {
    setLastSaleSuccess(null);
    setCart(prev => addCartHelper(prev, cat));
  };

  const removeFromCart = (id: number) => {
    setCart(prev => removeCartHelper(prev, id));
  };

  const updateQuantity = (id: number, val: number) => {
    setCart(prev => updateCartQuantity(prev, id, Math.floor(val) || 1));
  };

  const handleDecrement = (id: number) => {
    setCart(prev => decrementCartItem(prev, id));
  };

  const total = calculateCartTotal(cart);
  const totalItems = cart.reduce((sum, item) => sum + item.cantidad, 0);

  // Cálculos de vuelto
  const paidAmount = parseFloat(paidInput) || 0;
  const { change, isSufficient, difference } = calculateChange(total, paidAmount);

  const confirmSale = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      const soldTotal = total;
      const finalPaid = paidAmount;
      const finalChange = change;

      await onSell(cart.map(i => ({ paca_categoria_id: i.paca_categoria_id, cantidad: i.cantidad })));

      let msg = `Venta de C$ ${soldTotal.toLocaleString('es-NI', { minimumFractionDigits: 2 })} registrada`;
      if (paidInput !== '' && finalPaid >= soldTotal) {
        msg += ` · Pagó: C$ ${finalPaid.toLocaleString('es-NI', { minimumFractionDigits: 2 })} · Vuelto: C$ ${finalChange.toLocaleString('es-NI', { minimumFractionDigits: 2 })}`;
      }
      setLastSaleSuccess(msg);
      setCart([]);
      setShowCheckoutModal(false);
      setPaidInput('');
    } catch {
      // Error manejado en el store
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 pb-44 lg:pb-28 relative">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Punto de Venta</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Toca las prendas para sumar al cobro. Rápido y sin confirmaciones.
          </p>
        </div>

        {/* Buscador de prendas y filtro de origen opcional */}
        {allCategories.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-56">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar prenda..."
                className="w-full pl-9 pr-7 py-2 rounded-xl border border-gray-200 bg-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-1 cursor-pointer"
                  aria-label="Limpiar búsqueda"
                >
                  ✕
                </button>
              )}
            </div>

            {pacaOptions.length > 1 && (
              <select
                value={selectedPacaFilter}
                onChange={e => setSelectedPacaFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-black cursor-pointer"
              >
                <option value="all">Todos los orígenes ({allCategories.length})</option>
                {pacaOptions.map(p => (
                  <option key={p.id} value={p.id.toString()}>
                    {p.desc}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      {/* Persistent success banner (F6) */}
      {lastSaleSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center justify-between text-sm shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
              <Check size={14} />
            </div>
            <span className="font-semibold">{lastSaleSuccess}</span>
          </div>
          <button
            onClick={() => setLastSaleSuccess(null)}
            className="text-emerald-700 hover:text-emerald-950 p-1 rounded-lg hover:bg-emerald-100/60 transition-colors cursor-pointer"
            aria-label="Cerrar confirmación de venta"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Cuadrícula de Catálogo Táctil / Skeletons / Estado Vacío */}
      {loading && allCategories.length === 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map(n => (
            <div key={n} className="bg-white rounded-2xl p-4 border border-gray-200 h-32">
              <div className="h-3 w-20 bg-gray-200 rounded mb-2"></div>
              <div className="h-5 w-28 bg-gray-200 rounded mb-3"></div>
              <div className="h-4 w-16 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : allCategories.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center max-w-md mx-auto my-6 shadow-xs">
          <p className="text-gray-500 text-sm mb-4">
            Sin stock disponible — clasifica prendas en Inventario para vender.
          </p>
          {onNavigate && (
            <button
              onClick={() => onNavigate('inventory')}
              className="px-4 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-semibold hover:bg-black transition-colors cursor-pointer shadow-xs"
            >
              Ir a Inventario
            </button>
          )}
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-xs">
          <p className="text-gray-500 text-sm">No se encontraron prendas que coincidan con la búsqueda.</p>
          <button
            type="button"
            onClick={() => { setSearchTerm(''); setSelectedPacaFilter('all'); }}
            className="mt-2 text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
          >
            Restablecer filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filteredCategories.map(cat => {
            const inCart = cart.find(i => i.paca_categoria_id === cat.id);
            const qtyInCart = inCart ? inCart.cantidad : 0;
            const remainingStock = cat.cantidad_disponible - qtyInCart;
            const isOutOfStock = remainingStock <= 0;

            return (
              <button
                key={cat.id}
                type="button"
                disabled={isOutOfStock}
                onClick={() => addToCart(cat)}
                className={`relative rounded-2xl p-3.5 sm:p-4 border text-left transition-all duration-150 select-none flex flex-col justify-between min-h-[115px] ${
                  isOutOfStock
                    ? 'opacity-40 bg-gray-100/80 border-dashed border-gray-300 cursor-not-allowed'
                    : qtyInCart > 0
                    ? 'bg-blue-50/40 border-blue-500 shadow-xs active:scale-[0.96] cursor-pointer ring-2 ring-blue-500/20'
                    : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-xs active:scale-[0.96] cursor-pointer'
                }`}
              >
                {/* Cabecera de la tarjeta con paca y badge de estado */}
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider truncate">
                    Origen: {cat.paca_desc}
                  </span>
                  {qtyInCart > 0 && (
                    <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-black bg-blue-600 text-white shadow-xs animate-in zoom-in-75">
                      {qtyInCart} en venta
                    </span>
                  )}
                  {isOutOfStock && qtyInCart === 0 && (
                    <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-200 text-gray-600">
                      Agotado
                    </span>
                  )}
                  {isOutOfStock && qtyInCart > 0 && (
                    <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                      Sin más stock
                    </span>
                  )}
                </div>

                <div className="font-bold text-sm sm:text-base text-gray-900 leading-tight mb-2 truncate">
                  {cat.nombre}
                </div>

                <div className="flex items-baseline justify-between mt-auto pt-1.5 border-t border-gray-100">
                  <span className="text-base sm:text-lg font-black text-gray-900 tabular-nums">
                    C$ {cat.precio_venta.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                  </span>
                  <span
                    className={`text-[11px] sm:text-xs tabular-nums font-semibold ${
                      isOutOfStock ? 'text-gray-400' : remainingStock <= 2 ? 'text-amber-600' : 'text-emerald-700'
                    }`}
                  >
                    {remainingStock} disp.
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Detalle del carrito en pantalla */}
      {cart.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <ShoppingCart size={16} className="text-blue-600" />
              <span>Prendas en esta Venta ({totalItems})</span>
            </h3>
            <button
              type="button"
              onClick={() => setCart([])}
              className="text-xs text-red-600 hover:text-red-800 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Trash2 size={13} />
              <span>Vaciar Carrito</span>
            </button>
          </div>

          <div className="space-y-2.5 divide-y divide-gray-100">
            {cart.map((item) => (
              <div key={item.paca_categoria_id} className="pt-2.5 first:pt-0 flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-xs sm:text-sm font-bold text-gray-900 truncate">{item.nombre}</div>
                  <div className="text-xs text-gray-500 tabular-nums">
                    C$ {item.precio.toLocaleString('es-NI', { minimumFractionDigits: 2 })} c/u · máx {item.cantidad_disponible}
                  </div>
                </div>

                {/* Steppers táctiles por línea */}
                <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleDecrement(item.paca_categoria_id)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-white text-gray-700 hover:bg-gray-200 font-bold text-base cursor-pointer shadow-xs active:scale-95 transition-all select-none"
                    aria-label={`Disminuir cantidad de ${item.nombre}`}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={item.cantidad_disponible}
                    inputMode="numeric"
                    value={item.cantidad}
                    onChange={(e) => updateQuantity(item.paca_categoria_id, parseInt(e.target.value) || 1)}
                    className="w-10 text-center text-sm font-bold bg-transparent border-0 focus:outline-none p-0 tabular-nums text-gray-900"
                    aria-label={`Cantidad para ${item.nombre}`}
                  />
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.paca_categoria_id, item.cantidad + 1)}
                    disabled={item.cantidad >= item.cantidad_disponible}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-white text-gray-700 hover:bg-gray-200 font-bold text-base cursor-pointer shadow-xs active:scale-95 transition-all select-none disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label={`Aumentar cantidad de ${item.nombre}`}
                  >
                    +
                  </button>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="text-sm sm:text-base font-black text-gray-900 tabular-nums">
                    C$ {(item.precio * item.cantidad).toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.paca_categoria_id)}
                    aria-label={`Eliminar ${item.nombre} de la venta`}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 cursor-pointer transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BARRA DE COBRO FIJA (Sticky Bottom) — Flota siempre por encima de la barra de navegación móvil */}
      {cart.length > 0 && (
        <div className="fixed bottom-[65px] lg:bottom-4 inset-x-0 lg:left-64 z-30 px-3 sm:px-6 pointer-events-none">
          <div className="max-w-5xl mx-auto pointer-events-auto">
            <div className="bg-gray-900 text-white rounded-2xl p-3 sm:p-4 shadow-2xl border border-gray-800 flex items-center justify-between gap-3 animate-in slide-in-from-bottom-5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  <ShoppingCart size={18} className="text-white" />
                </div>
                <div className="truncate">
                  <span className="block text-[11px] sm:text-xs text-gray-400 font-medium truncate">
                    {totalItems} {totalItems === 1 ? 'prenda' : 'prendas'} en total
                  </span>
                  <span className="text-lg sm:text-2xl font-black text-white tabular-nums tracking-tight">
                    C$ {total.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setPaidInput('');
                  setShowCheckoutModal(true);
                }}
                className="shrink-0 flex items-center gap-2 px-4 sm:px-6 py-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer select-none"
              >
                <span>Confirmar Venta</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CALCULADORA DE VUELTO EXPRESS (BottomSheet Móvil / Modal Desktop) */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div
            className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl border border-gray-200 animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-2 space-y-4 max-h-[92vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
          >
            {/* Cabecera del BottomSheet */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Banknote size={20} className="text-emerald-600" />
                <h2 className="text-base sm:text-lg font-bold text-gray-900">
                  Cobro en Efectivo y Vuelto
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowCheckoutModal(false)}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                aria-label="Cerrar calculadora de cobro"
              >
                <X size={20} />
              </button>
            </div>

            {/* Total a cobrar */}
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 text-center">
              <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Total a Cobrar ({totalItems} prendas)
              </span>
              <span className="text-2xl sm:text-3xl font-black text-gray-900 tabular-nums">
                C$ {total.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Selector de denominaciones y entrada de pago */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">
                ¿Con cuánto paga el cliente?
              </label>

              {/* Botones de billetes comunes */}
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                <button
                  type="button"
                  onClick={() => setPaidInput(total.toString())}
                  className={`min-h-[44px] px-2 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer select-none flex flex-col items-center justify-center ${
                    paidAmount === total
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                  }`}
                >
                  <span>Exacto</span>
                  <span className="text-[10px] opacity-90 tabular-nums">C$ {total.toFixed(0)}</span>
                </button>
                {COMMON_DENOMINATIONS.map(denom => (
                  <button
                    key={denom}
                    type="button"
                    onClick={() => setPaidInput(denom.toString())}
                    className={`min-h-[44px] px-2 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer select-none flex flex-col items-center justify-center ${
                      paidAmount === denom
                        ? 'bg-gray-900 text-white border-gray-900 shadow-xs'
                        : 'bg-white text-gray-800 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <span>C$ {denom}</span>
                  </button>
                ))}
              </div>

              {/* Input numérico directo */}
              <div className="relative pt-1">
                <div className="absolute inset-y-0 left-0 pt-1 pl-3.5 flex items-center pointer-events-none text-gray-500 font-bold text-sm">
                  C$
                </div>
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min="0"
                  placeholder="Digitar monto recibido..."
                  value={paidInput}
                  onChange={e => setPaidInput(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-300 bg-gray-50 text-gray-900 font-bold text-base focus:bg-white focus:outline-none focus:ring-2 focus:ring-black tabular-nums"
                  autoFocus
                />
                {paidInput && (
                  <button
                    type="button"
                    onClick={() => setPaidInput('')}
                    className="absolute inset-y-0 right-0 pt-1 pr-3 flex items-center text-gray-400 hover:text-gray-700 cursor-pointer"
                    aria-label="Borrar monto ingresado"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Tarjeta de Vuelto en Vivo */}
            {paidInput !== '' && isSufficient ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-center animate-in zoom-in-95">
                <span className="block text-xs font-bold uppercase tracking-wider text-emerald-700">
                  Vuelto a entregar al cliente
                </span>
                <span className="text-3xl sm:text-4xl font-black text-emerald-700 tabular-nums">
                  C$ {change.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                </span>
                {change === 0 && (
                  <span className="block text-xs font-semibold text-emerald-600 mt-1">
                    ✓ Pago exacto recibido
                  </span>
                )}
              </div>
            ) : paidInput !== '' && !isSufficient ? (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-center animate-in zoom-in-95">
                <span className="block text-xs font-bold uppercase tracking-wider text-amber-700">
                  Monto Insuficiente
                </span>
                <span className="text-2xl font-black text-amber-800 tabular-nums">
                  Faltan C$ {difference.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                </span>
                <span className="block text-xs font-medium text-amber-600 mt-1">
                  El dinero entregado no cubre el total de la compra
                </span>
              </div>
            ) : (
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-center text-xs text-gray-500">
                Selecciona una denominación rápida o digita con cuánto paga el cliente.
              </div>
            )}

            {/* Botones de acción final */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowCheckoutModal(false)}
                className="w-1/3 min-h-[48px] py-3 rounded-xl border border-gray-300 text-gray-700 font-semibold text-xs hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={submitting || (paidInput !== '' && !isSufficient)}
                onClick={confirmSale}
                className="flex-1 min-h-[48px] flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white py-3 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
              >
                <Check size={18} />
                <span>
                  {submitting
                    ? 'Registrando...'
                    : `Cobrar C$ ${total.toLocaleString('es-NI', { minimumFractionDigits: 2 })}`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
