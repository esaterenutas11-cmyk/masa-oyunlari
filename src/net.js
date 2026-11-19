/* ===================== AĞ (BELBİM FIGHT CLUB ile aynı altyapı) =====================
   Eşleştirme: PeerJS bulut sunucusu + ntfy.sh (yedek), paralel.
   Bağlantı: WebRTC veri kanalı (önce doğrudan/aynı ağ, sonra Open Relay TURN).
   Hiçbiri olmazsa: mesajlar eşleştirme sunucusu üzerinden aktarılır. */
const SIG = { host: '0.peerjs.com', port: 443, secure: true, path: '/', key: 'peerjs' };
const NTFY = { http: 'https://ntfy.sh', ws: 'wss://ntfy.sh', pre: 'masaoyun-' };
const ID_PRE = 'masaoyun-';
const NETDG = { pj: '…', nt: '…', fb: '…', link: '' };
function netDiag(k, v) { NETDG[k] = v; const el = document.getElementById('netDiag'); if (el) el.textContent = `Sunucu 1: ${NETDG.pj} · Sunucu 2: ${NETDG.nt} · Sunucu 3 (Firebase): ${NETDG.fb}` + (NETDG.link ? ` · Bağlantı: ${NETDG.link}` : ''); }
/* Couple's Burger Life ile aynı: Firebase Realtime Database hem eşleştirme hem veri aktarımı için
   (her ağda çalışır: şirket ağı, Wi-Fi ↔ mobil veri) */
const FB_CFG = {
  apiKey: 'AIzaSyBp3s974T3yXLjtx0h-P2a2DbN1WCFQeeM', authDomain: 'couple-s-burger-life.firebaseapp.com', projectId: 'couple-s-burger-life',
  storageBucket: 'couple-s-burger-life.firebasestorage.app', messagingSenderId: '13664019864', appId: '1:13664019864:web:6a2c667be70b6b5b6437ed',
  databaseURL: 'https://couple-s-burger-life-default-rtdb.firebaseio.com'
};
const FB_V = '10.12.2';
function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('yüklenemedi: ' + src)); document.head.appendChild(s); }); }
let _fbDb = null;
function fbDb() {
  if (_fbDb) return _fbDb;
  const base = `https://www.gstatic.com/firebasejs/${FB_V}/`;
  _fbDb = (window.firebase && window.firebase.apps ? Promise.resolve() : loadScript(base + 'firebase-app-compat.js'))
    .then(() => window.firebase.database ? null : loadScript(base + 'firebase-database-compat.js'))
    .then(() => { const fb = window.firebase; if (!fb.apps.length) fb.initializeApp(FB_CFG); return fb.database(); })
    .catch(e => { _fbDb = null; throw e; });
  return _fbDb;
}
async function fbNet(id, onMsg) {
  const db = await fbDb(), fb = window.firebase, ref = db.ref('net/' + id);
  await Promise.race([ref.remove(), new Promise((_, rej) => setTimeout(() => rej(new Error('rtdb zaman aşımı')), 6000))]);
  try { ref.onDisconnect().remove(); } catch (e) { }
  ref.on('child_added', snap => { const v = snap.val(); snap.ref.remove().catch(() => { }); if (!v || typeof v.j !== 'string') return; let m; try { m = JSON.parse(v.j); } catch (e) { return; } onMsg(m); });
  return { send: (dst, m) => { try { db.ref('net/' + dst).push({ j: JSON.stringify(m), t: fb.database.ServerValue.TIMESTAMP }); } catch (e) { } }, close: () => { try { ref.off(); ref.remove().catch(() => { }); } catch (e) { } } };
}
async function zpack(t) { if (!window.CompressionStream || t.length < 1200) return t; const st = new Blob([t]).stream().pipeThrough(new CompressionStream('deflate-raw')); const u = new Uint8Array(await new Response(st).arrayBuffer()); let s = ''; for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode.apply(null, u.subarray(i, i + 8192)); return 'Z:' + btoa(s); }
async function zunpack(t) { if (!t.startsWith('Z:')) return t; const u = Uint8Array.from(atob(t.slice(2)), c => c.charCodeAt(0)); const st = new Blob([u]).stream().pipeThrough(new DecompressionStream('deflate-raw')); return await new Response(st).text(); }
async function iceServers() {
  const list = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun.relay.metered.ca:80'] }];
  try {
    const user = (Math.floor(Date.now() / 1000) + 12 * 3600) + ':mo', te = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', te.encode('openrelayprojectsecret'), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
    const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, te.encode(user)));
    const h = 'staticauth.openrelay.metered.ca';
    list.push({ urls: ['turn:openrelay.metered.ca:80', 'turn:openrelay.metered.ca:443', 'turn:openrelay.metered.ca:443?transport=tcp'], username: 'openrelayproject', credential: 'openrelayproject' });
    list.push({ urls: [`turn:${h}:80`, `turn:${h}:80?transport=tcp`, `turn:${h}:443`, `turns:${h}:443?transport=tcp`], username: user, credential: btoa(String.fromCharCode(...sig)) });
  } catch (e) { }
  return list;
}
function waitIce(p, ms) { return new Promise(r => { if (p.iceGatheringState === 'complete') return r(); const t = setTimeout(r, ms || 7000); p.addEventListener('icegatheringstatechange', () => { if (p.iceGatheringState === 'complete') { clearTimeout(t); r(); } }); }); }
const rid = () => Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);

