/* אורי — עבודה בלי רשת.
   העמוד עצמו נטען תמיד מהרשת כשיש רשת, כדי שעדכון לעולם לא ייתקע.
   כשאין רשת — מוגש העותק השמור האחרון. */

const V = 'uri-2026-09-1';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(V)
      .then(c => c.addAll(['./', './index.html']))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.map(k => k === V ? null : caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const isDoc = req.mode === 'navigate' || req.destination === 'document';

  if (isDoc) {
    // רשת קודם — תמיד הגרסה העדכנית. נפילה למטמון רק כשאין קליטה.
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(V).then(c => c.put('./index.html', copy)).catch(() => {});
          return res;
        })
        .catch(() =>
          caches.match('./index.html')
            .then(r => r || caches.match('./'))
            .then(r => r || new Response(
              '<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8">' +
              '<meta name="viewport" content="width=device-width,initial-scale=1">' +
              '<body style="background:#08080A;color:#fff;font-family:sans-serif;padding:40px 20px;text-align:center">' +
              '<div style="font-size:22px;font-weight:800">אין חיבור</div>' +
              '<div style="height:3px;width:44px;background:#E10600;margin:10px auto 14px;border-radius:2px"></div>' +
              '<div style="font-size:15px;color:#A1A1A6;line-height:1.6">תתחבר פעם אחת לרשת והאפליקציה תישמר על המכשיר לתמיד.</div>',
              { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
            ))
        )
    );
    return;
  }

  // פונטים וכל השאר — מטמון קודם, ואם אין, מהרשת ונשמר להבא
  e.respondWith(
    caches.match(req).then(hit => {
      if (hit) return hit;
      return fetch(req)
        .then(res => {
          if (res && (res.ok || res.type === 'opaque')) {
            const copy = res.clone();
            caches.open(V).then(c => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => new Response('', { status: 504 }));
    })
  );
});
