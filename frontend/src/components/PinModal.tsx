import { useState, useEffect, useCallback } from 'react';
import { Lock, Delete, X, ShieldAlert } from 'lucide-react';

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onVerify: (pin: string) => Promise<boolean>;
}

export function PinModal({ isOpen, onClose, onSuccess, onVerify }: PinModalProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const reset = useCallback(() => {
    setPin('');
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  const handleSubmit = useCallback(async (pinToVerify: string) => {
    if (pinToVerify.length < 4 || loading) return;
    setLoading(true);
    setError(null);
    try {
      const ok = await onVerify(pinToVerify);
      if (ok) {
        reset();
        onClose();
        if (onSuccess) onSuccess();
      } else {
        setError('PIN incorrecto');
        setPin('');
      }
    } catch (err: any) {
      setError(err?.message || 'PIN incorrecto');
      setPin('');
    } finally {
      setLoading(false);
    }
  }, [loading, onVerify, reset, onClose, onSuccess]);

  const handleDigit = useCallback((digit: string) => {
    if (loading) return;
    setError(null);
    setPin(prev => {
      if (prev.length >= 4) return prev;
      const next = prev + digit;
      if (next.length === 4) {
        setTimeout(() => handleSubmit(next), 50);
      }
      return next;
    });
  }, [loading, handleSubmit]);

  const handleBackspace = useCallback(() => {
    if (loading) return;
    setError(null);
    setPin(prev => prev.slice(0, -1));
  }, [loading]);

  const handleClear = useCallback(() => {
    if (loading) return;
    setError(null);
    setPin('');
  }, [loading]);

  // Teclado físico
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleDigit, handleBackspace, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pin-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
    >
      <div className="bg-white w-full max-w-xs rounded-2xl shadow-2xl border border-gray-100 p-6 flex flex-col items-center relative">
        <button
          onClick={onClose}
          aria-label="Cerrar ventana de PIN"
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 border border-blue-100">
          <Lock size={22} />
        </div>

        <h2 id="pin-modal-title" className="text-lg font-bold text-gray-900 tracking-tight">
          Acceso Administrador
        </h2>
        <p className="text-xs text-gray-500 text-center mt-1 mb-5">
          Ingresa el PIN de 4 dígitos para habilitar costos, utilidades y gestión de pacas.
        </p>

        {/* Indicadores de dígitos */}
        <div className="flex justify-center items-center gap-3.5 mb-6" aria-label={`Dígitos ingresados: ${pin.length} de 4`}>
          {[0, 1, 2, 3].map(idx => {
            const filled = idx < pin.length;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-150 ${
                  filled
                    ? 'bg-gray-900 scale-110 shadow-xs'
                    : 'border-2 border-gray-300 bg-transparent'
                }`}
              />
            );
          })}
        </div>

        {/* Mensaje de error o estado */}
        {error && (
          <div className="flex items-center gap-1.5 text-xs text-red-600 mb-4 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">
            <ShieldAlert size={14} />
            <span>{error}</span>
          </div>
        )}

        {loading && (
          <p className="text-xs text-blue-600 font-medium mb-4 animate-pulse">
            Verificando credenciales...
          </p>
        )}

        {/* Teclado numérico táctil */}
        <div className="grid grid-cols-3 gap-2.5 w-full max-w-[240px]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
            <button
              key={d}
              type="button"
              disabled={loading}
              onClick={() => handleDigit(d)}
              className="h-13 rounded-xl bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-gray-900 font-semibold text-xl transition-all shadow-xs active:scale-95 border border-gray-100 cursor-pointer disabled:opacity-50"
            >
              {d}
            </button>
          ))}
          <button
            type="button"
            disabled={loading || pin.length === 0}
            onClick={handleClear}
            className="h-13 rounded-xl bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-gray-500 font-medium text-xs transition-all border border-gray-100 cursor-pointer disabled:opacity-40"
          >
            Limpiar
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => handleDigit('0')}
            className="h-13 rounded-xl bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-gray-900 font-semibold text-xl transition-all shadow-xs active:scale-95 border border-gray-100 cursor-pointer disabled:opacity-50"
          >
            0
          </button>
          <button
            type="button"
            disabled={loading || pin.length === 0}
            onClick={handleBackspace}
            aria-label="Borrar último dígito"
            className="h-13 rounded-xl bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-gray-700 flex items-center justify-center transition-all border border-gray-100 cursor-pointer disabled:opacity-40"
          >
            <Delete size={18} />
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 text-xs text-gray-500 hover:text-gray-800 font-medium py-1 transition-colors cursor-pointer"
        >
          Cancelar / Modo Cajero
        </button>
      </div>
    </div>
  );
}
