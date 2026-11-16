/* ===================== UYGULAMA ===================== */
const $ = id => document.getElementById(id);
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const AVATARS = ['😎', '🧔', '👩', '👨‍💼', '👩‍💼', '🧕', '👴', '🦊', '🐯', '🐼', '🤠', '🥸'];
const BOTS = [{ name: 'Cemil Bot', av: '🤖' }, { name: 'Saadet Bot', av: '👾' }, { name: 'Nuri Bot', av: '🦾' }];
const SEATCOL = ['#f7d77d', '#64b5f6', '#ef9a9a', '#a5d6a7'];
const GAME_ORDER = ['okey101', 'okey', 'batak', 'pisti'];
function show(id) { document.querySelectorAll('.screen').forEach(e => e.classList.toggle('on', e.id === id)); }
let toastT; function toast(t, ok) { const e = $('toast'); e.textContent = t; e.style.background = ok ? '#2e7d32' : '#c62828'; e.style.display = 'block'; clearTimeout(toastT); toastT = setTimeout(() => e.style.display = 'none', 2600); }
let bigT; function big(t) { const e = $('big'); e.textContent = t; e.style.display = 'none'; e.offsetWidth; e.style.display = 'block'; clearTimeout(bigT); bigT = setTimeout(() => e.style.display = 'none', 1600); }
function msg(t, b) { $('msgT').textContent = t; $('msgB').innerHTML = b; $('mMsg').classList.add('on'); }
$('msgOk').onclick = () => $('mMsg').classList.remove('on');
const LS = { get(k, d) { try { const v = localStorage.getItem('kiraathane_' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('kiraathane_' + k, JSON.stringify(v)); } catch (e) { } } };

/* ---- ses ---- */
let AC = null, SOUND = LS.get('sound', true);
function snd(kind) {
  if (!SOUND) return; try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)(); const t = AC.currentTime;
    if (kind === 'card' || kind === 'tile') {
      const len = kind === 'card' ? 0.09 : 0.05, b = AC.createBuffer(1, AC.sampleRate * len, AC.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, kind === 'card' ? 2 : 6);
      const s = AC.createBufferSource(); s.buffer = b; const f = AC.createBiquadFilter(); f.type = kind === 'card' ? 'highpass' : 'bandpass'; f.frequency.value = kind === 'card' ? 1800 : 2400;
      const g = AC.createGain(); g.gain.value = kind === 'card' ? .35 : .6; s.connect(f); f.connect(g); g.connect(AC.destination); s.start(t);
    } else {
      const notes = kind === 'win' ? [523, 659, 784, 1046] : kind === 'turn' ? [880] : [660, 880];
      notes.forEach((fq, i) => { const o = AC.createOscillator(), g = AC.createGain(); o.type = 'triangle'; o.frequency.value = fq; g.gain.setValueAtTime(0, t + i * .11); g.gain.linearRampToValueAtTime(.18, t + i * .11 + .02); g.gain.exponentialRampToValueAtTime(.001, t + i * .11 + .35); o.connect(g); g.connect(AC.destination); o.start(t + i * .11); o.stop(t + i * .11 + .4); });
    }
  } catch (e) { }
}
$('bSound').onclick = () => { SOUND = !SOUND; LS.set('sound', SOUND); $('bSound').textContent = SOUND ? '🔊' : '🔇'; };
$('bSound').textContent = SOUND ? '🔊' : '🔇';

