// Bolao Copa 2026 - v2.0
import { firebaseConfig, ADMIN_UID } from './firebase-config.js';
import { JOGOS_GRUPOS, GRUPOS, CODIGOS_PAIS, PONTUACAO, CUSTO_PALPITE, DISTRIBUICAO_PREMIO, CHAVEAMENTO_R32 } from './data.js?v=5';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, signInWithPopup, signOut, GoogleAuthProvider, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, doc, setDoc, getDoc, getDocs, collection, onSnapshot, serverTimestamp, updateDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const fbApp   = initializeApp(firebaseConfig);
const auth    = getAuth(fbApp);
const db      = getFirestore(fbApp);
const provider = new GoogleAuthProvider();

// ESTADO
let currentUser     = null;
let isAdmin         = false;
let currentPage     = 'palpites';
let currentFase     = 'grupos';
let currentGrupo    = 'A';
let currentRankFase = 'geral';
let configSite      = { pixKey: '', pixNome: '', pixCidade: '' };
let jogosKnockout   = {};
let resultados      = {};
let palpitesUsuario = {};
let unsubListeners  = [];

// UTILS
function fmtBRL(v) { return 'R$ ' + Number(v).toFixed(2).replace('.', ','); }

function parseBrasilia(iso) {
  var match = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) return { diaSemana: '', diaMes: '', hora: '00:00' };
  var ano = +match[1], mes = +match[2], dia = +match[3], h = match[4], m = match[5];
  var dias = ['Dom','Seg','Ter','Qua','Qui','Sex','Sab'];
  var d = new Date(Date.UTC(ano, mes - 1, dia, +h + 3, +m));
  return { diaSemana: dias[d.getUTCDay()], diaMes: match[3] + '/' + match[2], hora: h + ':' + m };
}

function fmtData(iso) {
  var p = parseBrasilia(iso);
  return p.diaMes + ' ' + p.hora;
}

function jogoAberto(jogo) {
  return Date.now() < new Date(jogo.data).getTime() - 60 * 60 * 1000;
}

function faseLbl(fase) {
  var map = { grupos: 'Grupos', oitavas: 'Oitavas', quartas: 'Quartas', semi: 'Semi', final: 'Final' };
  return map[fase] || fase;
}

function flag(time) {
  var c = CODIGOS_PAIS[time];
  if (!c) return '<span style="font-size:20px">?</span>';
  return '<img src="https://flagcdn.com/w40/' + c + '.png" alt="' + time + '" style="width:28px;height:20px;object-fit:cover;border-radius:3px;vertical-align:middle" loading="lazy">';
}

function flagSm(time) {
  var c = CODIGOS_PAIS[time];
  if (!c) return '';
  return '<img src="https://flagcdn.com/w20/' + c + '.png" alt="' + time + '" style="width:18px;height:12px;object-fit:cover;border-radius:2px" loading="lazy">';
}

function flagLg(time) {
  var c = CODIGOS_PAIS[time];
  if (!c) return '<span style="font-size:40px">?</span>';
  return '<img src="https://flagcdn.com/w80/' + c + '.png" alt="' + time + '" style="width:56px;height:38px;object-fit:cover;border-radius:6px;box-shadow:0 1px 4px rgba(0,0,0,.15)" loading="lazy">';
}

// TOAST
var toastTimer;
function showToast(msg, dur) {
  dur = dur || 2500;
  var el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function() { el.classList.add('hidden'); }, dur);
}

// AUTH
document.getElementById('btnLogin').addEventListener('click', function() {
  signInWithPopup(auth, provider).catch(function(e) {
    console.error(e);
    showToast('Erro ao fazer login. Tente novamente.');
  });
});

function logout() {
  unsubListeners.forEach(function(u) { u(); });
  unsubListeners = [];
  signOut(auth);
}

onAuthStateChanged(auth, function(user) {
  var splash = document.getElementById('splash');
  splash.style.opacity = '0';
  setTimeout(function() { splash.style.display = 'none'; }, 400);

  if (user) {
    currentUser = user;
    isAdmin = user.uid === ADMIN_UID;
    initApp(user);
  } else {
    currentUser = null;
    isAdmin = false;
    document.getElementById('app').classList.add('hidden');
    document.getElementById('loginScreen').classList.remove('hidden');
  }
});

function initApp(user) {
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');

  document.getElementById('userName').textContent = (user.displayName || 'Usuario').split(' ')[0];
  if (user.photoURL) {
    var av = document.getElementById('userAvatar');
    av.src = user.photoURL; av.style.display = 'block';
    document.getElementById('sidebarAvatar').src = user.photoURL;
  }
  document.getElementById('sidebarName').textContent  = user.displayName || 'Usuario';
  document.getElementById('sidebarEmail').textContent = user.email || '';

  if (isAdmin) {
    document.querySelectorAll('.admin-item').forEach(function(el) { el.classList.remove('hidden'); });
  }

  ensureUserDoc(user).then(function() {
    return loadConfig();
  }).then(function() {
    subscribeResultados();
    subscribePalpitesUsuario();
    subscribeKnockout();
    navTo('palpites');
  }).catch(function(err) {
    console.error('initApp error:', err);
    navTo('palpites');
  });
}

function ensureUserDoc(user) {
  var ref = doc(db, 'usuarios', user.uid);
  return getDoc(ref).then(function(snap) {
    if (!snap.exists()) {
      return setDoc(ref, { uid: user.uid, nome: user.displayName || '', email: user.email || '', foto: user.photoURL || '', criadoEm: serverTimestamp() }, { merge: true });
    } else {
      return setDoc(ref, { nome: user.displayName || '', foto: user.photoURL || '' }, { merge: true });
    }
  });
}

function loadConfig() {
  return getDoc(doc(db, 'config', 'site')).then(function(snap) {
    if (snap.exists()) configSite = snap.data();
  }).catch(function() {});
}

// LISTENERS
function subscribeResultados() {
  var unsub = onSnapshot(collection(db, 'resultados'), function(snap) {
    resultados = {};
    snap.forEach(function(d) { resultados[d.id] = d.data(); });
    if (currentPage === 'palpites') renderPalpites();
    if (currentPage === 'chaveamento') renderChaveamento();
  }, function(err) { console.warn('resultados:', err.code); });
  unsubListeners.push(unsub);
}

function subscribePalpitesUsuario() {
  if (!currentUser) return;
  var unsub = onSnapshot(collection(db, 'palpites', currentUser.uid, 'jogos'), function(snap) {
    palpitesUsuario = {};
    snap.forEach(function(d) { palpitesUsuario[d.id] = d.data(); });
    atualizarCustoBanner();
    renderGrupoTabs();
    if (currentPage === 'palpites') renderPalpites();
    if (currentPage === 'meus-palpites') renderMeusPalpites();
  }, function(err) { console.warn('palpites:', err.code); });
  unsubListeners.push(unsub);
}

function subscribeKnockout() {
  var unsub = onSnapshot(collection(db, 'jogos_knockout'), function(snap) {
    jogosKnockout = {};
    snap.forEach(function(d) { jogosKnockout[d.id] = d.data(); });
    if (currentPage === 'palpites') renderPalpites();
    if (currentPage === 'chaveamento') renderChaveamento();
  }, function(err) { console.warn('knockout:', err.code); });
  unsubListeners.push(unsub);
}

