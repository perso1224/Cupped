/**
 * Bir işi hata fırlatmadan çalıştırır: başarılıysa sonucu, hata olursa `{ error: true }` döner.
 * Ekran bileşenlerinde try/catch/finally gerekmesin diye (React Compiler bunları içeren bileşenleri optimize edemiyor).
 */
export async function safely<T>(work: () => Promise<T>): Promise<{ ok: true; value: T } | { ok: false }> {
  try {
    return { ok: true, value: await work() };
  } catch {
    return { ok: false };
  }
}
