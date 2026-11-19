/* ===================== OKEY ===================== */
const okeyBase = {
  kind: 'tiles', players: [4],
  setupTiles(s, handSize) {
    const p = newTiles(); s.indicator = p.find(i => i < 104); p.splice(p.indexOf(s.indicator), 1);
    s.x = okeyCtx(s.indicator); s.dealer = (s.dealer + 1) % 4;
    s.hands = [0, 1, 2, 3].map(i => p.splice(0, handSize + (i === s.dealer ? 1 : 0)));
    s.pile = p; s.discards = [[], [], [], []]; s.turn = s.dealer; s.phase = 'discard';
    s.ev = { type: 'deal', k: Math.random() };
  },
  prev: t => (t + 3) % 4,
  drawCommon(s, seat, a) {
    if (a.from === 'pile') {
      if (!s.pile.length) return 'Ortada taş kalmadı';
      const t = s.pile.shift(); s.hands[seat].push(t); s.phase = 'discard'; s.drawn = t; s.ev = { type: 'draw', seat, from: 'pile', k: Math.random() }; return null;
    }
    if (a.from === 'left') {
      const d = s.discards[this.prev(seat)]; if (!d.length) return 'Yanda taş yok';
      const t = d.pop(); s.hands[seat].push(t); s.phase = 'discard'; s.drawn = t; s.ev = { type: 'draw', seat, from: 'left', tile: t, k: Math.random() }; s.log.unshift(`{${seat}} yandan aldı`); return 'TOOK';
    }
    return 'Nereden çekeceğini seç';
  },
  botDiscard(s, seat, avoid) {
    const h = s.hands[seat], x = s.x; let best = null, bq = -1;
    for (const t of h) {
      if (isWild(t, x) || (avoid && avoid(t))) continue;
      const q = handQuality(h.filter(i => i !== t), x) - (s.g === 'okey101' ? effT(t, x).n * 0.15 : 0);
      if (q > bq || (q === bq && effT(t, x).n > effT(best, x).n)) { bq = q; best = t; }
    }
    if (best === null) best = h.find(t => !isWild(t, x)) ?? h[0];
    return best;
  }
};

