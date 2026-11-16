/* ===================== 3D SAHNE ===================== */
const BOARD = $('board');
const SC = { els: new Map(), used: new Set(), lastEvK: null, dealK: null };
const CX = 700, CY = 450, KX = 1.55;
function T(x, y, z, rz, rx, ry) { return `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,${(z || 0).toFixed(1)}px) rotateZ(${rz || 0}deg) rotateX(${rx || 0}deg) rotateY(${ry || 0}deg)`; }
function relOf(seat, v) { const n = v.n; if (n === 2) return seat === APP.mySeat ? 0 : 2; return (seat - APP.mySeat + 4) % 4; }
function P(rel, px, py) {
  if (rel === 0) return { x: CX + px, y: CY + py, r: 0 };
  if (rel === 1) return { x: CX + py * KX, y: CY - px, r: -90 };
  if (rel === 2) return { x: CX - px, y: CY - py, r: 180 };
  return { x: CX - py * KX, y: CY + px, r: 90 };
}
function put(key, make, tf, from) {
  let el = SC.els.get(key);
  if (!el) {
    el = make(); el.classList.add('o3'); el.dataset.key = key; BOARD.appendChild(el); SC.els.set(key, el);
    if (from) { el.classList.add('noanim'); el.style.transform = from; el.offsetWidth; el.classList.remove('noanim'); }
  }
  SC.used.add(key); if (el.style.transform !== tf) el.style.transform = tf; return el;
}
function commitScene(exitTo) {
  for (const [k, el] of SC.els) if (!SC.used.has(k)) {
    SC.els.delete(k); const to = exitTo && exitTo(k); el.style.pointerEvents = 'none'; el.classList.remove('legal', 'dim');
    if (to && typeof to === 'object') { if (to.mid) el.style.transform = to.mid; setTimeout(() => { el.style.transform = to.to; }, to.mid ? 550 : 350); setTimeout(() => el.remove(), 1300); }
    else if (to) { el.style.transform = to; setTimeout(() => el.remove(), 600); } else el.remove();
  }
  SC.used.clear();
}
function clearScene() { for (const el of SC.els.values()) el.remove(); SC.els.clear(); SC.used.clear(); BOARD.innerHTML = ''; SC.lastEvK = null; SC.dealK = null; LAST.sumKey = null; }
function fitBoard() {
  const W = innerWidth, H = innerHeight; const tiles = APP.game && GAMES[APP.game].kind === 'tiles';
  const sc = Math.min(W / 1500, (H - (tiles ? 150 : 40)) / 860);
  $('boardWrap').style.transform = `translateY(${tiles ? -(H * 0.09) : -(H * 0.02)}px) scale(${sc})`;
  const rw = $('rack'); if (rw) { const rs = Math.min(1, (W - 10) / 800); $('rackWrap').style.transform = `translateX(-50%) scale(${rs})`; $('rackWrap').style.transformOrigin = '50% 100%'; }
}
addEventListener('resize', fitBoard);

/* ---- kart / taş görünümü ---- */
function cardFace(id) {
  const su = cSuit(id), r = cRank(id), red = su === 1 || su === 2, txt = RANK_TXT(r), sy = SUITS[su];
  const mid = r >= 11 && r <= 13 ? `<div class="cm face"><span>${txt}</span></div>` : `<div class="cm">${sy}</div>`;
  return `<div class="f ${red ? 'r' : ''}"><div class="ci">${txt}<i>${sy}</i></div>${mid}<div class="ci br">${txt}<i>${sy}</i></div></div>`;
}
function mkCard(id) { return () => { const d = document.createElement('div'); d.className = 'card'; d.innerHTML = `<div class="shadow3"></div>${id >= 0 ? cardFace(id) : '<div class="f"></div>'}<div class="b"></div>`; return d; }; }
function tileFace(id, x, cls) {
  const t = tile(id); if (t.fake) return `<div class="tf fk ${cls || ''}">★</div>`;
  return `<div class="tf c${t.c} ${x && isWild(id, x) ? 'wild' : ''} ${cls || ''}">${t.n}</div>`;
}
function mkTile(id, x, small) { return () => { const d = document.createElement('div'); d.className = 'tile' + (small ? ' small' : ''); d.innerHTML = `<div class="f">${id >= 0 ? tileFace(id, x) : ''}</div><div class="b"></div>`; return d; }; }
const mkDiv = (cls, html) => () => { const d = document.createElement('div'); d.className = cls; if (html) d.innerHTML = html; return d; };
const hashRot = (id, a) => (((id * 2654435761) >>> 0) % 1000 / 1000 - 0.5) * a;