// NAVEGACAO
function toggleMenu() {
  if (window.innerWidth >= 900) return;
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('menuOverlay').classList.toggle('hidden');
}
window.toggleMenu = toggleMenu;

function navTo(page) {
  currentPage = page;
  if (window.innerWidth < 900) {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('menuOverlay').classList.add('hidden');
  }
  document.querySelectorAll('.menu-item').forEach(function(el) {
    el.classList.toggle('active', el.dataset.page === page);
  });
  document.querySelectorAll('.page').forEach(function(el) { el.classList.remove('active'); });
  var pg = document.getElementById('page-' + page);
  if (pg) pg.classList.add('active');

  var renders = {
    'palpites': renderPalpites,
    'ranking': renderRanking,
    'chaveamento': renderChaveamento,
    'premios': renderPremios,
    'meus-palpites': renderMeusPalpites,
    'admin': renderAdmin
  };
  var fn = renders[page];
  if (fn) {
    Promise.resolve().then(function() { return fn(); }).catch(function(err) {
      console.error('Erro ao renderizar ' + page + ':', err);
      var contId = page === 'meus-palpites' ? 'meusPalpitesContainer' : page === 'admin' ? 'adminContainer' : page + 'Container';
      var cont = document.getElementById(contId);
      if (cont) cont.innerHTML = '<div class="empty-state"><div class="empty-state-icon">!</div><div class="empty-state-titulo">Erro ao carregar</div><div class="empty-state-desc" style="font-family:monospace;font-size:12px">' + (err.code || err.message) + '</div></div>';
    });
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
window.navTo = navTo;

function setFase(fase) {
  currentFase = fase;
  document.querySelectorAll('.fase-tab[data-fase]').forEach(function(el) {
    el.classList.toggle('active', el.dataset.fase === fase);
  });
  renderGrupoTabs();
  renderPalpites();
}
window.setFase = setFase;

function setGrupo(grupo) {
  currentGrupo = grupo;
  renderGrupoTabs();
  renderPalpites();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
window.setGrupo = setGrupo;

function setRankFase(fase) {
  currentRankFase = fase;
  document.querySelectorAll('.rank-filter-btn[data-rank]').forEach(function(el) {
    el.classList.toggle('active', el.dataset.rank === fase);
  });
  renderRanking();
}
window.setRankFase = setRankFase;

// ABAS DE GRUPO
function renderGrupoTabs() {
  var wrap = document.getElementById('grupoTabsWrap');
  var el   = document.getElementById('grupoTabs');
  if (!wrap || !el) return;
  if (currentFase !== 'grupos') { wrap.style.display = 'none'; return; }
  wrap.style.display = '';
  el.innerHTML = Object.keys(GRUPOS).map(function(g) {
    var flags  = GRUPOS[g].times.map(function(t) { return flagSm(t); }).join('');
    var temPal = JOGOS_GRUPOS.filter(function(j) { return j.grupo === g; }).some(function(j) { return palpitesUsuario[j.id] && palpitesUsuario[j.id].pago; });
    return '<button class="grupo-tab ' + (g === currentGrupo ? 'active' : '') + ' ' + (temPal ? 'tem-palpite' : '') + '" onclick="setGrupo(\'' + g + '\')">' +
      '<span class="gt-letra">Grupo ' + g + '</span>' +
      '<span class="gt-flags">' + flags + '</span>' +
    '</button>';
  }).join('');
}

// RENDER PALPITES
function renderPalpites() {
  var container = document.getElementById('jogosContainer');
  if (!container) return;
  renderGrupoTabs();

  var jogos = currentFase === 'grupos'
    ? JOGOS_GRUPOS.filter(function(j) { return j.grupo === currentGrupo; })
    : Object.values(jogosKnockout).filter(function(j) { return j.fase === currentFase; });

  if (!jogos.length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">!</div><div class="empty-state-titulo">Jogos ainda nao disponiveis</div><div class="empty-state-desc">Os jogos desta fase serao liberados apos o encerramento da fase anterior.</div></div>';
    return;
  }

  var header = '';
  if (currentFase === 'grupos') {
    var chips = GRUPOS[currentGrupo].times.map(function(t) {
      return '<span class="grupo-time-chip">' + flag(t) + ' ' + t + '</span>';
    }).join('');
    header = '<div class="grupo-times-header"><div class="grupo-times-lista">' + chips + '</div></div>';
  }

  container.innerHTML = header + jogos.map(renderJogoCard).join('');

  container.querySelectorAll('.palpite-input').forEach(function(input) {
    input.addEventListener('change', onPalpiteChange);
    input.addEventListener('input', function(e) {
      if (e.target.value.length > 2) e.target.value = e.target.value.slice(0, 2);
      if (parseInt(e.target.value) < 0) e.target.value = '0';
    });
  });
}

function renderJogoCard(jogo) {
  var aberto = jogoAberto(jogo);
  var res    = resultados[jogo.id];
  var pal    = palpitesUsuario[jogo.id];
  var pago   = pal && pal.pago === true;
  var fase   = jogo.fase || 'grupos';
  var custo  = CUSTO_PALPITE[fase] || CUSTO_PALPITE.grupos;

  var statusTxt = res ? 'Encerrado' : aberto ? 'Aberto' : 'Fechado';
  var statusCls = aberto && !res ? 'aberto' : 'encerrado';
  var p         = parseBrasilia(jogo.data);

  var palpiteArea = '';
  if (res) {
    var pts = calcularPontos(jogo, pal, res);
    var acertou = pts > 0;
    palpiteArea  = '<div class="palpite-area">';
    palpiteArea += '<div class="resultado-oficial">' + flag(jogo.time1) + '<span class="placar">' + res.gols1 + ' x ' + res.gols2 + '</span>' + flag(jogo.time2) + '</div>';
    if (pal) {
      palpiteArea += '<div class="palpite-pontos ' + (acertou ? 'pontos-acertou' : 'pontos-errou') + '">' + (acertou ? 'Acertou' : 'Errou') + ' - Palpite: ' + pal.gols1 + 'x' + pal.gols2 + (pago ? ' - +' + pts + ' pts' : ' (nao pago)') + '</div>';
    } else {
      palpiteArea += '<div class="palpite-label" style="margin-top:8px">Voce nao palpitou neste jogo</div>';
    }
    palpiteArea += '</div>';
  } else if (!aberto) {
    palpiteArea  = '<div class="palpite-area">';
    palpiteArea += '<div class="palpite-label">Palpites encerrados</div>';
    if (pal) palpiteArea += '<div class="palpite-salvo">Seu palpite: ' + pal.gols1 + 'x' + pal.gols2 + ' - ' + (pago ? 'pago' : 'aguardando pagamento') + '</div>';
    palpiteArea += '</div>';
  } else {
    var v1 = (pal && pal.gols1 != null) ? pal.gols1 : '';
    var v2 = (pal && pal.gols2 != null) ? pal.gols2 : '';
    palpiteArea  = '<div class="palpite-area">';
    if (pago) {
      palpiteArea += '<div class="pago-label">Jogo pago - edite o placar ate 1h antes</div>';
    } else {
      palpiteArea += '<div class="palpite-label">Seu palpite <span class="palpite-custo-inline">' + fmtBRL(custo) + '</span></div>';
    }
    palpiteArea += '<div class="palpite-grid">';
    palpiteArea += '<input class="palpite-input ' + (pago ? 'pago' : '') + '" type="number" min="0" max="20" placeholder="" value="' + v1 + '" data-jogo="' + jogo.id + '" data-campo="gols1" id="inp-' + jogo.id + '-1" name="g1-' + jogo.id + '">';
    palpiteArea += '<div class="palpite-x">x</div>';
    palpiteArea += '<input class="palpite-input ' + (pago ? 'pago' : '') + '" type="number" min="0" max="20" placeholder="" value="' + v2 + '" data-jogo="' + jogo.id + '" data-campo="gols2" id="inp-' + jogo.id + '-2" name="g2-' + jogo.id + '">';
    palpiteArea += '</div>';
    if (!pago && pal) palpiteArea += '<div class="palpite-salvo">Salvo - confirme o pagamento</div>';
    palpiteArea += '</div>';
  }

  var cardCls = ['jogo-card', pal ? 'palpitado' : '', res ? 'com-resultado' : '', !aberto && !res ? 'encerrado' : ''].filter(Boolean).join(' ');

  return '<div class="' + cardCls + '" id="jogo-' + jogo.id + '">' +
    '<div class="jogo-card-top">' +
      '<div class="jogo-card-top-left">' +
        '<span class="jogo-fase-badge">' + faseLbl(fase) + (jogo.grupo ? ' - Grupo ' + jogo.grupo : '') + '</span>' +
        '<span class="jogo-data-txt">' + p.diaSemana + ', ' + p.diaMes + '</span>' +
        '<span class="jogo-hora-txt">' + p.hora + ' (BRT)</span>' +
        '<span class="jogo-local-txt">' + (jogo.local || '') + '</span>' +
      '</div>' +
      '<span class="jogo-status ' + statusCls + '">' + statusTxt + '</span>' +
    '</div>' +
    '<div class="jogo-card-body">' +
      '<div class="jogo-times-v2">' +
        '<div class="jogo-time-v2"><div class="time-flag-v2">' + flagLg(jogo.time1) + '</div><div class="time-nome-v2">' + jogo.time1 + '</div></div>' +
        '<div class="jogo-vs-v2"><span class="vs-txt">VS</span>' + (jogo.grupo ? '<span class="vs-grupo">Grupo ' + jogo.grupo + '</span>' : '') + '</div>' +
        '<div class="jogo-time-v2"><div class="time-flag-v2">' + flagLg(jogo.time2) + '</div><div class="time-nome-v2">' + jogo.time2 + '</div></div>' +
      '</div>' +
      palpiteArea +
    '</div>' +
  '</div>';
}

// PALPITE: SALVAR / REMOVER
function onPalpiteChange(e) {
  var jogoId = e.target.dataset.jogo;
  var card   = e.target.closest('.jogo-card');
  var inputs = card.querySelectorAll('.palpite-input');
  var v1 = inputs[0].value.trim();
  var v2 = inputs[1].value.trim();
  if (v1 === '' || v2 === '') {
    removerPalpite(jogoId).then(function() { atualizarCustoBanner(); });
    return;
  }
  var g1 = parseInt(v1), g2 = parseInt(v2);
  if (isNaN(g1) || isNaN(g2) || g1 < 0 || g2 < 0) return;
  salvarPalpite(jogoId, g1, g2).then(function() { atualizarCustoBanner(); });
}

function removerPalpite(jogoId) {
  if (!currentUser) return Promise.resolve();
  var pal = palpitesUsuario[jogoId];
  if (pal && pal.pago) {
    var card = document.getElementById('jogo-' + jogoId);
    if (card) {
      var inputs = card.querySelectorAll('.palpite-input');
      if (inputs[0]) inputs[0].value = pal.gols1 != null ? pal.gols1 : '';
      if (inputs[1]) inputs[1].value = pal.gols2 != null ? pal.gols2 : '';
    }
    showToast('Palpite pago - nao pode ser removido, so editado');
    return Promise.resolve();
  }
  return deleteDoc(doc(db, 'palpites', currentUser.uid, 'jogos', jogoId)).catch(function(err) { console.warn('removerPalpite:', err); });
}

function salvarPalpite(jogoId, gols1, gols2) {
  if (!currentUser) return Promise.resolve();
  var jogos = JOGOS_GRUPOS.concat(Object.values(jogosKnockout));
  var jogo  = jogos.find(function(j) { return j.id === jogoId; });
  if (!jogo || !jogoAberto(jogo)) return Promise.resolve();
  var fase = jogo.fase || 'grupos';
  var ref  = doc(db, 'palpites', currentUser.uid, 'jogos', jogoId);
  var pal  = palpitesUsuario[jogoId];
  if (pal && pal.pago) {
    return setDoc(ref, { gols1: gols1, gols2: gols2, atualizadoEm: serverTimestamp() }, { merge: true }).then(function() { showToast('Palpite atualizado!'); });
  }
  return setDoc(ref, { jogoId: jogoId, gols1: gols1, gols2: gols2, fase: fase, pago: false, uid: currentUser.uid, atualizadoEm: serverTimestamp() }, { merge: true });
}

// CUSTO BANNER
function atualizarCustoBanner() {
  var jogos = JOGOS_GRUPOS.concat(Object.values(jogosKnockout));
  var naoPageos = Object.entries(palpitesUsuario).filter(function(entry) {
    var id = entry[0], p = entry[1];
    if (p.pago) return false;
    var jogo = jogos.find(function(j) { return j.id === id; });
    return jogo && jogoAberto(jogo) && p.gols1 != null && p.gols2 != null;
  });
  var total = naoPageos.reduce(function(acc, entry) {
    var id = entry[0];
    var jogo = jogos.find(function(j) { return j.id === id; });
    return acc + (CUSTO_PALPITE[(jogo && jogo.fase) || 'grupos'] || 0);
  }, 0);
  document.getElementById('qtdPalpites').textContent = naoPageos.length;
  document.getElementById('custoTotal').textContent  = fmtBRL(total);
  document.getElementById('btnPagar').disabled = naoPageos.length === 0;
}

// PONTUACAO
function calcularPontos(jogo, palpite, resultado) {
  if (!palpite || !resultado || palpite.pago !== true) return 0;
  var fase = jogo.fase || 'grupos';
  var pts  = PONTUACAO[fase] || PONTUACAO.grupos;
  var g1r = resultado.gols1, g2r = resultado.gols2;
  var g1p = palpite.gols1,   g2p = palpite.gols2;
  if (fase === 'grupos') {
    if (g1p === g1r && g2p === g2r) return pts.acertou_placar;
    if (g1r === g2r && g1p === g2p) return pts.acertou_empate;
    var vR = g1r > g2r ? 1 : g1r < g2r ? 2 : 0;
    var vP = g1p > g2p ? 1 : g1p < g2p ? 2 : 0;
    if (vR !== 0 && vR === vP) return pts.acertou_vencedor;
    return pts.errou;
  } else {
    if (g1p === g1r && g2p === g2r) return pts.acertou_placar;
    var vR2 = g1r >= g2r ? 1 : 2;
    var vP2 = g1p >= g2p ? 1 : 2;
    return vR2 === vP2 ? pts.acertou_vencedor : 0;
  }
}

function calcularPontosUsuario(uid, fase) {
  return getDocs(collection(db, 'palpites', uid, 'jogos')).then(function(snap) {
    var jogos = JOGOS_GRUPOS.concat(Object.values(jogosKnockout));
    var total = 0;
    snap.forEach(function(d) {
      var p = d.data();
      if (fase && fase !== 'geral' && p.fase !== fase) return;
      var res  = resultados[p.jogoId];
      if (!res) return;
      var jogo = jogos.find(function(j) { return j.id === p.jogoId; });
      if (jogo) total += calcularPontos(jogo, p, res);
    });
    return total;
  });
}

// CHECKOUT / PIX
function abrirCheckout() {
  var jogos = JOGOS_GRUPOS.concat(Object.values(jogosKnockout));
  var naoPageos = Object.entries(palpitesUsuario).filter(function(entry) {
    var id = entry[0], p = entry[1];
    if (p.pago) return false;
    var jogo = jogos.find(function(j) { return j.id === id; });
    return jogo && jogoAberto(jogo) && p.gols1 != null && p.gols2 != null;
  });
  if (!naoPageos.length) return;

  var total = naoPageos.reduce(function(acc, entry) {
    var id = entry[0];
    var jogo = jogos.find(function(j) { return j.id === id; });
    return acc + (CUSTO_PALPITE[(jogo && jogo.fase) || 'grupos'] || 0);
  }, 0);

  var itens = naoPageos.map(function(entry) {
    var id = entry[0], p = entry[1];
    var jogo  = jogos.find(function(j) { return j.id === id; });
    var custo = CUSTO_PALPITE[(jogo && jogo.fase) || 'grupos'] || 0;
    return '<div class="checkout-jogo-item">' +
      '<span class="checkout-jogo-nome">' + flag(jogo.time1) + ' ' + jogo.time1 + ' x ' + jogo.time2 + ' ' + flag(jogo.time2) + '</span>' +
      '<span class="checkout-jogo-palpite">' + p.gols1 + 'x' + p.gols2 + '</span>' +
      '<span class="checkout-jogo-custo">' + fmtBRL(custo) + '</span>' +
    '</div>';
  }).join('');

  var pixKey   = configSite.pixKey   || '(chave Pix nao configurada)';
  var pixNome  = configSite.pixNome  || 'Administrador';
  var pixCidade = configSite.pixCidade || 'SAO PAULO';
  var qrUrl    = 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=' + encodeURIComponent(gerarPixPayload(pixKey, pixNome, pixCidade, total));
  var jogoIds  = naoPageos.map(function(e) { return e[0]; });

  document.getElementById('checkoutContent').innerHTML =
    '<div class="modal-body">' +
      '<div class="checkout-resumo">' +
        '<div style="font-size:12px;font-weight:700;color:var(--texto3);margin-bottom:8px;text-transform:uppercase">Resumo dos palpites</div>' +
        itens +
        '<div class="checkout-total"><span>Total a pagar</span><span class="checkout-total-val">' + fmtBRL(total) + '</span></div>' +
      '</div>' +
      '<div class="pix-section">' +
        '<div class="pix-titulo">Pague via Pix</div>' +
        '<div class="pix-qr-wrap">' +
          '<img class="pix-qr-img" src="' + qrUrl + '" alt="QR Code Pix" onerror="this.style.display=\'none\'">' +
          '<div class="pix-chave-wrap"><span class="pix-chave-val">' + pixKey + '</span><button class="btn-copiar" onclick="copiarPix(\'' + pixKey + '\')">Copiar</button></div>' +
          '<div class="pix-instrucao">Valor: <strong>' + fmtBRL(total) + '</strong> para <strong>' + pixNome + '</strong><br>Apos pagar, clique em Ja paguei abaixo.</div>' +
        '</div>' +
        '<button class="btn-confirmar-pix" onclick="confirmarPagamento(' + JSON.stringify(jogoIds) + ',' + total + ')">Ja paguei - Confirmar palpites</button>' +
        '<div class="aguardando-badge" id="aguardandoBadge" style="display:none">Aguardando confirmacao do administrador</div>' +
      '</div>' +
    '</div>';
  document.getElementById('modalCheckout').classList.remove('hidden');
}
window.abrirCheckout = abrirCheckout;

function fecharCheckout() { document.getElementById('modalCheckout').classList.add('hidden'); }
window.fecharCheckout = fecharCheckout;

function copiarPix(chave) { navigator.clipboard.writeText(chave).then(function() { showToast('Chave Pix copiada!'); }); }
window.copiarPix = copiarPix;

function confirmarPagamento(jogoIds, total) {
  if (!currentUser) return;
  var pedidoId = currentUser.uid + '_' + Date.now();
  setDoc(doc(db, 'pagamentos', pedidoId), {
    uid: currentUser.uid, nome: currentUser.displayName || '', email: currentUser.email || '',
    foto: currentUser.photoURL || '', jogoIds: jogoIds, total: total, status: 'pendente', criadoEm: serverTimestamp()
  }).then(function() {
    document.getElementById('aguardandoBadge').style.display = 'flex';
    var btn = document.querySelector('.btn-confirmar-pix');
    if (btn) btn.disabled = true;
    showToast('Pedido enviado! Aguarde a confirmacao do admin.', 4000);
  });
}
window.confirmarPagamento = confirmarPagamento;

function gerarPixPayload(chave, nome, cidade, valor) {
  function tlv(id, val) { return id + String(val.length).padStart(2, '0') + val; }
  var mai = tlv('00', 'BR.GOV.BCB.PIX') + tlv('01', chave);
  var p = tlv('00','01') + tlv('26', mai) + tlv('52','0000') + tlv('53','986') +
    tlv('54', valor.toFixed(2)) + tlv('58','BR') +
    tlv('59', nome.substring(0,25)) + tlv('60', cidade.substring(0,15)) +
    tlv('62', tlv('05','***')) + '6304';
  var crc = 0xFFFF;
  for (var i = 0; i < p.length; i++) { crc ^= p.charCodeAt(i) << 8; for (var j = 0; j < 8; j++) crc = (crc & 0x8000) ? (crc << 1) ^ 0x1021 : crc << 1; }
  return p + ((crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0'));
}

// RANKING
function renderRanking() {
  var container = document.getElementById('rankingContainer');
  var statsEl   = document.getElementById('rankingStats');
  if (!container || !statsEl) return;
  container.innerHTML = '<div class="loading"><div class="spinner"></div> Calculando ranking...</div>';

  return getDocs(collection(db, 'usuarios')).then(function(usersSnap) {
    var users = [];
    usersSnap.forEach(function(d) { users.push(d.data()); });

    return Promise.all(users.map(function(u) {
      return Promise.all([
        calcularPontosUsuario(u.uid, currentRankFase === 'geral' ? null : currentRankFase),
        getDocs(collection(db, 'palpites', u.uid, 'jogos'))
      ]).then(function(results) {
        var pts = results[0];
        var palSnap = results[1];
        var jogos = JOGOS_GRUPOS.concat(Object.values(jogosKnockout));
        var palpitesPagos = 0, totalGasto = 0;
        palSnap.forEach(function(d) {
          var p = d.data();
          if (p.pago) {
            palpitesPagos++;
            var jogo = jogos.find(function(j) { return j.id === p.jogoId; });
            totalGasto += CUSTO_PALPITE[(jogo && jogo.fase) || 'grupos'] || 0;
          }
        });
        return Object.assign({}, u, { pts: pts, palpitesPagos: palpitesPagos, totalGasto: totalGasto });
      });
    }));
  }).then(function(ranking) {
    ranking.sort(function(a, b) { return b.pts - a.pts; });
    var totalBalde = ranking.reduce(function(a, u) { return a + u.totalGasto; }, 0);

    statsEl.innerHTML =
      '<div class="rank-stat-card"><div class="rank-stat-val">' + ranking.length + '</div><div class="rank-stat-lbl">Usuarios</div></div>' +
      '<div class="rank-stat-card"><div class="rank-stat-val">' + fmtBRL(totalBalde) + '</div><div class="rank-stat-lbl">Balde total</div></div>' +
      '<div class="rank-stat-card"><div class="rank-stat-val">' + (ranking[0] ? ranking[0].pts : 0) + '</div><div class="rank-stat-lbl">Lider (pts)</div></div>';

    if (!ranking.length) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">!</div><div class="empty-state-titulo">Nenhum participante ainda</div></div>';
      return;
    }

    container.innerHTML = '<div class="ranking-list">' + ranking.map(function(u, i) {
      var pos = i + 1;
      var posCls   = pos === 1 ? 'pos-1' : pos === 2 ? 'pos-2' : pos === 3 ? 'pos-3' : 'pos-n';
      var posLabel = pos === 1 ? '1.' : pos === 2 ? '2.' : pos === 3 ? '3.' : pos + '.';
      var euCls    = (currentUser && u.uid === currentUser.uid) ? ' ranking-eu' : '';
      var avatar   = u.foto ? '<img class="ranking-avatar" src="' + u.foto + '" alt="">' : '<div class="ranking-avatar-placeholder">?</div>';
      return '<div class="ranking-item' + euCls + '">' +
        '<div class="ranking-pos ' + posCls + '">' + posLabel + '</div>' +
        avatar +
        '<div class="ranking-info">' +
          '<div class="ranking-nome">' + (u.nome || 'Usuario') + (currentUser && u.uid === currentUser.uid ? ' (voce)' : '') + '</div>' +
          '<div class="ranking-detalhe">' + u.palpitesPagos + ' palpites - ' + fmtBRL(u.totalGasto) + ' investidos</div>' +
        '</div>' +
        '<div class="ranking-pontos"><div class="ranking-pts-val">' + u.pts + '</div><div class="ranking-pts-lbl">pontos</div></div>' +
      '</div>';
    }).join('') + '</div>';
  }).catch(function(err) {
    console.error('renderRanking:', err);
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">!</div><div class="empty-state-titulo">Erro ao carregar ranking</div><div class="empty-state-desc">' + (err.code || err.message) + '</div></div>';
  });
}

// PREMIOS
function renderPremios() {
  var container = document.getElementById('premiosContainer');
  if (!container) return;
  container.innerHTML = '<div class="loading"><div class="spinner"></div> Calculando premios...</div>';

  var usersData = [];

  return getDocs(collection(db, 'usuarios')).then(function(usersSnap) {
    var docsArr = [];
    usersSnap.forEach(function(d) { docsArr.push(d.data()); });

    return Promise.all(docsArr.map(function(u) {
      return getDocs(collection(db, 'palpites', u.uid, 'jogos')).then(function(palSnap) {
        var jogos = JOGOS_GRUPOS.concat(Object.values(jogosKnockout));
        var gasto = 0;
        palSnap.forEach(function(d) {
          var p = d.data();
          if (p.pago) {
            var jogo = jogos.find(function(j) { return j.id === p.jogoId; });
            gasto += CUSTO_PALPITE[(jogo && jogo.fase) || 'grupos'] || 0;
          }
        });
        usersData.push(Object.assign({}, u, { gasto: gasto }));
      });
    }));
  }).then(function() {
    var totalBalde = usersData.reduce(function(a, u) { return a + u.gasto; }, 0);
    var totalP = usersData.filter(function(u) { return u.gasto > 0; }).length;

    function liderFase(fase) {
      return Promise.all(usersData.map(function(u) {
        return calcularPontosUsuario(u.uid, fase).then(function(pts) { return { nome: u.nome, pts: pts }; });
      })).then(function(arr) {
        arr.sort(function(a, b) { return b.pts - a.pts; });
        return arr[0] && arr[0].pts > 0 ? arr[0] : null;
      });
    }

    return Promise.all([
      liderFase(null), liderFase('grupos'), liderFase('oitavas'), liderFase('quartas'), liderFase('semi')
    ]).then(function(liders) {
      var premios = [
        { titulo: 'Campeao Geral',         desc: 'Melhor pontuacao total',             pct: DISTRIBUICAO_PREMIO.campeao_geral,  lider: liders[0] },
        { titulo: 'Rei da Fase de Grupos', desc: 'Melhor pontuacao na fase de grupos', pct: DISTRIBUICAO_PREMIO.melhor_grupos,  lider: liders[1] },
        { titulo: 'Rei das Oitavas',       desc: 'Melhor pontuacao nas oitavas',       pct: DISTRIBUICAO_PREMIO.melhor_oitavas, lider: liders[2] },
        { titulo: 'Rei das Quartas',       desc: 'Melhor pontuacao nas quartas',       pct: DISTRIBUICAO_PREMIO.melhor_quartas, lider: liders[3] },
        { titulo: 'Rei da Semifinal',      desc: 'Melhor pontuacao na semifinal',      pct: DISTRIBUICAO_PREMIO.melhor_semi,    lider: liders[4] },
      ];

      container.innerHTML =
        '<div class="premio-balde">' +
          '<div class="premio-balde-titulo">Balde Total</div>' +
          '<div class="premio-balde-valor">' + fmtBRL(totalBalde) + '</div>' +
          '<div class="premio-balde-sub">' + totalP + ' participante(s)</div>' +
        '</div>' +
        '<div class="premios-grid">' + premios.map(function(p) {
          return '<div class="premio-card">' +
            '<div class="premio-info">' +
              '<div class="premio-titulo">' + p.titulo + '</div>' +
              '<div class="premio-desc">' + p.desc + '</div>' +
              '<div class="premio-lider">' + (p.lider ? 'Lider: ' + p.lider.nome + ' (' + p.lider.pts + ' pts)' : 'Sem dados ainda') + '</div>' +
            '</div>' +
            '<div class="premio-valor">' +
              '<div class="premio-pct">' + Math.round(p.pct * 100) + '%</div>' +
              '<div class="premio-reais">' + fmtBRL(totalBalde * p.pct) + '</div>' +
            '</div>' +
          '</div>';
        }).join('') + '</div>' +
        '<div style="background:var(--cinza-mid);border-radius:var(--radius);padding:16px;text-align:center;margin-top:16px">' +
          '<strong style="color:var(--verde);font-size:18px">' + totalP + '</strong> participante(s) no balde de <strong style="color:var(--verde)">' + fmtBRL(totalBalde) + '</strong>' +
        '</div>';
    });
  }).catch(function(err) {
    console.error('renderPremios:', err);
    container.innerHTML = '<div class="empty-state"><div class="empty-state-titulo">Erro ao carregar</div><div class="empty-state-desc">' + (err.code || err.message) + '</div></div>';
  });
}

// CHAVEAMENTO
function renderChaveamento() {
  var container = document.getElementById('chaveamentoContainer');
  if (!container) return;
  var fases = [
    { label: 'Oitavas de Final', jogos: CHAVEAMENTO_R32 },
    { label: 'Quartas de Final', jogos: Object.values(jogosKnockout).filter(function(j) { return j.fase === 'quartas'; }) },
    { label: 'Semifinal',        jogos: Object.values(jogosKnockout).filter(function(j) { return j.fase === 'semi'; }) },
    { label: 'Final',            jogos: Object.values(jogosKnockout).filter(function(j) { return j.fase === 'final'; }) },
  ];
  container.innerHTML = fases.map(function(fase) {
    var jogosHtml = fase.jogos.length === 0
      ? '<div class="empty-state" style="padding:20px 0"><div class="empty-state-desc">Aguardando resultados da fase anterior</div></div>'
      : fase.jogos.map(function(j, i) {
          var res = resultados[j.id];
          var t1  = j.time1 || j.slot1;
          var t2  = j.time2 || j.slot2;
          var f1  = CODIGOS_PAIS[t1];
          var f2  = CODIGOS_PAIS[t2];
          var img1 = f1 ? '<img src="https://flagcdn.com/w40/' + f1 + '.png" alt="' + t1 + '" style="width:28px;height:20px;object-fit:cover;border-radius:3px">' : '';
          var img2 = f2 ? '<img src="https://flagcdn.com/w40/' + f2 + '.png" alt="' + t2 + '" style="width:28px;height:20px;object-fit:cover;border-radius:3px">' : '';
          var placar = res ? '<div class="chave-placar-v2">' + res.gols1 + 'x' + res.gols2 + '</div>' : '<div class="chave-placar-v2 pendente">- x -</div>';
          return '<div class="chave-jogo-v2">' +
            '<div class="chave-jogo-header"><span>Jogo ' + (i+1) + '</span>' + (j.data ? '<span>' + fmtData(j.data) + '</span>' : '') + '</div>' +
            '<div class="chave-jogo-body">' +
              '<div class="chave-time-v2">' + img1 + '<span class="' + (!f1 ? 'chave-slot-v2' : '') + '">' + t1 + '</span></div>' +
              placar +
              '<div class="chave-time-v2 direita"><span class="' + (!f2 ? 'chave-slot-v2' : '') + '">' + t2 + '</span>' + img2 + '</div>' +
            '</div>' +
          '</div>';
        }).join('');
    return '<div class="chave-fase-titulo">' + fase.label + '</div>' + jogosHtml;
  }).join('');
}

// MEUS PALPITES
function renderMeusPalpites() {
  var container = document.getElementById('meusPalpitesContainer');
  if (!container || !currentUser) return;
  var todos = Object.entries(palpitesUsuario);
  if (!todos.length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">!</div><div class="empty-state-titulo">Nenhum palpite ainda</div><div class="empty-state-desc">Va para Palpites e comece a apostar!</div></div>';
    return;
  }
  var jogos = JOGOS_GRUPOS.concat(Object.values(jogosKnockout));
  var comJogo = todos.map(function(entry) {
    var id = entry[0], p = entry[1];
    var jogo = jogos.find(function(j) { return j.id === id; });
    return { id: id, p: p, jogo: jogo };
  }).filter(function(x) { return x.jogo; }).sort(function(a, b) { return new Date(a.jogo.data) - new Date(b.jogo.data); });

  var totalPago = 0, totalPontos = 0;
  comJogo.forEach(function(item) {
    if (item.p.pago) {
      totalPago += CUSTO_PALPITE[item.jogo.fase || 'grupos'] || 0;
      var res = resultados[item.id];
      if (res) totalPontos += calcularPontos(item.jogo, item.p, res);
    }
  });

  container.innerHTML =
    '<div class="ranking-stats" style="margin-bottom:16px">' +
      '<div class="rank-stat-card"><div class="rank-stat-val">' + comJogo.length + '</div><div class="rank-stat-lbl">Palpites</div></div>' +
      '<div class="rank-stat-card"><div class="rank-stat-val">' + fmtBRL(totalPago) + '</div><div class="rank-stat-lbl">Investido</div></div>' +
      '<div class="rank-stat-card"><div class="rank-stat-val">' + totalPontos + '</div><div class="rank-stat-lbl">Pontos</div></div>' +
    '</div>' +
    '<div class="meus-palpites-lista">' + comJogo.map(function(item) {
      var res = resultados[item.id];
      var pts = (res && item.p.pago) ? calcularPontos(item.jogo, item.p, res) : null;
      var statusCls   = item.p.pago ? 'pago' : 'pendente';
      var statusLbl   = item.p.pago ? 'Pago' : 'Aguardando pagamento';
      var badgeCls    = item.p.pago ? 'status-pago' : 'status-pendente';
      return '<div class="meu-palpite-card ' + statusCls + '">' +
        '<div class="meu-palpite-header">' +
          '<div class="meu-palpite-jogo">' + flag(item.jogo.time1) + ' ' + item.jogo.time1 + ' x ' + item.jogo.time2 + ' ' + flag(item.jogo.time2) + '</div>' +
          '<span class="meu-palpite-status ' + badgeCls + '">' + statusLbl + '</span>' +
        '</div>' +
        '<div class="meu-palpite-detalhe">Palpite: <strong>' + item.p.gols1 + 'x' + item.p.gols2 + '</strong> - ' + fmtData(item.jogo.data) + ' - ' + faseLbl(item.jogo.fase || 'grupos') + (res ? ' - Resultado: <strong>' + res.gols1 + 'x' + res.gols2 + '</strong>' : '') + '</div>' +
        (pts !== null ? '<div class="meu-palpite-pontos ' + (pts > 0 ? 'pontos-acertou' : 'pontos-errou') + '">' + (pts > 0 ? '+' + pts + ' pontos' : '0 pontos') + '</div>' : '') +
      '</div>';
    }).join('') + '</div>';
}

// ADMIN
function renderAdmin() {
  if (!isAdmin) {
    document.getElementById('adminContainer').innerHTML = '<div class="empty-state"><div class="empty-state-icon">!</div><div class="empty-state-titulo">Acesso restrito</div><div class="empty-state-desc">isAdmin=' + isAdmin + ' UID=' + (currentUser ? currentUser.uid : 'none') + ' ADMIN_UID=' + ADMIN_UID + '</div></div>';
    return;
  }
  var container = document.getElementById('adminContainer');
  container.innerHTML = '<div class="loading"><div class="spinner"></div> Carregando admin...</div>';

  return Promise.all([
    getDocs(collection(db, 'usuarios')),
    getDocs(collection(db, 'pagamentos'))
  ]).then(function(results) {
    var usersSnap = results[0], pagSnap = results[1];
    console.log('admin: usuarios=', usersSnap.size, 'pagamentos=', pagSnap.size);
    var users = [];
    usersSnap.forEach(function(d) { users.push(d.data()); });
    var pagamentos = [];
    pagSnap.forEach(function(d) { pagamentos.push(Object.assign({ id: d.id }, d.data())); });
    var pendentes = pagamentos.filter(function(p) { return p.status === 'pendente'; });

    return Promise.all(users.map(function(u) {
      return getDocs(collection(db, 'palpites', u.uid, 'jogos')).then(function(palSnap) {
        var jogos = JOGOS_GRUPOS.concat(Object.values(jogosKnockout));
        var palpitesPagos = 0, gasto = 0;
        palSnap.forEach(function(d) {
          var p = d.data();
          if (p.pago) {
            palpitesPagos++;
            var jogo = jogos.find(function(j) { return j.id === p.jogoId; });
            gasto += CUSTO_PALPITE[(jogo && jogo.fase) || 'grupos'] || 0;
          }
        });
        return Object.assign({}, u, { palpitesPagos: palpitesPagos, gasto: gasto });
      });
    })).then(function(usersComStats) {
      var totalBalde = usersComStats.reduce(function(a, u) { return a + u.gasto; }, 0);

      var auditHtml = '<table class="audit-table"><thead><tr><th>Participante</th><th>Palpites</th><th>Valor</th><th>Status</th><th>Data</th><th>Acao</th></tr></thead><tbody>' +
        pagamentos.sort(function(a,b) { return ((b.criadoEm && b.criadoEm.seconds) || 0) - ((a.criadoEm && a.criadoEm.seconds) || 0); }).map(function(p) {
          var statusMap = { pendente: 'Pendente', aprovado: 'Aprovado', rejeitado: 'Rejeitado' };
          var statusCss = { pendente: 'audit-pendente', aprovado: 'audit-aprovado', rejeitado: 'audit-rejeitado' };
          var dataPgto  = (p.criadoEm && p.criadoEm.seconds) ? new Date(p.criadoEm.seconds * 1000).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' }) : '-';
          var acoes = p.status === 'pendente'
            ? '<div style="display:flex;gap:6px"><button class="btn-inserir" style="padding:5px 10px;font-size:11px" onclick="aprovarPagamento(\'' + p.id + '\',' + JSON.stringify(p.jogoIds || []) + ',\'' + p.uid + '\')">Aprovar</button><button class="btn-inserir" style="padding:5px 10px;font-size:11px;background:var(--vermelho)" onclick="rejeitarPagamento(\'' + p.id + '\')">Rejeitar</button></div>'
            : '<span style="font-size:11px;color:var(--texto3)">' + (statusMap[p.status] || p.status) + '</span>';
          return '<tr><td><div style="font-weight:700;font-size:13px">' + (p.nome || '-') + '</div><div style="font-size:11px;color:var(--texto3)">' + (p.email || '') + '</div></td>' +
            '<td style="text-align:center;font-weight:700">' + (p.jogoIds ? p.jogoIds.length : 0) + '</td>' +
            '<td style="font-weight:800;color:var(--verde)">' + fmtBRL(p.total || 0) + '</td>' +
            '<td><span class="audit-badge ' + (statusCss[p.status] || '') + '">' + (statusMap[p.status] || p.status) + '</span></td>' +
            '<td style="font-size:11px;color:var(--texto3);white-space:nowrap">' + dataPgto + '</td>' +
            '<td>' + acoes + '</td></tr>';
        }).join('') + '</tbody></table>';

      var resultadosHtml = Object.entries(
        JOGOS_GRUPOS.reduce(function(acc, j) { if (!acc[j.grupo]) acc[j.grupo] = []; acc[j.grupo].push(j); return acc; }, {})
      ).map(function(entry) {
        var grupo = entry[0], gs = entry[1];
        return '<div class="admin-card" style="margin-bottom:10px"><div style="font-weight:800;color:var(--verde);margin-bottom:10px">Grupo ' + grupo + '</div>' +
          gs.map(function(j) {
            var res = resultados[j.id];
            return '<div class="admin-jogo-row">' +
              '<div class="admin-jogo-info"><div class="admin-jogo-nome">' + flag(j.time1) + ' ' + j.time1 + ' x ' + j.time2 + ' ' + flag(j.time2) + '</div><div class="admin-jogo-meta">' + fmtData(j.data) + '</div></div>' +
              (res ? '<div class="admin-jogo-resultado">' + res.gols1 + 'x' + res.gols2 + '</div>' : '') +
              '<button class="btn-inserir ' + (res ? 'editando' : '') + '" onclick="abrirModalResultado(\'' + j.id + '\',\'' + j.time1 + '\',\'' + j.time2 + '\')">' + (res ? 'Editar' : '+ Resultado') + '</button>' +
            '</div>';
          }).join('') + '</div>';
      }).join('');

      container.innerHTML =
        '<div class="admin-stats-grid">' +
          '<div class="admin-stat"><div class="admin-stat-val">' + users.length + '</div><div class="admin-stat-lbl">Usuarios</div></div>' +
          '<div class="admin-stat"><div class="admin-stat-val">' + fmtBRL(totalBalde) + '</div><div class="admin-stat-lbl">Balde total</div></div>' +
          '<div class="admin-stat"><div class="admin-stat-val">' + pendentes.length + '</div><div class="admin-stat-lbl">Pgtos pendentes</div></div>' +
          '<div class="admin-stat"><div class="admin-stat-val">' + Object.keys(resultados).length + '</div><div class="admin-stat-lbl">Resultados</div></div>' +
        '</div>' +
        '<div class="admin-section"><div class="admin-section-titulo">Configuracao Pix</div><div class="admin-card"><div class="pix-config">' +
          '<input class="pix-input" id="pixKeyInput" type="text" placeholder="Chave Pix" value="' + (configSite.pixKey || '') + '">' +
          '<input class="pix-input" id="pixNomeInput" type="text" placeholder="Nome do recebedor" value="' + (configSite.pixNome || '') + '">' +
          '<input class="pix-input" id="pixCidadeInput" type="text" placeholder="Cidade (ex: SAO PAULO)" value="' + (configSite.pixCidade || '') + '">' +
          '<button class="btn-salvar-pix" onclick="salvarConfigPix()">Salvar Pix</button>' +
        '</div></div></div>' +
        '<div class="admin-section"><div class="admin-section-titulo">Auditoria de Pagamentos (' + pagamentos.length + ')</div><div class="admin-card" style="padding:0;overflow:hidden">' + (pagamentos.length ? auditHtml : '<div class="empty-state" style="padding:24px"><div class="empty-state-desc">Nenhum pagamento ainda</div></div>') + '</div></div>' +
        '<div class="admin-section"><div class="admin-section-titulo">Dados de Teste</div><div class="admin-card" style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><div style="flex:1;font-size:13px;color:var(--texto3)">Cria participantes ficticios para testar o ranking.</div><div style="display:flex;gap:8px;flex-shrink:0"><button class="btn-inserir" onclick="criarDadosTeste()" style="background:var(--verde4)">+ Criar fakes</button><button class="btn-inserir" onclick="removerDadosTeste()" style="background:var(--vermelho)">Remover fakes</button></div></div></div>' +
        '<div class="admin-section"><div class="admin-section-titulo">Resultados - Fase de Grupos</div>' + resultadosHtml + '</div>' +
        '<div class="admin-section"><div class="admin-section-titulo">Participantes</div><div class="admin-card">' +
          usersComStats.sort(function(a,b) { return b.gasto - a.gasto; }).map(function(u) {
            return '<div class="admin-user-row">' +
              (u.foto ? '<img class="admin-user-avatar" src="' + u.foto + '" alt="">' : '<div style="width:34px;height:34px;border-radius:50%;background:var(--verde-light);display:flex;align-items:center;justify-content:center">?</div>') +
              '<div class="admin-user-info"><div class="admin-user-nome">' + (u.nome || 'Usuario') + '</div><div class="admin-user-email">' + (u.email || '') + '</div></div>' +
              '<div class="admin-user-stats"><strong>' + fmtBRL(u.gasto) + '</strong>' + u.palpitesPagos + ' palpites pagos</div>' +
            '</div>';
          }).join('') +
        '</div></div>';
    });
  }).catch(function(err) {
    console.error('renderAdmin:', err);
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">!</div><div class="empty-state-titulo">Erro ao carregar</div><div class="empty-state-desc">' + (err.code || err.message) + '</div></div>';
  });
}

function aprovarPagamento(pedidoId, jogoIds, uid) {
  if (!confirm('Aprovar ' + jogoIds.length + ' palpite(s)?')) return;
  Promise.all(jogoIds.map(function(id) { return setDoc(doc(db,'palpites',uid,'jogos',id),{pago:true},{merge:true}); }))
    .then(function() { return updateDoc(doc(db,'pagamentos',pedidoId),{status:'aprovado'}); })
    .then(function() { showToast('Pagamento aprovado!'); renderAdmin(); });
}
window.aprovarPagamento = aprovarPagamento;

function rejeitarPagamento(pedidoId) {
  if (!confirm('Rejeitar este pagamento?')) return;
  updateDoc(doc(db,'pagamentos',pedidoId),{status:'rejeitado'}).then(function() { showToast('Pagamento rejeitado.'); renderAdmin(); });
}
window.rejeitarPagamento = rejeitarPagamento;

function salvarConfigPix() {
  var key    = document.getElementById('pixKeyInput').value.trim();
  var nome   = document.getElementById('pixNomeInput').value.trim();
  var cidade = document.getElementById('pixCidadeInput').value.trim();
  if (!key) { showToast('Informe a chave Pix'); return; }
  configSite = { pixKey: key, pixNome: nome, pixCidade: cidade };
  setDoc(doc(db,'config','site'), configSite, { merge: true }).then(function() { showToast('Configuracao Pix salva!'); });
}
window.salvarConfigPix = salvarConfigPix;

function abrirModalResultado(jogoId, time1, time2) {
  var res = resultados[jogoId];
  document.getElementById('resultadoContent').innerHTML =
    '<div class="modal-body">' +
    '<div style="text-align:center;margin-bottom:16px;font-size:16px;font-weight:700">' + flag(time1) + ' ' + time1 + ' x ' + time2 + ' ' + flag(time2) + '</div>' +
    '<div class="palpite-grid" style="margin-bottom:16px">' +
      '<input class="palpite-input" type="number" min="0" max="20" id="resGols1" placeholder="0" value="' + (res ? res.gols1 : '') + '">' +
      '<div class="palpite-x">x</div>' +
      '<input class="palpite-input" type="number" min="0" max="20" id="resGols2" placeholder="0" value="' + (res ? res.gols2 : '') + '">' +
    '</div>' +
    '<button class="btn-confirmar-pix" onclick="salvarResultado(\'' + jogoId + '\')">Salvar Resultado</button>' +
    '</div>';
  document.getElementById('modalResultado').classList.remove('hidden');
}
window.abrirModalResultado = abrirModalResultado;

function fecharModalResultado() { document.getElementById('modalResultado').classList.add('hidden'); }
window.fecharModalResultado = fecharModalResultado;

function salvarResultado(jogoId) {
  var g1 = parseInt(document.getElementById('resGols1').value);
  var g2 = parseInt(document.getElementById('resGols2').value);
  if (isNaN(g1) || isNaN(g2)) { showToast('Informe o placar completo'); return; }
  setDoc(doc(db,'resultados',jogoId), { jogoId:jogoId, gols1:g1, gols2:g2, atualizadoEm:serverTimestamp() })
    .then(function() { fecharModalResultado(); showToast('Resultado salvo!'); });
}
window.salvarResultado = salvarResultado;

var FAKE_USERS = [
  { nome: 'Carlos Silva',   email: 'carlos@teste.com',   foto: 'https://i.pravatar.cc/40?u=carlos'   },
  { nome: 'Ana Souza',      email: 'ana@teste.com',      foto: 'https://i.pravatar.cc/40?u=ana'      },
  { nome: 'Pedro Oliveira', email: 'pedro@teste.com',    foto: 'https://i.pravatar.cc/40?u=pedro'    },
  { nome: 'Juliana Costa',  email: 'juliana@teste.com',  foto: 'https://i.pravatar.cc/40?u=juliana'  },
  { nome: 'Rafael Mendes',  email: 'rafael@teste.com',   foto: 'https://i.pravatar.cc/40?u=rafael'   },
  { nome: 'Fernanda Lima',  email: 'fernanda@teste.com', foto: 'https://i.pravatar.cc/40?u=fernanda' },
  { nome: 'Bruno Alves',    email: 'bruno@teste.com',    foto: 'https://i.pravatar.cc/40?u=bruno'    },
  { nome: 'Camila Torres',  email: 'camila@teste.com',   foto: 'https://i.pravatar.cc/40?u=camila'   },
];

function criarDadosTeste() {
  if (!confirm('Criar 8 usuarios de teste?')) return;
  showToast('Criando dados de teste...', 8000);
  var jogosTeste = JOGOS_GRUPOS.slice(0, 6);
  var proms = FAKE_USERS.map(function(u) {
    var uid = 'fake_' + u.email.split('@')[0];
    return setDoc(doc(db,'usuarios',uid), { uid:uid, nome:u.nome, email:u.email, foto:u.foto, fake:true, criadoEm:serverTimestamp() }, { merge:true }).then(function() {
      var qtd = 3 + Math.floor(Math.random() * 4);
      var palProms = [];
      for (var i = 0; i < qtd; i++) {
        var jogo = jogosTeste[i % jogosTeste.length];
        var g1 = Math.floor(Math.random() * 4);
        var g2 = Math.floor(Math.random() * 4);
        palProms.push(setDoc(doc(db,'palpites',uid,'jogos',jogo.id), { jogoId:jogo.id, gols1:g1, gols2:g2, fase:'grupos', pago:true, uid:uid, atualizadoEm:serverTimestamp() }, { merge:true }));
      }
      return Promise.all(palProms);
    });
  });
  Promise.all(proms).then(function() { showToast('Dados de teste criados!'); setTimeout(renderAdmin, 1500); });
}
window.criarDadosTeste = criarDadosTeste;

function removerDadosTeste() {
  if (!confirm('Remover todos os usuarios fake?')) return;
  showToast('Removendo...', 6000);
  getDocs(collection(db,'usuarios')).then(function(snap) {
    var fakes = [];
    snap.forEach(function(d) { if (d.data().fake === true) fakes.push(d.id); });
    return Promise.all(fakes.map(function(uid) {
      return getDocs(collection(db,'palpites',uid,'jogos')).then(function(palSnap) {
        return Promise.all(palSnap.docs.map(function(d) { return deleteDoc(d.ref); }));
      }).then(function() { return deleteDoc(doc(db,'usuarios',uid)); });
    })).then(function() { showToast(fakes.length + ' usuario(s) fake removidos!'); setTimeout(renderAdmin, 1500); });
  });
}
window.removerDadosTeste = removerDadosTeste;

window.logout = logout;
