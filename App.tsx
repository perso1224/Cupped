import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Merhaba</Text>
      <Text style={styles.subtitle}>Cupped çalışıyor ☕</Text>
      <StatusBar style="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 48,
    fontWeight: '800',
    color: '#111111',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    color: '#D98B2B',
  },
});
