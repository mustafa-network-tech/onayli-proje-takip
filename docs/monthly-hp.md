# Aylık HP Takibi

Menüde **Aylık HP Takibi** alanı `/monthly-hp` adresindedir.

- GF için Kablo ve Ek; BF için Kablo, Ek ve OBK tamamlandığında bina aylık kayda alınır.
- Excel’in `ALTYAPI_DURUMU` değeri `Tamamlandı` ise bina otomatik tamamlanmış kabul edilir. Excel’den gelen tamamlanmış kayıtlar yükleme ayından önceki aya yazılır. Ocak yüklemeleri önceki yılın Aralık ayına yazılır.
- Panelde son gerekli imalatın tamamlandığı ay kullanılır. Ay sınırları Türkiye saatine göredir.
- Tamamlanan kayıtta proje türü, Proje ID, UAVT, bina adresi, HP ve ay saklanır. Aynı proje türü + Proje ID + bina anahtarı ikinci kez sayılmaz.
- Excel yeniden yüklense veya silinse de aylık arşiv korunur. Yeniden yüklenen dosyadaki HP/adres değişiklikleri eski aylık kaydı değiştirmez. Gerektiğinde yalnızca bu modüldeki tamamlanma ayı düzenlenebilir.
- İmalat işareti geri alınırsa bina güncel kalan listeye döner; geçmiş tamamlanma kaydı korunur. Aylık üretim ile güncel kalan iş bu nedenle farklı zamanları temsil eder.
- Kalan HP, henüz tüm gerekli imalatları tamamlanmamış aktif binaların HP toplamıdır; kısmi imalat oranıyla azaltılmaz. Kalan liste ay seçiminden bağımsızdır.
- GF, BF ve GF + BF için Excel çıktısı ile yazdırma/PDF kaydetme seçenekleri bulunur. Önceki proje Excel çıktıları değişmez.

## İlk yayın

Yeni tablo, yeni kod yayına girmeden önce oluşturulmalıdır. Migration, o anda mevcut tamamlanmış binaları bir önceki aya aktarır. Mevcut proje, bina ve Excel tablolarını değiştirmez.

Proje klasöründe:

```powershell
npm.cmd run db:migrate:remote
npm.cmd run deploy
```

GitHub üzerinden otomatik dağıtım kullanılıyorsa migration komutunu **push öncesinde** çalıştırın. Migration tekrar çalıştırıldığında uygulanmış dosyalar atlanır. Bu migration için veritabanını sıfırlamak gerekmez.

Yerel geliştirme için:

```powershell
node scripts/apply-monthly-hp-local.mjs
npm.cmd run db:generate
npm.cmd run dev
```

Yerel yardımcı, `prisma/dev.db` dosyasını `.cloudflare-backups` altında yedekler ve tablo yoksa migration’ı uygular.
