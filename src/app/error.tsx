"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("China dashboard runtime error:", error);
  }, [error]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-xl rounded-3xl border border-rose-900/60 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="text-2xl">⚠️</div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-black text-white">Ошибка интерфейса</h1>
            <p className="mt-1 text-sm text-slate-400">
              Приложение не должно падать при изменении веса или другого поля.
            </p>
            <pre className="mt-4 max-h-48 overflow-auto rounded-xl bg-black/40 border border-slate-800 p-3 text-xs text-rose-300 whitespace-pre-wrap break-words">
              {error?.message || "Неизвестная ошибка"}
            </pre>
            {error?.digest && (
              <p className="mt-2 text-[10px] text-slate-500">Код ошибки: {error.digest}</p>
            )}
            <button
              type="button"
              onClick={() => reset()}
              className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-500"
            >
              Повторить
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
