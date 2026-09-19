export interface CategoriaOut {
  id: number;
  nombre: string;
  cantidad_total: number;
  cantidad_disponible: number;
  precio_venta: number;
}

export interface PacaOut {
  id: number;
  descripcion: string;
  costo: number;
  peso_lbs: number;
  created_at: string;
  categorias: CategoriaOut[];
}

export interface VentaItemOut {
  id: number;
  paca_categoria_id: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface VentaOut {
  id: number;
  total: number;
  created_at: string;
  items: VentaItemOut[];
}

export interface DashboardData {
  ventas_hoy: number;
  ventas_semana: number;
  ventas_mes: number;
  inversion_total: number;
  ganancia_neta: number;
  total_prendas: number;
  prendas_vendidas: number;
  prendas_disponibles: number;
}

export type View = 'dashboard' | 'inventory' | 'pos' | 'reportes';
