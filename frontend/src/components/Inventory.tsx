import { useState } from 'react';
import { Plus, Trash2, Package, Tag, Sparkles, Lock } from 'lucide-react';
import type { PacaOut } from '../types';

interface InventoryProps {
  pacas: PacaOut[];
  loading?: boolean;
  isAdmin?: boolean;
  onRequestUnlock?: () => void;
  onAddPaca: (data: any) => Promise<void>;
  onDeletePaca: (id: number) => Promise<void>;
  onAddPrendas: (pacaId: number, data: { nombre: string; cantidad: number; precio_venta: number }) => Promise<void>;
}

const inputClass =
  'w-full px-3.5 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent focus:bg-white transition-all duration-200';

const labelClass =
  'block text-xs font-semibold tracking-wider text-gray-500 uppercase mb-1.5';

const PRESET_CATEGORIES = [
  { nombre: 'Premium', precio: 150 },
  { nombre: 'Regular', precio: 80 },
  { nombre: 'Económica', precio: 40 },
];

export function Inventory({
  pacas,
  loading,
  isAdmin,
  onRequestUnlock,
  onAddPaca,
  onDeletePaca,
  onAddPrendas,
}: InventoryProps) {
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState('');
  const [weight, setWeight] = useState('');
  const [includeCategoriesNow, setIncludeCategoriesNow] = useState(true);
  const [categories, setCategories] = useState([{ name: 'Premium', quantity: 0, pricePerUnit: 150 }]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [newPacaError, setNewPacaError] = useState<string | null>(null);
  const [addPrendasErrors, setAddPrendasErrors] = useState<Record<number, string>>({});

  // Inline delete confirmation states (F5)
  const [deletingPacaId, setDeletingPacaId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<{ id: number; message: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [showNewPacaForm, setShowNewPacaForm] = useState(false);

  // Clasificación en paca existente
  const [activePacaId, setActivePacaId] = useState<number | null>(null);
  const [addCatName, setAddCatName] = useState('Premium');
  const [addCatQty, setAddCatQty] = useState('');
  const [addCatPrice, setAddCatPrice] = useState('150');
  const [addingPrendas, setAddingPrendas] = useState(false);

  const addCategory = () => {
    setCategories(prev => [...prev, { name: '', quantity: 0, pricePerUnit: 0 }]);
  };

  const removeCategory = (index: number) => {
    if (categories.length <= 1) return;
    setCategories(prev => prev.filter((_, i) => i !== index));
  };

  const updateCategory = (index: number, field: string, value: string | number) => {
    setCategories(prev =>
      prev.map((cat, i) => (i === index ? { ...cat, [field]: value } : cat))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !cost || !weight) return;

    const validCategories = includeCategoriesNow
      ? categories.filter(c => c.name && c.quantity > 0 && c.pricePerUnit > 0)
      : [];

    setSubmitting(true);
    setFormError(null);
    setNewPacaError(null);
    try {
      await onAddPaca({
        descripcion: description,
        costo: parseFloat(cost),
        peso_lbs: parseFloat(weight),
        categorias: validCategories.map(c => ({
          nombre: c.name,
          cantidad_total: c.quantity,
          precio_venta: c.pricePerUnit
        })),
      });

      setDescription('');
      setCost('');
      setWeight('');
      setCategories([{ name: 'Premium', quantity: 0, pricePerUnit: 150 }]);
      setShowNewPacaForm(false);
    } catch (err: any) {
      setNewPacaError(err?.message || 'Error al registrar la paca. Verifica los datos.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddPrendasToPaca = async (pacaId: number, e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(addCatQty);
    const price = parseFloat(addCatPrice);
    if (!addCatName || isNaN(qty) || qty <= 0 || isNaN(price) || price <= 0) return;

    setAddingPrendas(true);
    setFormError(null);
    setAddPrendasErrors(prev => ({ ...prev, [pacaId]: '' }));
    try {
      await onAddPrendas(pacaId, {
        nombre: addCatName.trim(),
        cantidad: qty,
        precio_venta: price,
      });
      setAddCatQty('');
      setActivePacaId(null);
    } catch (err: any) {
      setAddPrendasErrors(prev => ({ ...prev, [pacaId]: err?.message || 'Error al clasificar prendas.' }));
    } finally {
      setAddingPrendas(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {formError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>{formError}</span>
            {formError.toLowerCase().includes('pin') && onRequestUnlock && (
              <button
                type="button"
                onClick={onRequestUnlock}
                className="underline font-bold hover:text-red-900 cursor-pointer"
              >
                Ingresar PIN
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setFormError(null)}
            className="font-bold ml-3 text-red-600 hover:text-red-900 cursor-pointer"
            aria-label="Cerrar mensaje de error"
          >
            ✕
          </button>
        </div>
      )}

      {/* CABECERA Y BOTÓN DE REGISTRAR PACA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Pacas e Inventario</h1>
          <p className="text-sm text-gray-500 mt-1">
            Administra tus fardos de ropa, clasifica prendas y proyecta ganancias.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (!isAdmin && onRequestUnlock) {
              onRequestUnlock();
              return;
            }
            setShowNewPacaForm(prev => !prev);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl font-semibold text-xs sm:text-sm hover:bg-black transition-colors cursor-pointer self-start sm:self-auto"
        >
          {isAdmin ? <Plus size={16} /> : <Lock size={15} />}
          {showNewPacaForm ? 'Cerrar Formulario' : 'Registrar Nueva Paca'}
        </button>
      </div>

      {/* FORMULARIO DESPLEGABLE / MODAL DE NUEVA PACA */}
      {(showNewPacaForm || (!loading && pacas.length === 0)) && (
        <form onSubmit={handleSubmit} className="space-y-5 bg-white rounded-2xl p-5 sm:p-7 border border-gray-200/90 shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Package size={18} className="text-primary" /> Datos de la Paca
            </h2>
            {pacas.length > 0 && (
              <button
                type="button"
                onClick={() => setShowNewPacaForm(false)}
                className="text-xs text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                Cancelar
              </button>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className={labelClass}>Descripción o Proveedor</label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Ej: Paca Mixta USA - Fardo 100 lbs"
                className={inputClass}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Costo de la Paca (C$)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={cost}
                  onChange={e => setCost(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className={`${inputClass} tabular-nums`}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Peso (lbs)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={weight}
                  onChange={e => setWeight(e.target.value)}
                  placeholder="Ej: 100 o 25"
                  min="0"
                  step="0.1"
                  className={`${inputClass} tabular-nums`}
                  required
                />
              </div>
            </div>

            <div className="pt-1">
              <label className="flex items-center gap-2 text-xs sm:text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeCategoriesNow}
                  onChange={e => setIncludeCategoriesNow(e.target.checked)}
                  className="rounded border-gray-300 text-black focus:ring-black"
                />
                <span className="font-medium">Ingresar categorías de prendas ahora mismo</span>
              </label>
              {!includeCategoriesNow && (
                <p className="text-xs text-gray-500 mt-1">
                  Podrás registrar la paca vacía y clasificar las prendas después a medida que la abras.
                </p>
              )}
            </div>
          </div>

          {includeCategoriesNow && (
            <div className="pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-900">
                    Prendas Contadas Iniciales
                  </h3>
                  <p className="text-xs text-gray-500">¿Cuántas prendas salieron de cada precio?</p>
                </div>
                <button
                  type="button"
                  onClick={addCategory}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  <Plus size={12} />
                  Agregar
                </button>
              </div>

              <div className="space-y-3">
                {categories.map((cat, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2 bg-gray-50 p-2.5 rounded-xl border border-gray-200/70">
                      <input
                        type="text"
                        value={cat.name}
                        onChange={e => updateCategory(i, 'name', e.target.value)}
                        placeholder="Categoría (ej: Premium)"
                        className={inputClass}
                      />
                      <input
                        type="number"
                        inputMode="decimal"
                        value={cat.quantity || ''}
                        onChange={e => updateCategory(i, 'quantity', parseInt(e.target.value) || 0)}
                        placeholder="Cantidad de prendas"
                        min="0"
                        className={`${inputClass} tabular-nums`}
                      />
                      <input
                        type="number"
                        inputMode="decimal"
                        value={cat.pricePerUnit || ''}
                        onChange={e => updateCategory(i, 'pricePerUnit', parseFloat(e.target.value) || 0)}
                        placeholder="Precio de venta C$"
                        min="0"
                        step="0.01"
                        className={`${inputClass} tabular-nums`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeCategory(i)}
                      disabled={categories.length <= 1}
                      className="mt-2.5 p-3 rounded-lg text-gray-400 hover:text-red-600 disabled:opacity-20 cursor-pointer"
                      title="Eliminar fila"
                      aria-label="Eliminar fila de categoría"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {newPacaError && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center justify-between">
              <span>{newPacaError}</span>
              <button
                type="button"
                onClick={() => setNewPacaError(null)}
                className="p-1 text-red-600 hover:text-red-900 font-bold cursor-pointer"
                aria-label="Cerrar mensaje de error"
              >
                ✕
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-3 rounded-xl font-semibold text-sm hover:bg-black transition-all cursor-pointer disabled:opacity-50"
          >
            <Package size={16} />
            {submitting ? 'Guardando...' : 'Guardar Paca'}
          </button>
        </form>
      )}

      {/* SECCIÓN 2: HISTORIAL Y DESGLOSE POR PACA */}
      <div>
        <div className="mb-4">
          <h2 className="text-xl font-bold tracking-tight text-gray-900">Historial y Desglose por Paca</h2>
          <p className="text-xs sm:text-sm text-gray-500">
            Revisa cuántas prendas salieron de cada fardo, el costo unitario promedio y las ganancias estimadas.
          </p>
        </div>

        <div className="space-y-6">
          {loading && pacas.length === 0 ? (
            <div className="space-y-4 animate-pulse">
              {[1, 2].map(n => (
                <div key={n} className="bg-white rounded-2xl border border-gray-200 p-6 h-48">
                  <div className="h-6 w-1/3 bg-gray-200 rounded mb-4"></div>
                  <div className="h-4 w-1/2 bg-gray-200 rounded mb-6"></div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[1, 2, 3, 4].map(c => (
                      <div key={c} className="h-16 bg-gray-100 rounded-xl"></div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            pacas.map(paca => {
              const totalPrendas = paca.categorias.reduce((sum, c) => sum + c.cantidad_total, 0);
              const totalDisponibles = paca.categorias.reduce((sum, c) => sum + c.cantidad_disponible, 0);
              const totalVendidas = totalPrendas - totalDisponibles;
              const valorVentaEsperado = paca.categorias.reduce((sum, c) => sum + (c.cantidad_total * c.precio_venta), 0);
              const gananciaProyectada = valorVentaEsperado - paca.costo;
              const margenProyectado = paca.costo > 0 ? (gananciaProyectada / paca.costo) * 100 : 0;
              const costoUnitarioPromedio = totalPrendas > 0 ? paca.costo / totalPrendas : 0;
              const isAddingHere = activePacaId === paca.id;

              return (
                <div key={paca.id} className="bg-white rounded-2xl border border-gray-200/90 shadow-sm overflow-hidden">
                  {/* Cabecera de la paca o confirmación inline de eliminación (F5) */}
                  {deletingPacaId === paca.id ? (
                    <div className="p-4 bg-red-50 border-b border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-red-900 text-xs animate-in fade-in">
                      <div>
                        <span className="font-bold block sm:inline">
                          ¿Eliminar la paca «{paca.descripcion}»?
                        </span>{' '}
                        <span>Prendas y categorías se eliminarán. No se puede deshacer.</span>
                        {deleteError && deleteError.id === paca.id && (
                          <p className="text-red-700 font-bold mt-1">{deleteError.message}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        <button
                          type="button"
                          disabled={isDeleting}
                          onClick={() => { setDeletingPacaId(null); setDeleteError(null); }}
                          className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 cursor-pointer disabled:opacity-50"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          disabled={isDeleting}
                          onClick={async () => {
                            setIsDeleting(true);
                            try {
                              await onDeletePaca(paca.id);
                              setDeletingPacaId(null);
                              setDeleteError(null);
                            } catch (err: any) {
                              setDeleteError({ id: paca.id, message: err?.message || 'Error al eliminar paca' });
                            } finally {
                              setIsDeleting(false);
                            }
                          }}
                          className="px-3 py-1.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 cursor-pointer disabled:opacity-50"
                        >
                          {isDeleting ? 'Eliminando...' : 'Eliminar paca'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 sm:p-5 border-b border-gray-100 bg-gray-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-gray-900 text-white">
                            Paca #{paca.id}
                          </span>
                          <h3 className="font-bold text-base sm:text-lg text-gray-900">{paca.descripcion}</h3>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 tabular-nums">
                          Costo inversión: <span className="font-semibold text-gray-800">C$ {paca.costo.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</span> · {paca.peso_lbs} lbs · {new Date(paca.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <button
                          type="button"
                          onClick={() => {
                            if (!isAdmin && onRequestUnlock) {
                              onRequestUnlock();
                              return;
                            }
                            setActivePacaId(isAddingHere ? null : paca.id);
                          }}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer shadow-sm"
                        >
                          {isAdmin ? <Plus size={14} /> : <Lock size={13} />}
                          {isAddingHere ? 'Cerrar' : 'Clasificar Prendas'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!isAdmin && onRequestUnlock) {
                              onRequestUnlock();
                              return;
                            }
                            setDeletingPacaId(paca.id);
                          }}
                          aria-label={`Eliminar paca ${paca.descripcion}`}
                          className="p-3 text-gray-500 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                          title={isAdmin ? `Eliminar paca ${paca.descripcion}` : 'Requiere PIN de Administrador'}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  )}

                {/* Resumen métrico de la paca */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5 bg-white border-b border-gray-100 text-center">
                  <div className="p-3 rounded-xl bg-gray-50">
                    <span className="block text-xs font-semibold uppercase text-gray-600">Prendas que Salieron</span>
                    <span className="text-xl font-bold text-gray-900">{totalPrendas}</span>
                    <span className="block text-xs text-gray-600">{totalVendidas} vendidas · {totalDisponibles} disp.</span>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50">
                    <span className="block text-xs font-semibold uppercase text-gray-600">Costo / Prenda</span>
                    <span className="text-xl font-bold text-gray-900">
                      C$ {costoUnitarioPromedio.toFixed(1)}
                    </span>
                    <span className="block text-xs text-gray-600">costo promedio real</span>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50">
                    <span className="block text-xs font-semibold uppercase text-gray-600">Venta Proyectada</span>
                    <span className="text-xl font-bold text-blue-700">
                      C$ {valorVentaEsperado.toLocaleString('es-NI', { minimumFractionDigits: 0 })}
                    </span>
                    <span className="block text-xs text-gray-600">recaudación total estimada</span>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50">
                    <span className="block text-xs font-semibold uppercase text-gray-600">Ganancia Proyectada</span>
                    <span className={`text-xl font-bold ${gananciaProyectada >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                      {gananciaProyectada >= 0 ? '+' : ''}C$ {gananciaProyectada.toLocaleString('es-NI', { minimumFractionDigits: 0 })}
                    </span>
                    <span className="block text-xs text-gray-600">({margenProyectado.toFixed(0)}% ganancia)</span>
                  </div>
                </div>

                {/* Formulario desplegable para sumar prendas a esta paca */}
                {isAddingHere && (
                  <div className="p-5 bg-blue-50/50 border-b border-blue-100">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles size={16} className="text-blue-600" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900">
                        Clasificar prendas sacadas de esta paca
                      </h4>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3 items-center">
                      <span className="text-xs text-gray-500">Precios rápidos:</span>
                      {PRESET_CATEGORIES.map(p => (
                        <button
                          key={p.nombre}
                          type="button"
                          onClick={() => {
                            setAddCatName(p.nombre);
                            setAddCatPrice(p.precio.toString());
                          }}
                          className="px-2.5 py-1 text-xs font-medium rounded-md bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 cursor-pointer"
                        >
                          {p.nombre} (C$ {p.precio})
                        </button>
                      ))}
                    </div>

                    {addPrendasErrors[paca.id] && (
                      <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center justify-between">
                        <span>{addPrendasErrors[paca.id]}</span>
                        <button
                          type="button"
                          onClick={() => setAddPrendasErrors(prev => ({ ...prev, [paca.id]: '' }))}
                          className="text-red-600 hover:text-red-900 font-bold ml-2 cursor-pointer"
                          aria-label="Cerrar error de clasificación"
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    <form onSubmit={e => handleAddPrendasToPaca(paca.id, e)} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div>
                        <label className={labelClass}>Categoría</label>
                        <input
                          type="text"
                          value={addCatName}
                          onChange={e => setAddCatName(e.target.value)}
                          placeholder="Ej: Premium"
                          className={inputClass}
                          required
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Prendas que salieron</label>
                        <input
                          type="number"
                          inputMode="decimal"
                          value={addCatQty}
                          onChange={e => setAddCatQty(e.target.value)}
                          placeholder="Ej: 15"
                          min="1"
                          className={`${inputClass} tabular-nums`}
                          required
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Precio Venta Unitario (C$)</label>
                        <input
                          type="number"
                          inputMode="decimal"
                          value={addCatPrice}
                          onChange={e => setAddCatPrice(e.target.value)}
                          placeholder="Ej: 150"
                          min="1"
                          step="0.01"
                          className={`${inputClass} tabular-nums`}
                          required
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          type="submit"
                          disabled={addingPrendas}
                          className="w-full h-[42px] flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Plus size={14} />
                          {addingPrendas ? 'Sumando...' : 'Sumar a la Paca'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Tabla de categorías y precios de esta paca */}
                <div className="p-5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
                    <Tag size={14} /> Desglose de prendas por precio
                  </h4>

                  {paca.categorias.length === 0 ? (
                    <div className="text-center py-6 border border-dashed border-gray-200 rounded-xl">
                      <p className="text-sm text-gray-500">Esta paca aún no tiene prendas clasificadas.</p>
                      <button
                        type="button"
                        onClick={() => setActivePacaId(paca.id)}
                        className="mt-2 text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                      >
                        + Empezar a clasificar prendas ahora
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* VISTA MÓVIL: Tarjetas limpias y legibles por categoría */}
                      <div className="space-y-3 sm:hidden">
                        {paca.categorias.map(cat => {
                          const vendidas = cat.cantidad_total - cat.cantidad_disponible;
                          const subtotalVenta = cat.cantidad_total * cat.precio_venta;
                          const porcentajeVendidas = cat.cantidad_total > 0 ? (vendidas / cat.cantidad_total) * 100 : 0;

                          return (
                            <div key={cat.id} className="p-3.5 rounded-xl bg-gray-50 border border-gray-200/70">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                                  <span className="font-bold text-sm text-gray-900">{cat.nombre}</span>
                                </div>
                                <span className="text-sm font-bold text-gray-900">
                                  C$ {cat.precio_venta.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                                  <span className="text-xs text-gray-500 font-normal ml-1">c/u</span>
                                </span>
                              </div>

                              <div className="grid grid-cols-3 gap-2 text-center text-xs my-2.5 py-2 bg-white rounded-lg border border-gray-100">
                                <div>
                                  <span className="block text-xs text-gray-600 font-medium uppercase">Salieron</span>
                                  <span className="font-bold text-gray-900">{cat.cantidad_total}</span>
                                </div>
                                <div>
                                  <span className="block text-xs text-gray-600 font-medium uppercase">En Tienda</span>
                                  <span className="font-bold text-green-700">{cat.cantidad_disponible}</span>
                                </div>
                                <div>
                                  <span className="block text-xs text-gray-600 font-medium uppercase">Vendidas</span>
                                  <span className="font-bold text-gray-700">{vendidas}</span>
                                </div>
                              </div>

                              {/* Barra de progreso de ventas */}
                              <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden mb-2">
                                <div
                                  className="h-full bg-blue-500 rounded-full transition-all"
                                  style={{ width: `${porcentajeVendidas}%` }}
                                />
                              </div>

                              <div className="flex items-center justify-between text-xs text-gray-600 pt-1">
                                <span>Recaudación proyectada:</span>
                                <span className="font-bold text-blue-700">
                                  C$ {subtotalVenta.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* VISTA DESKTOP: Tabla completa con suficiente espacio */}
                      <div className="hidden sm:block overflow-x-auto">
                        <table className="w-full text-left text-xs min-w-[520px]">
                          <thead>
                            <tr className="border-b border-gray-100 text-gray-600 font-semibold uppercase">
                              <th className="pb-2">Categoría</th>
                              <th className="pb-2 text-center">Salieron (Total)</th>
                              <th className="pb-2 text-center">En Tienda</th>
                              <th className="pb-2 text-center">Vendidas</th>
                              <th className="pb-2 text-right">Precio Unitario</th>
                              <th className="pb-2 text-right">Total Proyectado</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {paca.categorias.map(cat => {
                              const vendidas = cat.cantidad_total - cat.cantidad_disponible;
                              const subtotalVenta = cat.cantidad_total * cat.precio_venta;
                              return (
                                <tr key={cat.id} className="hover:bg-gray-50/50">
                                  <td className="py-2.5 font-semibold text-gray-800">{cat.nombre}</td>
                                  <td className="py-2.5 text-center font-bold text-gray-900">{cat.cantidad_total} prendas</td>
                                  <td className="py-2.5 text-center text-green-700 font-medium">{cat.cantidad_disponible} disp.</td>
                                  <td className="py-2.5 text-center text-gray-600">{vendidas} vendidas</td>
                                  <td className="py-2.5 text-right font-semibold text-gray-800">
                                    C$ {cat.precio_venta.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="py-2.5 text-right font-bold text-blue-700">
                                    C$ {subtotalVenta.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          }))}

          {!loading && pacas.length === 0 && (
            <div className="bg-white rounded-2xl p-10 border border-gray-200 text-center shadow-xs">
              <Package size={36} className="mx-auto text-gray-400 mb-2" />
              <p className="text-gray-600 text-sm font-medium">No tienes pacas registradas.</p>
              <p className="text-xs text-gray-500 mt-1">Usa el formulario superior para registrar la primera.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}