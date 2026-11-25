import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Copy, MoreVertical, Pencil, Play, Trash2 } from 'lucide-react';
import type { Program } from '../types';
import { EntityImage } from './EntityImage';

interface ProgramCardProps {
  program: Program;
  lastCompleted: boolean;
  lastCompletedAt?: string | null;
  onStart: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function ProgramCard({
  program,
  lastCompleted,
  lastCompletedAt,
  onStart,
  onEdit,
  onDuplicate,
  onDelete,
}: ProgramCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  return (
    <article className="program-card">
      <EntityImage src={program.coverImage} alt="" className="program-card__image" />
      <div className="program-card__body">
        <div className="program-card__top">
          <div className="program-card__title-wrap">
            <h2>{program.name}</h2>
            {program.description && <p>{program.description}</p>}
          </div>
          <div className="program-card__menu-wrap" ref={menuRef}>
            <button
              type="button"
              className="icon-button icon-button--small"
              aria-label={`More actions for ${program.name}`}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((value) => !value)}
            >
              <MoreVertical size={19} />
            </button>
            {menuOpen && (
              <div className="card-menu" role="menu">
                <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onEdit(); }}>
                  <Pencil size={16} /> Edit
                </button>
                <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onDuplicate(); }}>
                  <Copy size={16} /> Duplicate
                </button>
                <button type="button" role="menuitem" className="is-danger" onClick={() => { setMenuOpen(false); onDelete(); }}>
                  <Trash2 size={16} /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="program-card__meta">
          <span>{program.activities.length} Activities</span>
          {lastCompleted && (
            <span className="last-completed">
              <CheckCircle2 size={14} /> Last completed
            </span>
          )}
        </div>
        {lastCompleted && lastCompletedAt && (
          <span className="program-card__date">
            {new Date(lastCompletedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </span>
        )}
      </div>
      <button type="button" className="play-button" onClick={onStart} aria-label={`Start ${program.name}`}>
        <Play size={21} fill="currentColor" />
      </button>
    </article>
  );
}
