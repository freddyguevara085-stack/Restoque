import type { View } from './types';

export interface CartItem {
  paca_categoria_id: number;
  nombre: string;
  precio: number;
  cantidad: number;
  cantidad_disponible: number;
}

export interface AddableCategory {
  id: number;
  nombre: string;
  paca_desc: string;
  precio_venta: number;
  cantidad_disponible: number;
}

export function addToCart(cart: CartItem[], category: AddableCategory): CartItem[] {
  const existing = cart.find((i) => i.paca_categoria_id === category.id);
  if (existing) {
    if (existing.cantidad >= category.cantidad_disponible) return cart;
    return cart.map((i) =>
      i.paca_categoria_id === category.id
        ? { ...i, cantidad: i.cantidad + 1 }
        : i
    );
  }
  return [
    ...cart,
    {
      paca_categoria_id: category.id,
      nombre: category.nombre,
      precio: category.precio_venta,
      cantidad: 1,
      cantidad_disponible: category.cantidad_disponible,
    },
  ];
}

export function updateCartQuantity(cart: CartItem[], catId: number, qty: number): CartItem[] {
  return cart.map((item) => {
    if (item.paca_categoria_id === catId) {
      const clamped = Math.max(1, Math.min(qty, item.cantidad_disponible));
      return { ...item, cantidad: clamped };
    }
    return item;
  });
}

export function decrementCartItem(cart: CartItem[], catId: number): CartItem[] {
  const item = cart.find((i) => i.paca_categoria_id === catId);
  if (!item) return cart;
  if (item.cantidad <= 1) {
    return removeFromCart(cart, catId);
  }
  return updateCartQuantity(cart, catId, item.cantidad - 1);
}

export function removeFromCart(cart: CartItem[], catId: number): CartItem[] {
  return cart.filter((i) => i.paca_categoria_id !== catId);
}

export function calculateCartTotal(cart: CartItem[]): number {
  return cart.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
}

export interface ChangeResult {
  change: number;
  isSufficient: boolean;
  difference: number;
}

export function calculateChange(total: number, paid: number): ChangeResult {
  const diff = paid - total;
  return {
    change: Math.max(0, diff),
    isSufficient: diff >= 0,
    difference: Math.abs(diff),
  };
}

export const VALID_VIEWS: View[] = ['dashboard', 'inventory', 'pos', 'reportes'];

export function parseHashString(hash: string): { view: View; desde?: string; hasta?: string } {
  const clean = hash.replace(/^#/, '');
  const [viewPart, ...rest] = clean.split(/[&?]/);
  const view = VALID_VIEWS.includes(viewPart as View) ? (viewPart as View) : 'dashboard';

  const params = new URLSearchParams(rest.join('&'));
  const desde = params.get('desde') || undefined;
  const hasta = params.get('hasta') || undefined;

  return { view, desde, hasta };
}

export function serializeHash(view: View, dates?: { desde?: string; hasta?: string }): string {
  if (view === 'reportes' && (dates?.desde || dates?.hasta)) {
    const p = new URLSearchParams();
    if (dates.desde) p.set('desde', dates.desde);
    if (dates.hasta) p.set('hasta', dates.hasta);
    return `#reportes&${p.toString()}`;
  }
  return `#${view}`;
}