/* ===================== GÖRÜNÜM ===================== */
const LAST = { sumKey: null, turnMine: false };
function renderView(v) {
  const prev = APP.v; APP.v = v; const E = GAMES[v.g];
  document.body.classList.toggle('tilesMode', E.kind === 'tiles'); document.body.classList.toggle('cardsMode', E.kind === 'cards');
  $('rackWrap').style.display = E.kind === 'tiles' ? 'block' : 'none';
  const evNew = v.ev && v.ev.k !== SC.lastEvK; if (evNew) SC.lastEvK = v.ev.k;
  if (evNew && v.ev.type === 'deal') { for (const el of SC.els.values()) el.remove(); SC.els.clear(); BOARD.innerHTML = ''; }
  if (evNew) { const t = v.ev.type; if (t === 'play' || t === 'collect') snd('card'); else if (t === 'discard' || t === 'draw' || t === 'lay') snd('tile');
    if (v.ev.pisti) big(v.ev.pisti === 20 ? 'VALE PİŞTİ!' : 'PİŞTİ!');
    if (t === 'finish' && v.ev.seat >= 0) { big(v.ev.seat === APP.mySeat ? 'BİTİRDİN!' : 'EL BİTTİ'); snd('win'); } }
  if (v.g === 'pisti') renderPisti(v, evNew); else if (v.g === 'batak') renderBatak(v, evNew); else renderOkey(v, evNew);
  renderPlates(v); renderInfo(v); renderActions(v);
  $('log').innerHTML = (v.log || []).map(l => `<div>${fmtLog(l)}</div>`).join('');
  const mine = GAMES[v.g].turnSeat ? (v.turn === APP.mySeat && ['play', 'bid', 'trump', 'draw', 'discard'].includes(v.phase)) : false;
  if (mine && !LAST.turnMine) snd('turn'); LAST.turnMine = mine;
  // özet
  if (v.summary && (v.phase === 'roundEnd' || v.phase === 'over')) { const key = v.round + v.phase; if (LAST.sumKey !== key) { LAST.sumKey = key; showSummary(v); } }
  else if (LAST.sumKey && v.phase !== 'roundEnd' && v.phase !== 'over') { LAST.sumKey = null; $('mSum').classList.remove('on'); }
}
function deckFrom() { return T(CX - 220, CY, 40, 0, 0, 180); }
function seatFrom(rel) { const p = P(rel, 0, 380); return T(p.x, p.y, 60, p.r, 0, 180); }

/* ---- el kartları (ortak) ---- */
function renderHands(v, sortFn) {
  const hand = sortFn ? v.hand.slice().sort(sortFn) : v.hand, k = hand.length, sp = Math.min(76, 820 / Math.max(k, 1));
  const legal = new Set(v.legal || []); const myTurn = v.turn === APP.mySeat;
  hand.forEach((id, i) => {
    const px = (i - (k - 1) / 2) * sp, p = P(0, px, 345);
    const el = put('c' + id, mkCard(id), T(p.x, p.y + Math.abs(px) * 0.03, 120 + i * 0.6, px * 0.012, -52, 0), deckFrom());
    el.classList.add('mine'); el.classList.toggle('legal', myTurn && legal.has(id)); el.classList.toggle('dim', myTurn && legal.size > 0 && !legal.has(id));
    el.onclick = () => { if (myTurn && legal.has(id)) sendAct({ type: 'play', card: id }); else if (myTurn) toast('Bu kartı şimdi oynayamazsın'); };
  });
  for (let s = 0; s < v.n; s++) { if (s === APP.mySeat) continue; const rel = relOf(s, v), c = v.counts[s];
    for (let j = 0; j < c; j++) { const px = (j - (c - 1) / 2) * 24, p = P(rel, px, 370); put(`o${s}-${j}`, mkCard(-1), T(p.x, p.y, 4 + j * 0.8, p.r + px * 0.05, 0, 180), deckFrom()); } }
}
function stackAt(key, rel, px, py, count, max, label, rot) {
  const p = P(rel, px, py), m = Math.min(max, Math.ceil(count / 4));
  for (let j = 0; j < m; j++) put(`${key}-${j}`, mkCard(-1), T(p.x + j * 0.4, p.y - j * 0.6, 2 + j * 1.4, p.r + (rot || 0) + hashRot(j + 7, 10), 0, 180));
  if (count) { const lp = P(rel, px, py - 80); put(`${key}-l`, mkDiv('lbl3'), T(lp.x - 20, lp.y, 30, p.r)).innerHTML = label; }
}
function exitToSeat(v, seat, keyTest) { return k => { if (seat === undefined || seat < 0 || !keyTest(k)) return null; const rel = relOf(seat, v), p = P(rel, -270, 290); return T(p.x, p.y, 20, p.r, 0, 180); }; }