GAMES.okey = Object.assign({}, okeyBase, {
  name: 'Okey', icon: '🀄',
  desc: '14 taşını per ya da 7 çift yap, 15. taşı atarak bitir. Herkes 20 puanla başlar, biten oyuncu diğerlerinden puan düşürür. Göstergeyi göstermek 1 puan.',
  opts: { start: { label: 'Başlangıç puanı', values: [20, 12, 6], def: 20, fmt: v => v + ' puan' } },
  create(o) { const st = o.start || 20; const s = { g: 'okey', n: 4, start: st, round: 0, scores: [st, st, st, st], dealer: Math.random() * 4 | 0, log: [], over: false }; this.newRound(s); return s; },
  newRound(s) { s.round++; this.setupTiles(s, 14); s.summary = null; s.played = [false, false, false, false]; s.shown = false; s.log.unshift(`${s.round}. el başladı`); },
  turnSeat(s) { return (s.phase === 'draw' || s.phase === 'discard') ? s.turn : -1; },
  canShow(s, seat) { if (s.shown || s.played[seat] || seat !== s.turn) return false; const I = tile(s.indicator); return s.hands[seat].some(t => t !== s.indicator && !tile(t).fake && tile(t).c === I.c && tile(t).n === I.n); },
  act(s, seat, a) {
    if (seat !== s.turn) return 'Sıra sende değil';
    if (a.type === 'gosterge') {
      if (!this.canShow(s, seat)) return 'Gösterge yapamazsın (göstergenin aynısı elinde olmalı, ilk hamlende)';
      s.shown = true; for (let i = 0; i < 4; i++) if (i !== seat) s.scores[i] -= 1;
      s.log.unshift(`{${seat}} GÖSTERGE yaptı! Diğerleri -1`); s.ev = { type: 'show', seat, k: Math.random() };
      if (s.scores.some(p => p <= 0)) return this.endRound(s, -1, 0, ['gösterge']);
      return null;
    }
    if (s.phase === 'draw') { if (a.type !== 'draw') return 'Önce taş çek'; const r = this.drawCommon(s, seat, a); return r === 'TOOK' ? null : r; }
    if (s.phase !== 'discard') return 'Bekle';
    const h = s.hands[seat];
    if (a.type === 'discard' || a.type === 'finish') {
      if (!h.includes(a.tile)) return 'Taş elinde yok';
      const rest = h.filter(i => i !== a.tile);
      if (a.type === 'finish') {
        const g = solveGroups(rest, s.x, 'count'), p = solvePairs(rest, s.x);
        const asPairs = p.pairs.length === 7, asGroups = g.score === 14;
        if (!asGroups && !asPairs) return 'Elin bitmiyor: 14 taşın tamamı per ya da 7 çift olmalı';
        h.splice(h.indexOf(a.tile), 1); s.discards[seat].push(a.tile);
        let pts = 2; const notes = [];
        if (isWild(a.tile, s.x)) { pts *= 2; notes.push('okey atarak'); }
        if (asPairs && !asGroups) { pts *= 2; notes.push('çiftten'); }
        for (let i = 0; i < 4; i++) if (i !== seat) s.scores[i] -= pts;
        s.winGroups = asGroups ? g.groups : p.pairs;
        s.log.unshift(`{${seat}} ELİ BİTİRDİ${notes.length ? ' (' + notes.join(', ') + ')' : ''}: diğerleri -${pts}`);
        s.ev = { type: 'finish', seat, k: Math.random() };
        return this.endRound(s, seat, pts, notes);
      }
      h.splice(h.indexOf(a.tile), 1); s.discards[seat].push(a.tile); s.played[seat] = true; s.ev = { type: 'discard', seat, tile: a.tile, k: Math.random() };
      if (!s.pile.length) { s.log.unshift('Ortada taş bitti, el berabere'); return this.endRound(s, -1, 0, []); }
      s.turn = (s.turn + 1) % 4; s.phase = 'draw'; return null;
    }
    return 'Taş at';
  },
  endRound(s, w, pts, notes) {
    s.revealHands = s.hands.map(h => h.slice());
    s.summary = { title: `${s.round}. El Sonucu`, rows: [0, 1, 2, 3].map(i => ({ seat: i, cells: [i === w ? 'BİTİRDİ' + (notes.length ? ' · ' + notes.join(', ') : '') : '', w < 0 ? '0' : i === w ? '0' : '-' + pts], total: s.scores[i] })) };
    if (s.scores.some(p => p <= 0)) { s.phase = 'over'; s.over = true; s.winner = s.scores.indexOf(Math.max(...s.scores)); s.summary.title = 'Oyun Bitti'; }
    else s.phase = 'roundEnd';
    return null;
  },
  auto(s) { return s.phase === 'roundEnd' ? 8000 : null; },
  advance(s) { if (s.phase === 'roundEnd') this.newRound(s); },
  view(s, seat) {
    return { g: 'okey', n: 4, phase: s.phase, turn: s.turn, round: s.round, start: s.start, canShow: this.canShow(s, seat), scores: s.scores, log: s.log.slice(0, 6),
      hand: (s.hands[seat] || []).slice(), counts: s.hands.map(h => h.length), pile: s.pile.length, indicator: s.indicator, x: s.x,
      discards: s.discards.map(d => d.slice(-3)), dcount: s.discards.map(d => d.length), ev: s.ev, summary: s.summary, over: s.over, winner: s.winner,
      reveal: (s.phase === 'roundEnd' || s.phase === 'over') ? s.revealHands : null };
  },
  bot(s, seat) {
    const h = s.hands[seat], x = s.x;
    if (this.canShow(s, seat)) return { type: 'gosterge' };
    if (s.phase === 'draw') {
      const d = s.discards[this.prev(seat)], top = d[d.length - 1];
      if (top !== undefined) {
        const now = handQuality(h, x);
        const withT = h.concat([top]); let best = -1;
        for (const t of withT) { if (t === top) continue; best = Math.max(best, handQuality(withT.filter(i => i !== t), x)); }
        if (isWild(top, x) || best >= now + 10) return { type: 'draw', from: 'left' };
      }
      if (!s.pile.length) return { type: 'draw', from: 'left' };
      return { type: 'draw', from: 'pile' };
    }
    for (const t of h) { const rest = h.filter(i => i !== t); if (solveGroups(rest, x, 'count').score === 14 || solvePairs(rest, x).pairs.length === 7) return { type: 'finish', tile: t }; }
    return { type: 'discard', tile: this.botDiscard(s, seat) };
  }
});

/* ===================== 101 OKEY =====================
   Kaynak: pagat.com Okey 101, Altinstar 101 kuralları, okey.gg (101 Okey Plus tarzı katlamalı mod) */
