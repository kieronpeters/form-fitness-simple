import { useState } from 'react';
import { Dumbbell } from 'lucide-react';

interface EntityImageProps {
  src?: string;
  alt?: string;
  className?: string;
  icon?: React.ReactNode;
}

export function EntityImage({ src, alt = '', className = '', icon }: EntityImageProps) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={`entity-image entity-image--fallback ${className}`} aria-hidden="true">
        {icon ?? <Dumbbell size={28} />}
      </div>
    );
  }
  return (
    <img
      className={`entity-image ${className}`}
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
