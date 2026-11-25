import { useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  ImagePlus,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Activity, Program, ProgramActivity, Target } from '../types';
import { createId } from '../lib/ids';
import { compressImageFile } from '../lib/image';
import { formatTargetText } from '../lib/training';
import { useAppStore } from '../store/appStore';
import { toast } from '../store/toastStore';
import { PageHeader } from '../components/PageHeader';
import { EntityImage } from '../components/EntityImage';
import { ActivityPicker } from '../components/ActivityPicker';
import { TargetEditor } from '../components/TargetEditor';

function defaultTarget(activity: Activity): Target {
  if (activity.fields.includes('sets')) {
    return {
      sets: 3,
      repsMin: 8,
      repsMax: 12,
      repsText: null,
      perLeg: Boolean(activity.repsLabel),
      restSec: 90,
      note: null,
    };
  }
  return {
    durationSec: 5 * 60,
    speedKmh: activity.fields.includes('speed') ? 5 : null,
    incline: activity.fields.includes('incline') ? 9 : null,
    note: null,
  };
}

function emptyProgram(): Program {
  const now = new Date().toISOString();
  return {
    id: createId('program'),
    name: '',
    description: '',
    coverImage: '/images/activities/placeholder.jpg',
    activities: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function ProgramEditorPage() {
  const { programId } = useParams();
  const navigate = useNavigate();
  const programs = useAppStore((state) => state.programs);
  const activities = useAppStore((state) => state.activities);
  const weightUnit = useAppStore((state) => state.settings.weightUnit);
  const saveProgram = useAppStore((state) => state.saveProgram);
  const existing = programId && programId !== 'new' ? programs.find((program) => program.id === programId) : null;
  const [draft, setDraft] = useState<Program>(() => existing ? structuredClone(existing) : emptyProgram());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  if (programId && programId !== 'new' && !existing) {
    return (
      <div className="page">
        <PageHeader title="Workout not found" backTo="/" settings={false} />
        <p className="muted">This programme no longer exists.</p>
      </div>
    );
  }

  const update = (patch: Partial<Program>) => setDraft((current) => ({ ...current, ...patch }));

  const updateEntry = (entryId: string, patch: Partial<ProgramActivity>) => {
    setDraft((current) => ({
      ...current,
      activities: current.activities.map((entry) => (entry.id === entryId ? { ...entry, ...patch } : entry)),
    }));
  };

  const move = (index: number, delta: number) => {
    const next = index + delta;
    if (next < 0 || next >= draft.activities.length) return;
    const activitiesNext = [...draft.activities];
    const [item] = activitiesNext.splice(index, 1);
    activitiesNext.splice(next, 0, item);
    update({ activities: activitiesNext });
  };

  const addActivity = (activity: Activity) => {
    const entry: ProgramActivity = {
      id: createId('pa'),
      activityId: activity.id,
      label: activity.name,
      target: defaultTarget(activity),
    };
    update({ activities: [...draft.activities, entry] });
    setExpanded(entry.id);
    setPickerOpen(false);
  };

  const handleCover = async (file: File | undefined) => {
    if (!file) return;
    try {
      const image = await compressImageFile(file, { maxDimension: 1400, quality: 0.82 });
      update({ coverImage: image.dataUrl });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not use that image.', 'error');
    }
  };

  const save = () => {
    if (!draft.name.trim()) {
      toast('Give your workout a title.', 'error');
      return;
    }
    if (!draft.activities.length) {
      toast('Add at least one activity.', 'error');
      return;
    }
    const cleaned: Program = {
      ...draft,
      name: draft.name.trim(),
      description: draft.description?.trim() ?? '',
      activities: draft.activities.map((entry) => ({
        ...entry,
        label: entry.label.trim() || activities.find((activity) => activity.id === entry.activityId)?.name || 'Activity',
      })),
      updatedAt: new Date().toISOString(),
    };
    saveProgram(cleaned);
    toast(existing ? 'Workout updated.' : 'Workout created.', 'success');
    navigate('/');
  };

  return (
    <div className="page page--editor">
      <PageHeader
        title={existing ? 'Edit Workout' : 'New Workout'}
        backTo="/"
        settings={false}
        action={
          <button type="button" className="text-button" onClick={save}>
            <Save size={17} /> Save
          </button>
        }
      />

      <section className="editor-cover">
        <EntityImage src={draft.coverImage} alt="" className="editor-cover__image" />
        <button type="button" className="button button--overlay" onClick={() => fileRef.current?.click()}>
          <ImagePlus size={17} /> Change cover
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(event) => {
            void handleCover(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
      </section>

      <div className="form-stack">
        <label className="field">
          <span>Workout title</span>
          <input
            value={draft.name}
            onChange={(event) => update({ name: event.target.value })}
            placeholder="e.g. Day 1 – Push"
          />
        </label>
        <label className="field">
          <span>Description</span>
          <input
            value={draft.description ?? ''}
            onChange={(event) => update({ description: event.target.value })}
            placeholder="Chest · shoulders · triceps"
          />
        </label>
      </div>

      <div className="section-heading">
        <h2>Activities ({draft.activities.length})</h2>
        <span className="muted">Tap an activity to edit its target</span>
      </div>

      <div className="editor-activities">
        {draft.activities.map((entry, index) => {
          const activity = activities.find((item) => item.id === entry.activityId);
          if (!activity) return null;
          const isOpen = expanded === entry.id;
          return (
            <div
              key={entry.id}
              className={`editor-activity${isOpen ? ' is-open' : ''}`}
              draggable
              onDragStart={() => setDraggingIndex(index)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (draggingIndex == null || draggingIndex === index) return;
                const next = [...draft.activities];
                const [item] = next.splice(draggingIndex, 1);
                next.splice(index, 0, item);
                update({ activities: next });
                setDraggingIndex(null);
              }}
            >
              <div className="editor-activity__row">
                <span className="drag-handle" aria-hidden="true"><GripVertical size={18} /></span>
                <EntityImage src={activity.image} alt="" className="editor-activity__image" />
                <button type="button" className="editor-activity__copy" onClick={() => setExpanded(isOpen ? null : entry.id)}>
                  <strong>{entry.label}</strong>
                  <small>{formatTargetText(entry.target, weightUnit)}</small>
                </button>
                <div className="editor-activity__actions">
                  <button type="button" className="icon-button icon-button--small" onClick={() => move(index, -1)} aria-label={`Move ${entry.label} up`} disabled={index === 0}>
                    <ChevronUp size={16} />
                  </button>
                  <button type="button" className="icon-button icon-button--small" onClick={() => move(index, 1)} aria-label={`Move ${entry.label} down`} disabled={index === draft.activities.length - 1}>
                    <ChevronDown size={16} />
                  </button>
                  <button type="button" className="icon-button icon-button--small is-danger" onClick={() => update({ activities: draft.activities.filter((item) => item.id !== entry.id) })} aria-label={`Remove ${entry.label}`}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              {isOpen && (
                <div className="editor-activity__details">
                  <label className="field">
                    <span>Programme label</span>
                    <input value={entry.label} onChange={(event) => updateEntry(entry.id, { label: event.target.value })} />
                  </label>
                  <TargetEditor
                    entry={entry}
                    activity={activity}
                    onChange={(target) => updateEntry(entry.id, { target })}
                  />
                </div>
              )}
            </div>
          );
        })}
        {!draft.activities.length && (
          <p className="muted center">No activities yet. Add one below.</p>
        )}
      </div>

      <button type="button" className="button button--outline button--full" onClick={() => setPickerOpen(true)}>
        <Plus size={18} /> Add Activity
      </button>

      <button type="button" className="button button--primary button--full button--sticky" onClick={save}>
        <Save size={18} /> Save Workout
      </button>

      <ActivityPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={addActivity} />
    </div>
  );
}