function signal(id) {
  return new Promise((res, rej) => {
    const S = { id, handlers: {}, seen: new Set(), rseen: new Set(), pj: null, nt: null, fb: null, ntOk: false, done: false };
    const deliver = m => {
      if (m.payload && typeof m.payload.r === 'string') { const k = m.payload.k; if (k) { if (S.rseen.has(k)) return; S.rseen.add(k); if (S.rseen.size > 3000) S.rseen = new Set(); } S.onRelay && S.onRelay(m.src, m.payload.r); return; }
      const mid = m.payload && m.payload.mid; if (mid && S.seen.has(mid)) return; const h = S.handlers[m.type]; if (h && h(m) !== false && mid) S.seen.add(mid);
    };
    const ready = () => { if (S.done) return; S.done = true; clearTimeout(to); res(S); };
    S.send = (type, dst, payload) => {
      payload = Object.assign({ mid: rid() }, payload);
      try { S.pj && S.pj.readyState === 1 && S.pj.send(JSON.stringify({ type, dst, payload })); } catch (e) { }
      if (S.ntOk) zpack(JSON.stringify({ type, src: id, dst, payload })).then(body => fetch(NTFY.http + '/' + NTFY.pre + dst, { method: 'POST', body })).catch(() => { });
      if (S.fb) S.fb.send(dst, { type, src: id, dst, payload });
    };
    // veri aktarımı: Firebase + PeerJS ikisinden birden, tekrarlar "k" ile elenir
    S.raw = (dst, data) => { const k = rid(); let ok = false;
      try { if (S.fb) { S.fb.send(dst, { type: 'CANDIDATE', src: id, dst, payload: { r: data, k } }); ok = true; } } catch (e) { }
      try { if (S.pj && S.pj.readyState === 1) { S.pj.send(JSON.stringify({ type: 'CANDIDATE', dst, payload: { r: data, k } })); ok = true; } } catch (e) { }
      return ok; };
    S.close = () => { clearInterval(S.hb); S.closedAll = true; try { S.pj && S.pj.close(); } catch (e) { } try { S.nt && S.nt.close(); } catch (e) { } try { S.fb && S.fb.close(); } catch (e) { } S.fb = null; };
    const to = setTimeout(() => { if (!S.done) { S.close(); rej({ code: 'upstream_error', message: 'Eşleştirme sunucularına ulaşılamadı (internet bağlantısını kontrol et)' }); } }, 12000);
    try {
      const pj = new WebSocket(`${SIG.secure ? 'wss' : 'ws'}://${SIG.host}:${SIG.port}${SIG.path}peerjs?key=${SIG.key}&id=${id}&token=${rid()}&version=1.5.4`); S.pj = pj;
      pj.onmessage = e => {
        let m; try { m = JSON.parse(e.data); } catch (x) { return; }
        if (m.type === 'OPEN') { netDiag('pj', '✔'); S.hb = setInterval(() => { try { pj.readyState === 1 && pj.send(JSON.stringify({ type: 'HEARTBEAT' })); } catch (x) { } }, 5000); ready(); return; }
        if (m.type === 'ID-TAKEN') { if (!S.done) { S.done = true; clearTimeout(to); S.close(); rej({ code: 'id_taken', message: 'Kod kullanımda' }); } return; }
        if (m.type === 'ERROR') { netDiag('pj', '✖'); return; }
        deliver(m);
      };
      pj.onerror = () => netDiag('pj', '✖');
    } catch (e) { netDiag('pj', '✖'); }
    fbNet(id, m => { if (!S.closedAll) deliver(m); }).then(f => { if (S.closedAll) { f.close(); return; } S.fb = f; netDiag('fb', '✔'); ready(); }).catch(e => { console.warn('rtdb', e); netDiag('fb', '✖'); });
    try {
      const nt = new WebSocket(NTFY.ws + '/' + NTFY.pre + id + '/ws'); S.nt = nt;
      nt.onmessage = e => {
        let m; try { m = JSON.parse(e.data); } catch (x) { return; }
        if (m.event === 'open') { S.ntOk = true; netDiag('nt', '✔'); ready(); return; }
        if (m.event === 'message') zunpack(m.message).then(t => { let x; try { x = JSON.parse(t); } catch (y) { return; } if (x && x.dst === id) deliver(x); }).catch(() => { });
      };
      nt.onerror = () => netDiag('nt', '✖'); nt.onclose = () => { S.ntOk = false; };
    } catch (e) { netDiag('nt', '✖'); }
  });
}
// doğrudan bağlantı kurulamazsa sunucu üzerinden sanal kanal (mesajlar sıraya alınır, kaybolmaz)
function relayDC(sig, dst) {
  const v = { readyState: 'open', relay: true, onmessage: null, onclose: null, q: [], tm: null,
    send: t => { v.q.push(t); if (!v.tm) v.tm = setTimeout(flush, 45); }, close: () => { if (v.q.length) flush(); v.readyState = 'closed'; clearTimeout(v.tm); } };
  function flush() { v.tm = null; if (!v.q.length || v.readyState !== 'open') return; const out = v.q.length === 1 ? v.q[0] : 'B' + JSON.stringify(v.q); v.q = []; sig.raw(dst, out); }
  return v;
}
function relayIn(v, data) { if (!v || !v.onmessage) return; if (data[0] === 'B') { try { JSON.parse(data.slice(1)).forEach(x => v.onmessage({ data: x })); } catch (e) { } } else v.onmessage({ data }); }
const NET_JSON = o => JSON.stringify(o);

