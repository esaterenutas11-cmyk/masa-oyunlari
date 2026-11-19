/* ===================== PİŞTİ ===================== */
GAMES.pisti = {
  name: 'Pişti', icon: '🃏', players: [2, 4], kind: 'cards',
  desc: 'Yere atılan kartla aynı kartı ya da Vale (J) at, yerdekileri topla. Tek karta aynısını atarsan PİŞTİ! 2 kişi, 4 kişi tekli ya da eşli.',
  opts: { target: { label: 'Oyun sonu', values: [51, 101, 151], def: 101, fmt: v => v + ' sayı' },
    teams: { label: '4 kişide', values: [1, 0], def: 1, fmt: v => v ? 'Eşli (karşılıklı)' : 'Tekli' } },
  create(o, n) {
    const s = { g: 'pisti', n, teams: n === 4 && (o.teams === undefined ? 1 : +o.teams) ? 1 : 0, target: o.target || 101, scores: Array(n).fill(0), dealer: Math.random() * n | 0, round: 0, log: [], over: false };
    this.newRound(s); return s;
  },
  newRound(s) {
    s.round++; s.deck = newDeck(); s.pile = s.deck.splice(0, 4); s.hidden = 3;
    // açık kart vale olmasın
    while (cRank(s.pile[3]) === 11) { s.deck.push(s.pile.pop()); s.pile.push(s.deck.shift()); }
    s.hands = Array.from({ length: s.n }, () => []); s.cap = Array.from({ length: s.n }, () => []);
    s.pisti = Array(s.n).fill(0); s.lastCap = -1; s.phase = 'play'; s.dealer = (s.dealer + 1) % s.n; s.turn = (s.dealer + 1) % s.n;
    this.deal(s); s.ev = { type: 'deal', k: Math.random() }; s.log.unshift(`${s.round}. el başladı`);
  },
  deal(s) { for (let k = 0; k < 4; k++) for (let i = 0; i < s.n; i++) s.hands[i].push(s.deck.shift()); },
  turnSeat(s) { return s.phase === 'play' ? s.turn : -1; },
  act(s, seat, a) {
    if (a.type !== 'play') return 'Geçersiz';
    if (s.phase !== 'play' || seat !== s.turn) return 'Sıra sende değil';
    const h = s.hands[seat], i = h.indexOf(a.card); if (i < 0) return 'Kart elinde yok';
    h.splice(i, 1); const c = a.card; const top = s.pile[s.pile.length - 1];
    s.pile.push(c); s.ev = { type: 'play', seat, card: c, k: Math.random() };
    if (top !== undefined && (cRank(c) === cRank(top) || cRank(c) === 11)) {
      const nm = '{' + seat + '}';
      const lastCard = !s.deck.length && s.hands.every(x => !x.length);
      if (s.pile.length === 2 && cRank(c) === cRank(top) && !lastCard) {
        const pts = cRank(c) === 11 ? 20 : 10; s.pisti[seat] += pts; s.ev.pisti = pts; s.log.unshift(`${nm} PİŞTİ yaptı! +${pts}`);
      } else s.log.unshift(`${nm} ${s.pile.length} kartı topladı`);
      s.ev.capture = seat; s.ev.ids = s.pile.slice(); s.cap[seat].push(...s.pile); s.pile = []; s.hidden = 0; s.lastCap = seat;
    }
    s.turn = (s.turn + 1) % s.n;
    if (s.hands.every(h => !h.length)) {
      if (s.deck.length) { this.deal(s); s.ev.deal = true; }
      else this.endRound(s);
    }
    return null;
  },
  endRound(s) {
    if (s.pile.length && s.lastCap >= 0) { s.cap[s.lastCap].push(...s.pile); s.log.unshift(`Kalan ${s.pile.length} kart son toplayan {${s.lastCap}} oyuncusuna`); s.pile = []; }
    const tm = i => s.teams ? i % 2 : i, T = s.teams ? 2 : s.n;
    const cardPts = s.cap.map((cs, i) => { let p = s.pisti[i]; for (const c of cs) { const r = cRank(c), su = cSuit(c); if (r === 14 || r === 11) p += 1; if (r === 2 && su === 3) p += 2; if (r === 10 && su === 2) p += 3; } return p; });
    const tCards = Array(T).fill(0), tPts = Array(T).fill(0);
    s.cap.forEach((cs, i) => { tCards[tm(i)] += cs.length; tPts[tm(i)] += cardPts[i]; });
    const mx = Math.max(...tCards), who = tCards.map((c, t) => c === mx ? t : -1).filter(t => t >= 0);
    if (who.length === 1) tPts[who[0]] += 3;
    const pts = s.cap.map((_, i) => tPts[tm(i)]);
    pts.forEach((p, i) => s.scores[i] += p); s.roundPts = pts;
    s.summary = { title: `${s.round}. El Sonucu`, rows: pts.map((p, i) => ({ seat: i, cells: [(s.teams ? `Takım ${tm(i) + 1} · ` : '') + s.cap[i].length + ' kart', s.pisti[i] ? s.pisti[i] + ' pişti puanı' : '', '+' + (s.teams ? cardPts[i] + ' (takım +' + p + ')' : p)], total: s.scores[i] })) };
    const best = Math.max(...s.scores), leaders = new Set(s.scores.map((x, i) => x === best ? tm(i) : -1).filter(t => t >= 0));
    if (best >= s.target && leaders.size === 1) { s.phase = 'over'; s.over = true; s.winner = s.scores.indexOf(best); s.winTeam = s.teams ? [...leaders][0] : -1; s.summary.title = 'Oyun Bitti'; }
    else s.phase = 'roundEnd';
  },
  auto(s) { return s.phase === 'roundEnd' ? 7000 : null; },
  advance(s) { if (s.phase === 'roundEnd') this.newRound(s); },
  view(s, seat) {
    return { g: 'pisti', n: s.n, teams: s.teams, winTeam: s.winTeam, phase: s.phase, turn: s.turn, round: s.round, target: s.target, scores: s.scores, log: s.log.slice(0, 6),
      hand: s.hands[seat] ? s.hands[seat].slice() : [], counts: s.hands.map(h => h.length), deck: s.deck.length,
      pile: s.pile.map((c, i) => i < s.hidden ? -1 : c), cap: s.cap.map(c => c.length), pisti: s.pisti, ev: s.ev, summary: s.summary, over: s.over, winner: s.winner,
      legal: seat === s.turn && s.phase === 'play' ? s.hands[seat].slice() : [] };
  },
  bot(s, seat) {
    const h = s.hands[seat], top = s.pile[s.pile.length - 1];
    const seen = {}; for (const cs of s.cap) for (const c of cs) seen[cRank(c)] = (seen[cRank(c)] || 0) + 1; for (const c of s.pile) if (c >= 0) seen[cRank(c)] = (seen[cRank(c)] || 0) + 1;
    const val = cs => cs.reduce((p, c) => p + 1 + ((cRank(c) === 14 || cRank(c) === 11) ? 2 : 0) + (c === 39 ? 3 : 0) + (c === 34 ? 4 : 0), 0); // 2♣ id 39, 10♦ id 34
    if (top !== undefined) {
      const m = h.find(c => cRank(c) === cRank(top) && cRank(c) !== 11); if (m !== undefined) return { type: 'play', card: m };
      const j = h.find(c => cRank(c) === 11);
      if (j !== undefined && (s.pile.length >= 3 || val(s.pile) >= 5 || (s.pile.length === 1 && cRank(top) === 11) || h.length === 1)) return { type: 'play', card: j };
    }
    // vermeyecek kart: en çok görülmüş, vale olmayan, değersiz
    const cand = h.filter(c => cRank(c) !== 11); const pool = cand.length ? cand : h;
    pool.sort((a, b) => (seen[cRank(b)] || 0) - (seen[cRank(a)] || 0) || val([a]) - val([b]));
    if (s.pile.length === 0) { const safe = pool.find(c => (seen[cRank(c)] || 0) >= 2); if (safe !== undefined) return { type: 'play', card: safe }; }
    return { type: 'play', card: pool[0] };
  }
};

