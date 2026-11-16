/* ===================== ORTAK MOTOR ===================== */
const GAMES = {};
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }
const clone = o => JSON.parse(JSON.stringify(o));
const sum = a => a.reduce((s, x) => s + x, 0);

/* ---- İskambil ---- */
// kart id 0..51 : suit = id/13|0 (0♠ 1♥ 2♦ 3♣), rank = id%13 + 2 (2..14, 14 = As)
const SUITS = ['♠', '♥', '♦', '♣'];
const SUIT_NAMES = ['Maça', 'Kupa', 'Karo', 'Sinek'];
const cSuit = id => (id / 13) | 0;
const cRank = id => (id % 13) + 2;
const RANK_TXT = r => ({ 11: 'J', 12: 'Q', 13: 'K', 14: 'A' }[r] || String(r));
const cardName = id => SUITS[cSuit(id)] + RANK_TXT(cRank(id));
const newDeck = () => shuffle([...Array(52).keys()]);

/* ---- Okey taşları ---- */
// taş id: renk c(0 sarı,1 mavi,2 siyah,3 kırmızı) * 26 + (n-1)*2 + kopya ; 104,105 sahte okey
const TCOL = ['Sarı', 'Mavi', 'Siyah', 'Kırmızı'];
function tile(id) { if (id >= 104) return { id, fake: true, c: -1, n: 0 }; return { id, c: (id / 26) | 0, n: (((id % 26) / 2) | 0) + 1, fake: false }; }
const newTiles = () => shuffle([...Array(106).keys()]);
function okeyCtx(indId) { const t = tile(indId); return { okC: t.c, okN: t.n === 13 ? 1 : t.n + 1 }; }
const isWild = (id, x) => { const t = tile(id); return !t.fake && t.c === x.okC && t.n === x.okN; };
const effT = (id, x) => { const t = tile(id); return t.fake ? { c: x.okC, n: x.okN } : { c: t.c, n: t.n }; };

// Geçerli per mi? {type, value, order} ya da null
function validGroup(ids, x) {
  if (!ids || ids.length < 3) return null;
  const W = ids.filter(i => isWild(i, x)), R = ids.filter(i => !isWild(i, x)).map(i => ({ id: i, ...effT(i, x) }));
  let best = null;
  const L = ids.length;
  // set: aynı sayı farklı renk
  if (L <= 4 && R.length >= 1 && R.every(r => r.n === R[0].n) && new Set(R.map(r => r.c)).size === R.length) {
    best = { type: 'set', value: R[0].n * L, order: [...R.map(r => r.id), ...W], n: R[0].n };
  }
  // seri: aynı renk ardışık
  if (R.length >= 1 && R.every(r => r.c === R[0].c) && new Set(R.map(r => r.n)).size === R.length && L <= 13) {
    for (const hi of [false]) { // 12-13-1 geçerli değil: 1 sadece serinin başında
      const nums = R.map(r => r.n);
      const mn = Math.min(...nums), mx = Math.max(...nums);
      if (mx - mn + 1 - R.length > W.length) continue;
      const maxEnd = 13;
      let s = Math.min(mn, maxEnd - L + 1);
      if (s < Math.max(1, mx - L + 1)) continue;
      const order = []; let wi = 0, value = 0;
      for (let p = s; p < s + L; p++) {
        const r = R.find((rr, k) => nums[k] === p);
        order.push(r ? r.id : W[wi++]); value += (p === 14 ? 1 : p);
      }
      if (!best || value > best.value) best = { type: 'run', value, order, c: R[0].c, start: s };
    }
  }
  return best;
}
function validPair(ids, x) {
  if (ids.length !== 2) return false;
  if (ids.some(i => isWild(i, x))) return true;
  const a = effT(ids[0], x), b = effT(ids[1], x); return a.c === b.c && a.n === b.n;
}
function pairValue(ids, x) { const r = ids.find(i => !isWild(i, x)); return r === undefined ? 0 : effT(r, x).n * 2; }