/* ---- Ev sahibi ---- */
async function netHost(code, cb) {
  const ice = await iceServers(); const links = new Map();
  const sig = await signal(ID_PRE + code.toLowerCase());
  const H = { code, links, sig, closed: false };
  const attach = (peer, dc, pc) => {
    const L = links.get(peer) || {}; L.dc = dc; L.pc = pc; links.set(peer, L);
    dc.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch (x) { return; } cb.onMsg(peer, m); };
    dc.onclose = () => drop(peer);
    if (pc) pc.onconnectionstatechange = () => { if (pc.connectionState === 'failed' || pc.connectionState === 'closed') drop(peer); };
  };
  const drop = peer => { const L = links.get(peer); if (!L) return; links.delete(peer); try { L.pc && L.pc.close(); } catch (e) { } try { L.dc && L.dc.relay && L.dc.close(); } catch (e) { } cb.onLeave(peer); };
  sig.handlers.OFFER = async m => {
    const src = m.src; if (links.has(src)) return;
    const pc = new RTCPeerConnection({ iceServers: ice }); const L = { pc, dc: null, q: [] }; links.set(src, L);
    pc.ondatachannel = e => { const dc = e.channel; attach(src, dc, pc); netDiag('link', 'doğrudan ✔'); };
    try {
      await pc.setRemoteDescription(m.payload.sdp); for (const c of L.q) pc.addIceCandidate(c).catch(() => { }); L.q = null;
      await pc.setLocalDescription(await pc.createAnswer()); await waitIce(pc, 5000);
      sig.send('ANSWER', src, { sdp: pc.localDescription });
    } catch (e) { drop(src); }
  };
  sig.handlers.CANDIDATE = m => { const L = links.get(m.src); if (!L) return false; const c = m.payload && m.payload.c; if (!c) return; if (L.q) L.q.push(c); else L.pc && L.pc.addIceCandidate(c).catch(() => { }); };
  sig.onRelay = (src, data) => {
    let L = links.get(src);
    if (!L || !L.dc || !L.dc.relay) {
      if (L) { try { if (L.dc) { L.dc.onclose = null; L.dc.onmessage = null; } if (L.pc) { L.pc.onconnectionstatechange = null; L.pc.close(); } } catch (e) { } }
      const v = relayDC(sig, src); links.delete(src); attach(src, v, null); L = links.get(src); netDiag('link', 'sunucu üzerinden ✔');
    }
    relayIn(L.dc, data);
  };
  H.send = (peer, obj) => { const L = links.get(peer); if (!L || !L.dc) return; const msg = NET_JSON(obj);
    if (L.dc.readyState === 'open') { try { L.dc.send(msg); } catch (e) { } }
    else if (L.dc.readyState === 'connecting') { (L.pend = L.pend || []).push(msg); if (!L.dc._po) { L.dc._po = 1; L.dc.addEventListener('open', () => { for (const m of L.pend.splice(0)) try { L.dc.send(m); } catch (e) { } }); } } };
  H.kick = peer => drop(peer);
  H.close = () => { H.closed = true; for (const p of [...links.keys()]) { const L = links.get(p); links.delete(p); try { L.pc && L.pc.close(); } catch (e) { } } sig.close(); };
  return H;
}

