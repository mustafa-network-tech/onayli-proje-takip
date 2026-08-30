# HP Odaklı Projeler

GF/BF Excel kaynaklarını kalıcı proje ve bina kayıtlarına dönüştüren, imalat ilerlemesi, Rekor, not ve audit geçmişini ayrı ayrı izleyen operasyon paneli.

## Kurulum

```bash
npm install
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

Uygulama `http://localhost:3000` adresinde açılır. Lokal geliştirmede seed kullanıcısı kullanılır. Üretimde `lib/auth.ts` gerçek session/SSO sağlayıcısına bağlanmalıdır.

## Veri güvenliği

- Excel yalnızca `.xlsx`, boyut limitli ve `BİNA ADRESLERİ` sayfasından okunur.
- Import öncesi diff/önizleme zorunludur; onay sonrası tek transaction çalışır.
- Proje eşleşmesi tür + CIZIM_ID, bina eşleşmesi UAVT; UAVT yoksa normalize adres anahtarıdır.
- Import yalnızca Excel kaynak alanlarını günceller. Kablo, Ek, OBK, not ve history alanlarına dokunmaz.
- Import kararı Proje ID bazında verilir. Yeni Excel projesinde Rekor bilgisi bulunuyor, mevcut projede bulunmuyorsa eski proje bağlı kayıtlarıyla tamamen silinir ve yeni proje bütünüyle kaydedilir. Yeni Excel'de Rekor bilgisi yoksa veya mevcut proje zaten Rekor bilgisi içeriyorsa mevcut proje korunur ve yeni sürüm kayda alınmaz.
- Rekor ile panel içi imalat iki bağımsız durumdur.
- Tüm ilerleme ve not değişiklikleri kullanıcı/tarih bilgisiyle history tablosuna eklenir.

## Üretime geçiş notları

SQLite başlangıç ve lokal kullanım içindir. Çok kullanıcılı üretimde Prisma datasource PostgreSQL'e taşınmalı, gerçek authentication bağlanmalı, upload uçlarına uygulamanın rol/yetki politikası uygulanmalı ve CSRF/rate-limit katmanı eklenmelidir.
