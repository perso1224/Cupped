import { encodeProfile, tasteProfile } from './match';
import { computePalateTypeId } from './palate';
import { useEntries } from './useEntries';

/** Paylaşım kartlarındaki davet satırı için kendi damak kodun (fincan yoksa null). */
export function useDamakCode(): string | null {
  const entries = useEntries() ?? [];
  if (!entries.length) return null;
  const p = tasteProfile(entries, computePalateTypeId(entries));
  return p ? encodeProfile(p) : null;
}
