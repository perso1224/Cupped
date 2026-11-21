import { useLocalSearchParams } from 'expo-router';
import { BackButton } from '../components/NavButtons';
import { StyleSheet, Text, View } from 'react-native';
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
          <BackButton label={tr.profile.title} />
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