/* ===================== BATAK (İhaleli) ===================== */
GAMES.batak = {
  name: 'Batak', icon: '♠️', players: [4], kind: 'cards',
  desc: 'İhaleli, Eşli ihaleli ya da Koz Maça. Renk takip etmek ve yükseltmek zorunlu, renk yoksa koz çakılır.',
  opts: { mode: { label: 'Mod', values: [0, 1, 2], def: 0, fmt: v => ['İhaleli (tekli)', 'Eşli ihaleli', 'Koz Maça'][v] },
    rounds: { label: 'El sayısı', values: [4, 8, 12, 16], def: 8, fmt: v => v + ' el' },
    minBid: { label: 'En düşük ihale', values: [5, 4], def: 5, fmt: v => v },
    scoring: { label: 'Puanlama', values: [1, 0], def: 1, fmt: v => v ? 'Onluk (×10)' : 'Basit' } },
  create(o, n) {
    const s = { g: 'batak', n: 4, mode: +o.mode || 0, scoring: o.scoring === undefined ? 1 : +o.scoring, rounds: o.rounds || 8, minBid: o.minBid || 5, scores: [0, 0, 0, 0], dealer: Math.random() * 4 | 0, round: 0, log: [], over: false };
    this.newRound(s); return s;
  },
  newRound(s) {
    s.round++; s.dealer = (s.dealer + 1) % 4; const d = newDeck();
    s.hands = [0, 1, 2, 3].map(i => d.slice(i * 13, i * 13 + 13).sort((a, b) => a - b));
    s.bids = [null, null, null, null]; s.curBid = 0; s.bidder = -1; s.turn = (s.dealer + 1) % 4; s.phase = 'bid';
    s.trump = -1; s.trick = []; s.tricks = [0, 0, 0, 0]; s.taken = [[], [], [], []]; s.kozBroken = false; s.lastTrick = null;
    s.ev = { type: 'deal', k: Math.random() }; s.log.unshift(`${s.round}. el dağıtıldı, ihale başlıyor`);
  },
  turnSeat(s) { return ['bid', 'trump', 'play'].includes(s.phase) ? s.turn : -1; },
  legal(s, seat) {
    const h = s.hands[seat]; if (s.phase !== 'play' || seat !== s.turn) return [];
    if (!s.trick.length) { const nk = h.filter(c => cSuit(c) !== s.trump); return (s.kozBroken || !nk.length) ? h.slice() : nk; }
    const led = cSuit(s.trick[0].card); const same = h.filter(c => cSuit(c) === led);
    const trumped = s.trick.some(t => cSuit(t.card) === s.trump) && led !== s.trump;
    if (same.length) {
      if (trumped) return same;
      const hi = Math.max(...s.trick.filter(t => cSuit(t.card) === led).map(t => cRank(t.card)));
      const up = same.filter(c => cRank(c) > hi); return up.length ? up : same;
    }
    const koz = h.filter(c => cSuit(c) === s.trump);
    if (koz.length) {
      const tk = s.trick.filter(t => cSuit(t.card) === s.trump);
      if (tk.length) { const hi = Math.max(...tk.map(t => cRank(t.card))); const up = koz.filter(c => cRank(c) > hi); return up.length ? up : koz; }
      return koz;
    }
    return h.slice();
  },
  act(s, seat, a) {
    if (seat !== s.turn) return 'Sıra sende değil';
    if (s.phase === 'bid' && s.mode === 2) { // koz maça: herkes kaç el alacağını söyler, koz maça
      if (a.type !== 'bid' || a.bid === 'pass') return 'Kaç el alacağını söyle';
      const b = a.bid | 0; if (b < 1 || b > 13) return 'Geçersiz'; s.bids[seat] = b; s.log.unshift(`{${seat}} ${b} el dedi`);
      if (s.bids.every(x => x !== null)) { s.trump = 0; s.phase = 'play'; s.turn = (s.dealer + 1) % 4; s.log.unshift('Koz: ♠ Maça'); s.ev = { type: 'trump', k: Math.random() }; }
      else s.turn = (s.turn + 1) % 4;
      return null;
    }
    if (s.phase === 'bid') {
      if (a.type !== 'bid') return 'İhale bekleniyor';
      if (a.bid === 'pass') { s.bids[seat] = 'pass'; s.log.unshift(`{${seat}} pas geçti`); }
      else { const b = a.bid | 0; if (b < Math.max(s.minBid, s.curBid + 1) || b > 13) return 'Geçersiz ihale'; s.bids[seat] = b; s.curBid = b; s.bidder = seat; s.log.unshift(`{${seat}} ${b} dedi`); }
      const active = [0, 1, 2, 3].filter(i => s.bids[i] !== 'pass');
      if (active.length === 1 && s.bidder === active[0]) return this.wonBid(s, active[0]);
      if (active.length === 0) { s.bidder = s.dealer; s.curBid = 4; s.bids[s.dealer] = 4; s.log.unshift('Herkes pas, ihale dağıtana kaldı (4)'); return this.wonBid(s, s.dealer); }
      let t = s.turn; do { t = (t + 1) % 4; } while (s.bids[t] === 'pass'); s.turn = t;
      if (active.length === 1 && s.bidder < 0) { /* tek kalan henüz söylemedi */ }
      return null;
    }
    if (s.phase === 'trump') {
      if (a.type !== 'trump' || !(a.suit >= 0 && a.suit < 4)) return 'Koz seç';
      s.trump = a.suit; s.phase = 'play'; s.turn = seat; s.log.unshift(`Koz: ${SUITS[a.suit]} ${SUIT_NAMES[a.suit]}`); s.ev = { type: 'trump', k: Math.random() }; return null;
    }
    if (s.phase === 'play') {
      if (a.type !== 'play') return 'Kart oyna';
      if (!this.legal(s, seat).includes(a.card)) return 'Bu kartı oynayamazsın (renk / yükseltme / koz kuralı)';
      s.hands[seat].splice(s.hands[seat].indexOf(a.card), 1); s.trick.push({ seat, card: a.card });
      if (cSuit(a.card) === s.trump) s.kozBroken = true;
      s.ev = { type: 'play', seat, card: a.card, k: Math.random() };
      if (s.trick.length === 4) { s.phase = 'trickEnd'; s.trickWinner = this.winner(s); }
      else s.turn = (s.turn + 1) % 4;
      return null;
    }
    return 'Bekle';
  },
  wonBid(s, seat) { s.bidder = seat; s.phase = 'trump'; s.turn = seat; s.log.unshift(`İhale {${seat}} oyuncusunda: ${s.curBid}`); return null; },
  winner(s) {
    const led = cSuit(s.trick[0].card); let best = s.trick[0];
    for (const t of s.trick) { const bs = cSuit(best.card), ts = cSuit(t.card);
      if (ts === s.trump && bs !== s.trump) best = t; else if (ts === bs && cRank(t.card) > cRank(best.card)) best = t; }
    return best.seat;
  },
  auto(s) { return s.phase === 'trickEnd' ? 1300 : s.phase === 'roundEnd' ? 8000 : null; },
  advance(s) {
    if (s.phase === 'trickEnd') {
      const w = s.trickWinner; s.tricks[w]++; s.taken[w].push(...s.trick.map(t => t.card)); s.lastTrick = s.trick; s.ev = { type: 'collect', seat: w, ids: s.trick.map(t => t.card), k: Math.random() };
      s.trick = []; s.turn = w; s.phase = 'play';
      if (s.hands.every(h => !h.length)) this.endRound(s);
    } else if (s.phase === 'roundEnd') this.newRound(s);
  },
  // puan: ihale/söz tuttu mu
  contract(s, bid, got) { return s.scoring ? (got >= bid ? 10 * bid + (got - bid) : -10 * bid) : (got >= bid ? got : -bid); },
  endRound(s) {
    let pts, notes = [];
    if (s.mode === 2) pts = s.tricks.map((t, i) => this.contract(s, s.bids[i], t));
    else if (s.mode === 1) {
      const bt = s.bidder % 2, tt = [s.tricks[0] + s.tricks[2], s.tricks[1] + s.tricks[3]];
      const tp = [0, 1].map(t => t === bt ? this.contract(s, s.curBid, tt[t]) : (s.scoring && tt[t] === 0 ? -10 * s.curBid : tt[t]));
      pts = [0, 1, 2, 3].map(i => tp[i % 2]); notes = tt;
      s.log.unshift(tt[bt] >= s.curBid ? `Takım ${bt + 1} ihaleyi çıkardı (${tt[bt]})` : `Takım ${bt + 1} BATTI! (${tt[bt]}/${s.curBid})`);
    } else {
      pts = s.tricks.map((t, i) => i === s.bidder ? this.contract(s, s.curBid, t) : (s.scoring && t === 0 ? -10 * s.curBid : t));
      s.log.unshift(s.tricks[s.bidder] >= s.curBid ? `{${s.bidder}} ihaleyi çıkardı` : `{${s.bidder}} BATTI! (-${s.scoring ? 10 * s.curBid : s.curBid})`);
    }
    pts.forEach((p, i) => s.scores[i] += p);
    s.summary = { title: `${s.round}. El Sonucu`, rows: pts.map((p, i) => ({ seat: i, cells: [s.tricks[i] + ' el aldı' + (s.mode === 1 ? ` (takım ${notes[i % 2]})` : ''),
      s.mode === 2 ? `Söz ${s.bids[i]}` + (s.tricks[i] >= s.bids[i] ? ' ✔' : ' · BATTI') : (i === s.bidder ? 'İhale ' + s.curBid + (p < 0 ? ' · BATTI' : ' ✔') : (s.mode === 1 && i % 2 === s.bidder % 2 ? 'İhale ortağı' : '')),
      (p > 0 ? '+' : '') + p], total: s.scores[i] })) };
    if (s.round >= s.rounds) { s.phase = 'over'; s.over = true; s.winner = s.scores.indexOf(Math.max(...s.scores)); s.winTeam = s.mode === 1 ? s.winner % 2 : -1; s.summary.title = 'Oyun Bitti'; }
    else s.phase = 'roundEnd';
  },
  view(s, seat) {
    return { g: 'batak', n: 4, mode: s.mode, teams: s.mode === 1 ? 1 : 0, winTeam: s.winTeam, scoring: s.scoring, phase: s.phase, turn: s.turn, round: s.round, rounds: s.rounds, scores: s.scores, log: s.log.slice(0, 6),
      hand: (s.hands[seat] || []).slice(), counts: s.hands.map(h => h.length), bids: s.bids, curBid: s.curBid, bidder: s.bidder, minBid: s.minBid,
      trump: s.trump, trick: s.trick, tricks: s.tricks, taken: s.taken.map(t => t.length), ev: s.ev, summary: s.summary, over: s.over, winner: s.winner, trickWinner: s.phase === 'trickEnd' ? s.trickWinner : -1,
      legal: this.legal(s, seat) };
  },
  estimate(h) {
    let e = 0; const by = [0, 1, 2, 3].map(su => h.filter(c => cSuit(c) === su).map(cRank).sort((a, b) => b - a));
    for (const r of by) { if (r[0] === 14) e += 1; if (r.includes(13) && r.length >= 2) e += r[0] === 14 ? 1 : 0.7; if (r.includes(12) && r.length >= 3) e += 0.4; }
    const long = by.reduce((m, r, i) => r.length > by[m].length ? i : m, 0);
    e += Math.max(0, by[long].length - 3) * 0.9 + by[long].filter(r => r >= 11).length * 0.3;
    return { e, long };
  },
  bot(s, seat) {
    const h = s.hands[seat];
    if (s.phase === 'bid' && s.mode === 2) { const by = [0, 1, 2, 3].map(su => h.filter(c => cSuit(c) === su).map(cRank).sort((a, b) => b - a));
      let e = 0; by.forEach((r, su) => { if (r[0] === 14) e += 1; if (r.includes(13) && r.length >= 2 && su) e += 0.6; }); e += Math.max(0, by[0].length - 3) + by[0].filter(r => r >= 12 && r < 14).length * 0.5;
      return { type: 'bid', bid: Math.max(1, Math.min(13, Math.round(e))) }; }
    if (s.phase === 'bid') {
      const { e } = this.estimate(h); const need = Math.max(s.minBid, s.curBid + 1);
      if (Math.floor(e + 0.3) >= need && need <= 13) return { type: 'bid', bid: need };
      return { type: 'bid', bid: 'pass' };
    }
    if (s.phase === 'trump') {
      const sc = [0, 1, 2, 3].map(su => h.filter(c => cSuit(c) === su).reduce((p, c) => p + 1 + Math.max(0, cRank(c) - 9) * 0.3, 0));
      return { type: 'trump', suit: sc.indexOf(Math.max(...sc)) };
    }
    const L = this.legal(s, seat);
    if (!s.trick.length) {
      const aces = L.filter(c => cRank(c) === 14 && cSuit(c) !== s.trump); if (aces.length) return { type: 'play', card: aces[0] };
      const koz = L.filter(c => cSuit(c) === s.trump);
      if (seat === s.bidder && koz.length >= 3) return { type: 'play', card: koz.sort((a, b) => cRank(b) - cRank(a))[0] };
      return { type: 'play', card: L.slice().sort((a, b) => cRank(a) - cRank(b))[0] };
    }
    const lowest0 = a => a.slice().sort((x, y) => (cSuit(x) === s.trump) - (cSuit(y) === s.trump) || cRank(x) - cRank(y))[0];
    if (s.mode === 1) { const cur = this.winner(s); if (cur % 2 === seat % 2) return { type: 'play', card: lowest0(L) }; }
    // kazanabiliyorsa en ucuz kazanan, yoksa en küçük
    const wins = L.filter(c => { const t = s.trick.concat([{ seat, card: c }]); const save = s.trick; s.trick = t; const w = this.winner(s); s.trick = save; return w === seat; });
    const lowest = a => a.slice().sort((x, y) => (cSuit(x) === s.trump) - (cSuit(y) === s.trump) || cRank(x) - cRank(y))[0];
    if (wins.length) return { type: 'play', card: lowest(wins) };
    return { type: 'play', card: lowest(L) };
  }
};
