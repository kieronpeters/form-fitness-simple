import { useMemo, useState } from 'react';
import { Dumbbell, Play, Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { ProgramCard } from '../components/ProgramCard';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { useAppStore } from '../store/appStore';
import { toast } from '../store/toastStore';

export function WorkoutsPage() {
  const navigate = useNavigate();
  const programs = useAppStore((state) => state.programs);
  const sessions = useAppStore((state) => state.sessions);
  const activeSession = useAppStore((state) => state.activeSession);
  const startWorkout = useAppStore((state) => state.startWorkout);
  const duplicateProgram = useAppStore((state) => state.duplicateProgram);
  const deleteProgram = useAppStore((state) => state.deleteProgram);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const lastByProgram = useMemo(() => {
    const map = new Map<string, string>();
    for (const session of sessions) {
      if (!session.programId) continue;
      const current = map.get(session.programId);
      if (!current || session.completedAt > current) map.set(session.programId, session.completedAt);
    }
    return map;
  }, [sessions]);

  const lastCompletedProgramId = useMemo(() => {
    let id: string | null = null;
    let latest = '';
    for (const [programId, completedAt] of lastByProgram) {
      if (completedAt > latest) {
        latest = completedAt;
        id = programId;
      }
    }
    return id;
  }, [lastByProgram]);

  const handleStart = (programId: string) => {
    if (activeSession) {
      toast('Finish or discard your active workout first.', 'error');
      return;
    }
    const sessionId = startWorkout(programId);
    if (sessionId) navigate('/session');
    else toast('That programme has no activities yet.', 'error');
  };

  const handleDuplicate = (programId: string) => {
    const id = duplicateProgram(programId);
    if (id) toast('Programme duplicated.', 'success');
  };

  return (
    <div className="page page--with-nav">
      <PageHeader icon={Dumbbell} title="Workouts" subtitle="Your workout programmes" />

      {activeSession && (
        <Link to="/session" className="resume-banner">
          <span className="resume-banner__icon"><Play size={19} fill="currentColor" /></span>
          <span>
            <strong>Resume {activeSession.programName}</strong>
            <small>Your workout is still in progress</small>
          </span>
          <span className="resume-banner__action">Resume</span>
        </Link>
      )}

      {programs.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title="No workouts yet"
          description="Create your first programme and start training."
          action={
            <Link to="/workouts/new" className="button button--primary">
              <Plus size={18} /> Create New Workout
            </Link>
          }
        />
      ) : (
        <div className="stack">
          {programs.map((program) => (
            <ProgramCard
              key={program.id}
              program={program}
              lastCompleted={program.id === lastCompletedProgramId}
              lastCompletedAt={lastByProgram.get(program.id) ?? null}
              onStart={() => handleStart(program.id)}
              onEdit={() => navigate(`/workouts/${program.id}/edit`)}
              onDuplicate={() => handleDuplicate(program.id)}
              onDelete={() => setDeleteTarget({ id: program.id, name: program.name })}
            />
          ))}
          <Link to="/workouts/new" className="create-program-card">
            <span className="create-program-card__plus"><Plus size={24} /></span>
            <span>Create New Workout</span>
          </Link>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete programme?"
        message={`Delete “${deleteTarget?.name ?? ''}”? Completed history stays in your history, but this programme will be removed.`}
        confirmLabel="Delete programme"
        danger
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteProgram(deleteTarget.id);
            toast('Programme deleted.');
          }
        }}
      />
    </div>
  );
}
