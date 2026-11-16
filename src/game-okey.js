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
  desc: '14 taşını per (seri veya aynı sayı farklı renk) ya da 7 çift yap, 15. taşı atarak bitir. Göstergenin bir üstü okeydir.',
  opts: { rounds: { label: 'El sayısı', values: [3, 5, 7, 9], def: 5, fmt: v => v + ' el' } },
  create(o) { const s = { g: 'okey', n: 4, rounds: o.rounds || 5, round: 0, scores: [0, 0, 0, 0], dealer: Math.random() * 4 | 0, log: [], over: false }; this.newRound(s); return s; },
  newRound(s) { s.round++; this.setupTiles(s, 14); s.summary = null; s.log.unshift(`${s.round}. el başladı`); },
  turnSeat(s) { return (s.phase === 'draw' || s.phase === 'discard') ? s.turn : -1; },
  act(s, seat, a) {
    if (seat !== s.turn) return 'Sıra sende değil';
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
        s.scores[seat] += pts; s.winGroups = asGroups ? g.groups : p.pairs; s.winner = seat;
        s.log.unshift(`{${seat}} ELİ BİTİRDİ${notes.length ? ' (' + notes.join(', ') + ')' : ''} +${pts}`);
        s.ev = { type: 'finish', seat, k: Math.random() };
        return this.endRound(s, seat, pts, notes);
      }
      h.splice(h.indexOf(a.tile), 1); s.discards[seat].push(a.tile); s.ev = { type: 'discard', seat, tile: a.tile, k: Math.random() };
      if (!s.pile.length) { s.log.unshift('Ortada taş bitti, el berabere'); return this.endRound(s, -1, 0, []); }
      s.turn = (s.turn + 1) % 4; s.phase = 'draw'; return null;
    }
    return 'Taş at';
  },
  endRound(s, w, pts, notes) {
    s.revealHands = s.hands.map(h => h.slice());
    s.summary = { title: `${s.round}. El Sonucu`, rows: [0, 1, 2, 3].map(i => ({ seat: i, cells: [i === w ? 'BİTİRDİ' + (notes.length ? ' · ' + notes.join(', ') : '') : '', i === w ? '+' + pts : '0'], total: s.scores[i] })) };
    if (s.round >= s.rounds) { s.phase = 'over'; s.over = true; s.winner = s.scores.indexOf(Math.max(...s.scores)); s.summary.title = 'Oyun Bitti'; }
    else s.phase = 'roundEnd';
    return null;
  },
  auto(s) { return s.phase === 'roundEnd' ? 8000 : null; },
  advance(s) { if (s.phase === 'roundEnd') this.newRound(s); },
  view(s, seat) {
    return { g: 'okey', n: 4, phase: s.phase, turn: s.turn, round: s.round, rounds: s.rounds, scores: s.scores, log: s.log.slice(0, 6),
      hand: (s.hands[seat] || []).slice(), counts: s.hands.map(h => h.length), pile: s.pile.length, indicator: s.indicator, x: s.x,
      discards: s.discards.map(d => d.slice(-3)), dcount: s.discards.map(d => d.length), ev: s.ev, summary: s.summary, over: s.over, winner: s.winner,
      reveal: (s.phase === 'roundEnd' || s.phase === 'over') ? s.revealHands : null };
  },
  bot(s, seat) {
    const h = s.hands[seat], x = s.x;
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

/* ===================== 101 OKEY ===================== */
GAMES.okey101 = Object.assign({}, okeyBase, {
  name: '101 Okey', icon: '💯',
  desc: 'Toplamı en az 101 olan perlerle ya da 5 çiftle elini aç, sonra perlere taş işle. Elinde kalan taşlar ceza puanıdır; en düşük puan kazanır.',
  opts: { rounds: { label: 'El sayısı', values: [1, 3, 5, 7, 9], def: 3, fmt: v => v + ' el' } },
  create(o) { const s = { g: 'okey101', n: 4, rounds: o.rounds || 3, round: 0, scores: [0, 0, 0, 0], dealer: Math.random() * 4 | 0, log: [], over: false }; this.newRound(s); return s; },
  newRound(s) {
    s.round++; this.setupTiles(s, 21); s.summary = null; s.melds = []; s.opened = [null, null, null, null]; s.openedAt = [-1, -1, -1, -1];
    s.pen = [0, 0, 0, 0]; s.turnNo = 0; s.mustUse = null; s.laid = false; s.noTake = false; s.log.unshift(`${s.round}. el başladı`);
  },
  turnSeat(s) { return (s.phase === 'draw' || s.phase === 'discard') ? s.turn : -1; },
  canAdd(s, tileId) { return s.melds.findIndex(m => m.type !== 'pair' && validGroup(m.ids.concat([tileId]), s.x)); },
  act(s, seat, a) {
    if (seat !== s.turn) return 'Sıra sende değil';
    const h = s.hands[seat], x = s.x;
    if (s.phase === 'draw') {
      if (a.type !== 'draw') return 'Önce taş çek';
      if (a.from === 'left' && s.noTake) return 'Bu tur yandan alamazsın';
      const r = this.drawCommon(s, seat, a); if (r === 'TOOK') { s.mustUse = s.drawn; return null; } return r;
    }
    if (s.phase !== 'discard') return 'Bekle';
    const has = ids => ids.every(i => h.includes(i)) && new Set(ids).size === ids.length;
    if (a.type === 'giveBack') {
      if (s.mustUse === null || !h.includes(s.mustUse)) return 'Geri veremezsin';
      h.splice(h.indexOf(s.mustUse), 1); s.discards[this.prev(seat)].push(s.mustUse); s.mustUse = null; s.phase = 'draw'; s.noTake = true; return null;
    }
    if (a.type === 'open' || a.type === 'lay') {
      const groups = (a.groups || []).filter(g => g && g.length); if (!groups.length) return 'Per seç';
      const all = groups.flat(); if (!has(all)) return 'Taşlar elinde yok';
      if (h.length - all.length < 1) return 'Atacak en az bir taş kalmalı';
      const isPairs = a.kind === 'cift' || (a.type === 'lay' && s.opened[seat] === 'cift');
      if (isPairs) {
        if (!groups.every(g => validPair(g, x))) return 'Geçersiz çift var';
        if (a.type === 'open' && groups.length < 5) return 'Çift açmak için en az 5 çift gerekir';
      } else {
        const v = groups.map(g => validGroup(g, x)); if (v.some(q => !q)) return 'Geçersiz per var (seri: aynı renk ardışık, ya da aynı sayı farklı renk; en az 3 taş)';
        const tot = sum(v.map(q => q.value));
        if (a.type === 'open' && tot < 101) return `Perlerin toplamı ${tot}, en az 101 olmalı`;
        groups.forEach((g, k) => g.splice(0, g.length, ...v[k].order));
      }
      if (a.type === 'open') { if (s.opened[seat]) return 'Zaten açtın'; s.opened[seat] = isPairs ? 'cift' : 'seri'; s.openedAt[seat] = s.turnNo; }
      else if (!s.opened[seat]) return 'Önce elini açmalısın';
      for (const g of groups) { for (const i of g) h.splice(h.indexOf(i), 1); s.melds.push({ owner: seat, ids: g.slice(), type: isPairs ? 'pair' : (validGroup(g, x).type) }); }
      if (s.mustUse !== null && !h.includes(s.mustUse)) s.mustUse = null;
      s.laid = true; s.ev = { type: 'lay', seat, k: Math.random() };
      if (a.type === 'open') { const tot = isPairs ? groups.length + ' çift' : sum(groups.map(g => validGroup(g, x).value)); s.log.unshift(`{${seat}} elini açtı (${tot})`); }
      return null;
    }
    if (a.type === 'add') {
      if (!s.opened[seat]) return 'İşlemek için önce elini açmalısın';
      if (s.openedAt[seat] === s.turnNo) return 'Açtığın turda işleyemezsin';
      if (!h.includes(a.tile)) return 'Taş elinde yok';
      if (h.length <= 1) return 'Atacak en az bir taş kalmalı';
      const m = s.melds[a.meld]; if (!m || m.type === 'pair') return 'Bu pere işlenmez';
      const v = validGroup(m.ids.concat([a.tile]), x); if (!v) return 'Bu taş bu pere uymuyor';
      m.ids = v.order; h.splice(h.indexOf(a.tile), 1); s.laid = true;
      if (s.mustUse === a.tile) s.mustUse = null; s.ev = { type: 'lay', seat, k: Math.random() }; return null;
    }
    if (a.type === 'discard') {
      if (!h.includes(a.tile)) return 'Taş elinde yok';
      if (s.mustUse !== null) return 'Yandan aldığın taşı bu turda kullanmalısın (ya da geri ver)';
      h.splice(h.indexOf(a.tile), 1); s.discards[seat].push(a.tile);
      s.ev = { type: 'discard', seat, tile: a.tile, k: Math.random() };
      if (!h.length) return this.finishRound(s, seat, a.tile);
      if (s.melds.length && this.canAdd(s, a.tile) >= 0) { s.pen[seat] += 101; s.log.unshift(`{${seat}} işlek taş attı: +101 ceza`); }
      else if (isWild(a.tile, x)) { s.pen[seat] += 101; s.log.unshift(`{${seat}} okey attı: +101 ceza`); }
      s.laid = false; s.noTake = false; s.mustUse = null; s.turnNo++;
      if (!s.pile.length) { s.log.unshift('Ortada taş bitti'); return this.finishRound(s, -1); }
      s.turn = (s.turn + 1) % 4; s.phase = 'draw'; return null;
    }
    return 'Geçersiz hamle';
  },
  finishRound(s, w, lastTile) {
    const x = s.x; let mult = 1; const notes = [];
    if (w >= 0) {
      if (isWild(lastTile, x)) { mult *= 2; notes.push('okeyle bitti'); }
      if (s.openedAt[w] === s.turnNo) { mult *= 2; notes.push('elden bitti'); }
      if (s.opened[w] === 'cift') { mult *= 2; notes.push('çiftten bitti'); }
      s.log.unshift(`{${w}} ELİ BİTİRDİ!${notes.length ? ' (' + notes.join(', ') + ')' : ''}`);
    }
    const pts = [0, 1, 2, 3].map(i => {
      if (i === w) return -101 * mult;
      let p;
      if (!s.opened[i]) p = 202;
      else p = sum(s.hands[i].map(t => isWild(t, x) ? 101 : effT(t, x).n)) * (s.opened[i] === 'cift' ? 2 : 1);
      return p * (w >= 0 ? mult : 1) + s.pen[i];
    });
    pts.forEach((p, i) => s.scores[i] += p);
    s.revealHands = s.hands.map(h => h.slice());
    s.summary = { title: `${s.round}. El Sonucu`, lowWins: true, rows: pts.map((p, i) => ({ seat: i, cells: [i === w ? 'BİTİRDİ' + (notes.length ? ' · ' + notes.join(', ') : '') : (s.opened[i] ? (s.opened[i] === 'cift' ? 'Çift açtı' : 'Açtı') + ` · ${s.hands[i].length} taş` : 'Açamadı'), s.pen[i] ? 'Ceza ' + s.pen[i] : '', (p > 0 ? '+' : '') + p], total: s.scores[i] })) };
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
      discards: s.discards.map(d => d.slice(-3)), dcount: s.discards.map(d => d.length), melds: s.melds, opened: s.opened, pen: s.pen,
      mustUse: seat === s.turn ? s.mustUse : null, laid: s.laid, noTake: s.noTake, canAddNow: s.opened[seat] && s.openedAt[seat] !== s.turnNo,
      ev: s.ev, summary: s.summary, over: s.over, winner: s.winner, reveal: (s.phase === 'roundEnd' || s.phase === 'over') ? s.revealHands : null };
  },
  bot(s, seat) {
    const h = s.hands[seat], x = s.x, me = s.opened[seat];
    if (s.phase === 'draw') {
      const d = s.discards[this.prev(seat)], top = d[d.length - 1];
      if (top !== undefined && !s.noTake) {
        const withT = h.concat([top]);
        if (me && me !== 'cift' && s.openedAt[seat] !== s.turnNo && this.canAdd(s, top) >= 0) return { type: 'draw', from: 'left' };
        if (me === 'seri') { const g = solveGroups(withT, x, 'count'); if (g.groups.some(gr => gr.includes(top)) && g.groups.flat().length < withT.length) return { type: 'draw', from: 'left' }; }
        if (!me) { const g = solveGroups(withT, x, 'value'); if (g.score >= 101 && g.groups.some(gr => gr.includes(top)) && g.groups.flat().length < withT.length) return { type: 'draw', from: 'left' }; }
      }
      if (!s.pile.length) return { type: 'draw', from: 'left' };
      return { type: 'draw', from: 'pile' };
    }
    // aç
    if (!me) {
      const g = solveGroups(h, x, 'value');
      if (g.score >= 101) {
        // atacak taş bırak
        let groups = g.groups.map(a => a.slice()); while (groups.flat().length >= h.length && groups.length) { groups.sort((a, b) => validGroup(a, x).value - validGroup(b, x).value); if (sum(groups.slice(1).map(q => validGroup(q, x).value)) >= 101) groups.shift(); else { const big = groups[groups.length - 1]; if (big.length > 3) { const tr = big.slice(0, -1); if (validGroup(tr, x)) groups[groups.length - 1] = tr; else break; } else break; } }
        if (groups.length && groups.flat().length < h.length && sum(groups.map(q => validGroup(q, x).value)) >= 101) return { type: 'open', kind: 'seri', groups };
      }
      const p = solvePairs(h, x);
      if (p.pairs.length >= 5 && h.length - p.pairs.length * 2 >= 1 && solveGroups(h, x, 'value').score < 101) return { type: 'open', kind: 'cift', groups: p.pairs.slice(0, Math.min(p.pairs.length, Math.floor((h.length - 1) / 2))) };
    } else {
      if (me === 'seri') { const g = solveGroups(h, x, 'count'); let gs = g.groups.filter(q => q.length); if (gs.length) { while (gs.flat().length >= h.length && gs.length) gs.pop(); if (gs.length) return { type: 'lay', groups: gs }; } }
      if (me === 'cift') { const p = solvePairs(h, x); if (p.pairs.length) { const k = Math.min(p.pairs.length, Math.floor((h.length - 1) / 2)); if (k > 0) return { type: 'lay', groups: p.pairs.slice(0, k) }; } }
      if (s.openedAt[seat] !== s.turnNo && h.length > 1) for (const t of h) { const m = this.canAdd(s, t); if (m >= 0) return { type: 'add', tile: t, meld: m }; }
    }
    if (s.mustUse !== null) return { type: 'giveBack' };
    const dis = this.botDiscard(s, seat, t => s.melds.length && this.canAdd(s, t) >= 0);
    return { type: 'discard', tile: dis };
  }
});
