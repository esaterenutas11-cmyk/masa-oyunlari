# 🃏 KIRAATHANE — 3D Online Masa Oyunları

Tarayıcıda çalışan, kurulum gerektirmeyen 3D masa oyunları. 4 kişiye kadar online, boş koltuklara bot oturur.

**Oyna:** https://esaterenutas11-cmyk.github.io/masa-oyunlari/

## Oyunlar
| Oyun | Kişi | Özet |
|---|---|---|
| 💯 101 Okey | 4 | Katlamalı/katlamasız açış, çift açma, işleme, okey alma, siler, işlek taş & okey cezası, elden bitme |
| 🀄 Okey | 4 | 20'den düşme puanlama, gösterge, okeyle / çiftten bitirme |
| ♠️ Batak | 4 | İhaleli, Eşli ihaleli, Koz Maça · Onluk (×10) ya da basit puanlama |
| 🃏 Pişti | 2 / 4 | Tekli ya da eşli, pişti 10, vale piştisi 20 |

📖 **Tüm kurallar:** [KURALLAR.md](KURALLAR.md) (oyunda da 📖 düğmesiyle açılır ve indirilebilir)

## Nasıl oynanır
1. Adını yaz, oyunu seç.
2. **Online Oda Kur** → çıkan 4 harfli kodu arkadaşlarına söyle.
3. Arkadaşların kodu yazıp **Odaya Katıl** der.
4. Lobide oyun ayarlarını ve **hamle süresini** seç, **Oyunu Başlat** — eksik koltuklara bot oturur. Biri koparsa yerine bot oynar, aynı isimle tekrar girince koltuğunu geri alır.

**Okey ıstakası:** taşları sürükleyip diz, tıklayarak seç, çift tıklayarak at. 101'de yan yana dizilmiş perler "Seri Aç" ile açılır; masadaki pere işlemek için taşı seçip pere tıkla.

## Bağlantı
BELBİM FIGHT CLUB ile aynı altyapı: eşleştirme PeerJS + ntfy.sh, oyun verisi WebRTC ile doğrudan; olmazsa aktarma sunucusu üzerinden. Oyunu odayı kuran kişinin tarayıcısı yönetir, herkes sadece kendi elini görür.

## Geliştirme
Kaynak `src/` altında. `python3 build.py` tek dosyalık `index.html` üretir. `node test/sim.js 20` botlarla tüm oyunları simüle eder.
