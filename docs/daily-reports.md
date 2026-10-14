# Günlük Bina Raporları

GF/BF binaları taslağa kaydedilir; **Günlük Rapor Al** taslağı o günün raporu olarak kesinleştirir. Sayfa: `/daily-reports`.

## Akış

1. Tür (GF/BF) ve Proje ID ile binalar getirilir, seçilir; durum (Tamamlandı / Problemli / İptal) ve açıklama girilip **Kaydet**'e basılır. Binalar tek taslağa eklenir. Problemli ve iptal için açıklama zorunludur.
2. **Günlük Rapor Al**: taslak, o günün tarihiyle (Europe/Istanbul, sunucuda) kesinleşir. Aynı gün ikinci rapor `(1)`, üçüncü `(2)` olur. Ardından yeni taslak başlatılabilir; süreç gün bazlı değildir. Rapor Al'a basılmayan taslak olduğu gibi kalır.
3. Excel/PDF indirmesi kayıttan **bağımsızdır**: rapor önce kaydedilir, indirme başarısız olsa bile rapor kaybolmaz. Geçmiş Raporlar'dan her iki format tekrar indirilir.

## Toplamlar (yalnızca rapora girilen binalar)

- Toplam bina: rapordaki tüm binalar
- Toplam HP: yalnızca tamamlananlar
- Bekleyen sorunlu HP: problemli binaların HP toplamı (toplam HP'ye dahil değil)
- İptal HP: ayrı, "İPTAL" olarak (toplam HP'ye dahil değil)

## Güvenceler

| Kural | Nerede sağlanır |
|---|---|
| Tek taslak | `DailyReport_single_draft` kısmi benzersiz index (veritabanı) |
| Aynı bina aynı taslağa bir kez | `UNIQUE(reportId, projectType, projectId, sourceKey)`; başka raporlarda tekrar kullanılabilir |
| Kesinleşmiş rapor değişmez | Veritabanı tetikleyicileri (rapor + bina satırları) + API 409 |
| Tarih / sıra tekrarsız | `UNIQUE(reportDate, sequence)`; çakışmada kaybeden istek yeniden dener |
| Açıklama zorunluluğu | `CHECK` kısıtı + API doğrulaması |
| Rapor Al atomik | Tek `UPDATE` (toplamlar aynı ifadede, kayıttan hesaplanır) |
| Geçmiş korunur | Bina bilgisi kopya olarak saklanır; `HpBuilding`'e yabancı anahtar yok (Excel yeniden yüklemesi bina kimliklerini değiştirir). Excel/PDF yalnızca bu kayıttan üretilir |

Dosya adı: `Bina_Raporu_GG-AA-YYYY.xlsx|pdf`, aynı günün sonraki raporları `_(1)`.

## Kurulum

Yerel: `node scripts/daily-reports-migrate-local.cjs` (önce yedek alır) ve `npm run db:generate`.
Production: `migrations/0006_daily_reports.sql` önce D1'e uygulanmalı (`npm run db:migrate:remote`), sonra uygulama yayınlanmalıdır. Yalnızca yeni tablo ekler; mevcut tablolara dokunmaz.

PDF tarayıcıda `jspdf` + `jspdf-autotable` ile üretilir (Worker paketine girmez); Türkçe için `public/fonts/NotoSans-*.ttf` (SIL OFL, `OFL.txt`).
