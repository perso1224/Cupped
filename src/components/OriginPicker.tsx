import { useMemo, useState } from 'react';
import { Modal, SectionList, StyleSheet, Text, TextInput, View } from 'react-native';
import { applyOrigin, filterOrigins, originOptions, type OriginOption } from '../config/origins';
import { tr, upper } from '../i18n/tr';
import { colors, layout, type } from '../theme';
import { Icon } from './Icon';
import { CloseButton } from './NavButtons';
import { haptic, PressScale } from './motion';

const SECTIONS = originOptions();

/**
 * Çekirdek seçici: dünyadaki kahve ülkeleri/bölgeleri, çeşitler ve türler; üstte arama.
 * Seçim menşei metnine yazılır; menşei ve çeşit birlikte seçilebilir ("Panama Boquete · Geisha").
 */
export function OriginPicker({
  visible,
  value,
  onChange,
  onClose,
}: {
  visible: boolean;
  value: string;
  onChange: (v: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const sections = useMemo(() => filterOrigins(SECTIONS, q), [q]);
  const parts = value.split(' · ').map((s) => s.trim());

  function pick(o: OriginOption) {
    haptic.select();
    const next = applyOrigin(value, o);
    onChange(next);
    // Menşei seçince çeşit de seçebilsin diye açık kalır; çeşit seçince kapanır.
    if (o.kind === 'variety') close();
  }

  function close() {
    setQ('');
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <View style={styles.screen}>
        <View style={styles.head}>
          <CloseButton onPress={close} />
          <Text style={styles.title}>{tr.capture.originPickerTitle}</Text>
          <View style={{ width: 36 }} />
        </View>
        {value ? (
          <View style={styles.current}>
            <Text style={styles.currentText} numberOfLines={1}>
              {value}
            </Text>
            <PressScale onPress={() => onChange('')} hitSlop={10} accessibilityLabel={tr.capture.originClear}>
              <Icon name="close-circle" size={20} color={colors.muted} />
            </PressScale>
          </View>
        ) : null}
        <View style={styles.search}>
          <Icon name="search" size={18} color={colors.muted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={tr.capture.originSearch}
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
            autoCorrect={false}
            clearButtonMode="while-editing"
            returnKeyType="done"
          />
        </View>
        <Text style={styles.hint}>{tr.capture.originPickerHint}</Text>
        <SectionList
          sections={sections}
          keyExtractor={(o) => `${o.kind}:${o.label}`}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          stickySectionHeadersEnabled
          contentContainerStyle={{ paddingBottom: 40 }}
          ListEmptyComponent={
            <PressScale
              onPress={() => {
                onChange(q.trim().slice(0, 80));
                close();
              }}
              style={styles.row}
            >
              <Text style={styles.rowText}>{tr.capture.originUseTyped(q.trim())}</Text>
            </PressScale>
          }
          renderSectionHeader={({ section }) => <Text style={styles.section}>{upper(section.title)}</Text>}
          renderItem={({ item }) => {
            const selected = parts.includes(item.label);
            const isRegion = !!item.region;
            return (
              <PressScale onPress={() => pick(item)} scaleTo={0.98} style={[styles.row, isRegion && styles.regionRow]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowText, !isRegion && item.kind === 'origin' && styles.countryText]}>{item.label}</Text>
                  {item.sub ? <Text style={styles.rowSub}>{item.sub}</Text> : null}
                </View>
                {selected ? <Icon name="checkmark-circle" size={22} color={colors.accent} /> : null}
              </PressScale>
            );
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: layout.screenPad, paddingTop: 16 },
  title: { ...type.headline },
  current: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: layout.screenPad,
    marginTop: 14,
    backgroundColor: colors.accentSoft,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  currentText: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.accentText },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: layout.screenPad,
    marginTop: 12,
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: { flex: 1, fontSize: 16, color: colors.text },
  hint: { ...type.footnote, marginHorizontal: layout.screenPad, marginTop: 8, marginBottom: 4 },
  section: { ...type.sectionHeader, backgroundColor: colors.bg, paddingHorizontal: layout.screenPad + 4, paddingTop: 16, paddingBottom: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 46,
    paddingHorizontal: layout.screenPad + 4,
    paddingVertical: 8,
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  regionRow: { paddingLeft: layout.screenPad + 24 },
  rowText: { ...type.body },
  countryText: { fontWeight: '600' },
  rowSub: { ...type.caption, marginTop: 1 },
});
