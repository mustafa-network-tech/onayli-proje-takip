# Kurumsal Projeler

Kurumsal ayrı bir ana kategoridir; GF/BF, HP Odaklı Projeler altında kalır. Kurumsal kayıtlarında HP alanı yoktur ve aylık HP toplamlarına katılmazlar.

## Excel eşleştirmesi

| Excel sütunu | Panel ve çıktı başlığı |
| --- | --- |
| SANTRAL_ADI | İlçe |
| CIZIM_ADI | Adres |
| CIZIM_ID | ID |

Değerler aynen alınır; örneğin `BİGA-48` değeri İlçe alanında `BİGA-48` olarak görünür. İlçe ve adres panelden düzenlenebilir.

Yeni projeler Başlanmadı durumunda açılır. Kablo veya Ek'ten biri Yapıldı ise Devam Ediyor, ikisi de Yapıldı ise Tamamlandı gösterilir. İşaret kaldırıldığında durum yeniden hesaplanır. Excel'deki onay durumu veya hücre rengi imalat durumunu belirlemez.

Excel yükleme `/corporate/import`, liste `/corporate` adresindedir. Ön izleme ve onay ile kayıt yapılır. Aynı ID yeniden yüklendiğinde Kablo, Ek, not ve elle düzenlenmiş ilçe/adres korunur; kaynak bilgiler güncellenir. Dosyada bulunmayan eski kayıtlar silinmez. Yeni dosyadaki mükerrer/eksik ID satırları ön izlemede bildirilir ve kayda alınmaz.

Panelde İlçe, Adres, ID, Kablo, Ek, Durum ve Not gösterilir. Onaylandı, İl Adı ve Proje Özelliği alanları panelde ve çıktıda gösterilmez. Excel çıktısı aynı sütun başlıklarını kullanır; rapor başlığı **TTVPN PROJELERİ** olur. Alt başlıkta seçilen durum, ilçe/arama filtresi ve proje sayısı belirtilir.

Durum filtresiyle tamamlananlar, devam edenler ve başlanmayanlar ayrı indirilebilir. Komple Excel Al tüm Kurumsal kayıtlarını indirir. Her durumdaki projede seçim kutusu vardır. Filtre değiştirirken mevcut seçimler korunur; Seçilenleri Listele tüm filtrelerden seçilmiş projeleri birleştirir. Seçilenleri Excel Al yalnızca bu projeleri dışa aktarır. Seçimler sayfa açıkken korunur; sayfa tamamen yenilenirse temizlenir.

Tamamlanan satırlar, seçili çıktı dahil, yedi sütunun tamamında yeşildir. PDF çıktısı yoktur.

## İlk yayın

Yeni kod yayımlanmadan, otomatik dağıtım varsa push'tan önce:

```powershell
npm.cmd run db:migrate:remote
```

Manuel yayın:

```powershell
npm.cmd run deploy
```

Yerel kurulum:

```powershell
node scripts/apply-corporate-local.mjs
npm.cmd run db:generate
```

Yerel yardımcı önce veritabanını yedekler. Yeni tablolar GF/BF verilerini değiştirmez.
