import { router } from 'expo-router';
import { useMemo } from 'react';
import { CollectionScreen } from '../../components/collection';
import { ListRow, ListSection } from '../../components/List';
import { tr } from '../../i18n/tr';
import { EmptyState } from '../../components/EmptyState';
import { passport, placeRatings } from '../../lib/progress';
import { useEntries } from '../../lib/useEntries';
import { tint } from '../../theme';

// Bu yılın tarihlerinde yıl yazılmaz (satır kısa kalsın)
const shortDate = (iso: string) => {
  const d = new Date(iso);
  const thisYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString('tr-TR', thisYear ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' });
};

/** Profil > Koleksiyon > Mekanlar: ziyaret sayısına göre sıralı liste; dokununca o mekandaki fincanlar açılır. */
export default function Places() {
  const entries = useEntries();
  const places = useMemo(() => passport(entries ?? []).places, [entries]);
  const ratings = useMemo(() => placeRatings(entries ?? []), [entries]);
  const visits = places.reduce((s, p) => s + p.visits, 0);
  const open = (key: string, name: string) => router.push({ pathname: '/history', params: { place: key, title: name } });

  return (
    <CollectionScreen title={tr.profile.placesPlural} summary={places.length ? tr.collection.placesSummary(places.length, visits) : undefined}>
      {entries && places.length === 0 ? (
        <EmptyState icon="location-outline" title={tr.collection.noPlaces} />
      ) : null}

      {places.length ? (
        <ListSection title={tr.collection.allPlaces}>
          {places.map((p, i) => (
            <ListRow
              key={p.key}
              icon={i === 0 && p.visits > 1 ? 'trophy' : 'location'}
              tint={i === 0 && p.visits > 1 ? tint.amber : tint.cherry}
              title={p.name}
              subtitle={tr.collection.placeSub(p.visits, shortDate(p.firstVisit))}
              // Yıldız ortalaması sağda: dar ekranda alt satıra tek başına düşmesin
              value={ratings.get(p.key) ? tr.rating.avg(ratings.get(p.key)!.avg) : undefined}
              chevron
              onPress={() => open(p.key, p.name)}
            />
          ))}
        </ListSection>
      ) : null}
    </CollectionScreen>
  );
}
