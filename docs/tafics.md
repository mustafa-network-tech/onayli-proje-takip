# TAFICS teknik raporu

TAFICS, mevcut Next.js App Router / React / Prisma yapısına bağımsız modül olarak eklendi. Yerelde SQLite, production ortamında mevcut Cloudflare D1 bağlantısı kullanılıyor. Yeni bağımlılık eklenmedi.

## Ekran ve işlemler

- Ekran: `/tafics`; mevcut ana navigasyonda TAFICS bağlantısı.
- Oluşturma: `POST /api/tafics`.
- Düzenleme ve onaylı silme: `PATCH /api/tafics/[id]`, `DELETE /api/tafics/[id]`.
- Excel: `GET /api/tafics/export`; aktif arama ve dört filtre uygulanır.
- İl ve Proje Adı zorunludur. Aynı isimle birden fazla kayıt oluşturulabilir. Teknik UUID yalnızca kayıt ilişkisi ve API işlemleri için kullanılır; görünür tablo, form ve Excel alanı değildir.
- Metrajlar sonlu, negatif olmayan sayılardır; üst sınır 1 trilyondur. Açıklama 30.000 karaktere kadar saklanır; açılır detay alanı tam metni gösterir.
- İzin ve tamamlanma durumları ortak sabitlerden doğrulanır. API doğrulamasına ek olarak yeni SQL tablosunda CHECK kısıtları bulunur.
- Mevcut inline bildirim ve `confirm` yaklaşımı kullanılır. Silme API'si de `confirmed: true` ister. Backend işlemleri mevcut `requireUser` üzerinden korunur; sayfa mevcut middleware kapsamındadır. Mevcut sistemde ayrı rol bazlı yetki modeli bulunmuyor.
- Türkçe büyük/küçük harf uyumlu proje adı/il araması ve dört birleşik filtre vardır. Tablo 50 kayıtlık sayfalara ayrılır. Toplamlar ve Excel, geçerli sayfa dahil tüm filtre sonuçlarını kapsar.
- Liste son eklenen kayıt önce olacak şekilde sıralanır. Excel aynı sıralamayı izler. S.N. filtre sonuçlarında 1'den başlar, sayfalarda devam eder; veritabanı anahtarı değildir.
- Excel mevcut `xlsx-js-style` ile oluşturulur. İstenen 10 sütun, sayısal metraj hücreleri, TOPLAM satırı, kolon genişlikleri ve belirgin başlık/toplam biçimleri bulunur. Metin hücreleri formül olarak çalıştırılmaz.
- CSS yalnızca TAFICS sınıflarına uygulanır. Mobilde yatay kaydırılabilir tablo ve tek sütunlu form kullanılır.

## Eklenen dosyalar

- `app/tafics/page.tsx`, `app/tafics/tafics.css`
- `app/api/tafics/route.ts`, `app/api/tafics/[id]/route.ts`, `app/api/tafics/export/route.ts`
- `components/TaficsForm.tsx`, `components/TaficsTable.tsx`
- `lib/tafics.ts`, `lib/tafics-shared.ts`, `lib/tafics-api.ts`, `lib/tafics-export.ts`, `lib/tafics.test.ts`
- `migrations/0004_tafics.sql`
- `scripts/tafics-migrate-local.cjs`, `scripts/tafics-smoke-local.cjs`
- `scripts/build-cloudflare-windows.mjs`: yalnızca `.open-next` çıktı klasöründe Windows kopyalama uyumluluğu sağlayan yayın paketleme yardımcısı.
- Bu rapor: `docs/tafics.md`

## Mevcut dosyalara dokunulan noktalar

- `app/layout.tsx`: tek TAFICS navigasyon bağlantısı.
- `prisma/schema.prisma`: bağımsız `TaficsProject` modeli.
- `.gitignore`: yerel veritabanı yedek klasörünün dışlanması.

Mevcut modüllerin CRUD, Excel, kimlik doğrulama ve ortak CSS kodları değiştirilmedi.

## Veritabanı ve yayınlama

`0004_tafics.sql` yalnızca `TaficsProject` tablosunu ve il/proje türü indeksini oluşturur. Mevcut tablolara ALTER, DROP, DELETE veya veri taşıma işlemi içermez. Proje adında UNIQUE kısıtı yoktur.

Yerelde `node scripts/tafics-migrate-local.cjs` çalıştırıldı. Önce `prisma/local-backups/` altına SQLite yedeği alındı, ardından sadece yeni migration transaction içinde uygulandı. Tablo zaten varsa script değişiklik yapmadan çıkar. Genel `db:push`, reset veya seed çalıştırılmadı.

9 Eylül 2026 tarihinde production'da tek bekleyen migration'ın `0004_tafics.sql` olduğu doğrulandı ve bu migration başarıyla uygulandı. Ardından bekleyen migration kalmadığı ve yeni tablonun 0 kayıtla sorgulanabildiği doğrulandı. Mevcut proje tablolarına değişiklik uygulanmadı.

