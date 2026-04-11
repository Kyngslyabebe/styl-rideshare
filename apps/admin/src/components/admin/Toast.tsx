'use client';

import { createContext, useContext, useCallback, useState, useRef, type ReactNode } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import s from './Toast.module.css';

/* ── Types ── */
type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'default';
}

interface ToastContextValue {
  toast: (type: ToastType, title: string, message?: string, duration?: number) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

/* ── Icons ── */
const ICONS: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

/* ── Provider ── */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const idRef = useRef(0);

  const addToast = useCallback((type: ToastType, title: string, message?: string, duration = 4000) => {
    const id = String(++idRef.current);
    setToasts((prev) => [...prev, { id, type, title, message, duration }]);
    if (duration > 0) {
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const confirmFn = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({ ...options, resolve });
    });
  }, []);

  const handleConfirm = (result: boolean) => {
    confirmState?.resolve(result);
    setConfirmState(null);
  };

  return (
    <ToastContext.Provider value={{ toast: addToast, confirm: confirmFn }}>
      {children}

      {/* Toast stack */}
      <div className={s.toastContainer}>
        {toasts.map((t) => {
          const Icon = ICONS[t.type];
          return (
            <div key={t.id} className={`${s.toast} ${s[t.type]}`}>
              <Icon size={18} className={s.toastIcon} />
              <div className={s.toastContent}>
                <div className={s.toastTitle}>{t.title}</div>
                {t.message && <div className={s.toastMessage}>{t.message}</div>}
              </div>
              <button className={s.toastClose} onClick={() => removeToast(t.id)} type="button">
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Confirm modal */}
      {confirmState && (
        <div className={s.overlay} onClick={() => handleConfirm(false)}>
          <div className={s.modal} onClick={(e) => e.stopPropagation()}>
            <div className={s.modalHeader}>
              <h3 className={s.modalTitle}>{confirmState.title}</h3>
            </div>
            <p className={s.modalMessage}>{confirmState.message}</p>
            <div className={s.modalActions}>
              <button className={s.modalCancel} onClick={() => handleConfirm(false)} type="button">
                {confirmState.cancelText || 'Cancel'}
              </button>
              <button
                className={`${s.modalConfirm} ${confirmState.variant === 'danger' ? s.modalConfirmDanger : ''}`}
                onClick={() => handleConfirm(true)}
                type="button"
              >
                {confirmState.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}
