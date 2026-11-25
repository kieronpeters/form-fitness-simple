import type { Activity, ProgramActivity, Target } from '../types';

interface TargetEditorProps {
  entry: ProgramActivity;
  activity: Activity;
  onChange: (target: Target) => void;
}

function numberValue(value: number | null | undefined): string {
  return value == null ? '' : String(value);
}

export function TargetEditor({ entry, activity, onChange }: TargetEditorProps) {
  const target = entry.target;
  const update = (patch: Partial<Target>) => onChange({ ...target, ...patch });

  return (
    <div className="target-editor">
      {activity.fields.includes('sets') && (
        <label className="field">
          <span>Sets</span>
          <input
            type="number"
            min={1}
            inputMode="numeric"
            value={numberValue(target.sets)}
            onChange={(event) => update({ sets: event.target.value ? Number(event.target.value) : null })}
          />
        </label>
      )}
      {activity.fields.includes('reps') && (
        <>
          <label className="field">
            <span>Reps min</span>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={numberValue(target.repsMin)}
              onChange={(event) => update({ repsMin: event.target.value ? Number(event.target.value) : null })}
            />
          </label>
          <label className="field">
            <span>Reps max</span>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={numberValue(target.repsMax)}
              onChange={(event) => update({ repsMax: event.target.value ? Number(event.target.value) : null })}
            />
          </label>
          <label className="field field--wide">
            <span>Rep target text (optional)</span>
            <input
              value={target.repsText ?? ''}
              onChange={(event) => update({ repsText: event.target.value || null })}
              placeholder="e.g. near failure"
            />
          </label>
          {(activity.id === 'walking-lunge' || activity.repsLabel) && (
            <label className="check-field field--wide">
              <input
                type="checkbox"
                checked={Boolean(target.perLeg)}
                onChange={(event) => update({ perLeg: event.target.checked })}
              />
              <span>Reps are per leg / step</span>
            </label>
          )}
        </>
      )}
      {activity.fields.includes('duration') && (
        <label className="field">
          <span>Duration (minutes)</span>
          <input
            type="number"
            min={0}
            step={0.5}
            inputMode="decimal"
            value={target.durationSec ? String(Math.round((target.durationSec / 60) * 10) / 10) : ''}
            onChange={(event) =>
              update({ durationSec: event.target.value ? Number(event.target.value) * 60 : null })
            }
          />
        </label>
      )}
      {activity.fields.includes('speed') && (
        <label className="field">
          <span>Speed (km/h)</span>
          <input
            type="number"
            min={0}
            step={0.1}
            inputMode="decimal"
            value={numberValue(target.speedKmh)}
            onChange={(event) => update({ speedKmh: event.target.value ? Number(event.target.value) : null })}
          />
        </label>
      )}
      {activity.fields.includes('incline') && (
        <label className="field">
          <span>Incline</span>
          <input
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={numberValue(target.incline)}
            onChange={(event) => update({ incline: event.target.value ? Number(event.target.value) : null })}
          />
        </label>
      )}
      {activity.fields.includes('rest') && (
        <label className="field">
          <span>Rest (seconds)</span>
          <input
            type="number"
            min={0}
            step={15}
            inputMode="numeric"
            value={numberValue(target.restSec)}
            onChange={(event) => update({ restSec: event.target.value ? Number(event.target.value) : null })}
          />
        </label>
      )}
      <label className="field field--wide">
        <span>Programme note (optional)</span>
        <input
          value={target.note ?? ''}
          onChange={(event) => update({ note: event.target.value || null })}
          placeholder="Technique cue, rest guidance, etc."
        />
      </label>
    </div>
  );
}
