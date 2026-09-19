import { useState, useEffect, useCallback } from 'react';
import type { DashboardData, PacaOut, VentaOut } from './types';

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const token = localStorage.getItem('restoque_admin_token');
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const apiKey = localStorage.getItem('restoque_api_key') || (import.meta as any).env?.VITE_API_KEY || '';
  if (apiKey) headers['X-API-Key'] = apiKey;

  return headers;
}

export const api = {
  async verifyPin(pin: string): Promise<boolean> {
    const r = await fetch('/api/auth/verify-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ pin }),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      throw new Error(err.detail || 'PIN incorrecto');
    }
    const data = await r.json();
    if (data.token) {
      localStorage.setItem('restoque_admin_token', data.token);
      return true;
    }
    return false;
  },

  logoutAdmin() {
    localStorage.removeItem('restoque_admin_token');
  },

  isAdminAuthenticated(): boolean {
    return !!localStorage.getItem('restoque_admin_token');
  },

  async getPacas(): Promise<PacaOut[]> {
    const r = await fetch('/api/pacas/', {
      headers: getAuthHeaders(),
    });
    if (!r.ok) throw new Error('Error al cargar inventario');
    return r.json();
  },

  async createPaca(data: { descripcion: string; costo: number; peso_lbs: number; categorias: { nombre: string; cantidad_total: number; precio_venta: number }[] }): Promise<PacaOut> {
    const r = await fetch('/api/pacas/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(data),
    });
    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      throw new Error(e.detail || 'Error al registrar paca');
    }
    return r.json();
  },

  async deletePaca(id: number): Promise<void> {
    const r = await fetch(`/api/pacas/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      throw new Error(e.detail || 'Error al eliminar paca');
    }
  },

  async addPrendasToPaca(pacaId: number, data: { nombre: string; cantidad: number; precio_venta: number }): Promise<PacaOut> {
    const r = await fetch(`/api/pacas/${pacaId}/prendas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(data),
    });
    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      throw new Error(e.detail || 'Error al agregar prendas');
    }
    return r.json();
  },

  async createVenta(items: { paca_categoria_id: number; cantidad: number }[]): Promise<VentaOut> {
    const r = await fetch('/api/ventas/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ items }),
    });
    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      throw new Error(e.detail || 'Error al registrar venta');
    }
    return r.json();
  },

  async getDashboard(): Promise<DashboardData | null> {
    const r = await fetch('/api/reportes/dashboard', {
      headers: getAuthHeaders(),
    });
    if (r.status === 401) {
      return null;
    }
    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      throw new Error(e.detail || 'Error al cargar métricas');
    }
    return r.json();
  },

  async getVentas(desde?: string, hasta?: string): Promise<VentaOut[]> {
    const params = new URLSearchParams();
    if (desde) params.set('desde', desde);
    if (hasta) params.set('hasta', hasta);
    const r = await fetch(`/api/ventas/?${params}`, {
      headers: getAuthHeaders(),
    });
    if (!r.ok) throw new Error('Error al cargar historial de ventas');
    return r.json();
  },

  async downloadExcel(): Promise<void> {
    const r = await fetch('/api/reportes/excel', {
      headers: getAuthHeaders(),
    });
    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      throw new Error(e.detail || 'Requiere PIN de administrador para descargar');
    }
    const blob = await r.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'restoque_reporte.xlsx';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
};

export function useStore() {
  const [pacas, setPacas] = useState<PacaOut[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(api.isAdminAuthenticated());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const pacasData = await api.getPacas();
      setPacas(pacasData);

      if (api.isAdminAuthenticated()) {
        const dashboardData = await api.getDashboard();
        setDashboard(dashboardData);
        setIsAdmin(true);
      } else {
        setDashboard(null);
        setIsAdmin(false);
      }
    } catch (e: any) {
      setError(e.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const loginAdmin = async (pin: string): Promise<boolean> => {
    const success = await api.verifyPin(pin);
    if (success) {
      setIsAdmin(true);
      await refresh();
    }
    return success;
  };

  const logoutAdmin = () => {
    api.logoutAdmin();
    setIsAdmin(false);
    setDashboard(null);
  };

  const addPaca = async (data: Parameters<typeof api.createPaca>[0]) => {
    await api.createPaca(data);
    await refresh();
  };

  const deletePaca = async (id: number) => {
    const previous = pacas;
    setPacas((prev) => prev.filter((p) => p.id !== id));
    try {
      await api.deletePaca(id);
      await refresh();
    } catch (e) {
      setPacas(previous);
      throw e;
    }
  };

  const addPrendas = async (pacaId: number, data: { nombre: string; cantidad: number; precio_venta: number }) => {
    await api.addPrendasToPaca(pacaId, data);
    await refresh();
  };

  const sellItems = async (items: Parameters<typeof api.createVenta>[0]) => {
    try {
      await api.createVenta(items);
      await refresh();
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Error al procesar venta');
      throw e;
    }
  };

  return {
    pacas,
    dashboard,
    isAdmin,
    loading,
    error,
    refresh,
    loginAdmin,
    logoutAdmin,
    addPaca,
    deletePaca,
    addPrendas,
    sellItems,
  };
}