/* ---- Misafir ---- */
async function netJoin(code, cb) {
  const ice = await iceServers(); const host = ID_PRE + code.toLowerCase(); const me = ID_PRE + 'g-' + rid();
  const sig = await signal(me);
  const pc = new RTCPeerConnection({ iceServers: ice }), dc = pc.createDataChannel('masa', { ordered: true });
  const C = { ch: dc, closed: false }; let q = [], gotAnswer = false;
  const wireCh = ch => { ch.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch (x) { return; } cb.onMsg(m); }; ch.onclose = () => { if (!C.closed) { C.closed = true; cb.onClose(); } }; };
  sig.handlers.ANSWER = async m => { if (m.src !== host || gotAnswer) return; gotAnswer = true; relayTimer(); try { await pc.setRemoteDescription(m.payload.sdp); for (const c of q) pc.addIceCandidate(c).catch(() => { }); q = null; } catch (e) { } };
  sig.handlers.CANDIDATE = m => { if (m.src !== host) return; const c = m.payload && m.payload.c; if (!c) return; if (q) q.push(c); else pc.addIceCandidate(c).catch(() => { }); };
  let relayTimer = () => { };
  const opened = new Promise((res, rej) => {
    let done = false;
    const goRelay = () => {
      if (done) return; done = true; dc.onclose = null; dc.onmessage = null; try { pc.close(); } catch (e) { }
      const v = relayDC(sig, host); C.ch = v; wireCh(v); sig.onRelay = (src, data) => { if (src === host) relayIn(v, data); };
      netDiag('link', 'sunucu üzerinden ✔'); res();
    };
    wireCh(dc);
    dc.onopen = () => { if (done) return; done = true; netDiag('link', 'doğrudan ✔'); res(); };
    pc.addEventListener('iceconnectionstatechange', () => { if (pc.iceConnectionState === 'failed') goRelay(); });
    relayTimer = () => setTimeout(goRelay, 6000);
    C.forceRelay = () => { done = false; C.ch = null; const v = relayDC(sig, host); C.ch = v; wireCh(v); sig.onRelay = (src, data) => { if (src === host) relayIn(v, data); }; try { dc.onclose = null; dc.onmessage = null; pc.close(); } catch (e) { } netDiag('link', 'sunucu üzerinden ✔'); done = true; };
    setTimeout(() => { if (!done) rej({ message: gotAnswer ? 'Ev sahibi bulundu ama bağlantı kurulamadı.' : 'Bu kodda açık oda bulunamadı. Kodu kontrol et; ev sahibinin oda ekranı açık olmalı.' }); }, 25000);
  });
  await pc.setLocalDescription(await pc.createOffer()); await waitIce(pc, 5000);
  sig.send('OFFER', host, { sdp: pc.localDescription, type: 'data' });
  const resend = setInterval(() => { if (gotAnswer || C.closed) { clearInterval(resend); return; } sig.send('OFFER', host, { sdp: pc.localDescription, type: 'data' }); }, 3000);
  try { await opened; } catch (e) { clearInterval(resend); sig.close(); try { pc.close(); } catch (x) { } throw e; }
  C.send = obj => { try { C.ch.readyState === 'open' && C.ch.send(NET_JSON(obj)); } catch (e) { } };
  C.close = () => { C.closed = true; try { pc.close(); } catch (e) { } try { C.ch.close(); } catch (e) { } sig.close(); };
  return C;
}
