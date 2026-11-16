# 🃏 KIRAATHANE — 3D Online Masa Oyunları

Tarayıcıda çalışan, kurulum gerektirmeyen 3D masa oyunları. 4 kişiye kadar online, boş koltuklara bot oturur.

**Oyna:** https://esaterenutas11-cmyk.github.io/masa-oyunlari/

## Oyunlar
| Oyun | Kişi | Özet |
|---|---|---|
| 💯 101 Okey | 4 | 101 ile seri açma / 5 çift açma, işleme, işlek taş & okey atma cezası, elden/okeyle bitirme katları |
| 🀄 Okey | 4 | 14 taşı per ya da 7 çift yap, 15. taşla bitir (okeyle / çiftten bitirme ×2) |
| ♠️ Batak | 4 | İhaleli, koz seçimi, renk takip + yükseltme + koz çakma zorunluluğu |
| 🃏 Pişti | 2 / 4 | Pişti 10, vale pişti 20, kart çoğunluğu 3, as/vale 1, ♣2 = 2, ♦10 = 3 |

## Nasıl oynanır
1. Adını yaz, oyunu seç.
2. **Online Oda Kur** → çıkan 4 harfli kodu arkadaşlarına söyle.
3. Arkadaşların kodu yazıp **Odaya Katıl** der.
4. **Oyunu Başlat** — eksik koltuklara bot oturur. Biri koparsa yerine bot oynar, aynı isimle tekrar girince koltuğunu geri alır.

**Okey ıstakası:** taşları sürükleyip diz, tıklayarak seç, çift tıklayarak at. 101'de yan yana dizilmiş perler "Seri Aç" ile açılır; masadaki pere işlemek için taşı seçip pere tıkla.

## Bağlantı
BELBİM FIGHT CLUB ile aynı altyapı: eşleştirme PeerJS + ntfy.sh, oyun verisi WebRTC ile doğrudan; olmazsa aktarma sunucusu üzerinden. Oyunu odayı kuran kişinin tarayıcısı yönetir, herkes sadece kendi elini görür.

## Geliştirme
Kaynak `src/` altında. `python3 build.py` tek dosyalık `index.html` üretir. `node test/sim.js 20` botlarla tüm oyunları simüle eder.