/* ---- PİŞTİ ---- */
function renderPisti(v, evNew) {
  const ev = v.ev || {};
  if (v.deck > 0) { const m = Math.min(8, Math.ceil(v.deck / 6)); for (let j = 0; j < m; j++) put('deck-' + j, mkCard(-1), T(CX - 220 + j * 0.3, CY - j * 0.5, 2 + j * 1.5, -8, 0, 180)); put('deck-l', mkDiv('lbl3'), T(CX - 250, CY - 100, 30, 0)).innerHTML = `${v.deck} <small>kart</small>`; }
  v.pile.forEach((c, i) => {
    const key = c >= 0 ? 'c' + c : 'h' + i;
    const from = (ev.type === 'play' && ev.card === c) ? seatFrom(relOf(ev.seat, v)) : deckFrom();
    put(key, mkCard(c), T(CX + 40 + hashRot(i * 13 + (c + 3), 26), CY + hashRot(i * 7 + c, 22), 4 + i * 1.3, hashRot(c * 31 + i, 40), 0, c >= 0 ? 0 : 180), from);
  });
  renderHands(v, (a, b) => cRank(a) - cRank(b) || cSuit(a) - cSuit(b));
  for (let s = 0; s < v.n; s++) stackAt('cap' + s, relOf(s, v), -270, 290, v.cap[s], 10, `${v.cap[s]} <small>kart${v.pisti[s] ? ' · ' + v.pisti[s] / 10 + ' pişti' : ''}</small>`);
  let exit = null;
  if (evNew && ev.capture !== undefined) {
    const p = P(relOf(ev.capture, v), -270, 290), to = T(p.x, p.y, 20, p.r, 0, 180), mid = T(CX + 40, CY, 40, 0);
    const pk = 'c' + ev.card;
    if (!SC.els.has(pk)) { put(pk, mkCard(ev.card), mid, seatFrom(relOf(ev.seat, v))); SC.used.delete(pk); }
    exit = k => ev.ids.includes(+k.slice(1)) && k[0] === 'c' ? { mid: k === pk ? mid : null, to } : null;
  }
  commitScene(exit);
}

/* ---- BATAK ---- */
const batakSort = (a, b) => { const o = [0, 1, 3, 2]; return o[cSuit(a)] - o[cSuit(b)] || cRank(b) - cRank(a); };
function renderBatak(v, evNew) {
  const ev = v.ev || {};
  v.trick.forEach((t, i) => { const rel = relOf(t.seat, v), p = P(rel, 0, 115);
    const el = put('c' + t.card, mkCard(t.card), T(p.x, p.y, 6 + i * 2, p.r + hashRot(t.card, 16), 0, 0), seatFrom(rel));
    el.classList.toggle('legal', v.trickWinner === t.seat); el.classList.remove('mine', 'dim'); el.onclick = null; });
  renderHands(v, batakSort);
  for (let s = 0; s < 4; s++) { const n = v.taken[s] / 4; stackAt('tk' + s, relOf(s, v), -270, 290, v.taken[s], 13, `${n} <small>el</small>`, 90); }
  if (v.trump >= 0) put('trump', mkDiv('lbl3'), T(CX - 40, CY - 60, 1, 0)).innerHTML = `<span style="font-size:110px;opacity:.22;color:${v.trump === 1 || v.trump === 2 ? '#ff8a80' : '#000'}">${SUITS[v.trump]}</span>`;
  commitScene(ev.type === 'collect' ? exitToSeat(v, ev.seat, k => ev.ids.includes(+k.slice(1)) && k[0] === 'c') : null);
}