/* ---- profil / ana ekran ---- */
const ME = { name: LS.get('name', ''), av: LS.get('av', AVATARS[Math.random() * AVATARS.length | 0]) };
let PICK = LS.get('game', 'okey101'); if (!GAMES[PICK]) PICK = 'okey101';
let OPTS = LS.get('opts', {});
$('myName').value = ME.name;
$('myName').oninput = () => { ME.name = $('myName').value.trim(); LS.set('name', ME.name); };
function renderAvs() { $('avs').innerHTML = AVATARS.map(a => `<span class="${a === ME.av ? 'on' : ''}">${a}</span>`).join(''); [...$('avs').children].forEach((e, i) => e.onclick = () => { ME.av = AVATARS[i]; LS.set('av', ME.av); renderAvs(); }); }
renderAvs();
function renderGames() {
  $('games').innerHTML = GAME_ORDER.map(k => { const g = GAMES[k]; return `<div class="gcard ${k === PICK ? 'sel' : ''}" data-g="${k}"><span class="pc">${g.players.join(' / ')} kişi</span><div class="gi">${g.icon}</div><b>${g.name}</b><p>${g.desc}</p></div>`; }).join('');
  document.querySelectorAll('.gcard').forEach(e => e.onclick = () => { PICK = e.dataset.g; LS.set('game', PICK); renderGames(); });
}
renderGames();
function needName() { if (!ME.name) { ME.name = 'Oyuncu' + (Math.random() * 90 + 10 | 0); $('myName').value = ME.name; LS.set('name', ME.name); } }
function defOpts(g) { const o = {}; const E = GAMES[g]; for (const k in E.opts) o[k] = (OPTS[g] && OPTS[g][k] !== undefined) ? OPTS[g][k] : E.opts[k].def; o.players = (OPTS[g] && OPTS[g].players) || E.players[E.players.length - 1]; return o; }

/* ===================== OTURUM ===================== */
const APP = { mode: null, game: PICK, opts: {}, seats: [], players: [], mySeat: 0, s: null, v: null, H: null, C: null, timer: null, started: false, lastSeen: {}, pingT: null, lastHost: 0 };
const pubPlayers = () => APP.players.map(p => ({ name: p.name, av: p.av, bot: !!p.bot, online: p.bot || p.online !== false }));
const pubSeats = () => APP.seats.map(p => p ? { name: p.name, av: p.av, bot: !!p.bot, host: !!p.host } : null);
function nameOf(i) { const p = APP.players[i]; return p ? p.name : 'Oyuncu ' + (i + 1); }
const fmtLog = t => esc(t).replace(/\{(\d)\}/g, (m, i) => `<b style="color:${SEATCOL[i]}">${esc(nameOf(+i))}</b>`);