Production veritabanını yerel SQL dosyasına indirme girişimi otomatik onay incelemesi tarafından hassas veri aktarımı gerekçesiyle reddedildi; production yedeği indirilmedi. Bunun yerine Cloudflare tarafındaki Time Travel geri dönüş bookmark'ı kaydedildi: `0000004f-00000000-000050e1-29c4a0699f4f59ef8f627cdae1fd128c`.

Önceki canlı Worker sürümü: `ed1be09f-8108-4be2-b91d-78789b19aae1`. İlk yayın girişimi otomatik onay incelemesinde açık production yayın onayı bulunmadığı gerekçesiyle reddedildi. Kullanıcının açık “ONAYLIYORUM” mesajından sonra `wrangler deploy --minify --keep-vars` başarıyla çalıştırıldı. **TAFICS production'da yayında.**

- Canlı adres: https://onayli-proje-takip.oner334480.workers.dev/tafics
- Yeni sürüm: `8c1b66d7-f9ee-4e44-9ee2-b72d08dca2f3`.
- Worker başlangıç süresi: 40 ms; paket gzip boyutu yaklaşık 2.52 MiB.
- Mevcut D1 ve ASSETS binding'leri ile ortam değişkenleri korundu.
- Canlı kontrol: oturumsuz Excel isteği 401, oturumsuz TAFICS sayfası giriş yönlendirmesi, oturumla TAFICS sayfası ve veritabanı okuması başarılı.
- TAFICS sayfasının JavaScript/CSS dosyaları HTTP 200 döndü. Boş sonuç veren filtre ile production Excel çıktısı tekrar açılarak 10 başlık ve sayısal toplam hücreleri doğrulandı.
- Dashboard, Kurumsal, GF, BF, Aylık HP ve Performans ekranları oturumla HTTP 200 döndü.
- Production doğrulamasında proje kaydı oluşturulmadı, düzenlenmedi veya silinmedi. CRUD yazma senaryoları yerel HTTP ve SQLite testlerinde doğrulandı.

Windows ortamında OpenNext'in `fs.cpSync` çağrısı config ve dizin içeriklerini sessizce atladığı için standart paketleme başarısız oldu. Uygulama veya bağımlılık dosyalarını değiştirmeyen, sadece `.open-next` hedefine dosyaları tek tek kopyalayan yardımcıyla paketleme tamamlandı: `node scripts/build-cloudflare-windows.mjs --skipNextBuild`. Bu seçenek yalnızca güncel ve başarılı OpenNext/Next standalone derlemesi bulunduğunda kullanılmalıdır. Baştan derlemek için yardımcıyı seçeneksiz çalıştırın.

## Doğrulama

- `npm.cmd run typecheck`: başarılı.
- `npm.cmd test`: 9 test dosyası, 61 test başarılı; 7 kapsamlı TAFICS testi dahil.
- `npm.cmd run build`: production derlemesi başarılı, `/tafics` ve üç API route'u derlendi.
- SQLite entegrasyon testleri: tüm alanların saklanması, aynı adlı kayıtlar, sabit anahtarla yeniden adlandırma, yanlış/eksik silme onayı, bulunamayan kayıt, negatif/geçersiz sayı ve durumların reddi, mevcut HP kaydının korunması.
- Arama/filtre testleri: Türkçe harfler, dört filtrenin ayrı ve birlikte kullanımı, boş sonuç, filtreye bağlı toplamlar, teknik anahtarla arama yapılmaması.
- Excel testleri: dosyanın tekrar açılması, 10 sütun sırası, UUID olmaması, 1'den başlayan sıra numaraları, number hücreleri, tam açıklama, formül olmayan metin, toplam satırı, renkler, genişlikler, boş liste çıktısı.
- Güvenlik/hata testleri: tüm API'lerde oturum doğrulaması, yetkisiz isteklerde veri erişimi yapılmaması, hatalı JSON, ham veritabanı hata mesajlarının gizlenmesi.
- `node scripts/tafics-smoke-local.cjs`: gerçek yerel HTTP oturumu ile oluşturma, sayfada görünme, düzenleme, filtreli Excel ve test kaydının silinmesi başarılı. Dashboard, Kurumsal, GF ve Aylık HP ekranları HTTP 200 döndü. Yalnızca testin oluşturduğu TAFICS kaydı silindi.

Bağlı tarayıcı bulunmadığından masaüstü/mobil görsel inceleme ve tarayıcı üzerinden form etkileşimi doğrulanamadı. Responsive davranış kodda uygulanmıştır. Yerel dev sunucusu testler tamamlandıktan sonra sandbox dışındaki Wrangler registry dizini erişiminden dolayı kapandı; production derlemesi gerekli erişimle başarıyla tamamlandı.

Liste verileri mevcut Kurumsal modüldeki gibi tek sorguda alınır, filtreleme bellekte yapılır; 50 kayıtlık sayfalama DOM yükünü sınırlar. Çok büyük veri hacminde sunucu taraflı arama/sayfalama ve ayrı toplam sorgusu değerlendirilmelidir. Eş zamanlı başka bir kullanıcı değişiklik yaparsa listeyi yenilemek gerekir; Excel indirme veritabanındaki güncel durumu okur.
