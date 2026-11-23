import { Redirect } from 'expo-router';

// Bu sekme hiç açılmaz; alt menüdeki "+" düğmesi doğrudan /new ekranına gider.
// Bağlantıyla doğrudan açılırsa boş ekran yerine fincan eklemeye yönlendir.
export default function AddPlaceholder() {
  return <Redirect href="/new" />;
}
