import { router } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CollectionScreen } from '../../components/collection';
import { ListRow, ListSection } from '../../components/List';
import { PillButton } from '../../components/ui';
import { tr } from '../../i18n/tr';
import { passport, placeRatings } from '../../lib/progress';
import { useEntries } from '../../lib/useEntries';
import { tint, type } from '../../theme';

const shortDate = (iso: string) => new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });

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
        <View style={styles.emptyBox}>
          <Text style={styles.empty}>{tr.collection.noPlaces}</Text>
          <PillButton label={tr.collection.addCup} onPress={() => router.push('/new')} style={{ marginTop: 16, alignSelf: 'stretch' }} />
        </View>
      ) : null}

      {places.length ? (
        <ListSection title={tr.collection.allPlaces}>
          {places.map((p, i) => (
            <ListRow
              key={p.key}
              icon={i === 0 && p.visits > 1 ? 'trophy' : 'location'}
              tint={i === 0 && p.visits > 1 ? tint.amber : tint.cherry}
              title={p.name}
              subtitle={[tr.collection.placeSub(p.visits, shortDate(p.firstVisit)), ratings.get(p.key) ? tr.rating.avg(ratings.get(p.key)!.avg) : null].filter(Boolean).join(' · ')}
              chevron
              onPress={() => open(p.key, p.name)}
            />
          ))}
        </ListSection>
      ) : null}
    </CollectionScreen>
  );
}

const styles = StyleSheet.create({
  emptyBox: { marginTop: 24 },
  empty: { ...type.subhead, lineHeight: 21 },
});