$('bSolo').onclick = () => {
  needName(); APP.mode = 'solo'; APP.game = PICK; APP.opts = defOpts(PICK);
  const n = APP.opts.players; APP.players = [{ name: ME.name, av: ME.av, local: true }, ...BOTS.slice(0, n - 1).map(b => ({ ...b, bot: true }))];
  startGame();
};
$('bHost').onclick = async () => {
  needName(); if (!window.RTCPeerConnection || !window.WebSocket) return msg('Tarayıcı desteklemiyor', 'Online oyun için Chrome veya Edge kullan.');
  APP.mode = 'host'; APP.game = PICK; APP.opts = defOpts(PICK); APP.started = false;
  APP.seats = [{ name: ME.name, av: ME.av, host: true, local: true }, null, null, null];
  show('lobby'); $('lobTitle').textContent = 'Oda kodu'; $('lobCode').textContent = '––––'; $('lobSt').textContent = 'Sunucuya bağlanılıyor…'; $('lchatLog').innerHTML = '';
  renderLobby();
  const A = 'ABCDEFGHJKLMNPRSTUVYZ'; let code;
  for (let k = 0; k < 4; k++) {
    code = ''; for (let i = 0; i < 4; i++) code += A[Math.random() * A.length | 0];
    try { APP.H = await netHost(code, { onMsg: hostMsg, onLeave: hostLeave }); break; }
    catch (e) { if (e.code === 'id_taken') continue; $('lobSt').textContent = 'Oda kurulamadı: ' + (e.message || e) + ' · Botlarla oynayabilirsin.'; return; }
  }
  if (APP.mode !== 'host') { APP.H && APP.H.close(); return; }
  $('lobCode').textContent = code; $('lobSt').textContent = 'Arkadaşların “Odaya Katıl” deyip bu kodu yazsın.';
  clearInterval(APP.pingT); APP.pingT = setInterval(hostPing, 4000);
};
$('joinCode').addEventListener('keydown', e => { if (e.key === 'Enter') $('bJoin').click(); });
$('bJoin').onclick = async () => {
  needName(); const code = $('joinCode').value.trim().toUpperCase(); if (!/^[A-Z]{4}$/.test(code)) return toast('4 harfli oda kodunu yaz');
  if (!window.RTCPeerConnection) return msg('Tarayıcı desteklemiyor', 'Chrome veya Edge kullan.');
  APP.mode = 'guest'; APP.started = false; APP.seats = []; show('lobby'); $('lobTitle').textContent = 'Katılınan oda'; $('lobCode').textContent = code; $('lobSt').textContent = 'Ev sahibine bağlanılıyor… (10-20 sn sürebilir)'; $('lchatLog').innerHTML = ''; renderLobby();
  try {
    APP.C = await netJoin(code, { onMsg: guestMsg, onClose: () => { if (APP.mode === 'guest') { backHome(); msg('Bağlantı koptu', 'Ev sahibiyle bağlantı kesildi.'); } } });
    if (APP.mode !== 'guest') { APP.C.close(); return; }
    APP.C.send({ t: 'hello', name: ME.name, av: ME.av }); APP.lastHost = Date.now();
    $('lobSt').textContent = 'Bağlandın! Ev sahibinin oyunu başlatması bekleniyor.';
    clearInterval(APP.pingT); APP.pingT = setInterval(() => { APP.C && APP.C.send({ t: 'ping' }); if (Date.now() - APP.lastHost > 25000 && APP.mode === 'guest') { backHome(); msg('Bağlantı koptu', 'Ev sahibinden 25 saniyedir haber yok.'); } }, 4000);
  } catch (e) { if (APP.mode === 'guest') { backHome(); msg('Katılamadın', esc(e.message || e)); } }
};
function backHome() {
  clearTimeout(APP.timer); clearInterval(APP.pingT);
  if (APP.mode === 'host' && APP.H) { for (const p of APP.H.links.keys()) APP.H.send(p, { t: 'closed' }); setTimeout(() => APP.H && APP.H.close(), 300); }
  if (APP.mode === 'guest' && APP.C) { APP.C.send({ t: 'bye' }); const C = APP.C; setTimeout(() => C.close(), 200); }
  const H = APP.H; APP.mode = null; APP.H = null; APP.C = null; APP.s = null; APP.v = null; APP.started = false; if (H) setTimeout(() => H.close(), 400);
  $('mSum').classList.remove('on'); show('home'); clearScene();
}
$('bLeave').onclick = backHome;
$('bExit').onclick = () => { if (APP.mode === 'solo' || confirm('Masadan çıkmak istiyor musun?')) backHome(); };

