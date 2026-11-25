import type { LucideIcon } from 'lucide-react';
import { ArrowLeft, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PageHeaderProps {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  backTo?: string | number;
  settings?: boolean;
  action?: React.ReactNode;
}

export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  backTo,
  settings = true,
  action,
}: PageHeaderProps) {
  const navigate = useNavigate();

  const goBack = () => {
    if (typeof backTo === 'number') {
      navigate(backTo);
    } else if (typeof backTo === 'string') {
      navigate(backTo);
    } else {
      navigate(-1);
    }
  };

  return (
    <header className={`page-header${backTo !== undefined ? ' page-header--back' : ''}`}>
      <div className="page-header__main">
        {backTo !== undefined ? (
          <button type="button" className="icon-button page-header__back" onClick={goBack} aria-label="Go back">
            <ArrowLeft size={22} />
          </button>
        ) : Icon ? (
          <span className="page-header__icon" aria-hidden="true">
            <Icon size={25} strokeWidth={2.2} />
          </span>
        ) : null}
        <div className="page-header__text">
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      <div className="page-header__actions">
        {action}
        {settings && (
          <button
            type="button"
            className="icon-button"
            onClick={() => navigate('/settings')}
            aria-label="Open settings"
          >
            <Settings size={22} />
          </button>
        )}
      </div>
    </header>
  );
}
