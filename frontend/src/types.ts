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
  estado?: 'activa' | 'recuperada' | 'agotada';
  ingresos_recaudados?: number;
  porcentaje_recuperado?: number;
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

export interface VentaReciente {
  id: number;
  created_at: string;
  total: number;
  items_count: number;
  resumen: string;
}

export interface PacaRoi {
  id: number;
  descripcion: string;
  costo: number;
  peso_lbs: number;
  ingresos_recaudados: number;
  porcentaje_recuperado: number;
  ganancia_neta_paca: number;
  prendas_totales: number;
  prendas_disponibles: number;
  prendas_vendidas: number;
  estado: 'recuperada' | 'en_proceso' | 'agotada';
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
  valor_inventario_remanente: number;
  margen_bruto_realizado: number;
  porcentaje_margen_bruto: number;
  ganancia_proyectada_inventario: number;
  actividad_reciente: VentaReciente[];
  roi_pacas: PacaRoi[];
}

export type View = 'dashboard' | 'inventory' | 'pos' | 'reportes';