/* ---- OKEY / 101 ---- */
function renderOkey(v, evNew) {
  const is101 = v.g === 'okey101', x = v.x, myTurn = v.turn === APP.mySeat;
  const pileXY = is101 ? [CX - 60, CY - 255] : [CX - 50, CY];
  const canDraw = myTurn && v.phase === 'draw';
  const pm = Math.min(9, Math.ceil(v.pile / 6));
  for (let j = 0; j < pm; j++) { const el = put('pile-' + j, mkTile(-1), T(pileXY[0] + j * 0.3, pileXY[1] - j * 0.4, 2 + j * 4, 0, 0, 180)); el.classList.toggle('pileTop', j === pm - 1); el.classList.toggle('can', canDraw && j === pm - 1); el.onclick = j === pm - 1 ? () => canDraw && sendAct({ type: 'draw', from: 'pile' }) : null; }
  put('pile-l', mkDiv('lbl3'), T(pileXY[0] - 30, pileXY[1] + 45, 30, 0)).innerHTML = `${v.pile} <small>taş</small>`;
  put('ind', mkTile(v.indicator, null), T(pileXY[0] + 80, pileXY[1], 3, 12, 0, 0));
  put('ind-l', mkDiv('lbl3'), T(pileXY[0] + 52, pileXY[1] + 45, 30, 0)).innerHTML = '<small>gösterge</small>';
  // atılan taşlar
  const leftSeat = (APP.mySeat + 3) % 4;
  for (let s = 0; s < 4; s++) {
    const rel = relOf(s, v), p = P(rel, 300, 245);
    const can = (s === leftSeat && canDraw && v.dcount[s] > 0 && !(is101 && v.noTake)) || (s === APP.mySeat && myTurn && v.phase === 'discard');
    const sp = put('spot' + s, mkDiv('spot'), T(p.x, p.y, 1, p.r)); sp.classList.toggle('can', can); sp.dataset.act = s === APP.mySeat ? 'discard' : s === leftSeat ? 'left' : '';
    sp.onclick = () => { if (!can) return; if (s === leftSeat) sendAct({ type: 'draw', from: 'left' }); else rackDiscard(); };
    v.discards[s].forEach((id, i) => { const top = i === v.discards[s].length - 1;
      const from = (v.ev && v.ev.type === 'discard' && v.ev.tile === id) ? seatFrom(rel) : null;
      const el = put('t' + id, mkTile(id, x), T(p.x + i * 3, p.y - i * 3, 3 + i * 5, p.r + hashRot(id, 14), 0, 0), from);
      el.classList.toggle('pileTop', top); el.classList.toggle('can', top && can && s === leftSeat); el.onclick = () => sp.onclick(); });
    if (v.dcount[s] > 1) put('dl' + s, mkDiv('lbl3'), T(p.x + 30, p.y - 30, 34, p.r)).innerHTML = `<small>${v.dcount[s]}</small>`;
    if (s !== APP.mySeat) { const rp = P(rel, 0, 385); put('rack' + s, mkDiv('rack3d'), T(rp.x, rp.y, 2, rp.r));
      const c = v.counts[s]; for (let j = 0; j < c; j++) { const q = P(rel, (j - (c - 1) / 2) * 24, 362); put(`ob${s}-${j}`, mkTile(-1), T(q.x, q.y, 6, q.r, 0, 180), deckFrom()); } }
  }
  if (is101) renderMelds(v);
  commitScene(null);
  syncRack(v); renderRack(v);
}
function renderMelds(v) {
  const x = v.x; let cx = 285, cy = 300; const maxX = 1115, rowH = 64;
  const tgt = RACK.sel !== null && v.canAddNow;
  v.melds.forEach((m, i) => {
    const w = m.ids.length * 36 + 14; if (cx + w > maxX) { cx = 285; cy += rowH; }
    const el = put('meld' + i, mkDiv('meldBox'), T(cx, cy, 2, 0));
    const html = m.ids.map(id => `<div class="tile small"><div class="f">${tileFace(id, x)}</div></div>`).join('');
    if (el._h !== html) { el.innerHTML = html; el._h = html; }
    el.style.borderBottomColor = SEATCOL[m.owner]; el.classList.toggle('target', tgt && m.type !== 'pair' && !!validGroup(m.ids.concat([RACK.sel]), x));
    el.onclick = () => { if (RACK.sel === null) return toast('Önce ıstakadan işlenecek taşı seç'); sendAct({ type: 'add', tile: RACK.sel, meld: i }); RACK.sel = null; };
    cx += w + 10;
  });
}

