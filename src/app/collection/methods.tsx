import { router } from 'expo-router';
import { useMemo } from 'react';
import { ALL_METHODS, CollectionScreen } from '../../components/collection';
import { ListRow, ListSection } from '../../components/List';
import { tr } from '../../i18n/tr';
import { methodStats } from '../../lib/progress';
import { useEntries } from '../../lib/useEntries';
import { METHOD_INK } from '../../config/methodStyle';
import { METHOD_GLYPH } from '../../components/Glyph';
import { colors } from '../../theme';

const shortDate = (iso: string) => new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });

/** Profil > Koleksiyon > Yöntemler: denenenler (fincan sayısı, ortalama) ve henüz denenmeyenler. */
export default function Methods() {
  const entries = useEntries();
  const stats = useMemo(() => methodStats(entries ?? [], ALL_METHODS), [entries]);
  const tried = stats.filter((s) => s.cups > 0).sort((a, b) => b.cups - a.cups);
  const untried = stats.filter((s) => s.cups === 0);

  return (
    <CollectionScreen title={tr.profile.methodsPlural} summary={entries ? tr.collection.methodsSummary(tried.length, ALL_METHODS.length) : undefined}>
      {tried.length ? (
        <ListSection title={tr.collection.tried}>
          {tried.map((s) => (
            <ListRow
              key={s.method}
              glyph={METHOD_GLYPH[s.method]}
              tint={METHOD_INK[s.method]}
              title={tr.methods[s.method]}
              subtitle={`${tr.collection.methodSub(s.cups, s.avg)}${s.lastAt ? `\n${tr.collection.lastCup(shortDate(s.lastAt))}` : ''}`}
              chevron
              onPress={() => router.push({ pathname: '/history', params: { method: s.method } })}
            />
          ))}
        </ListSection>
      ) : null}

      {untried.length ? (
        <ListSection title={tr.collection.untried}>
          {untried.map((s) => (
            <ListRow key={s.method} glyph={METHOD_GLYPH[s.method]} tint={colors.tertiary} title={tr.methods[s.method]} subtitle={tr.collection.untriedSub} />
          ))}
        </ListSection>
      ) : null}
    </CollectionScreen>
  );
}
