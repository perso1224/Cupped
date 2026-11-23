import { StyleSheet, Text } from 'react-native';
import { PassportView } from '../../components/PassportView';
import { tr } from '../../i18n/tr';
import { type } from '../../theme';

export default function Passport() {
  return <PassportView header={<Text accessibilityRole="header" style={styles.title}>{tr.passport.title}</Text>} />;
}

const styles = StyleSheet.create({
  title: { ...type.largeTitle },
});
