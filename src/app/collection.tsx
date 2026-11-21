import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../components/Icon';
import { PassportView, type PassportFocus } from '../components/PassportView';
import { tr } from '../i18n/tr';
import { colors, type } from '../theme';

/** Profil > Koleksiyon'dan açılan Pasaport (yığın ekranı: sağdan kayarak açılır, geri ile döner). */
export default function Collection() {
  const { focus } = useLocalSearchParams<{ focus?: PassportFocus }>();
  return (
    <PassportView
      focus={focus}
      header={
        <View>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
            <Icon name="chevron-back" size={24} color={colors.accent} />
            <Text style={styles.backText}>{tr.profile.title}</Text>
          </Pressable>
          <Text style={styles.title}>{tr.passport.title}</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginLeft: -6 },
  backText: { fontSize: 17, color: colors.accent },
  title: { ...type.largeTitle, marginTop: 6 },
});