/* ---- lobi ---- */
function renderLobby() {
  const host = APP.mode === 'host', seats = APP.seats, E = GAMES[APP.game];
  $('seats').innerHTML = [0, 1, 2, 3].map(i => { const p = seats[i];
    if (!p) return `<div class="seat"><div class="av">🪑</div><div class="nm">Boş</div><div class="tag">bot oturur</div></div>`;
    return `<div class="seat full"><div class="av">${p.av}</div><div class="nm">${esc(p.name)}</div><div class="tag">${p.host ? 'Ev sahibi' : p.bot ? 'Bot' : 'Oyuncu'}</div>${host && i > 0 ? `<span class="x" data-i="${i}">✕</span>` : ''}</div>`; }).join('');
  document.querySelectorAll('.seat .x').forEach(e => e.onclick = () => { const i = +e.dataset.i; const p = APP.seats[i]; if (p && p.peer) { APP.H.send(p.peer, { t: 'kicked' }); setTimeout(() => APP.H.kick(p.peer), 200); } APP.seats[i] = null; renderLobby(); hostLobbyBroadcast(); });
  $('lobGame').innerHTML = host ? GAME_ORDER.map(k => `<button class="sm ${k === APP.game ? '' : 'ghost'}" data-g="${k}">${GAMES[k].icon} ${GAMES[k].name}</button>`).join('') : `<b>Oyun:</b>&nbsp;${E.icon} ${E.name}`;
  if (host) document.querySelectorAll('#lobGame button').forEach(b => b.onclick = () => { APP.game = b.dataset.g; PICK = APP.game; LS.set('game', PICK); APP.opts = defOpts(APP.game); renderLobby(); hostLobbyBroadcast(); });
  let oh = '';
  if (E.players.length > 1) oh += optSel('players', 'Oyuncu', E.players, v => v + ' kişi');
  for (const k in E.opts) oh += optSel(k, E.opts[k].label, E.opts[k].values, E.opts[k].fmt);
  $('lobOpts').innerHTML = oh;
  document.querySelectorAll('#lobOpts select').forEach(s => s.onchange = () => { APP.opts[s.dataset.k] = +s.value; OPTS[APP.game] = Object.assign({}, APP.opts); LS.set('opts', OPTS); hostLobbyBroadcast(); });
  $('bStart').style.display = host ? '' : 'none';
}
function optSel(k, label, vals, fmt) { const host = APP.mode === 'host'; const cur = APP.opts[k];
  if (!host) return `<span>${label}: <b>${fmt(cur)}</b></span>`;
  return `<label>${label} <select data-k="${k}">${vals.map(v => `<option value="${v}" ${v === cur ? 'selected' : ''}>${fmt(v)}</option>`).join('')}</select></label>`; }
function hostLobbyBroadcast() {
  if (APP.mode !== 'host' || !APP.H) return;
  APP.seats.forEach((p, i) => { if (p && p.peer) APP.H.send(p.peer, { t: 'lobby', seats: pubSeats(), game: APP.game, opts: APP.opts, started: APP.started }); });
}
$('bStart').onclick = () => {
  const E = GAMES[APP.game]; const n = APP.opts.players && E.players.includes(APP.opts.players) ? APP.opts.players : E.players[E.players.length - 1];
  const humans = APP.seats.filter(p => p && !p.bot);
  if (humans.length > n) return toast(`${E.name} en fazla ${n} kişi`);
  const list = humans.map(p => ({ name: p.name, av: p.av, peer: p.peer, local: p.local, online: true }));
  let b = 0; while (list.length < n) list.push({ ...BOTS[b++ % 3], bot: true });
  APP.players = list; APP.opts.players = n; startGame();
};

