"use client";

import { useEffect, useRef, useState } from "react";

const PRESETS = [60, 90, 120, 180];

export default function RestTimer() {
  const [remaining, setRemaining] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (remaining == null) return;
    if (remaining <= 0) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setRemaining((r) => (r == null ? null : r - 1));
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining != null]);

  function start(seconds: number) {
    setRemaining(seconds);
  }

  const mm = remaining != null ? Math.floor(Math.max(remaining, 0) / 60) : 0;
  const ss = remaining != null ? Math.max(remaining, 0) % 60 : 0;
  const done = remaining != null && remaining <= 0;

  return (
    <div className="flex items-center gap-2 rounded-xl border-2 border-line px-3 py-2">
      <span className="text-lg">⏱️</span>
      {remaining == null ? (
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((s) => (
            <button key={s} className="btn-secondary min-h-0 px-3 py-1.5 text-sm" onClick={() => start(s)}>
              {s}s
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-between">
          <span className={`font-mono text-xl ${done ? "text-warn" : ""}`}>
            {done ? "Rest up!" : `${mm}:${String(ss).padStart(2, "0")}`}
          </span>
          <button className="btn-ghost" onClick={() => setRemaining(null)}>
            Reset
          </button>
        </div>
      )}
    </div>
  );
}
