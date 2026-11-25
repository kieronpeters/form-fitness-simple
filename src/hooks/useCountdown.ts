import { useCallback, useEffect, useMemo, useState } from 'react';

interface TimerState {
  durationSec: number;
  remainingSec: number;
  endsAt: number | null;
  running: boolean;
  started: boolean;
}

export interface Countdown {
  durationSec: number;
  remainingSec: number;
  running: boolean;
  started: boolean;
  completed: boolean;
  start: (seconds: number) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  toggle: () => void;
}

const EMPTY: TimerState = {
  durationSec: 0,
  remainingSec: 0,
  endsAt: null,
  running: false,
  started: false,
};

export function useCountdown(): Countdown {
  const [state, setState] = useState<TimerState>(EMPTY);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!state.running) return;
    const interval = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, [state.running]);

  const remainingSec = useMemo(() => {
    if (!state.running || state.endsAt == null) return state.remainingSec;
    return Math.max(0, Math.ceil((state.endsAt - now) / 1000));
  }, [now, state.endsAt, state.remainingSec, state.running]);

  useEffect(() => {
    if (!state.running || remainingSec > 0) return;
    setState((current) => ({ ...current, running: false, endsAt: null, remainingSec: 0 }));
  }, [remainingSec, state.running]);

  const start = useCallback((seconds: number) => {
    const duration = Math.max(1, Math.round(seconds));
    setNow(Date.now());
    setState({
      durationSec: duration,
      remainingSec: duration,
      endsAt: Date.now() + duration * 1000,
      running: true,
      started: true,
    });
  }, []);

  const pause = useCallback(() => {
    const remaining = state.running && state.endsAt != null
      ? Math.max(0, Math.ceil((state.endsAt - Date.now()) / 1000))
      : state.remainingSec;
    setState((current) => ({ ...current, remainingSec: remaining, endsAt: null, running: false }));
  }, [state.endsAt, state.remainingSec, state.running]);

  const resume = useCallback(() => {
    if (state.remainingSec <= 0) return;
    setNow(Date.now());
    setState((current) => ({
      ...current,
      endsAt: Date.now() + current.remainingSec * 1000,
      running: true,
    }));
  }, [state.remainingSec]);

  const reset = useCallback(() => {
    setState((current) => ({
      ...current,
      remainingSec: current.durationSec,
      endsAt: null,
      running: false,
      started: false,
    }));
  }, []);

  const toggle = useCallback(() => {
    if (state.running) {
      pause();
    } else if (state.remainingSec > 0 && state.remainingSec < state.durationSec) {
      resume();
    } else if (state.remainingSec <= 0 && state.durationSec > 0) {
      start(state.durationSec);
    } else if (state.remainingSec === state.durationSec) {
      start(state.durationSec);
    }
  }, [pause, resume, start, state.durationSec, state.remainingSec, state.running]);

  return {
    durationSec: state.durationSec,
    remainingSec,
    running: state.running,
    started: state.started,
    completed: state.durationSec > 0 && !state.running && remainingSec === 0,
    start,
    pause,
    resume,
    reset,
    toggle,
  };
}

