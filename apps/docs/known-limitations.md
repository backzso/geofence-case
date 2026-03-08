# Known Limitations

Bu doküman, mevcut çözümün bilinen sınırlarını ve bilinçli trade-off'larını listeler.

---

# 1. Exactly-once yok

Sistem exactly-once event delivery garanti etmez.

Neden:
- Kafka publish ile DB published-status update global olarak atomik değildir
- çok nadir crash pencerelerinde duplicate publish teorik olarak mümkündür

Koruma:
- Logging Service `UNIQUE(event_id)` ile idempotent çalışır

---

# 2. Boundary-point doğrulaması pratikte yaklaşık olabilir

Containment için `ST_Covers` kullanılması boundary behavior açısından doğru yaklaşımdır.
Ancak manuel test sırasında tam sınır koordinatı üretmek pratikte zor olabilir.

---

# 3. Multi-instance crash recovery daha ileri faz konusudur

Outbox poller ve Kafka consumer lifecycle’ı doğru şekilde modellenmiştir.
Ancak ağır chaos / crash / network partition senaryoları için:
- DLQ
- backoff
- stuck processing recovery
- advanced observability

gibi ek hardening adımları gelecekte genişletilebilir.

---

# 4. Logging append-only tasarımdır

Logging Service current membership state’i yeniden inşa etmeye veya tamir etmeye çalışmaz.
Bu bilinçli bir bounded-context kararidir.

---

# 5. History update edilmez

Aynı kullanıcı aynı alana birden fazla kez girerse eski log kaydı update edilmez.
Yeni event yeni satır olarak append edilir.

Bu audit/history için bilinçli ve doğru tercihtir.