/* ===================== ISTAKA ===================== */
const RACK = { slots: Array(32).fill(null), sel: null, newId: null, drag: null };
function syncRack(v) {
  const hand = v.hand, H = new Set(hand);
  RACK.slots = RACK.slots.map(t => t !== null && H.has(t) ? t : null);
  if (RACK.sel !== null && !H.has(RACK.sel)) RACK.sel = null;
  const have = new Set(RACK.slots.filter(t => t !== null)); const miss = hand.filter(t => !have.has(t));
  if (miss.length >= 8) { autoArrange('seri', v); return; }
  for (const t of miss) {
    let last = -1; for (let i = 0; i < 16; i++) if (RACK.slots[i] !== null) last = i;
    let at = -1; for (let i = last + 1; i < 32; i++) if (RACK.slots[i] === null) { at = i; break; }
    if (at < 0) at = RACK.slots.indexOf(null); RACK.slots[at] = t; RACK.newId = t;
  }
}
function autoArrange(mode, v) {
  v = v || APP.v; const hand = v.hand, x = v.x; let groups, rest;
  if (mode === 'cift') { const p = solvePairs(hand, x); groups = p.pairs; rest = p.singles; }
  else { const r = solveGroups(hand, x, v.g === 'okey101' && !(v.opened && v.opened[APP.mySeat]) ? 'value' : 'count'); groups = r.groups; const u = new Set(groups.flat()); rest = hand.filter(t => !u.has(t)); }
  rest = rest.slice().sort((a, b) => { const A = effT(a, x), B = effT(b, x); const wa = isWild(a, x), wb = isWild(b, x); return wa - wb || A.c - B.c || A.n - B.n; });
  const S = Array(32).fill(null); let cur = 0;
  for (const g of groups) { const rowEnd = cur < 16 ? 16 : 32; if (cur + g.length > rowEnd) cur = rowEnd; if (cur + g.length > 32) break; g.forEach((t, k) => S[cur + k] = t); cur += g.length + 1; }
  for (const t of rest.concat(groups.flat().filter(t => !S.includes(t)))) { let i = S.indexOf(null, Math.min(cur, 31)); if (i < 0) i = S.indexOf(null); S[i] = t; cur = i + 1; }
  RACK.slots = S;
}
function rackGroups() { const out = []; for (const r of [0, 16]) { let g = []; for (let i = r; i < r + 16; i++) { const t = RACK.slots[i]; if (t !== null) g.push(t); else { if (g.length) out.push(g); g = []; } } if (g.length) out.push(g); } return out; }
function renderRack(v) {
  const x = v.x;
  for (const r of [0, 1]) {
    const row = $('row' + r); if (row.children.length !== 16) { row.innerHTML = ''; for (let i = 0; i < 16; i++) { const s = document.createElement('div'); s.className = 'slot'; s.dataset.i = r * 16 + i; row.appendChild(s); } }
    for (let i = 0; i < 16; i++) {
      const si = r * 16 + i, slot = row.children[i], t = RACK.slots[si];
      const want = t === null ? '' : `${t}|${RACK.sel === t}|${RACK.newId === t}|${v.mustUse === t}`;
      if (slot._w === want) continue; slot._w = want; slot.innerHTML = '';
      if (t === null) continue;
      const d = document.createElement('div'); d.className = 'rt' + (RACK.sel === t ? ' sel' : '') + (RACK.newId === t ? ' new' : '') + (v.mustUse === t ? ' must' : ''); d.innerHTML = tileFace(t, x); d.dataset.t = t;
      d.onpointerdown = e => rackDown(e, t, si); d.ondblclick = () => { RACK.sel = t; rackDiscard(); };
      slot.appendChild(d);
    }
  }
  // bilgi
  let info = '';
  const gs = rackGroups();
  if (v.g === 'okey101') {
    const opened = v.opened[APP.mySeat];
    if (opened === 'cift') info = `Çift açtın · dizili çift: ${gs.filter(g => validPair(g, x)).length}`;
    else { const vg = gs.map(g => validGroup(g, x)).filter(Boolean); const tot = sum(vg.map(q => q.value)); const pr = gs.filter(g => validPair(g, x)).length;
      info = opened ? `Açtın ✔ · dizili per: ${vg.length}` : `Dizili per toplamı: <b style="color:${tot >= 101 ? '#7fd88e' : '#f7d77d'}">${tot}</b>/101 · çift: ${pr}/5`; }
  } else { const n = sum(gs.filter(g => validGroup(g, x)).map(g => g.length)); const pr = gs.filter(g => validPair(g, x)).length; info = `Perde: ${n}/14 taş · çift: ${pr}/7`; }
  info += ` · Okey: <span class="${'c' + x.okC}" style="font-weight:800">${x.okN}</span>`;
  $('rackInfo').innerHTML = info;
}
function rackDown(e, t, si) {
  e.preventDefault(); const sx = e.clientX, sy = e.clientY; let ghost = null, over = null;
  const src = e.currentTarget;
  const move = ev => {
    if (!ghost && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 6) { ghost = src.cloneNode(true); ghost.classList.add('ghost'); document.body.appendChild(ghost); src.style.opacity = .3; }
    if (ghost) { ghost.style.left = ev.clientX - 22 + 'px'; ghost.style.top = ev.clientY - 31 + 'px'; const el = document.elementFromPoint(ev.clientX, ev.clientY); const s = el && el.closest('.slot');
      if (over && over !== s) over.classList.remove('over'); over = s; if (s) s.classList.add('over'); }
  };
  const up = ev => {
    removeEventListener('pointermove', move); removeEventListener('pointerup', up);
    if (over) over.classList.remove('over');
    if (!ghost) { RACK.sel = RACK.sel === t ? null : t; RACK.newId = null; APP.v && (renderRack(APP.v), APP.v.g === 'okey101' && renderMelds(APP.v), renderActions(APP.v)); return; }
    ghost.remove(); src.style.opacity = '';
    const el = document.elementFromPoint(ev.clientX, ev.clientY);
    const slot = el && el.closest('.slot');
    if (slot) { const di = +slot.dataset.i; const o = RACK.slots[di]; RACK.slots[di] = t; RACK.slots[si] = o; }
    else if (el && (el.closest('.spot') || el.closest('.tile.pileTop')) && el.closest('.o3') && APP.v && APP.v.turn === APP.mySeat && APP.v.phase === 'discard') {
      const sp = el.closest('.o3'); if (sp.dataset.act === 'discard' || sp.dataset.key === 'spot' + APP.mySeat) { RACK.sel = t; rackDiscard(); }
    } else if (el && el.closest('.meldBox')) { RACK.sel = t; el.closest('.meldBox').onclick(); }
    APP.v && renderRack(APP.v);
  };
  addEventListener('pointermove', move); addEventListener('pointerup', up);
}
function rackDiscard() { const v = APP.v; if (!v || v.turn !== APP.mySeat || v.phase !== 'discard') return; if (RACK.sel === null) return toast('Atmak için ıstakadan bir taş seç'); sendAct({ type: 'discard', tile: RACK.sel }); RACK.sel = null; }

