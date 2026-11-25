import { Pause, Play, RotateCcw } from 'lucide-react';
import { formatDuration } from '../lib/training';
import { useCountdown } from '../hooks/useCountdown';

interface ActivityTimerProps {
  label: string;
  seconds: number | null;
}

export function ActivityTimer({ label, seconds }: ActivityTimerProps) {
  const timer = useCountdown();
  if (!seconds || seconds <= 0) return null;

  const display = formatDuration(timer.started ? timer.remainingSec : seconds, 'clock');
  const paused = timer.started && !timer.running && timer.remainingSec > 0 && !timer.completed;

  return (
    <div className={`activity-timer${timer.running ? ' is-running' : ''}${timer.completed ? ' is-complete' : ''}`}>
      <button
        type="button"
        className="activity-timer__toggle"
        onClick={() => {
          if (timer.running) {
            timer.pause();
          } else if (timer.completed || !timer.started) {
            timer.start(seconds);
          } else {
            timer.resume();
          }
        }}
        aria-label={
          timer.running
            ? `Pause timer for ${label}`
            : timer.completed
              ? `Restart timer for ${label}`
              : paused
                ? `Resume timer for ${label}`
                : `Start timer for ${label}`
        }
      >
        {timer.running ? <Pause size={15} /> : <Play size={15} fill="currentColor" />}
        <span>{timer.completed ? 'Done' : display}</span>
      </button>
      {timer.started && (
        <button type="button" className="activity-timer__reset" onClick={timer.reset} aria-label={`Reset timer for ${label}`}>
          <RotateCcw size={14} />
        </button>
      )}
    </div>
  );
}
