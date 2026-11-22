/**
 * Keşfet (DENEME): herkese aynı, her gün sıradaki içerik.
 * Şimdilik uygulamanın içinde; beğenilirse internetten okunan bir dosyaya taşınır.
 * Kural: genel ve doğrulanabilir kahve bilgisi. Gerçek kafe/mekan önerisi YOK (yanlış bilgi riski).
 */
export type DiscoverKind = 'bean' | 'term' | 'tip' | 'fact';
export type DiscoverItem = { id: string; kind: DiscoverKind; title: string; body: string; action?: 'addCup' };

export const DISCOVER: DiscoverItem[] = [
  { id: 'b-yirgacheffe', kind: 'bean', title: 'Etiyopya Yirgacheffe', body: 'Genellikle yıkanmış işlenir. Yasemin gibi çiçeksi kokuları, narenciye ve bergamot notaları, hafif gövdesiyle bilinir. Filtre kahvede çok sevilir.' },
  { id: 't-crema', kind: 'term', title: 'Crema nedir?', body: 'Espressonun üstündeki kızıl kahverengi köpük. Basınçla çözünen karbondioksit ve kahve yağlarından oluşur. Taze kavrulmuş çekirdekte daha bol olur.' },
  { id: 'p-ratio', kind: 'tip', title: 'Filtrede 1:16 oranı', body: '15 gram kahveye 240-250 ml su iyi bir başlangıçtır. Daha yoğun istersen suyu azalt, daha hafif istersen artır. Bugün bir filtre demleyip dene.', action: 'addCup' },
  { id: 'f-cherry', kind: 'fact', title: 'Kahve aslında bir meyve', body: 'Kahve çekirdeği, kahve kirazı denen kırmızı bir meyvenin içindeki tohumdur. Her kirazda genellikle iki çekirdek bulunur.' },
  { id: 'b-kenya', kind: 'bean', title: 'Kenya', body: 'Parlak asiditesiyle ünlüdür. Frenk üzümü ve greyfurt gibi meyvemsi notalar sık görülür. SL28 ve SL34 ülkenin bilinen çeşitleridir.' },
  { id: 't-acidity', kind: 'term', title: 'Asidite ekşilik değildir', body: 'Kahvede asidite, ağızda canlılık ve parlaklık hissidir; iyi bir beyaz şarap ya da yeşil elma gibi. Yüksek rakımda yetişen çekirdeklerde daha belirgindir.' },
  { id: 'p-grind', kind: 'tip', title: 'Acı mı, ekşi mi?', body: 'Kahven acı ve buruk geliyorsa öğütmeyi biraz kalınlaştır. Ekşi ve sulu geliyorsa biraz incelt. Tek seferde tek şeyi değiştir.' },
  { id: 'f-unesco', kind: 'fact', title: 'Türk kahvesi UNESCO listesinde', body: 'Türk kahvesi kültürü ve geleneği, 2013 yılında UNESCO İnsanlığın Somut Olmayan Kültürel Mirası listesine alındı.' },
  { id: 'b-brazil', kind: 'bean', title: 'Brezilya Cerrado', body: 'Düşük asidite, çikolata ve fındık notalarıyla yumuşak bir profil. Bu yüzden espresso harmanlarında sık kullanılır.' },
  { id: 't-body', kind: 'term', title: 'Gövde (body)', body: 'Kahvenin ağızdaki ağırlığı ve dolgunluğu. Süt ile su arasındaki fark gibi düşün. French press kahvesi genellikle filtreden daha gövdelidir.' },
  { id: 'p-bloom', kind: 'tip', title: 'Ön demleme (bloom)', body: 'Filtrede önce kahveyi, ağırlığının yaklaşık iki katı suyla ıslat ve 30-45 saniye bekle. Taze kahve kabarır, gaz çıkar ve demleme daha dengeli olur.' },
  { id: 'f-robusta', kind: 'fact', title: 'Robusta daha sert', body: 'Robusta çekirdeği, Arabica’ya göre kabaca iki kat kafein içerir. Tadı daha acı ve odunsu olur, kreması daha yoğundur.' },
  { id: 'b-sumatra', kind: 'bean', title: 'Sumatra', body: 'Yerel bir yöntem olan ıslak kabuk soyma ile işlenir. Toprak ve baharat notaları, düşük asidite ve yoğun gövdesiyle tanınır.' },
  { id: 't-process', kind: 'term', title: 'Yıkanmış mı, doğal mı?', body: 'Yıkanmış işlemede meyve eti çekirdekten ayrılır; tat daha temiz ve berrak olur. Doğal işlemede çekirdek meyvenin içinde kurur; daha meyvemsi ve tatlı bir fincan çıkar.' },
  { id: 'p-temp', kind: 'tip', title: 'Kaynar su değil', body: 'Filtre kahve için su sıcaklığı genelde 90-96°C arasıdır. Su kaynadıktan sonra 30 saniye kadar beklemek yeterli olur.' },
  { id: 'f-light', kind: 'fact', title: 'Açık kavrum zayıf değildir', body: 'Açık ve koyu kavrum arasındaki kafein farkı çok küçüktür. Açık kavrum çekirdeğin kendi tadını, koyu kavrum ise kavurmanın tadını öne çıkarır.' },
  { id: 'b-geisha', kind: 'bean', title: 'Geisha (Gesha)', body: 'Kökeni Etiyopya’dır; Panama’da yetiştirilen Geisha’lar yasemin, bergamot ve çay gibi hafif bir içimle ünlendi. Açık artırmalarda rekor fiyatlara satılır.' },
  { id: 't-single', kind: 'term', title: 'Single origin ve harman', body: 'Single origin tek bir ülke, bölge ya da çiftlikten gelir ve oranın karakterini gösterir. Harman, farklı çekirdeklerin dengeli bir tat için karıştırılmasıdır.' },
  { id: 'p-turkish', kind: 'tip', title: 'Köpüklü Türk kahvesi', body: 'Soğuk suyla başla, kısık ateşte yavaşça ısıt. Köpük yükselmeye başlayınca önce köpüğü fincanlara paylaştır, sonra kahveyi ekle.', action: 'addCup' },
  { id: 'f-kaldi', kind: 'fact', title: 'Kaldi efsanesi', body: 'Bir efsaneye göre Etiyopyalı çoban Kaldi, keçilerinin bir çalının kırmızı meyvelerini yedikten sonra hoplayıp zıpladığını fark etti. Kahvenin keşfi bu hikâyeyle anlatılır.' },
  { id: 'b-colombia', kind: 'bean', title: 'Kolombiya Huila', body: 'Dengeli asidite, karamel ve kırmızı meyve notalarıyla bilinir. Yüksek dağ bölgelerinde küçük çiftliklerde yetişir.' },
  { id: 't-extraction', kind: 'term', title: 'Ekstraksiyon', body: 'Suyun kahveden tat çekmesi. Az olursa kahve ekşi ve sulu, fazla olursa acı ve buruk olur. Öğütme, süre ve sıcaklık bunu belirler.' },
  { id: 'p-cold', kind: 'tip', title: 'Evde soğuk demleme', body: 'Kalın öğütülmüş kahveyi yaklaşık 1:8 oranında soğuk suyla karıştır, buzdolabında 12-18 saat beklet ve süz. Yumuşak, düşük asiditeli bir içim verir.', action: 'addCup' },
  { id: 'f-rest', kind: 'fact', title: 'Taze kavrum dinlenir', body: 'Kavrulan kahve günlerce karbondioksit salar. Bu yüzden çoğu kahve, kavrumdan birkaç gün sonra daha dengeli demlenir.' },
  { id: 'b-yemen', kind: 'bean', title: 'Yemen', body: 'Tarihi Moka limanı kahve ticaretinin ilk merkezlerindendi. Yemen kahveleri kuru meyve ve şarabımsı notalarıyla bilinir.' },
  { id: 't-cupping', kind: 'term', title: 'Cupping (tadım)', body: 'Kahvelerin standart bir şekilde karşılaştırıldığı tadım yöntemi. Kahve fincanda demlenir, kaşıkla hızlıca höpürdetilerek tadılır. Uygulamanın adı da buradan gelir.' },
  { id: 'p-taste', kind: 'tip', title: 'Biraz soğumasını bekle', body: 'Kahvenin tat notaları ılıklaştıkça daha belirgin olur. Bugün ilk yudumu sıcak, ikincisini birkaç dakika sonra al ve farkı not et.', action: 'addCup' },
  { id: 'f-grind', kind: 'fact', title: 'Öğütünce aroma kaçar', body: 'Kahve öğütüldüğünde yüzeyi büyür ve aroması hızla uçmaya başlar. Mümkünse demlemeden hemen önce öğütmek en iyisidir.' },
];

/** Bugünün içeriği: tarih değişince sıradaki madde (herkeste aynı gün aynı içerik). */
export function discoverIndex(date: Date, length = DISCOVER.length): number {
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
  return ((day % length) + length) % length;
}

/** Bugün ve önceki günler (en yeni önce). */
export function discoverFeed(date: Date, days = 7): DiscoverItem[] {
  const today = discoverIndex(date);
  return Array.from({ length: Math.min(days, DISCOVER.length) }, (_, i) => DISCOVER[(today - i + DISCOVER.length * 10) % DISCOVER.length]);
}