/* ---- ev sahibi mesajları ---- */
function hostMsg(peer, m) {
  APP.lastSeen[peer] = Date.now();
  if (m.t === 'ping') return;
  if (m.t === 'hello') {
    const name = String(m.name || 'Misafir').slice(0, 14), av = AVATARS.includes(m.av) ? m.av : '😎';
    if (APP.started) {
      let i = APP.players.findIndex(p => !p.bot && p.name === name && p.online === false);
      if (i < 0) i = APP.players.findIndex(p => p.bot);
      if (i < 0) { APP.H.send(peer, { t: 'full' }); return; }
      APP.players[i] = { name, av, peer, online: true }; sysChat(`${name} masaya oturdu`); hostChanged(); return;
    }
    let i = APP.seats.findIndex(p => p && p.peer === peer); if (i < 0) i = APP.seats.findIndex(p => !p);
    if (i < 0) { APP.H.send(peer, { t: 'full' }); return; }
    APP.seats[i] = { name, av, peer }; renderLobby(); hostLobbyBroadcast(); sysChat(`${name} odaya katıldı`); snd('ding'); return;
  }
  if (m.t === 'bye') { APP.H.kick(peer); return; }
  if (m.t === 'chat') { const p = APP.players.find(x => x.peer === peer) || APP.seats.find(x => x && x.peer === peer); if (p) chatAll(p.name, String(m.text || '').slice(0, 120)); return; }
  if (m.t === 'act' && APP.started) {
    const i = APP.players.findIndex(p => p.peer === peer); if (i < 0) return;
    const err = GAMES[APP.game].act(APP.s, i, m.a || {}); if (err) APP.H.send(peer, { t: 'err', msg: err }); else hostChanged();
  }
}
function hostLeave(peer) {
  delete APP.lastSeen[peer];
  const si = APP.seats.findIndex(p => p && p.peer === peer);
  if (si >= 0) { sysChat(`${APP.seats[si].name} ayrıldı`); APP.seats[si] = null; if (!APP.started) { renderLobby(); hostLobbyBroadcast(); } }
  const pi = APP.players.findIndex(p => p.peer === peer);
  if (pi >= 0 && APP.started) { APP.players[pi].online = false; APP.players[pi].peer = null; sysChat(`${APP.players[pi].name} bağlantısı koptu, yerine bot oynuyor`); hostChanged(); }
}
function hostPing() {
  if (!APP.H) return; const now = Date.now();
  for (const peer of [...APP.H.links.keys()]) { if (APP.lastSeen[peer] === undefined) APP.lastSeen[peer] = now; if (now - APP.lastSeen[peer] > 22000) { APP.H.kick(peer); continue; } APP.H.send(peer, { t: 'ping' }); }
}
/* ---- misafir mesajları ---- */
function guestMsg(m) {
  APP.lastHost = Date.now();
  if (m.t === 'ping') return;
  if (m.t === 'lobby') { APP.seats = m.seats; APP.game = m.game; APP.opts = m.opts; if (!APP.started) { show('lobby'); renderLobby(); } return; }
  if (m.t === 'view') {
    APP.game = m.game; APP.players = m.players; APP.mySeat = m.you; APP.opts = m.opts || APP.opts;
    if (!APP.started) { APP.started = true; enterTable(); }
    if ($('lobby').classList.contains('on')) enterTable();
    renderView(m.v); return;
  }
  if (m.t === 'err') { toast(m.msg); return; }
  if (m.t === 'chat') { addChat(m.name, m.text); return; }
  if (m.t === 'toLobby') { APP.started = false; $('mSum').classList.remove('on'); clearScene(); show('lobby'); renderLobby(); return; }
  if (m.t === 'full') { backHome(); msg('Oda dolu', 'Bu odada boş yer yok.'); return; }
  if (m.t === 'kicked') { backHome(); msg('Odadan çıkarıldın', 'Ev sahibi seni odadan çıkardı.'); return; }
  if (m.t === 'closed') { backHome(); msg('Oda kapandı', 'Ev sahibi odayı kapattı.'); return; }
}
function sendAct(a) {
  if (APP.mode === 'guest') { APP.C && APP.C.send({ t: 'act', a }); return; }
  const err = GAMES[APP.game].act(APP.s, APP.mySeat, a); if (err) toast(err); else hostChanged();
}