// En iyi per kombinasyonu (obj:'count' taş sayısı, 'value' puan)
function solveGroups(ids, x, obj) {
  const wild = ids.filter(i => isWild(i, x));
  const reals = ids.filter(i => !isWild(i, x)).map(i => ({ id: i, ...effT(i, x) })).sort((a, b) => a.c - b.c || a.n - b.n || a.id - b.id);
  const N = reals.length, memo = new Map();
  const score = g => obj === 'value' ? validGroup(g, x).value : g.length;
  function rec(mask, w) {
    if (mask === 0) return { s: 0, g: [] };
    const key = mask * 4 + w; if (memo.has(key)) return memo.get(key);
    let i = 0; while (!(mask & (1 << i))) i++;
    const t = reals[i], rest = mask & ~(1 << i);
    let best = rec(rest, w); best = { s: best.s, g: best.g };
    const tryG = (gIds, m2, w2) => { const v = validGroup(gIds, x); if (!v) return; const r = rec(m2, w2); const s = r.s + score(gIds); if (s > best.s) best = { s, g: [v.order, ...r.g] }; };
    // set
    const byCol = {}; for (let k = 0; k < N; k++) if ((rest & (1 << k)) && reals[k].n === t.n && reals[k].c !== t.c && byCol[reals[k].c] === undefined) byCol[reals[k].c] = k;
    const cand = Object.values(byCol);
    for (let sub = 0; sub < (1 << cand.length); sub++) {
      const pick = cand.filter((_, k) => sub & (1 << k)); let m2 = rest; for (const k of pick) m2 &= ~(1 << k);
      for (let ww = 0; ww <= w; ww++) { const L = 1 + pick.length + ww; if (L < 3 || L > 4) continue; tryG([t.id, ...pick.map(k => reals[k].id), ...wild.slice(wild.length - w, wild.length - w + ww)], m2, w - ww); }
    }
    // seri yukarı doğru
    const chain = (dir, startN) => {
      const out = [];
      const go = (n, m2, w2, gIds) => {
        if (gIds.length >= 3) tryG(gIds, m2, w2);
        if (gIds.length >= 13) return;
        const nn = n + dir; if (nn < 1 || nn > 13) return;
        let k = -1; for (let q = 0; q < N; q++) if ((m2 & (1 << q)) && reals[q].c === t.c && reals[q].n === nn) { k = q; break; }
        if (k >= 0) go(nn, m2 & ~(1 << k), w2, [...gIds, reals[k].id]);
        if (w2 > 0) go(nn, m2, w2 - 1, [...gIds, wild[wild.length - w2]]);
      };
      go(startN, rest, w, [t.id]);
      return out;
    };
    chain(1, t.n);
    memo.set(key, best); return best;
  }
  const r = rec((1 << N) - 1, wild.length);
  // kullanılmamış okeyleri mevcut perlere ekle
  const used = new Set(r.g.flat()); const freeW = wild.filter(i => !used.has(i));
  const groups = r.g.map(g => g.slice());
  for (const wi of freeW) for (const g of groups) { const v = validGroup([...g, wi], x); if (v) { g.splice(0, g.length, ...v.order); break; } }
  const sc = obj === 'value' ? sum(groups.map(g => validGroup(g, x).value)) : groups.flat().length;
  return { score: sc, groups };
}
function solvePairs(ids, x) {
  const wild = ids.filter(i => isWild(i, x)); const by = {};
  for (const i of ids) if (!isWild(i, x)) { const e = effT(i, x); const k = e.c * 20 + e.n; (by[k] = by[k] || []).push(i); }
  const pairs = [], singles = [];
  for (const k in by) { const a = by[k]; while (a.length >= 2) pairs.push([a.pop(), a.pop()]); if (a.length) singles.push(a[0]); }
  singles.sort((a, b) => effT(b, x).n - effT(a, x).n);
  for (const w of wild) { if (singles.length) pairs.push([singles.shift(), w]); }
  return { pairs, singles };
}
// taşın yararlılığı (bot için)
function tileUse(id, hand, x) {
  if (isWild(id, x)) return 100;
  const e = effT(id, x); let u = 0;
  for (const o of hand) { if (o === id) continue; if (isWild(o, x)) continue; const f = effT(o, x);
    if (f.c === e.c && f.n === e.n) u += 2;
    else if (f.n === e.n) u += 3;
    else if (f.c === e.c) { const d = Math.abs(f.n - e.n); if (d === 1) u += 4; else if (d === 2) u += 2; } }
  return u;
}
function handQuality(hand, x) {
  const s = solveGroups(hand, x, 'count'); const used = new Set(s.groups.flat());
  const left = hand.filter(i => !used.has(i));
  let q = s.score * 10; for (const i of left) q += Math.min(4, tileUse(i, left, x));
  const p = solvePairs(hand, x).pairs.length; q = Math.max(q, p >= 5 ? p * 21 : 0);
  return q;
}
