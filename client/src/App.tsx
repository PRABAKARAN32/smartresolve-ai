import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

type Health = { status: string; db: string };
type State = "loading" | "ok" | "waking";

export default function App() {
  const [state, setState] = useState<State>("loading");
  const [health, setHealth] = useState<Health | null>(null);

  const check = useCallback(async () => {
    setState("loading");
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const h = await api<Health>("/health", { signal: controller.signal });
      clearTimeout(timer);
      setHealth(h);
      setState("ok");
    } catch {
      setState("waking");
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50 p-6 text-center">
      <h1 className="text-2xl font-bold text-slate-800">SmartResolve AI</h1>

      {state === "loading" && <p role="status">Connecting to server…</p>}

      {state === "ok" && (
        <p role="status" className="text-green-800">
          Server status: {health?.status} (database {health?.db})
        </p>
      )}

      {state === "waking" && (
        <div
          role="alert"
          className="max-w-sm rounded border border-amber-400 bg-amber-50 p-4"
        >
          <p className="mb-3">
            The server is waking up. This can take up to a minute on the free
            plan.
          </p>
          <button
            onClick={check}
            className="rounded bg-slate-800 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-800"
          >
            Retry
          </button>
        </div>
      )}
    </main>
  );
}
