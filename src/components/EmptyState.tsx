import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { tr } from '../i18n/tr';
import { colors, type } from '../theme';
import { Icon, type IconName } from './Icon';
import { PillButton } from './ui';

/** Boş liste: simge, kısa açıklama ve (istenirse) "Fincan ekle" düğmesi. Çıplak bir "henüz yok" yazısı yerine. */
export function EmptyState({ icon = 'cafe-outline', title, body, cta = true }: { icon?: IconName; title: string; body?: string; cta?: boolean }) {
  return (
    <View style={styles.box}>
      <View style={styles.iconCircle}>
        <Icon name={icon} size={30} color={colors.accentText} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
      {cta ? <PillButton label={tr.home.ctaButton} icon="add" onPress={() => router.push('/new')} style={{ marginTop: 18, alignSelf: 'stretch' }} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', backgroundColor: colors.card, borderRadius: 22, padding: 24, marginTop: 24 },
  iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  title: { ...type.headline, textAlign: 'center' },
  body: { ...type.subhead, textAlign: 'center', marginTop: 6, lineHeight: 21 },
});
