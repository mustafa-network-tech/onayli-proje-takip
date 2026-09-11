# Bina iptali ve proje türü araması

GF/BF binaları tek tek iptal edilebilir ve iptal geri alınabilir. İmalat işaretleri korunur; iptal sırasında değiştirilemez. İptal, diğer imalat durumlarından ayrıdır. Tüm durumlarda ve İptal filtresinde görünür; tamamlanmayan, başlanmayan, devam eden ve tamamlanan filtrelerinden çıkarılır. Bina satırları ekranlarda ve Excel/PDF çıktılarında kırmızıdır. Aktif HP ilerlemesi ve güncel kalan iş hesapları iptalleri dışarıda tutar. Geçmiş aylık tamamlanma kayıtları değiştirilmez.

ID kontrolü GF/BF listelerinde, HP aramasında ve Kurumsal filtrelemede tam ID eşleşmesiyle diğer proje türlerini bildirir. Aynı ID birden fazla türde varsa diğer eşleşmeler de gösterilir. TAFICS'te ayrı bir kullanıcı proje ID alanı bulunmadığından bu sorgu GF, BF ve Kurumsal kayıtlarını kapsar.

## Yayın sırası

Önce `0005_building_cancelled.sql` migration'ı hedef veritabanına uygulanmalıdır; sonra uygulama yayınlanmalıdır. Migration mevcut binalara varsayılan `false` değerli `isCancelled` alanı ekler; kayıt silmez.

Yerel geliştirme: `node scripts/cancellation-migrate-local.cjs` mevcut veritabanını yedekler ve yalnızca eksik alanı ekler. Prisma istemcisi `npm.cmd run db:generate` ile yenilenir.

Production migration ve deploy bu değişiklik kapsamında henüz çalıştırılmadı.

Mevcut Excel içe aktarma davranışı, onaylanan proje değişiminde eski binaları silip yeniden oluşturur. Bu işlem, diğer bina düzenlemeleri gibi iptal durumunu da sıfırlar.
