let counter = 0;

export function createId(prefix = 'id'): string {
  const uuid =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  counter += 1;
  return `${prefix}_${uuid.replace(/-/g, '').slice(0, 12)}${counter.toString(36)}`;
}
