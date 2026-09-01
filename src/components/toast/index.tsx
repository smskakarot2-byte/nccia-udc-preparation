"use client";

import { createContext, useCallback, useContext, useState, ReactNode } from "react";

type ToastKind = "success" | "error" | "info";
interface Toast { id: number; kind: ToastKind; message: string; }

interface ToastContextValue {
  push: (kind: ToastKind, message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-[min(92vw,360px)]" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={
              "rounded-xl border px-4 py-3 shadow-card text-sm font-medium animate-in fade-in slide-in-from-bottom-2 " +
              (t.kind === "success"
                ? "bg-emerald-100 border-emerald-400 text-emerald-600 dark:bg-emerald-600/20 dark:text-emerald-400"
                : t.kind === "error"
                ? "bg-crimson-100 border-crimson-500 text-crimson-600 dark:bg-crimson-600/20 dark:text-crimson-500"
                : "bg-ink-100 border-ink-400 text-ink-800 dark:bg-ink-800 dark:text-paper-100 dark:border-ink-600")
            }
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
