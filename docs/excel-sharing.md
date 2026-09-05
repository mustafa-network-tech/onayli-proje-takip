# Excel paylaşımı

Excel indirme seçeneklerinin yanında ayrı paylaşım düğmeleri bulunur:

- GF/BF listeleri ve proje detayları: seçilen bina/proje kapsamı ve uygulanmış filtrelerle **Excel Paylaş**. PDF indirme seçilmiş olsa bile paylaşım Excel üretir.
- Aylık HP: ay, GF/BF/GF+BF ve tamamlanan/kalan seçimiyle **Excel Paylaş**.
- Kurumsal: **Filtrelenenleri Paylaş**, **Komple Paylaş**, **Seçilenleri Paylaş**. Çoklu ilçe/durum/arama filtreleri ve seçilen proje ID'leri ilgili çıktıyla aynıdır.

İlk tıklama mevcut, oturum gerektiren çıktı adresinden Excel dosyasını hazırlar. Hazır dosyada **WhatsApp / Paylaş** düğmesine basılınca cihazın paylaşım menüsü açılır; kullanıcı WhatsApp'ı ve alıcıyı seçer. Bu ikinci tıklama, uzun süren dosya hazırlığında tarayıcının kullanıcı etkileşimi şartını korur. Dosya baytları değişmediğinden Excel biçimlendirmesi, A4 ayarları ve tamamlanan satır renkleri korunur.

Dosya desteği `navigator.canShare({ files })` ile kontrol edilir. Tarayıcı Excel dosyası paylaşamıyorsa veya WhatsApp paylaşım menüsünde yoksa kullanıcı **Excel’i İndir** ile dosyayı kaydeder ve WhatsApp'ta ataç / + → Belge üzerinden ekler. **WhatsApp Web’i Aç** yalnızca uygulamayı açar; dosyayı otomatik eklemez. WhatsApp'a gönderildiği doğrulanamadığı için panel teslim edildi mesajı göstermez.

Paylaşım iptal edilirse dosya otomatik indirilmez veya gönderilmez. Filtre değişimi, pencerenin kapanması ve sayfadan ayrılma bekleyen hazırlık isteğini iptal eder. Dosyalar herkese açık bir adrese yüklenmez; paylaşımda giriş gerektiren panel bağlantısı yerine gerçek `.xlsx` dosyası kullanılır.

Web Share desteği cihaz ve tarayıcıya bağlıdır ve HTTPS gerektirir: [MDN Web Share](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share).

Veritabanı değişikliği ve migration gerekmez.