/* ---- oyun döngüsü (ev sahibi / tek kişi) ---- */
function startGame() {
  const E = GAMES[APP.game]; APP.mySeat = 0; APP.started = true;
  APP.s = E.create(APP.opts, APP.players.length);
  enterTable(); hostChanged();
}
function enterTable() { $('mSum').classList.remove('on'); clearScene(); RACK.slots = Array(32).fill(null); RACK.sel = null; show('table'); fitBoard(); }
function hostChanged() {
  const E = GAMES[APP.game], s = APP.s; if (!s) return;
  if (APP.mode === 'host' && APP.H) APP.players.forEach((p, i) => { if (p.peer && p.online !== false) APP.H.send(p.peer, { t: 'view', v: E.view(s, i), players: pubPlayers(), you: i, game: APP.game, opts: APP.opts }); });
  renderView(E.view(s, APP.mySeat));
  clearTimeout(APP.timer);
  const d = E.auto(s);
  if (d != null) { APP.timer = setTimeout(() => { if (APP.s !== s) return; E.advance(s); hostChanged(); }, d); return; }
  if (s.over) return;
  const t = E.turnSeat(s); if (t < 0) return;
  const p = APP.players[t];
  if (p.bot || p.online === false) APP.timer = setTimeout(() => { if (APP.s !== s) return; botMove(E, s, t); hostChanged(); }, (p.bot ? (E.kind === 'tiles' ? 900 : 800) : 1500) + Math.random() * 500);
}
function botMove(E, s, t) {
  let a; try { a = E.bot(s, t); } catch (e) { console.error(e); }
  if (a && !E.act(s, t, a)) return;
  // yedek hamleler
  const h = s.hands[t] || [];
  const tries = [];
  if (E.kind === 'cards') { if (s.phase === 'bid') tries.push({ type: 'bid', bid: 'pass' }); if (s.phase === 'trump') tries.push({ type: 'trump', suit: 0 }); const L = E.legal ? E.legal(s, t) : h; L.forEach(c => tries.push({ type: 'play', card: c })); }
  else { if (s.phase === 'draw') tries.push({ type: 'draw', from: 'pile' }, { type: 'draw', from: 'left' }); tries.push({ type: 'giveBack' }); h.forEach(x => tries.push({ type: 'discard', tile: x })); }
  for (const b of tries) if (!E.act(s, t, b)) return;
}
function restartGame() { if (APP.mode === 'guest') return; APP.players.forEach(p => { if (!p.bot && p.online === false) Object.assign(p, BOTS[0], { bot: true }); }); startGame(); }
function toLobby() {
  if (APP.mode === 'solo') return backHome();
  APP.started = false; clearTimeout(APP.timer); APP.s = null; $('mSum').classList.remove('on'); clearScene();
  APP.seats = [APP.seats[0], ...APP.players.filter(p => p.peer && p.online !== false).map(p => ({ name: p.name, av: p.av, peer: p.peer }))];
  while (APP.seats.length < 4) APP.seats.push(null);
  for (const p of APP.players) if (p.peer && p.online !== false) APP.H.send(p.peer, { t: 'toLobby' });
  show('lobby'); renderLobby(); hostLobbyBroadcast();
}

/* ---- sohbet ---- */
const EMOS = ['👍', '😂', '😡', '😱', '🔥', '👏', '🤔', '😴', '☕', '🍀'];
$('emos').innerHTML = EMOS.map(e => `<span>${e}</span>`).join('');
[...$('emos').children].forEach(e => e.onclick = () => sendChat(e.textContent));
$('bChat').onclick = () => $('chat').classList.toggle('on');
$('chatSend').onclick = () => { sendChat($('chatIn').value); $('chatIn').value = ''; };
$('chatIn').addEventListener('keydown', e => { if (e.key === 'Enter') $('chatSend').click(); });
$('lchatSend').onclick = () => { sendChat($('lchatIn').value); $('lchatIn').value = ''; };
$('lchatIn').addEventListener('keydown', e => { if (e.key === 'Enter') $('lchatSend').click(); });
function sendChat(t) { t = String(t || '').trim(); if (!t) return; if (APP.mode === 'guest') APP.C && APP.C.send({ t: 'chat', text: t }); else chatAll(ME.name, t); }
function chatAll(name, text) {
  addChat(name, text);
  if (APP.mode === 'host' && APP.H) for (const peer of APP.H.links.keys()) APP.H.send(peer, { t: 'chat', name, text });
}
function sysChat(t) { chatAll('', t); }
function addChat(name, text) {
  const line = name ? `<div><b>${esc(name)}:</b> ${esc(text)}</div>` : `<div class="muted">${esc(text)}</div>`;
  for (const id of ['chatLog', 'lchatLog']) { const el = $(id); el.insertAdjacentHTML('beforeend', line); while (el.children.length > 60) el.firstChild.remove(); el.scrollTop = 1e9; }
  if (name) { const i = APP.players.findIndex(p => p.name === name); if (i >= 0) BUBBLE[i] = { text, until: Date.now() + 4500 }; if (APP.v) renderPlates(APP.v); setTimeout(() => APP.v && renderPlates(APP.v), 4600); if (name !== ME.name) snd('turn'); }
}
const BUBBLE = {};
