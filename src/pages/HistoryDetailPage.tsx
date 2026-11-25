import { useMemo, useState } from 'react';
import { Lock, Pencil, Trash2 } from 'lucide-react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import type { SessionActivity, SessionSet } from '../types';
import { createId } from '../lib/ids';
import { useAppStore } from '../store/appStore';
import { toast } from '../store/toastStore';
import { PageHeader } from '../components/PageHeader';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EntityImage } from '../components/EntityImage';
import { ActivityLogFields } from '../components/ActivityLogFields';
import {
  formatDate,
  formatDuration,
  formatSessionActivitySummary,
  formatTargetText,
  formatTime,
} from '../lib/training';

function hasData(activity: SessionActivity): boolean {
  return (
    activity.sets.some((set) => set.reps != null || set.weightKg != null) ||
    activity.durationSec != null ||
    activity.speedKmh != null ||
    activity.incline != null ||
    Boolean(activity.notes.trim())
  );
}

export function HistoryDetailPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const sessions = useAppStore((state) => state.sessions);
  const weightUnit = useAppStore((state) => state.settings.weightUnit);
  const updateSessionValues = useAppStore((state) => state.updateSessionValues);
  const deleteSession = useAppStore((state) => state.deleteSession);
  const session = useMemo(() => sessions.find((item) => item.id === sessionId), [sessionId, sessions]);
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [draft, setDraft] = useState<SessionActivity[]>([]);

  if (!session) return <Navigate to="/history" replace />;

  const beginEdit = () => {
    setDraft(structuredClone(session.activities));
    setEditing(true);
  };

  const updateDraft = (activityId: string, patch: Partial<SessionActivity>) => {
    setDraft((current) =>
      current.map((activity) => (activity.id === activityId ? { ...activity, ...patch } : activity)),
    );
  };

  const updateSet = (activityId: string, setId: string, patch: Partial<Pick<SessionSet, 'reps' | 'weightKg'>>) => {
    setDraft((current) =>
      current.map((activity) =>
        activity.id === activityId
          ? {
              ...activity,
              sets: activity.sets.map((set) => (set.id === setId ? { ...set, ...patch } : set)),
            }
          : activity,
      ),
    );
  };

  const save = () => {
    const cleaned = draft.filter(hasData);
    if (!cleaned.length) {
      toast('A workout needs at least one recorded value.', 'error');
      return;
    }
    updateSessionValues(session.id, cleaned);
    setEditing(false);
    toast('Workout values updated.', 'success');
  };

  return (
    <div className="page page--editor">
      <PageHeader
        title={editing ? 'Edit Workout Values' : 'Workout Details'}
        backTo="/history"
        settings={false}
        action={
          editing ? (
            <button type="button" className="text-button" onClick={save}>Save</button>
          ) : (
            <>
              <button type="button" className="icon-button" onClick={beginEdit} aria-label="Edit workout values">
                <Pencil size={19} />
              </button>
              <button type="button" className="icon-button is-danger" onClick={() => setDeleteOpen(true)} aria-label="Delete workout">
                <Trash2 size={19} />
              </button>
            </>
          )
        }
      />

      <section className="detail-hero">
        <EntityImage src={session.programCover} alt="" className="detail-hero__image" />
        <div className="detail-hero__copy">
          <p className="eyebrow">Completed workout</p>
          <h2>{session.programName}</h2>
          <div className="detail-meta">
            <span>{formatDate(session.completedAt)}</span>
            <span>{formatTime(session.completedAt)}</span>
            <span><Lock size={12} /> {formatDuration(session.durationSec)}</span>
          </div>
        </div>
      </section>

      {editing && (
        <p className="info-note">
          <Lock size={14} /> The original start/finish time and duration stay unchanged.
        </p>
      )}

      <div className="detail-activities">
        {editing
          ? draft.map((activity) => (
              <section className="detail-activity detail-activity--edit" key={activity.id}>
                <div className="detail-activity__header">
                  <EntityImage src={activity.image} alt="" className="detail-activity__image" />
                  <div>
                    <h3>{activity.label}</h3>
                    <p>{formatTargetText(activity.target, weightUnit)}</p>
                  </div>
                </div>
                <ActivityLogFields
                  activity={activity}
                  weightUnit={weightUnit}
                  onSetChange={(setId, patch) => updateSet(activity.id, setId, patch)}
                  onAddSet={() =>
                    updateDraft(activity.id, {
                      sets: [...activity.sets, { id: createId('set'), reps: null, weightKg: null }],
                    })
                  }
                  onRemoveSet={(setId) =>
                    updateDraft(activity.id, { sets: activity.sets.filter((set) => set.id !== setId) })
                  }
                  onMetricsChange={(patch) => updateDraft(activity.id, patch)}
                />
              </section>
            ))
          : session.activities.map((activity) => (
              <section className="detail-activity" key={activity.id}>
                <EntityImage src={activity.image} alt="" className="detail-activity__image" />
                <div className="detail-activity__copy">
                  <h3>{activity.label}</h3>
                  <p>{formatSessionActivitySummary(activity, weightUnit)}</p>
                  {activity.notes.trim() && <small>{activity.notes}</small>}
                </div>
              </section>
            ))}
      </div>

      {editing && (
        <div className="edit-actions">
          <button type="button" className="button button--primary button--full" onClick={save}>Save changes</button>
          <button type="button" className="button button--ghost button--full" onClick={() => setEditing(false)}>Cancel</button>
        </div>
      )}

      <ConfirmDialog
        open={deleteOpen}
        title="Delete this workout?"
        message="This removes the session and its contribution to workout counts, time, volume and personal records. This cannot be undone."
        confirmLabel="Delete workout"
        danger
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => {
          deleteSession(session.id);
          toast('Workout deleted.');
          navigate('/history');
        }}
      />
    </div>
  );
}
