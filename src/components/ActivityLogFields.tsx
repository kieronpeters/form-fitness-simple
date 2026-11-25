import { Check, Minus, Plus, Trash2 } from 'lucide-react';
import type { SessionActivity, SessionSet } from '../types';
import { formatSpeed, formatWeight, toDisplayWeight, toStoredWeight } from '../lib/training';

interface ActivityLogFieldsProps {
  activity: SessionActivity;
  weightUnit: 'kg' | 'lb';
  onSetChange?: (setId: string, patch: Partial<Pick<SessionSet, 'reps' | 'weightKg'>>) => void;
  onAddSet?: () => void;
  onRemoveSet?: (setId: string) => void;
  onMetricsChange?: (patch: Partial<Pick<SessionActivity, 'durationSec' | 'speedKmh' | 'incline' | 'notes'>>) => void;
  readOnly?: boolean;
}

function numberValue(value: number | null): string {
  return value == null ? '' : String(value);
}

export function ActivityLogFields({
  activity,
  weightUnit,
  onSetChange,
  onAddSet,
  onRemoveSet,
  onMetricsChange,
  readOnly = false,
}: ActivityLogFieldsProps) {
  const hasSets = activity.fields.includes('sets');
  const hasReps = activity.fields.includes('reps');
  const hasWeight = activity.fields.includes('weight');
  const hasDuration = activity.fields.includes('duration');
  const hasSpeed = activity.fields.includes('speed');
  const hasIncline = activity.fields.includes('incline');
  const hasNotes = activity.fields.includes('notes');

  return (
    <div className="log-fields">
      {hasSets && (
        <div className="set-table">
          <div className="set-table__head">
            <span>Set</span>
            {hasReps && <span>{activity.repsLabel ?? 'Reps'}</span>}
            {hasWeight && <span>Weight ({weightUnit})</span>}
            <span aria-hidden="true" />
          </div>
          {activity.sets.map((set, index) => {
            const complete = set.reps != null || set.weightKg != null;
            return (
              <div className="set-row" key={set.id}>
                <span className={`set-check${complete ? ' is-complete' : ''}`}>
                  {complete ? <Check size={14} /> : <span>{index + 1}</span>}
                </span>
                {hasReps && (
                  <input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    aria-label={`Set ${index + 1} reps`}
                    value={numberValue(set.reps)}
                    readOnly={readOnly}
                    onChange={(event) =>
                      onSetChange?.(set.id, {
                        reps: event.target.value ? Number(event.target.value) : null,
                      })
                    }
                  />
                )}
                {hasWeight && (
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    inputMode="decimal"
                    aria-label={`Set ${index + 1} weight`}
                    value={
                      set.weightKg == null
                        ? ''
                        : String(Math.round(toDisplayWeight(set.weightKg, weightUnit) * 10) / 10)
                    }
                    readOnly={readOnly}
                    onChange={(event) =>
                      onSetChange?.(set.id, {
                        weightKg: event.target.value
                          ? toStoredWeight(Number(event.target.value), weightUnit)
                          : null,
                      })
                    }
                  />
                )}
                {!readOnly && onRemoveSet && (
                  <button
                    type="button"
                    className="icon-button icon-button--tiny"
                    onClick={() => onRemoveSet(set.id)}
                    disabled={activity.sets.length <= 1}
                    aria-label={`Remove set ${index + 1}`}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
                {readOnly && <span />}
              </div>
            );
          })}
          {!readOnly && onAddSet && (
            <button type="button" className="add-set-button" onClick={onAddSet}>
              <Plus size={16} /> Add Set
            </button>
          )}
        </div>
      )}

      {hasDuration && (
        <div className="metric-grid">
          <label className="field">
            <span>Duration (minutes)</span>
            <input
              type="number"
              min={0}
              step={0.5}
              inputMode="decimal"
              value={activity.durationSec == null ? '' : String(Math.round((activity.durationSec / 60) * 10) / 10)}
              readOnly={readOnly}
              onChange={(event) =>
                onMetricsChange?.({ durationSec: event.target.value ? Number(event.target.value) * 60 : null })
              }
            />
          </label>
          {hasSpeed && (
            <label className="field">
              <span>Speed ({weightUnit === 'lb' ? 'mph' : 'km/h'})</span>
              <input
                type="number"
                min={0}
                step={0.1}
                inputMode="decimal"
                value={
                  activity.speedKmh == null
                    ? ''
                    : String(
                        weightUnit === 'lb'
                          ? Math.round((activity.speedKmh / 1.609344) * 10) / 10
                          : activity.speedKmh,
                      )
                }
                readOnly={readOnly}
                onChange={(event) =>
                  onMetricsChange?.({
                    speedKmh: event.target.value
                      ? weightUnit === 'lb'
                        ? Number(event.target.value) * 1.609344
                        : Number(event.target.value)
                      : null,
                  })
                }
              />
            </label>
          )}
          {hasIncline && (
            <label className="field">
              <span>Incline</span>
              <input
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={numberValue(activity.incline)}
                readOnly={readOnly}
                onChange={(event) =>
                  onMetricsChange?.({ incline: event.target.value ? Number(event.target.value) : null })
                }
              />
            </label>
          )}
        </div>
      )}

      {hasNotes && (
        <label className="field">
          <span>Notes</span>
          <textarea
            rows={2}
            value={activity.notes}
            readOnly={readOnly}
            onChange={(event) => onMetricsChange?.({ notes: event.target.value })}
            placeholder="Anything worth remembering about this activity"
          />
        </label>
      )}

      {!hasSets && !hasDuration && !hasNotes && (
        <p className="muted">This activity has no tracking fields configured.</p>
      )}

      {readOnly && activity.fields.includes('weight') && activity.sets.some((set) => set.weightKg != null) && (
        <p className="tiny muted">
          Recorded weights: {activity.sets.filter((set) => set.weightKg != null).map((set) => formatWeight(set.weightKg, weightUnit)).join(' · ')}
        </p>
      )}
      {readOnly && activity.speedKmh != null && <p className="tiny muted">{formatSpeed(activity.speedKmh, weightUnit)}</p>}
      {!readOnly && activity.fields.includes('rest') && activity.target.restSec != null && (
        <p className="tiny muted"><Minus size={12} /> Rest target: {activity.target.restSec}s between sets</p>
      )}
    </div>
  );
}
