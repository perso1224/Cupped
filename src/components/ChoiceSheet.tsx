import { useState, type ReactNode } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tr } from '../i18n/tr';
import { colors, type } from '../theme';
import { haptic } from './motion';

type Choice<T> = { title: string; options: { label: string; value: T }[]; onPick: (v: T) => void };

/**
 * Seçenek listesi. iPhone'da sistem uyarı penceresi (bugünkü görünüm).
 * Android'de alttan açılan liste: Android uyarı penceresi en fazla 3 düğme gösterir, 4-5 seçenek sığmaz.
 * Web'de (test) de alttan liste.
 *
 * Kullanım: const [choose, sheet] = useChoice(); ... choose(başlık, seçenekler, seçilince) ... {sheet}
 */
export function useChoice(): [<T>(title: string, options: { label: string; value: T }[], onPick: (v: T) => void, current?: T) => void, ReactNode] {
  const [open, setOpen] = useState<Choice<unknown> | null>(null);

  function choose<T>(title: string, rawOptions: { label: string; value: T }[], onPick: (v: T) => void, current?: T) {
    // Şu anki seçim işaretli görünsün
    const options = rawOptions.map((o) => (current !== undefined && o.value === current ? { ...o, label: `${o.label}  ✓` } : o));
    if (Platform.OS === 'ios') {
      Alert.alert(title, undefined, [
        ...options.map((o) => ({ text: o.label, onPress: () => onPick(o.value) })),
        { text: tr.settings.cancel, style: 'cancel' as const },
      ]);
      return;
    }
    setOpen({ title, options, onPick: onPick as (v: unknown) => void });
  }

  const sheet = <ChoiceSheet choice={open} onClose={() => setOpen(null)} />;
  return [choose, sheet];
}

function ChoiceSheet({ choice, onClose }: { choice: Choice<unknown> | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={!!choice} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={tr.settings.cancel}>
        {/* İçeriğe dokunmak listeyi kapatmasın */}
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]} onPress={() => {}}>
          <Text accessibilityRole="header" style={styles.title}>{choice?.title}</Text>
          {choice?.options.map((o, i) => (
            <Pressable
              key={i}
              android_ripple={{ color: colors.line }}
              style={styles.row}
              accessibilityRole="button"
              onPress={() => {
                haptic.select();
                onClose();
                choice.onPick(o.value);
              }}
            >
              <Text style={styles.rowText}>{o.label}</Text>
            </Pressable>
          ))}
          <Pressable android_ripple={{ color: colors.line }} style={[styles.row, styles.cancel]} onPress={onClose} accessibilityRole="button">
            <Text style={[styles.rowText, { color: colors.accentText, fontWeight: '700' }]}>{tr.settings.cancel}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 18, overflow: 'hidden' },
  title: { ...type.headline, textAlign: 'center', marginBottom: 8, paddingHorizontal: 20 },
  row: { minHeight: 52, justifyContent: 'center', paddingHorizontal: 24, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  rowText: { ...type.body },
  cancel: { marginTop: 6 },
  body: { ...type.body, lineHeight: 24, color: colors.text },
});

/**
 * Bilgi paneli: alttan açılır, uzun açıklamalar için (sistem uyarısında 5 paragraf okunmuyor; web'de de çalışır).
 */
export function InfoSheet({ visible, title, body, onClose }: { visible: boolean; title: string; body: string; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={tr.result.done}>
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 12, maxHeight: '80%' }]} onPress={() => {}}>
          <Text accessibilityRole="header" style={[styles.title, { fontSize: 20 }]}>
            {title}
          </Text>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 8 }}>
            <Text style={styles.body}>{body}</Text>
          </ScrollView>
          <Pressable android_ripple={{ color: colors.line }} style={[styles.row, styles.cancel]} onPress={onClose} accessibilityRole="button">
            <Text style={[styles.rowText, { color: colors.accentText, fontWeight: '700', textAlign: 'center' }]}>{tr.scoreHelp.ok}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