/* ===================== HUD ===================== */
function renderPlates(v) {
  let h = '';
  for (let s = 0; s < v.n; s++) {
    const rel = relOf(s, v), p = APP.players[s] || { name: '?', av: '❔' }; let extra = '';
    if (v.g === 'batak') { const b = v.bids[s]; extra = v.phase === 'bid' || v.bidder < 0 ? (b === 'pass' ? 'Pas' : b ? 'İhale ' + b : '') : (s === v.bidder ? `İhale ${v.curBid} · ` : '') + `${v.tricks[s]} el`; }
    if (v.g === 'okey101') extra = (v.opened[s] ? (v.opened[s] === 'cift' ? '✔ Çift açtı' : '✔ Açtı') : 'Açmadı') + (v.pen[s] ? ` · ceza ${v.pen[s]}` : '');
    if (v.g === 'pisti') extra = `${v.counts[s]} kart`;
    const b = BUBBLE[s] && BUBBLE[s].until > Date.now() ? `<div class="bub">${esc(BUBBLE[s].text)}</div>` : '';
    h += `<div class="plate p${rel} ${v.turn === s && !['roundEnd', 'over', 'trickEnd'].includes(v.phase) ? 'turn' : ''} ${p.online === false ? 'off' : ''}">${b}<div class="av">${p.av}</div><div><div class="nm" style="color:${SEATCOL[s]}">${esc(p.name)}${p.online === false ? ' (koptu)' : ''}</div><div class="sc">Puan: <b>${v.scores[s]}</b></div><div class="bd">${extra}</div></div></div>`;
  }
  $('plates').innerHTML = h;
}
function renderInfo(v) {
  const E = GAMES[v.g]; let h = `<div class="gn">${E.icon} ${E.name}</div>`;
  if (v.g === 'pisti') h += `${v.round}. el · ${v.target} sayıya`;
  else h += `${v.round}/${v.rounds}. el`;
  if (v.g === 'batak' && v.trump >= 0) h += `<br>Koz: <b style="font-size:20px;color:${v.trump === 1 || v.trump === 2 ? '#ff8a80' : '#fff'}">${SUITS[v.trump]}</b> ${SUIT_NAMES[v.trump]} · İhale: <b>${v.curBid}</b> (${esc(nameOf(v.bidder))})`;
  if (E.kind === 'tiles') h += `<br>Okey taşı: <b class="c${v.x.okC}" style="font-size:18px;background:#fffaf0;padding:0 6px;border-radius:4px">${v.x.okN}</b> (${TCOL[v.x.okC]}) · ★ sahte okey`;
  if (APP.mode === 'host' && APP.H) h += `<br><span class="muted">Oda: <b>${APP.H.code}</b></span>`;
  $('info').innerHTML = h;
}
function btn(label, fn, cls) { const b = document.createElement('button'); b.className = 'sm ' + (cls || ''); b.innerHTML = label; b.onclick = fn; return b; }
function renderActions(v) {
  const A = $('actions'); A.innerHTML = ''; const st = $('status'); const myTurn = v.turn === APP.mySeat; let s = '';
  const tn = esc(nameOf(v.turn));
  if (v.phase === 'roundEnd') s = 'El bitti, yeni el birazdan…'; else if (v.phase === 'over') s = 'Oyun bitti';
  else if (v.phase === 'trickEnd') s = `${esc(nameOf(v.trickWinner))} eli aldı`;
  if (v.g === 'batak') {
    if (v.phase === 'bid') { s = myTurn ? 'İhale sırası sende' : `${tn} ihale düşünüyor…`;
      if (myTurn) { A.appendChild(btn('Pas', () => sendAct({ type: 'bid', bid: 'pass' }), 'ghost')); for (let b = Math.max(v.minBid, v.curBid + 1); b <= Math.min(13, Math.max(v.minBid, v.curBid + 1) + 6); b++) A.appendChild(btn(String(b), () => sendAct({ type: 'bid', bid: b }))); } }
    else if (v.phase === 'trump') { s = myTurn ? 'İhale sende! Kozu seç' : `${tn} kozu seçiyor…`; if (myTurn) [0, 1, 2, 3].forEach(su => A.appendChild(btn(`<span style="font-size:20px;color:${su === 1 || su === 2 ? '#b71c1c' : '#111'}">${SUITS[su]}</span> ${SUIT_NAMES[su]}`, () => sendAct({ type: 'trump', suit: su })))); }
    else if (v.phase === 'play') s = myTurn ? 'Sıra sende — kart oyna' : `${tn} oynuyor…`;
  }
  if (v.g === 'pisti' && v.phase === 'play') s = myTurn ? 'Sıra sende — kart at' : `${tn} oynuyor…`;
  if (GAMES[v.g].kind === 'tiles' && (v.phase === 'draw' || v.phase === 'discard')) {
    const is101 = v.g === 'okey101';
    if (myTurn && v.phase === 'draw') { s = 'Sıra sende — ortadan çek ya da soldakini al'; A.appendChild(btn('⬇ Ortadan Çek', () => sendAct({ type: 'draw', from: 'pile' }), 'green')); const ls = (APP.mySeat + 3) % 4; if (v.dcount[ls] && !(is101 && v.noTake)) A.appendChild(btn('⬅ Yandan Al', () => sendAct({ type: 'draw', from: 'left' }))); }
    else if (myTurn) {
      s = is101 && v.mustUse !== null ? 'Yandan aldığın taşı (kırmızı) bu turda kullanmalısın' : 'Bir taş seç ve at' + (is101 ? '' : ' ya da bitir');
      A.appendChild(btn('Taş At', rackDiscard, RACK.sel === null ? 'ghost' : 'green'));
      if (!is101) A.appendChild(btn('🏁 Bitir', () => { if (RACK.sel === null) return toast('Bitirmek için atacağın taşı seç'); sendAct({ type: 'finish', tile: RACK.sel }); }, 'red'));
      if (is101) {
        const op = v.opened[APP.mySeat], x = v.x, gs = rackGroups();
        if (!op) {
          A.appendChild(btn('Seri Aç', () => sendAct({ type: 'open', kind: 'seri', groups: gs.filter(g => validGroup(g, x)) }), 'red'));
          A.appendChild(btn('Çift Aç', () => sendAct({ type: 'open', kind: 'cift', groups: gs.filter(g => validPair(g, x)) }), 'red'));
        } else {
          A.appendChild(btn('Per İndir', () => { const gg = op === 'cift' ? gs.filter(g => validPair(g, x)) : gs.filter(g => validGroup(g, x)); if (!gg.length) return toast('Istakada yan yana dizili geçerli per yok'); sendAct({ type: 'lay', groups: gg }); }));
          if (v.canAddNow) A.appendChild(btn('İşle', () => { if (RACK.sel === null) return toast('İşlenecek taşı seç, sonra masadaki pere tıkla'); const m = v.melds.findIndex(m => m.type !== 'pair' && validGroup(m.ids.concat([RACK.sel]), x)); if (m < 0) return toast('Bu taş masadaki hiçbir pere uymuyor'); sendAct({ type: 'add', tile: RACK.sel, meld: m }); RACK.sel = null; }));
        }
        if (v.mustUse !== null) A.appendChild(btn('↩ Geri Ver', () => sendAct({ type: 'giveBack' }), 'ghost'));
      }
    } else s = `${tn} oynuyor…`;
    A.appendChild(btn('Seri Diz', () => { autoArrange('seri'); renderRack(APP.v); }, 'ghost'));
    A.appendChild(btn('Çift Diz', () => { autoArrange('cift'); renderRack(APP.v); }, 'ghost'));
  }
  st.innerHTML = s; st.className = myTurn && !['roundEnd', 'over', 'trickEnd'].includes(v.phase) ? 'me' : '';
}

