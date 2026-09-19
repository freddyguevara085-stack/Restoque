import { useState, useMemo } from 'react';
import { Check, X } from 'lucide-react';
import type { PacaOut, CategoriaOut, View } from '../types';
import {
  addToCart as addCartHelper,
  removeFromCart as removeCartHelper,
  updateCartQuantity,
  decrementCartItem,
  calculateCartTotal,
  type CartItem,
} from '../cart';

interface POSProps {
  pacas: PacaOut[];
  loading?: boolean;
  onNavigate?: (view: View) => void;
  onSell: (items: { paca_categoria_id: number; cantidad: number }[]) => Promise<void>;
  error: string | null;
}

export function POS({ pacas, loading, onNavigate, onSell, error }: POSProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [lastSaleSuccess, setLastSaleSuccess] = useState<string | null>(null);

  // Flatten all categories with stock > 0
  const availableCategories = useMemo(() => {
    const list: (CategoriaOut & { paca_desc: string })[] = [];
    pacas.forEach(paca => {
      paca.categorias.forEach(cat => {
        if (cat.cantidad_disponible > 0) {
          list.push({ ...cat, paca_desc: paca.descripcion });
        }
      });
    });
    return list;
  }, [pacas]);

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

  const confirmSale = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      const soldTotal = total;
      await onSell(cart.map(i => ({ paca_categoria_id: i.paca_categoria_id, cantidad: i.cantidad })));
      setLastSaleSuccess(`Venta de C$ ${soldTotal.toLocaleString('es-NI', { minimumFractionDigits: 2 })} registrada`);
      setCart([]);
    } catch {
      // Error is handled by store and passed as prop
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 pb-24 lg:pb-6 relative">
      <div>
        <h1 className="text-2xl font-bold text-primary">Punto de Venta</h1>
        <p className="text-sm text-secondary mt-1">Selecciona categorías para vender</p>
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

      {/* Category grid / Skeleton / Empty state */}
      {loading && availableCategories.length === 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map(n => (
            <div key={n} className="bg-white rounded-xl p-4 border border-border h-28">
              <div className="h-3 w-24 bg-gray-200 rounded mb-2"></div>
              <div className="h-6 w-20 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 w-16 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : availableCategories.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border p-8 text-center max-w-md mx-auto my-6 shadow-xs">
          <p className="text-secondary text-sm mb-4">
            Sin stock disponible — clasifica prendas en Inventario para vender.
          </p>
          {onNavigate && (
            <button
              onClick={() => onNavigate('inventory')}
              className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-black transition-colors cursor-pointer"
            >
              Ir a Inventario
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {availableCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => addToCart(cat)}
              className="bg-white rounded-xl p-4 border border-border text-left hover-lift active:scale-[0.97] transition-all duration-200 cursor-pointer"
            >
              <span className="block text-xs font-medium text-secondary uppercase tracking-wider mb-2">
                {cat.paca_desc} - {cat.nombre}
              </span>
              <span className="block text-xl font-bold text-primary tabular-nums">
                C$ {cat.precio_venta.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
              </span>
              <span className="block text-xs text-secondary mt-1 tabular-nums">
                {cat.cantidad_disponible} disponibles
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Cart items */}
      {cart.length > 0 && (
        <div className="bg-white rounded-xl border border-border p-4 mb-24 shadow-xs">
          <h3 className="text-sm font-semibold text-primary mb-3">
            Venta Actual
          </h3>
          <div className="space-y-3">
            {cart.map((item) => (
              <div key={item.paca_categoria_id} className="flex items-center justify-between py-2 border-b border-border last:border-0 gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-secondary uppercase truncate">{item.nombre}</div>
                  <div className="text-xs text-gray-500 tabular-nums">
                    C$ {item.precio.toLocaleString('es-NI', { minimumFractionDigits: 2 })} c/u · máx {item.cantidad_disponible}
                  </div>
                </div>

                {/* Per-line stepper & input (F9) */}
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleDecrement(item.paca_categoria_id)}
                    className="w-7 h-7 flex items-center justify-center rounded bg-white text-gray-700 hover:bg-gray-200 font-bold text-sm cursor-pointer shadow-xs"
                    aria-label={`Disminuir cantidad de ${item.nombre}`}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={item.cantidad_disponible}
                    inputMode="decimal"
                    value={item.cantidad}
                    onChange={(e) => updateQuantity(item.paca_categoria_id, parseInt(e.target.value) || 1)}
                    className="w-12 text-center text-sm font-semibold bg-transparent border-0 focus:ring-1 focus:ring-black rounded p-0 tabular-nums"
                    aria-label={`Cantidad para ${item.nombre}`}
                  />
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.paca_categoria_id, item.cantidad + 1)}
                    disabled={item.cantidad >= item.cantidad_disponible}
                    className="w-7 h-7 flex items-center justify-center rounded bg-white text-gray-700 hover:bg-gray-200 font-bold text-sm cursor-pointer shadow-xs disabled:opacity-40"
                    aria-label={`Aumentar cantidad de ${item.nombre}`}
                  >
                    +
                  </button>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-bold text-primary tabular-nums">
                    C$ {(item.precio * item.cantidad).toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.paca_categoria_id)}
                    aria-label={`Eliminar ${item.nombre} de la venta`}
                    className="p-1.5 text-secondary hover:text-error spring cursor-pointer rounded-lg hover:bg-red-50"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sticky CTA */}
      <div className="fixed bottom-20 lg:bottom-6 left-0 right-0 lg:left-auto lg:right-auto lg:w-[calc(100%-17rem)] lg:max-w-5xl px-4 lg:px-8 z-10">
        <div className="bg-white rounded-xl border border-border p-4 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-secondary">Total a cobrar</span>
            <span className="text-2xl font-bold text-primary tabular-nums">
              C$ {total.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <button
            onClick={confirmSale}
            disabled={cart.length === 0 || submitting}
            className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3.5 rounded-xl font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 active:scale-[0.98] transition-all duration-200 cursor-pointer"
          >
            <Check size={18} />
            {submitting ? 'Procesando...' : 'Confirmar Venta'}
          </button>
        </div>
      </div>
    </div>
  );
}
