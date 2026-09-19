import { describe, it, expect } from 'vitest';
import {
  addToCart,
  updateCartQuantity,
  decrementCartItem,
  removeFromCart,
  calculateCartTotal,
  parseHashString,
  serializeHash,
  type CartItem,
  type AddableCategory,
} from './cart';

describe('POS Cart Math & State Logic', () => {
  const cat1: AddableCategory = {
    id: 101,
    nombre: 'Vestidos Premium',
    paca_desc: 'Paca #1',
    precio_venta: 150,
    cantidad_disponible: 3,
  };

  const cat2: AddableCategory = {
    id: 102,
    nombre: 'Blusas Regular',
    paca_desc: 'Paca #1',
    precio_venta: 80,
    cantidad_disponible: 5,
  };

  it('first add creates item with quantity 1', () => {
    const initial: CartItem[] = [];
    const updated = addToCart(initial, cat1);

    expect(updated).toHaveLength(1);
    expect(updated[0]).toEqual({
      paca_categoria_id: 101,
      nombre: 'Paca #1 - Vestidos Premium',
      precio: 150,
      cantidad: 1,
      cantidad_disponible: 3,
    });
  });

  it('repeat add increments and clamps at cantidad_disponible', () => {
    let cart: CartItem[] = [];
    cart = addToCart(cart, cat1); // qty 1
    cart = addToCart(cart, cat1); // qty 2
    cart = addToCart(cart, cat1); // qty 3
    expect(cart[0].cantidad).toBe(3);

    // Attempting to exceed stock available clamps at 3
    const overCart = addToCart(cart, cat1);
    expect(overCart[0].cantidad).toBe(3);
  });

  it('updateCartQuantity clamps between 1 and cantidad_disponible', () => {
    let cart = addToCart([], cat1); // qty 1, max 3

    cart = updateCartQuantity(cart, 101, 10);
    expect(cart[0].cantidad).toBe(3);

    cart = updateCartQuantity(cart, 101, 0);
    expect(cart[0].cantidad).toBe(1);

    cart = updateCartQuantity(cart, 101, 2);
    expect(cart[0].cantidad).toBe(2);
  });

  it('decrementCartItem decrements or removes item when quantity reaches <= 1', () => {
    let cart = addToCart([], cat1);
    cart = addToCart(cart, cat1); // qty 2

    // Decrement from 2 to 1
    cart = decrementCartItem(cart, 101);
    expect(cart).toHaveLength(1);
    expect(cart[0].cantidad).toBe(1);

    // Decrement from 1 removes item
    cart = decrementCartItem(cart, 101);
    expect(cart).toHaveLength(0);
  });

  it('removeFromCart removes specified line item', () => {
    let cart = addToCart([], cat1);
    cart = addToCart(cart, cat2);
    expect(cart).toHaveLength(2);

    cart = removeFromCart(cart, cat1.id);
    expect(cart).toHaveLength(1);
    expect(cart[0].paca_categoria_id).toBe(cat2.id);
  });

  it('calculateCartTotal calculates correct total over multiple lines with mixed quantities', () => {
    let cart: CartItem[] = [];
    cart = addToCart(cart, cat1); // 1 * 150 = 150
    cart = addToCart(cart, cat1); // 2 * 150 = 300
    cart = addToCart(cart, cat2); // 1 * 80  = 80
    cart = addToCart(cart, cat2); // 2 * 80  = 160
    cart = addToCart(cart, cat2); // 3 * 80  = 240

    // Total = (2 * 150) + (3 * 80) = 300 + 240 = 540
    expect(calculateCartTotal(cart)).toBe(540);
  });
});

describe('Hash Routing Pure Logic', () => {
  it('parses valid views and dates correctly', () => {
    expect(parseHashString('#pos')).toEqual({ view: 'pos', desde: undefined, hasta: undefined });
    expect(parseHashString('#inventory')).toEqual({ view: 'inventory', desde: undefined, hasta: undefined });
    expect(parseHashString('#reportes&desde=2026-09-01&hasta=2026-09-18')).toEqual({
      view: 'reportes',
      desde: '2026-09-01',
      hasta: '2026-09-18',
    });
  });

  it('falls back to dashboard on unknown view', () => {
    expect(parseHashString('#unknown-view')).toEqual({ view: 'dashboard', desde: undefined, hasta: undefined });
    expect(parseHashString('')).toEqual({ view: 'dashboard', desde: undefined, hasta: undefined });
  });

  it('round-trip serialize and parse survives encoding/decoding', () => {
    const serialized = serializeHash('reportes', { desde: '2026-01-01', hasta: '2026-01-31' });
    expect(serialized).toBe('#reportes&desde=2026-01-01&hasta=2026-01-31');

    const parsed = parseHashString(serialized);
    expect(parsed.view).toBe('reportes');
    expect(parsed.desde).toBe('2026-01-01');
    expect(parsed.hasta).toBe('2026-01-31');
  });
});