/* ---- özet ---- */
function showSummary(v) {
  const S = v.summary; $('sumT').textContent = S.title;
  const totals = S.rows.map(r => r.total); const best = S.lowWins ? Math.min(...totals) : Math.max(...totals);
  let h = '<table class="sum"><tr><th>Oyuncu</th>' + S.rows[0].cells.map(() => '<th></th>').join('') + '<th>Toplam</th></tr>';
  for (const r of S.rows) {
    h += `<tr class="${r.total === best ? 'win' : ''}"><td>${APP.players[r.seat] ? APP.players[r.seat].av : ''} ${esc(nameOf(r.seat))}</td>${r.cells.map(c => `<td>${esc(c)}</td>`).join('')}<td><b>${r.total}</b></td></tr>`;
    if (v.reveal && v.reveal[r.seat] && v.reveal[r.seat].length) h += `<tr><td colspan="9"><div class="revealRow">${v.reveal[r.seat].map(t => { const q = tile(t); return `<span class="mt ${q.fake ? '' : 'c' + q.c}">${q.fake ? '★' : q.n}</span>`; }).join('')}</div></td></tr>`;
  }
  h += '</table>';
  if (v.phase === 'over') h = `<p style="text-align:center;font-size:20px;margin-bottom:12px">🏆 Kazanan: <b style="color:#f7d77d">${esc(nameOf(v.winner))}</b></p>` + h;
  else h += '<p class="muted" style="text-align:center;margin-top:10px">Yeni el birkaç saniye içinde başlayacak…</p>';
  $('sumB').innerHTML = h; const B = $('sumBtns'); B.innerHTML = '';
  if (v.phase === 'over') {
    if (APP.mode !== 'guest') { B.appendChild(btn('🔁 Tekrar Oyna', restartGame, 'green')); B.appendChild(btn(APP.mode === 'solo' ? 'Ana Menü' : 'Lobiye Dön', toLobby)); }
    else { B.appendChild(btn('Kapat', () => $('mSum').classList.remove('on'), 'ghost')); B.appendChild(btn('Odadan Çık', backHome, 'red')); }
    if (v.winner === APP.mySeat) snd('win');
  } else B.appendChild(btn('Masayı Gör', () => $('mSum').classList.remove('on'), 'ghost'));
  $('mSum').classList.add('on');
}
$('bScore').onclick = () => { const v = APP.v; if (!v) return; if (v.summary) { showSummary(Object.assign({}, v, { phase: v.phase === 'over' ? 'over' : 'roundEnd' })); return; } toast('Henüz el bitmedi — puanlar isim kartlarında', true); };