// masadaki perde okeyin yerine geçtiği taş (okey alma için)
function wildSlots(ids, x) {
  const v = validGroup(ids, x); if (!v) return [];
  const W = ids.filter(i => isWild(i, x)); if (!W.length) return [];
  if (v.type === 'run') return v.order.map((id, k) => isWild(id, x) ? { id, c: v.c, n: v.start + k } : null).filter(Boolean);
  if (v.type === 'set' && ids.length === 4 && W.length === 1) { const cols = ids.filter(i => !isWild(i, x)).map(i => effT(i, x).c); const miss = [0, 1, 2, 3].find(c => !cols.includes(c)); return [{ id: W[0], c: miss, n: v.n }]; }
  return [];
}
GAMES.okey101 = Object.assign({}, okeyBase, {
  name: '101 Okey', icon: '💯',
  desc: 'Toplamı en az 101 olan perlerle ya da 5 çiftle elini aç, perlere taş işle, okeyi al. Elinde kalan taşlar ceza puanıdır; en düşük puan kazanır.',
  opts: {
    rounds: { label: 'El sayısı', values: [1, 3, 5, 7, 9, 11], def: 5, fmt: v => v + ' el' },
    katla: { label: 'Açış', values: [1, 0], def: 1, fmt: v => v ? 'Katlamalı' : 'Katlamasız' },
    siler: { label: 'Siler (150+ / 7 çift = -101)', values: [1, 0], def: 1, fmt: v => v ? 'Açık' : 'Kapalı' }
  },
  create(o) { const s = { g: 'okey101', n: 4, rounds: o.rounds || 5, katla: o.katla === undefined ? 1 : +o.katla, siler: o.siler === undefined ? 1 : +o.siler, round: 0, scores: [0, 0, 0, 0], dealer: Math.random() * 4 | 0, log: [], over: false }; this.newRound(s); return s; },
  newRound(s) {
    s.round++; this.setupTiles(s, 21); s.summary = null; s.melds = []; s.opened = [null, null, null, null]; s.openedAt = [-1, -1, -1, -1];
    s.pen = [0, 0, 0, 0]; s.turnNo = 0; s.mustUse = null; s.laid = false; s.noTake = false; s.best = { seri: 0, cift: 0 }; s.layer = {};
    s.log.unshift(`${s.round}. el başladı`);
  },
  need(s) { return { seri: s.katla ? Math.max(101, s.best.seri + 1) : 101, cift: s.katla ? Math.max(5, s.best.cift + 1) : 5 }; },
  turnSeat(s) { return (s.phase === 'draw' || s.phase === 'discard') ? s.turn : -1; },
  canAdd(s, tileId) { return s.melds.findIndex(m => m.type !== 'pair' && validGroup(m.ids.concat([tileId]), s.x)); },
  canSwap(s, tileId) {
    if (isWild(tileId, s.x)) return null; const e = effT(tileId, s.x);
    for (let i = 0; i < s.melds.length; i++) { const m = s.melds[i]; if (m.type === 'pair') continue;
      const sl = wildSlots(m.ids, s.x).find(w => w.c === e.c && w.n === e.n); if (sl) return { meld: i, wild: sl.id }; }
    return null;
  },
  act(s, seat, a) {
    if (seat !== s.turn) return 'Sıra sende değil';
    const h = s.hands[seat], x = s.x;
    if (s.phase === 'draw') {
      if (a.type !== 'draw') return 'Önce taş çek';
      if (a.from === 'left') {
        if (s.noTake) return 'Bu tur yandan alamazsın';
        const d = s.discards[this.prev(seat)]; if (d.length && isWild(d[d.length - 1], x)) return 'Yere atılan okey alınamaz';
      }
      const r = this.drawCommon(s, seat, a); if (r === 'TOOK') { s.mustUse = s.drawn; return null; } return r;
    }
    if (s.phase !== 'discard') return 'Bekle';
    const has = ids => ids.every(i => h.includes(i)) && new Set(ids).size === ids.length;
    if (a.type === 'giveBack') {
      if (s.mustUse === null || !h.includes(s.mustUse)) return 'Geri veremezsin';
      if (s.laid) { s.pen[seat] += 101; s.log.unshift(`{${seat}} yandan aldığı taşı kullanamadı: +101 ceza`); }
      h.splice(h.indexOf(s.mustUse), 1); s.discards[this.prev(seat)].push(s.mustUse); s.mustUse = null; s.phase = 'draw'; s.noTake = true; return null;
    }
    if (a.type === 'open' || a.type === 'lay') {
      const groups = (a.groups || []).filter(g => g && g.length); if (!groups.length) return 'Per seç';
      const all = groups.flat(); if (!has(all)) return 'Taşlar elinde yok';
      if (h.length - all.length < 1) return 'Atacak en az bir taş kalmalı';
      const isPairs = a.type === 'open' ? a.kind === 'cift' : s.opened[seat] === 'cift';
      const nd = this.need(s);
      if (a.type === 'lay' && !s.opened[seat]) return 'Önce elini açmalısın';
      if (a.type === 'open' && s.opened[seat]) return 'Zaten açtın';
      let tot = 0;
      if (isPairs) {
        if (!groups.every(g => validPair(g, x))) return 'Geçersiz çift var (aynı renk aynı sayı, ya da okeyle)';
        if (a.type === 'open' && groups.length < nd.cift) return `Çift açmak için en az ${nd.cift} çift gerekir`;
        tot = groups.length;
      } else {
        const v = groups.map(g => validGroup(g, x)); if (v.some(q => !q)) return 'Geçersiz per var (seri: aynı renk ardışık, ya da aynı sayı farklı renk; en az 3 taş)';
        tot = sum(v.map(q => q.value));
        if (a.type === 'open' && tot < nd.seri) return `Perlerin toplamı ${tot}, en az ${nd.seri} olmalı`;
        groups.forEach((g, k) => g.splice(0, g.length, ...v[k].order));
      }
      if (a.type === 'open') {
        s.opened[seat] = isPairs ? 'cift' : 'seri'; s.openedAt[seat] = s.turnNo;
        if (isPairs) s.best.cift = Math.max(s.best.cift, tot); else s.best.seri = Math.max(s.best.seri, tot);
        s.log.unshift(`{${seat}} elini açtı (${isPairs ? tot + ' çift' : tot})`);
        if (s.siler && (isPairs ? tot >= 7 : tot >= 150)) { s.pen[seat] -= 101; s.log.unshift(`{${seat}} SİLER! -101`); }
      }
      for (const g of groups) { for (const i of g) { h.splice(h.indexOf(i), 1); s.layer[i] = seat; } s.melds.push({ owner: seat, ids: g.slice(), type: isPairs ? 'pair' : (validGroup(g, x).type) }); }
      if (s.mustUse !== null && !h.includes(s.mustUse)) s.mustUse = null;
      s.laid = true; s.ev = { type: 'lay', seat, k: Math.random() };
      return null;
    }
    if (a.type === 'add') {
      if (!s.opened[seat]) return 'İşlemek için önce elini açmalısın';
      if (!h.includes(a.tile)) return 'Taş elinde yok';
      const m = s.melds[a.meld]; if (!m || m.type === 'pair') return 'Bu pere işlenmez';
      // okey alma: perdeki okeyin yerine geçtiği gerçek taş
      if (!isWild(a.tile, x)) { const e = effT(a.tile, x); const sl = wildSlots(m.ids, x).find(w => w.c === e.c && w.n === e.n);
        if (sl) { const ids = m.ids.map(i => i === sl.id ? a.tile : i); const v = validGroup(ids, x); if (v) {
          m.ids = v.order; h.splice(h.indexOf(a.tile), 1); h.push(sl.id); s.layer[a.tile] = seat;
          const lw = s.layer[sl.id]; if (lw !== undefined && lw !== seat) { s.pen[lw] += 101; s.log.unshift(`{${seat}} okeyi aldı! {${lw}} +101 ceza`); } else s.log.unshift(`{${seat}} okeyi geri aldı`);
          if (s.mustUse === a.tile) s.mustUse = null; s.laid = true; s.ev = { type: 'lay', seat, k: Math.random() }; return null; } } }
      if (h.length <= 1) return 'Atacak en az bir taş kalmalı';
      const v = validGroup(m.ids.concat([a.tile]), x); if (!v) return 'Bu taş bu pere uymuyor';
      m.ids = v.order; h.splice(h.indexOf(a.tile), 1); s.layer[a.tile] = seat; s.laid = true;
      if (s.mustUse === a.tile) s.mustUse = null; s.ev = { type: 'lay', seat, k: Math.random() }; return null;
    }
    if (a.type === 'discard') {
      if (!h.includes(a.tile)) return 'Taş elinde yok';
      if (s.mustUse !== null) return 'Yandan aldığın taşı bu turda kullanmalısın (ya da geri ver)';
      if (!h.filter(t => t !== a.tile).length && !s.opened[seat]) return 'Açmadan bitiremezsin';
      h.splice(h.indexOf(a.tile), 1); s.discards[seat].push(a.tile);
      s.ev = { type: 'discard', seat, tile: a.tile, k: Math.random() };
      if (!h.length) return this.finishRound(s, seat, a.tile);
      if (isWild(a.tile, x)) { s.pen[seat] += 101; s.log.unshift(`{${seat}} okey attı: +101 ceza`); }
      else if (s.melds.length && this.canAdd(s, a.tile) >= 0) { s.pen[seat] += 101; s.log.unshift(`{${seat}} işlek taş attı: +101 ceza`); }
      s.laid = false; s.noTake = false; s.mustUse = null; s.turnNo++;
      if (!s.pile.length) { s.log.unshift('Ortada taş bitti, el kimse bitirmeden kapandı'); return this.finishRound(s, -1); }
      s.turn = (s.turn + 1) % 4; s.phase = 'draw'; return null;
    }
    return 'Geçersiz hamle';
  },
  finishRound(s, w, lastTile) {
    const x = s.x; const notes = []; let pts;
    const handVal = i => sum(s.hands[i].map(t => isWild(t, x) ? 101 : effT(t, x).n));
    if (w < 0) {
      // deste bitti: kimse açmadıysa yazılmaz; açan varsa açmayan 202, açan eldeki taşlar
      const anyOpen = s.opened.some(Boolean);
      pts = [0, 1, 2, 3].map(i => (anyOpen ? (!s.opened[i] ? 202 : handVal(i) * (s.opened[i] === 'cift' ? 2 : 1)) : 0) + s.pen[i]);
      if (!anyOpen) notes.push('kimse açmadı, yazılmadı');
    } else {
      const okeyFin = isWild(lastTile, x), elden = s.openedAt[w] === s.turnNo && s.opened.every((o, i) => i === w || !o);
      if (okeyFin) notes.push('okeyle bitti'); if (s.opened[w] === 'cift') notes.push('çiftten bitti'); if (elden) notes.push('ELDEN bitti');
      if (elden) pts = [0, 1, 2, 3].map(i => (i === w ? (okeyFin ? -404 : -202) : (okeyFin ? 808 : 404)) + s.pen[i]);
      else {
        const mult = (okeyFin ? 2 : 1) * (s.opened[w] === 'cift' ? 2 : 1);
        pts = [0, 1, 2, 3].map(i => {
          if (i === w) return -101 * mult + s.pen[i];
          if (!s.opened[i]) return 202 * (mult > 1 ? 2 : 1) + s.pen[i];
          return handVal(i) * mult * (s.opened[i] === 'cift' ? 2 : 1) + s.pen[i];
        });
      }
      s.log.unshift(`{${w}} ELİ BİTİRDİ!${notes.length ? ' (' + notes.join(', ') + ')' : ''}`);
    }
    pts.forEach((p, i) => s.scores[i] += p);
    s.revealHands = s.hands.map(h => h.slice());
    s.summary = { title: `${s.round}. El Sonucu`, lowWins: true, rows: pts.map((p, i) => ({ seat: i, cells: [i === w ? 'BİTİRDİ' + (notes.length ? ' · ' + notes.join(', ') : '') : (s.opened[i] ? (s.opened[i] === 'cift' ? 'Çift açtı' : 'Açtı') + ` · ${s.hands[i].length} taş` : 'Açamadı'), s.pen[i] ? 'Ceza/ödül ' + s.pen[i] : '', (p > 0 ? '+' : '') + p], total: s.scores[i] })) };
    if (w < 0 && notes.length) s.summary.title += ' · ' + notes[0];
    if (s.round >= s.rounds) { s.phase = 'over'; s.over = true; s.winner = s.scores.indexOf(Math.min(...s.scores)); s.summary.title = 'Oyun Bitti'; }
    else s.phase = 'roundEnd';
    s.ev = { type: 'finish', seat: w, k: Math.random() };
    return null;
  },
  auto(s) { return s.phase === 'roundEnd' ? 9000 : null; },
  advance(s) { if (s.phase === 'roundEnd') this.newRound(s); },
  view(s, seat) {
    return { g: 'okey101', n: 4, phase: s.phase, turn: s.turn, round: s.round, rounds: s.rounds, scores: s.scores, log: s.log.slice(0, 6),
      hand: (s.hands[seat] || []).slice(), counts: s.hands.map(h => h.length), pile: s.pile.length, indicator: s.indicator, x: s.x,
      discards: s.discards.map(d => d.slice(-3)), dcount: s.discards.map(d => d.length), melds: s.melds, opened: s.opened, pen: s.pen, need: this.need(s), katla: s.katla,
      mustUse: seat === s.turn ? s.mustUse : null, laid: s.laid, noTake: s.noTake, canAddNow: !!s.opened[seat],
      ev: s.ev, summary: s.summary, over: s.over, winner: s.winner, reveal: (s.phase === 'roundEnd' || s.phase === 'over') ? s.revealHands : null };
  },
  bot(s, seat) {
    const h = s.hands[seat], x = s.x, me = s.opened[seat], nd = this.need(s);
    if (s.phase === 'draw') {
      const d = s.discards[this.prev(seat)], top = d[d.length - 1];
      if (top !== undefined && !s.noTake && !isWild(top, x)) {
        const withT = h.concat([top]);
        if (me && (this.canAdd(s, top) >= 0 || this.canSwap(s, top))) return { type: 'draw', from: 'left' };
        if (me === 'seri') { const g = solveGroups(withT, x, 'count'); if (g.groups.some(gr => gr.includes(top)) && g.groups.flat().length < withT.length) return { type: 'draw', from: 'left' }; }
        if (!me) { const g = solveGroups(withT, x, 'value'); if (g.score >= nd.seri && g.groups.some(gr => gr.includes(top)) && g.groups.flat().length < withT.length) return { type: 'draw', from: 'left' }; }
      }
      return { type: 'draw', from: 'pile' };
    }
    if (s.mustUse !== null && !s.laid) {
      const u = s.mustUse, canUse = me ? (this.canAdd(s, u) >= 0 || this.canSwap(s, u) || (me === 'seri' ? solveGroups(h, x, 'count').groups.some(g => g.includes(u)) : solvePairs(h, x).pairs.some(p => p.includes(u))))
        : (solveGroups(h, x, 'value').score >= nd.seri && solveGroups(h, x, 'value').groups.some(g => g.includes(u)));
      if (!canUse) return { type: 'giveBack' };
      if (me && this.canAdd(s, u) >= 0) return { type: 'add', tile: u, meld: this.canAdd(s, u) };
    }
    if (!me) {
      const g = solveGroups(h, x, 'value');
      if (g.score >= nd.seri) {
        let groups = g.groups.map(a => a.slice());
        while (groups.flat().length >= h.length && groups.length) { groups.sort((a, b) => validGroup(a, x).value - validGroup(b, x).value); if (sum(groups.slice(1).map(q => validGroup(q, x).value)) >= nd.seri) groups.shift(); else break; }
        if (groups.length && groups.flat().length < h.length && sum(groups.map(q => validGroup(q, x).value)) >= nd.seri && (s.mustUse === null || groups.flat().includes(s.mustUse))) return { type: 'open', kind: 'seri', groups };
      }
      const p = solvePairs(h, x); const k = Math.min(p.pairs.length, Math.floor((h.length - 1) / 2));
      if (k >= nd.cift && g.score < nd.seri && (s.mustUse === null || p.pairs.slice(0, k).flat().includes(s.mustUse))) return { type: 'open', kind: 'cift', groups: p.pairs.slice(0, k) };
    } else {
      for (const t of h) { const sw = this.canSwap(s, t); if (sw) return { type: 'add', tile: t, meld: sw.meld }; }
      if (me === 'seri') { const g = solveGroups(h, x, 'count'); let gs = g.groups.filter(q => q.length); if (s.mustUse !== null) gs.sort((p, q) => q.includes(s.mustUse) - p.includes(s.mustUse)); while (gs.flat().length >= h.length && gs.length) gs.pop(); if (gs.length) return { type: 'lay', groups: gs }; }
      if (me === 'cift') { const p = solvePairs(h, x); const k = Math.min(p.pairs.length, Math.floor((h.length - 1) / 2)); if (k > 0) return { type: 'lay', groups: p.pairs.slice(0, k) }; }
      if (h.length > 1) for (const t of h) { if (isWild(t, x)) continue; const m = this.canAdd(s, t); if (m >= 0) return { type: 'add', tile: t, meld: m }; }
    }
    if (s.mustUse !== null) return { type: 'giveBack' };
    const dis = this.botDiscard(s, seat, t => s.melds.length && this.canAdd(s, t) >= 0);
    return { type: 'discard', tile: dis };
  }
});
