import { useRef, useState } from 'react';
import { ImagePlus, Save, Trash2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Activity, ActivityCategory, ActivityField } from '../types';
import { createId } from '../lib/ids';
import { compressImageFile } from '../lib/image';
import { useAppStore } from '../store/appStore';
import { toast } from '../store/toastStore';
import { PageHeader } from '../components/PageHeader';
import { EntityImage } from '../components/EntityImage';
import { ConfirmDialog } from '../components/ConfirmDialog';

const CATEGORIES: ActivityCategory[] = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Cardio', 'Core'];
const FIELDS: Array<{ id: ActivityField; label: string }> = [
  { id: 'sets', label: 'Sets' },
  { id: 'reps', label: 'Repetitions' },
  { id: 'weight', label: 'Weight' },
  { id: 'duration', label: 'Duration' },
  { id: 'speed', label: 'Speed' },
  { id: 'incline', label: 'Incline' },
  { id: 'rest', label: 'Rest interval' },
  { id: 'notes', label: 'Notes' },
];

function newActivity(): Activity {
  const now = new Date().toISOString();
  return {
    id: createId('activity'),
    name: '',
    category: 'Chest',
    description: '',
    image: '/images/activities/placeholder.jpg',
    fields: ['sets', 'reps', 'weight', 'rest'],
    isCustom: true,
    createdAt: now,
    updatedAt: now,
  };
}

export function ActivityEditorPage() {
  const { activityId } = useParams();
  const navigate = useNavigate();
  const activities = useAppStore((state) => state.activities);
  const programs = useAppStore((state) => state.programs);
  const activeSession = useAppStore((state) => state.activeSession);
  const saveActivity = useAppStore((state) => state.saveActivity);
  const deleteActivity = useAppStore((state) => state.deleteActivity);
  const existing = activityId && activityId !== 'new'
    ? activities.find((activity) => activity.id === activityId)
    : null;
  const [draft, setDraft] = useState<Activity>(() => existing ? structuredClone(existing) : newActivity());
  const [deleteOpen, setDeleteOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  if (activityId && activityId !== 'new' && !existing) {
    return (
      <div className="page">
        <PageHeader title="Activity not found" backTo="/activities" settings={false} />
        <p className="muted">This activity no longer exists.</p>
      </div>
    );
  }

  const update = (patch: Partial<Activity>) => setDraft((current) => ({ ...current, ...patch }));

  const toggleField = (field: ActivityField) => {
    update({
      fields: draft.fields.includes(field)
        ? draft.fields.filter((item) => item !== field)
        : [...draft.fields, field],
    });
  };

  const handleImage = async (file: File | undefined) => {
    if (!file) return;
    try {
      const image = await compressImageFile(file, { maxDimension: 1200, quality: 0.8 });
      update({ image: image.dataUrl });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not use that image.', 'error');
    }
  };

  const save = () => {
    if (!draft.name.trim()) {
      toast('Give the activity a name.', 'error');
      return;
    }
    if (!draft.fields.length) {
      toast('Choose at least one tracking field.', 'error');
      return;
    }
    saveActivity({
      ...draft,
      name: draft.name.trim(),
      description: draft.description?.trim() ?? '',
      updatedAt: new Date().toISOString(),
    });
    toast(existing ? 'Activity updated.' : 'Activity created.', 'success');
    navigate('/activities');
  };

  const usage = existing
    ? programs.filter((program) => program.activities.some((entry) => entry.activityId === existing.id)).length
    : 0;
  const activeUse = existing && activeSession?.activities.some((activity) => activity.activityId === existing.id);

  return (
    <div className="page page--editor">
      <PageHeader
        title={existing ? 'Edit Activity' : 'New Activity'}
        backTo="/activities"
        settings={false}
        action={
          <button type="button" className="text-button" onClick={save}>
            <Save size={17} /> Save
          </button>
        }
      />

      <section className="editor-cover editor-cover--activity">
        <EntityImage src={draft.image} alt="" className="editor-cover__image" />
        <button type="button" className="button button--overlay" onClick={() => fileRef.current?.click()}>
          <ImagePlus size={17} /> Change image
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(event) => {
            void handleImage(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
      </section>

      <div className="form-stack">
        <label className="field">
          <span>Activity name</span>
          <input value={draft.name} onChange={(event) => update({ name: event.target.value })} placeholder="e.g. Bench Press" />
        </label>
        <label className="field">
          <span>Muscle group</span>
          <select value={draft.category} onChange={(event) => update({ category: event.target.value as ActivityCategory })}>
            {CATEGORIES.map((category) => <option key={category}>{category}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Description (optional)</span>
          <input value={draft.description ?? ''} onChange={(event) => update({ description: event.target.value })} />
        </label>
      </div>

      <div className="section-heading"><h2>Tracking fields</h2></div>
      <div className="field-grid">
        {FIELDS.map((field) => (
          <label key={field.id} className="check-field">
            <input type="checkbox" checked={draft.fields.includes(field.id)} onChange={() => toggleField(field.id)} />
            <span>{field.label}</span>
          </label>
        ))}
      </div>

      {draft.fields.includes('reps') && (
        <label className="field">
          <span>Reps label (optional)</span>
          <input
            value={draft.repsLabel ?? ''}
            onChange={(event) => update({ repsLabel: event.target.value || undefined })}
            placeholder="e.g. steps/leg"
          />
        </label>
      )}

      <button type="button" className="button button--primary button--full button--sticky" onClick={save}>
        <Save size={18} /> Save Activity
      </button>

      {existing && (
        <button type="button" className="button button--danger-ghost button--full" onClick={() => setDeleteOpen(true)}>
          <Trash2 size={17} /> Delete activity
        </button>
      )}

      <ConfirmDialog
        open={deleteOpen}
        title="Delete activity?"
        message={
          activeUse
            ? 'This activity is part of your active workout. Finish or discard that workout first.'
            : `This will remove the activity from ${usage} programme${usage === 1 ? '' : 's'}. Completed history keeps its recorded values.`
        }
        confirmLabel="Delete activity"
        danger
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => {
          if (activeUse) {
            toast('Finish or discard the active workout first.', 'error');
            return;
          }
          const result = deleteActivity(draft.id);
          if (!result.ok) {
            toast(result.reason ?? 'Could not delete activity.', 'error');
            return;
          }
          toast('Activity deleted.');
          navigate('/activities');
        }}
      />
    </div>
  );
}
