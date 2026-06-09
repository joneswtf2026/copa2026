// ── BOLÃO COPA 2026 ──
import { firebaseConfig, ADMIN_UID } from './firebase-config.js';
import { JOGOS_GRUPOS, GRUPOS, CODIGOS_PAIS, PONTUACAO, CUSTO_PALPITE, DISTRIBUICAO_PREMIO, CHAVEAMENTO_R32 } from './data.js?v=3';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, signInWithPopup, signOut, GoogleAuthProvider, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, doc, setDoc, getDoc, getDocs, collection, onSnapshot, serverTimestamp, updateDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const fbApp   = initializeApp(firebaseConfig);
const auth    = getAuth(fbApp);
const db      = getFirestore(fbApp);
const provider = new GoogleAuthProvider();

// ── ESTADO ──
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

// ── UTILS ──
function fmtBRL(v) { return 'R$ ' + Number(v).toFixed(2).replace('.', ','); }
function fmtData(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' }) + ' ' +
         d.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });
}
function jogoAberto(jogo) {
  return Date.now() < new Date(jogo.data).getTime() - 60 * 60 * 1000;
}
function faseLbl(fase) {
  return { grupos:'Grupos', oitavas:'Oitavas', quartas:'Quartas', semi:'Semi', final:'Final' }[fase] || fase;
}
// Bandeiras via flagcdn.com — compatível com todos os browsers/SO
function flag(time) {
  const c = CODIGOS_PAIS[time];
  if (!c) return '<span style="font-size:20px">🏳️</span>';
  return `<img src="https://flagcdn.com/w40/${c}.png" alt="${time}" style="width:28px;height:20px;object-fit:cover;border-radius:3px;vertical-align:middle" loading="lazy">`;
}
function flagSm(time) {
  const c = CODIGOS_PAIS[time];
  if (!c) return '';
  return `<img src="https://flagcdn.com/w20/${c}.png" alt="${time}" style="width:18px;height:12px;object-fit:cover;border-radius:2px" loading="lazy">`;
}
function flagLg(time) {
  const c = CODIGOS_PAIS[time];
  if (!c) return '<span style="font-size:40px">🏳️</span>';
  return `<img src="https://flagcdn.com/w80/${c}.png" alt="${time}" style="width:56px;height:38px;object-fit:cover;border-radius:6px;box-shadow:0 1px 4px rgba(0,0,0,.15)" loading="lazy">`;
}

// ── TOAST ──
let toastTimer;
function showToast(msg, dur = 2500) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), dur);
}

// ── AUTH ──
document.getElementById('btnLogin').addEventListener('click', async () => {
  try { await signInWithPopup(auth, provider); }
  catch (e) { showToast('Erro ao fazer login. Tente novamente.'); }
});

async function logout() {
  unsubListeners.forEach(u => u());
  unsubListeners = [];
  await signOut(auth);
}

onAuthStateChanged(auth, async (user) => {
  document.getElementById('splash').style.opacity = '0';
  setTimeout(() => document.getElementById('splash').style.display = 'none', 400);
  if (user) {
    currentUser = user;
    isAdmin = user.uid === ADMIN_UID;
    await initApp(user);
  } else {
    currentUser = null; isAdmin = false;
    document.getElementById('app').classList.add('hidden');
    document.getElementById('loginScreen').classList.remove('hidden');
  }
});

async function initApp(user) {
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  document.getElementById('userName').textContent = user.displayName?.split(' ')[0] || 'Usuário';
  if (user.photoURL) {
    const av = document.getElementById('userAvatar');
    av.src = user.photoURL; av.style.display = 'block';
    document.getElementById('sidebarAvatar').src = user.photoURL;
  }
  document.getElementById('sidebarName').textContent = user.displayName || 'Usuário';
  document.getElementById('sidebarEmail').textContent = user.email || '';

  // Mostra menu admin
  if (isAdmin) document.querySelectorAll('.admin-item').forEach(el => el.classList.remove('hidden'));

  await ensureUserDoc(user);
  await loadConfig();

  subscribeResultados();
  subscribePalpitesUsuario();
  subscribeKnockout();
  navTo('palpites');
}

async function ensureUserDoc(user) {
  const ref = doc(db, 'usuarios', user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { uid: user.uid, nome: user.displayName||'', email: user.email||'', foto: user.photoURL||'', criadoEm: serverTimestamp() }, { merge: true });
  } else {
    await setDoc(ref, { nome: user.displayName||'', foto: user.photoURL||'' }, { merge: true });
  }
}

async function loadConfig() {
  const snap = await getDoc(doc(db, 'config', 'site'));
  if (snap.exists()) configSite = snap.data();
}

// ── LISTENERS ──
function subscribeResultados() {
  const unsub = onSnapshot(collection(db, 'resultados'), snap => {
    resultados = {};
    snap.forEach(d => { resultados[d.id] = d.data(); });
    if (currentPage === 'palpites') renderPalpites();
    if (currentPage === 'ranking') renderRanking();
    if (currentPage === 'premios') renderPremios();
    if (currentPage === 'meus-palpites') renderMeusPalpites();
    if (currentPage === 'chaveamento') renderChaveamento();
  }, err => console.warn('resultados:', err.code));
  unsubListeners.push(unsub);
}

function subscribePalpitesUsuario() {
  if (!currentUser) return;
  const unsub = onSnapshot(collection(db, 'palpites', currentUser.uid, 'jogos'), snap => {
    palpitesUsuario = {};
    snap.forEach(d => { palpitesUsuario[d.id] = d.data(); });
    atualizarCustoBanner();
    renderGrupoTabs();
    if (currentPage === 'palpites') renderPalpites();
    if (currentPage === 'meus-palpites') renderMeusPalpites();
  }, err => console.warn('palpites:', err.code));
  unsubListeners.push(unsub);
}

function subscribeKnockout() {
  const unsub = onSnapshot(collection(db, 'jogos_knockout'), snap => {
    jogosKnockout = {};
    snap.forEach(d => { jogosKnockout[d.id] = d.data(); });
    if (currentPage === 'palpites') renderPalpites();
    if (currentPage === 'chaveamento') renderChaveamento();
  }, err => console.warn('knockout:', err.code));
  unsubListeners.push(unsub);
}

// ── NAVEGAÇÃO ──
function toggleMenu() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('menuOverlay').classList.toggle('hidden');
}
window.toggleMenu = toggleMenu;

function navTo(page) {
  currentPage = page;
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('menuOverlay').classList.add('hidden');
  document.querySelectorAll('.menu-item').forEach(el => el.classList.toggle('active', el.dataset.page === page));
  document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
  const pg = document.getElementById('page-' + page);
  if (pg) pg.classList.add('active');
  switch (page) {
    case 'palpites':      renderPalpites(); break;
    case 'ranking':       renderRanking(); break;
    case 'chaveamento':   renderChaveamento(); break;
    case 'premios':       renderPremios(); break;
    case 'meus-palpites': renderMeusPalpites(); break;
    case 'admin':         renderAdmin(); break;
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
window.navTo = navTo;

function setFase(fase) {
  currentFase = fase;
  document.querySelectorAll('.fase-tab[data-fase]').forEach(el => el.classList.toggle('active', el.dataset.fase === fase));
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
  document.querySelectorAll('.rank-filter-btn[data-rank]').forEach(el => el.classList.toggle('active', el.dataset.rank === fase));
  renderRanking();
}
window.setRankFase = setRankFase;

// ── ABAS DE GRUPO ──
function renderGrupoTabs() {
  const wrap = document.getElementById('grupoTabsWrap');
  const el   = document.getElementById('grupoTabs');
  if (!wrap || !el) return;
  if (currentFase !== 'grupos') { wrap.style.display = 'none'; return; }
  wrap.style.display = '';
  el.innerHTML = Object.keys(GRUPOS).map(g => {
    const flags  = GRUPOS[g].times.map(t => flagSm(t)).join('');
    const temPal = JOGOS_GRUPOS.filter(j => j.grupo === g).some(j => palpitesUsuario[j.id]?.pago);
    return `<button class="grupo-tab ${g===currentGrupo?'active':''} ${temPal?'tem-palpite':''}" onclick="setGrupo('${g}')">
      <span class="gt-letra">Grupo ${g}</span>
      <span class="gt-flags">${flags}</span>
    </button>`;
  }).join('');
}

// ── RENDER PALPITES ──
function renderPalpites() {
  const container = document.getElementById('jogosContainer');
  if (!container) return;
  renderGrupoTabs();

  let jogos = currentFase === 'grupos'
    ? JOGOS_GRUPOS.filter(j => j.grupo === currentGrupo)
    : Object.values(jogosKnockout).filter(j => j.fase === currentFase);

  if (jogos.length === 0) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">⏳</div>
      <div class="empty-state-titulo">Jogos ainda não disponíveis</div>
      <div class="empty-state-desc">Os jogos desta fase serão liberados após o encerramento da fase anterior.</div>
    </div>`;
    return;
  }

  // Cabeçalho com os times do grupo (só na fase de grupos)
  let header = '';
  if (currentFase === 'grupos') {
    const chips = GRUPOS[currentGrupo].times.map(t =>
      `<span class="grupo-time-chip">${flag(t)} ${t}</span>`
    ).join('');
    header = `<div class="grupo-times-header"><div class="grupo-times-lista">${chips}</div></div>`;
  }

  container.innerHTML = header + jogos.map(j => renderJogoCard(j)).join('');

  container.querySelectorAll('.palpite-input').forEach(input => {
    input.addEventListener('change', onPalpiteChange);
    input.addEventListener('input', e => {
      if (e.target.value.length > 2) e.target.value = e.target.value.slice(0, 2);
      if (parseInt(e.target.value) < 0) e.target.value = '0';
    });
  });
}

function renderJogoCard(jogo) {
  const aberto = jogoAberto(jogo);
  const res    = resultados[jogo.id];
  const pal    = palpitesUsuario[jogo.id];
  const pago   = pal?.pago === true;
  const fase   = jogo.fase || 'grupos';
  const custo  = CUSTO_PALPITE[fase] || CUSTO_PALPITE.grupos;

  const statusTxt = res ? 'Encerrado' : aberto ? 'Aberto' : 'Fechado';
  const statusCls = aberto && !res ? 'aberto' : 'encerrado';

  const d        = new Date(jogo.data);
  const diaSemana = d.toLocaleDateString('pt-BR', { weekday:'short' }).replace('.','');
  const diaMes    = d.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' });
  const hora      = d.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });

  let palpiteArea = '';
  if (res) {
    const pts    = calcularPontos(jogo, pal, res);
    const acertou = pts > 0;
    palpiteArea = `<div class="palpite-area">
      <div class="resultado-oficial">
        ${flag(jogo.time1)} <span class="placar">${res.gols1} × ${res.gols2}</span> ${flag(jogo.time2)}
      </div>
      ${pal
        ? `<div class="palpite-pontos ${acertou?'pontos-acertou':'pontos-errou'}">
             ${acertou?'✅':'❌'} Seu palpite: ${pal.gols1}×${pal.gols2}
             ${pago ? ` — <strong>+${pts} pts</strong>` : ' (não pago)'}
           </div>`
        : `<div class="palpite-label" style="margin-top:8px">Você não palpitou neste jogo</div>`
      }
    </div>`;
  } else if (!aberto) {
    palpiteArea = `<div class="palpite-area">
      <div class="palpite-label">⏰ Palpites encerrados</div>
      ${pal ? `<div class="palpite-salvo">✅ Palpite: ${pal.gols1}×${pal.gols2} · ${pago?'pago':'aguardando pagamento'}</div>` : ''}
    </div>`;
  } else {
    const v1 = pal?.gols1 ?? '';
    const v2 = pal?.gols2 ?? '';
    palpiteArea = `<div class="palpite-area">
      ${pago
        ? `<div class="pago-label">✅ Jogo pago — edite o placar até 1h antes de começar</div>`
        : `<div class="palpite-label">Seu palpite <span class="palpite-custo-inline">${fmtBRL(custo)}</span></div>`
      }
      <div class="palpite-grid">
        <input class="palpite-input ${pago?'pago':''}" type="number" min="0" max="20"
          placeholder="" value="${v1}" data-jogo="${jogo.id}" data-campo="gols1"
          id="inp-${jogo.id}-1" name="g1-${jogo.id}">
        <div class="palpite-x">×</div>
        <input class="palpite-input ${pago?'pago':''}" type="number" min="0" max="20"
          placeholder="" value="${v2}" data-jogo="${jogo.id}" data-campo="gols2"
          id="inp-${jogo.id}-2" name="g2-${jogo.id}">
      </div>
      ${!pago && pal ? `<div class="palpite-salvo">💾 Salvo — confirme o pagamento</div>` : ''}
    </div>`;
  }

  const cardCls = ['jogo-card', pal?'palpitado':'', res?'com-resultado':'', !aberto&&!res?'encerrado':''].filter(Boolean).join(' ');
  return `<div class="${cardCls}" id="jogo-${jogo.id}">
    <div class="jogo-card-top">
      <div class="jogo-card-top-left">
        <span class="jogo-fase-badge">${faseLbl(fase)}${jogo.grupo?' · Grupo '+jogo.grupo:''}</span>
        <span class="jogo-data-txt">${diaSemana}, ${diaMes}</span>
        <span class="jogo-hora-txt">🕐 ${hora}</span>
        <span class="jogo-local-txt">📍 ${jogo.local||''}</span>
      </div>
      <span class="jogo-status ${statusCls}">${statusTxt}</span>
    </div>
    <div class="jogo-card-body">
      <div class="jogo-times-v2">
        <div class="jogo-time-v2">
          <div class="time-flag-v2">${flagLg(jogo.time1)}</div>
          <div class="time-nome-v2">${jogo.time1}</div>
        </div>
        <div class="jogo-vs-v2">
          <span class="vs-txt">VS</span>
          ${jogo.grupo?`<span class="vs-grupo">Grupo ${jogo.grupo}</span>`:''}
        </div>
        <div class="jogo-time-v2">
          <div class="time-flag-v2">${flagLg(jogo.time2)}</div>
          <div class="time-nome-v2">${jogo.time2}</div>
        </div>
      </div>
      ${palpiteArea}
    </div>
  </div>`;
}

// ── PALPITE: SALVAR / REMOVER ──
async function onPalpiteChange(e) {
  const jogoId = e.target.dataset.jogo;
  const card   = e.target.closest('.jogo-card');
  const inputs = card.querySelectorAll('.palpite-input');
  const v1 = inputs[0].value.trim();
  const v2 = inputs[1].value.trim();

  // Campo vazio = remove palpite (se não estiver pago)
  if (v1 === '' || v2 === '') {
    await removerPalpite(jogoId);
    atualizarCustoBanner();
    return;
  }
  const g1 = parseInt(v1), g2 = parseInt(v2);
  if (isNaN(g1) || isNaN(g2) || g1 < 0 || g2 < 0) return;
  await salvarPalpite(jogoId, g1, g2);
  atualizarCustoBanner();
}

async function removerPalpite(jogoId) {
  if (!currentUser) return;
  const pal = palpitesUsuario[jogoId];
  if (pal?.pago) {
    // Pago: não remove, restaura valor salvo nos inputs
    const card = document.getElementById('jogo-' + jogoId);
    if (card) {
      const inputs = card.querySelectorAll('.palpite-input');
      if (inputs[0]) inputs[0].value = pal.gols1 ?? '';
      if (inputs[1]) inputs[1].value = pal.gols2 ?? '';
    }
    showToast('⚠️ Palpite pago — não pode ser removido, só editado');
    return;
  }
  try {
    await deleteDoc(doc(db, 'palpites', currentUser.uid, 'jogos', jogoId));
  } catch (err) { console.warn('removerPalpite:', err); }
}

async function salvarPalpite(jogoId, gols1, gols2) {
  if (!currentUser) return;
  const jogo = [...JOGOS_GRUPOS, ...Object.values(jogosKnockout)].find(j => j.id === jogoId);
  if (!jogo || !jogoAberto(jogo)) return;
  const fase = jogo.fase || 'grupos';
  const ref  = doc(db, 'palpites', currentUser.uid, 'jogos', jogoId);
  const pal  = palpitesUsuario[jogoId];
  if (pal?.pago) {
    // Já pago: só atualiza o placar, sem cobrar de novo
    await setDoc(ref, { gols1, gols2, atualizadoEm: serverTimestamp() }, { merge: true });
    showToast('✏️ Palpite atualizado!');
  } else {
    await setDoc(ref, { jogoId, gols1, gols2, fase, pago: false, uid: currentUser.uid, atualizadoEm: serverTimestamp() }, { merge: true });
  }
}

// ── CUSTO BANNER ──
function atualizarCustoBanner() {
  const naoPageos = Object.entries(palpitesUsuario).filter(([id, p]) => {
    if (p.pago) return false;
    const jogo = [...JOGOS_GRUPOS, ...Object.values(jogosKnockout)].find(j => j.id === id);
    return jogo && jogoAberto(jogo) && p.gols1 != null && p.gols2 != null;
  });
  const total = naoPageos.reduce((acc, [id]) => {
    const jogo = [...JOGOS_GRUPOS, ...Object.values(jogosKnockout)].find(j => j.id === id);
    return acc + (CUSTO_PALPITE[jogo?.fase || 'grupos'] || 0);
  }, 0);
  document.getElementById('qtdPalpites').textContent = naoPageos.length;
  document.getElementById('custoTotal').textContent  = fmtBRL(total);
  document.getElementById('btnPagar').disabled = naoPageos.length === 0;
}

// ── PONTUAÇÃO ──
function calcularPontos(jogo, palpite, resultado) {
  if (!palpite || !resultado || palpite.pago !== true) return 0;
  const fase = jogo.fase || 'grupos';
  const pts  = PONTUACAO[fase] || PONTUACAO.grupos;
  const { gols1: g1r, gols2: g2r } = resultado;
  const { gols1: g1p, gols2: g2p } = palpite;
  if (fase === 'grupos') {
    if (g1p === g1r && g2p === g2r) return pts.acertou_placar;
    if (g1r === g2r && g1p === g2p) return pts.acertou_empate;
    const vR = g1r > g2r ? 1 : g1r < g2r ? 2 : 0;
    const vP = g1p > g2p ? 1 : g1p < g2p ? 2 : 0;
    if (vR !== 0 && vR === vP) return pts.acertou_vencedor;
    return pts.errou;
  } else {
    if (g1p === g1r && g2p === g2r) return pts.acertou_placar;
    const vR = g1r >= g2r ? 1 : 2;
    const vP = g1p >= g2p ? 1 : 2;
    return vR === vP ? pts.acertou_vencedor : 0;
  }
}

async function calcularPontosUsuario(uid, fase) {
  const snap = await getDocs(collection(db, 'palpites', uid, 'jogos'));
  let total = 0;
  snap.forEach(d => {
    const p = d.data();
    if (fase && fase !== 'geral' && p.fase !== fase) return;
    const res  = resultados[p.jogoId];
    if (!res) return;
    const jogo = [...JOGOS_GRUPOS, ...Object.values(jogosKnockout)].find(j => j.id === p.jogoId);
    if (jogo) total += calcularPontos(jogo, p, res);
  });
  return total;
}

// ── CHECKOUT / PIX ──
function abrirCheckout() {
  const naoPageos = Object.entries(palpitesUsuario).filter(([id, p]) => {
    if (p.pago) return false;
    const jogo = [...JOGOS_GRUPOS, ...Object.values(jogosKnockout)].find(j => j.id === id);
    return jogo && jogoAberto(jogo) && p.gols1 != null && p.gols2 != null;
  });
  if (!naoPageos.length) return;

  const total = naoPageos.reduce((acc, [id]) => {
    const jogo = [...JOGOS_GRUPOS, ...Object.values(jogosKnockout)].find(j => j.id === id);
    return acc + (CUSTO_PALPITE[jogo?.fase || 'grupos'] || 0);
  }, 0);

  const itens = naoPageos.map(([id, p]) => {
    const jogo  = [...JOGOS_GRUPOS, ...Object.values(jogosKnockout)].find(j => j.id === id);
    const custo = CUSTO_PALPITE[jogo?.fase || 'grupos'] || 0;
    return `<div class="checkout-jogo-item">
      <span class="checkout-jogo-nome">${flag(jogo.time1)} ${jogo.time1} × ${jogo.time2} ${flag(jogo.time2)}</span>
      <span class="checkout-jogo-palpite">${p.gols1}×${p.gols2}</span>
      <span class="checkout-jogo-custo">${fmtBRL(custo)}</span>
    </div>`;
  }).join('');

  const pixKey   = configSite.pixKey   || '(chave Pix não configurada)';
  const pixNome  = configSite.pixNome  || 'Administrador';
  const pixCidade = configSite.pixCidade || 'SAO PAULO';
  const qrUrl    = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(gerarPixPayload(pixKey, pixNome, pixCidade, total))}`;

  document.getElementById('checkoutContent').innerHTML = `
    <div class="modal-body">
      <div class="checkout-resumo">
        <div style="font-size:12px;font-weight:700;color:var(--texto3);margin-bottom:8px;text-transform:uppercase">Resumo dos palpites</div>
        ${itens}
        <div class="checkout-total"><span>Total a pagar</span><span class="checkout-total-val">${fmtBRL(total)}</span></div>
      </div>
      <div class="pix-section">
        <div class="pix-titulo">💚 Pague via Pix</div>
        <div class="pix-qr-wrap">
          <img class="pix-qr-img" src="${qrUrl}" alt="QR Code Pix" onerror="this.style.display='none'">
          <div class="pix-chave-wrap">
            <span class="pix-chave-val">${pixKey}</span>
            <button class="btn-copiar" onclick="copiarPix('${pixKey}')">Copiar</button>
          </div>
          <div class="pix-instrucao">Valor: <strong>${fmtBRL(total)}</strong> para <strong>${pixNome}</strong><br>Após pagar, clique em "Já paguei" abaixo.</div>
        </div>
        <button class="btn-confirmar-pix" onclick="confirmarPagamento(${JSON.stringify(naoPageos.map(([id])=>id))}, ${total})">
          ✅ Já paguei — Confirmar palpites
        </button>
        <div class="aguardando-badge" id="aguardandoBadge" style="display:none">⏳ Aguardando confirmação do administrador</div>
      </div>
    </div>`;
  document.getElementById('modalCheckout').classList.remove('hidden');
}
window.abrirCheckout = abrirCheckout;

function fecharCheckout() { document.getElementById('modalCheckout').classList.add('hidden'); }
window.fecharCheckout = fecharCheckout;

function copiarPix(chave) { navigator.clipboard.writeText(chave).then(() => showToast('Chave Pix copiada!')); }
window.copiarPix = copiarPix;

async function confirmarPagamento(jogoIds, total) {
  if (!currentUser) return;
  const pedidoId = `${currentUser.uid}_${Date.now()}`;
  await setDoc(doc(db, 'pagamentos', pedidoId), {
    uid: currentUser.uid, nome: currentUser.displayName||'', email: currentUser.email||'',
    foto: currentUser.photoURL||'', jogoIds, total, status: 'pendente', criadoEm: serverTimestamp(),
  });
  document.getElementById('aguardandoBadge').style.display = 'flex';
  document.querySelector('.btn-confirmar-pix').disabled = true;
  showToast('Pedido enviado! Aguarde a confirmação do admin.', 4000);
}
window.confirmarPagamento = confirmarPagamento;

function gerarPixPayload(chave, nome, cidade, valor) {
  function tlv(id, val) { return id + String(val.length).padStart(2,'0') + val; }
  const mai = tlv('00','BR.GOV.BCB.PIX') + tlv('01', chave);
  let p = tlv('00','01') + tlv('26', mai) + tlv('52','0000') + tlv('53','986') +
          tlv('54', valor.toFixed(2)) + tlv('58','BR') +
          tlv('59', nome.substring(0,25)) + tlv('60', cidade.substring(0,15)) +
          tlv('62', tlv('05','***')) + '6304';
  let crc = 0xFFFF;
  for (let i=0; i<p.length; i++) { crc ^= p.charCodeAt(i)<<8; for(let j=0;j<8;j++) crc=(crc&0x8000)?(crc<<1)^0x1021:crc<<1; }
  return p + ((crc&0xFFFF).toString(16).toUpperCase().padStart(4,'0'));
}

// ── RANKING ──
async function renderRanking() {
  const container = document.getElementById('rankingContainer');
  const statsEl   = document.getElementById('rankingStats');
  container.innerHTML = '<div class="loading"><div class="spinner"></div> Calculando ranking...</div>';
  const usersSnap = await getDocs(collection(db, 'usuarios'));
  const users = [];
  usersSnap.forEach(d => users.push(d.data()));
  const ranking = await Promise.all(users.map(async u => {
    const pts = await calcularPontosUsuario(u.uid, currentRankFase === 'geral' ? null : currentRankFase);
    const palSnap = await getDocs(collection(db, 'palpites', u.uid, 'jogos'));
    let palpitesPagos = 0, totalGasto = 0;
    palSnap.forEach(d => {
      const p = d.data();
      if (p.pago) {
        palpitesPagos++;
        const jogo = [...JOGOS_GRUPOS, ...Object.values(jogosKnockout)].find(j => j.id === p.jogoId);
        totalGasto += CUSTO_PALPITE[jogo?.fase || 'grupos'] || 0;
      }
    });
    return { ...u, pts, palpitesPagos, totalGasto };
  }));
  ranking.sort((a, b) => b.pts - a.pts);
  const totalParticipantes = ranking.filter(u => u.palpitesPagos > 0).length;
  const totalBalde = ranking.reduce((a, u) => a + u.totalGasto, 0);
  statsEl.innerHTML = `
    <div class="rank-stat-card"><div class="rank-stat-val">${ranking.length}</div><div class="rank-stat-lbl">Usuários</div></div>
    <div class="rank-stat-card"><div class="rank-stat-val">${fmtBRL(totalBalde)}</div><div class="rank-stat-lbl">Balde total</div></div>
    <div class="rank-stat-card"><div class="rank-stat-val">${ranking[0]?.pts || 0}</div><div class="rank-stat-lbl">Líder (pts)</div></div>`;
  if (!ranking.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🏆</div><div class="empty-state-titulo">Nenhum participante ainda</div></div>`;
    return;
  }
  container.innerHTML = `<div class="ranking-list">${ranking.map((u, i) => {
    const pos = i + 1;
    const posCls = pos===1?'pos-1':pos===2?'pos-2':pos===3?'pos-3':'pos-n';
    const posLabel = pos===1?'🥇':pos===2?'🥈':pos===3?'🥉':pos;
    const euCls = u.uid === currentUser?.uid ? ' ranking-eu' : '';
    const avatar = u.foto ? `<img class="ranking-avatar" src="${u.foto}" alt="">` : `<div class="ranking-avatar-placeholder">👤</div>`;
    return `<div class="ranking-item${euCls}">
      <div class="ranking-pos ${posCls}">${posLabel}</div>
      ${avatar}
      <div class="ranking-info">
        <div class="ranking-nome">${u.nome||'Usuário'}${u.uid===currentUser?.uid?' (você)':''}</div>
        <div class="ranking-detalhe">${u.palpitesPagos} palpites · ${fmtBRL(u.totalGasto)} investidos</div>
      </div>
      <div class="ranking-pontos">
        <div class="ranking-pts-val">${u.pts}</div>
        <div class="ranking-pts-lbl">pontos</div>
      </div>
    </div>`;
  }).join('')}</div>`;
}

// ── PRÊMIOS ──
async function renderPremios() {
  const container = document.getElementById('premiosContainer');
  container.innerHTML = '<div class="loading"><div class="spinner"></div> Calculando prêmios...</div>';
  const usersSnap = await getDocs(collection(db, 'usuarios'));
  let totalBalde = 0;
  const usersData = [];
  for (const ud of usersSnap.docs) {
    const u = ud.data();
    const palSnap = await getDocs(collection(db, 'palpites', u.uid, 'jogos'));
    let gasto = 0;
    palSnap.forEach(d => {
      const p = d.data();
      if (p.pago) {
        const jogo = [...JOGOS_GRUPOS, ...Object.values(jogosKnockout)].find(j => j.id === p.jogoId);
        gasto += CUSTO_PALPITE[jogo?.fase || 'grupos'] || 0;
      }
    });
    totalBalde += gasto;
    usersData.push({ ...u, gasto });
  }
  async function liderFase(fase) {
    const pts = await Promise.all(usersData.map(async u => ({ nome: u.nome, pts: await calcularPontosUsuario(u.uid, fase) })));
    pts.sort((a,b) => b.pts - a.pts);
    return pts[0]?.pts > 0 ? pts[0] : null;
  }
  const [lGeral, lGrupos, lOitavas, lQuartas, lSemi] = await Promise.all([
    liderFase(null), liderFase('grupos'), liderFase('oitavas'), liderFase('quartas'), liderFase('semi')
  ]);
  const premios = [
    { icon:'🏆', titulo:'Campeão Geral',        desc:'Melhor pontuação total no final do torneio',        pct: DISTRIBUICAO_PREMIO.campeao_geral,  lider: lGeral   },
    { icon:'⚽', titulo:'Rei da Fase de Grupos', desc:'Melhor pontuação apenas na fase de grupos',         pct: DISTRIBUICAO_PREMIO.melhor_grupos,  lider: lGrupos  },
    { icon:'🎯', titulo:'Rei das Oitavas',       desc:'Melhor pontuação apenas nas oitavas de final',      pct: DISTRIBUICAO_PREMIO.melhor_oitavas, lider: lOitavas },
    { icon:'💎', titulo:'Rei das Quartas',       desc:'Melhor pontuação apenas nas quartas de final',      pct: DISTRIBUICAO_PREMIO.melhor_quartas, lider: lQuartas },
    { icon:'🌟', titulo:'Rei da Semifinal',      desc:'Melhor pontuação apenas na semifinal',              pct: DISTRIBUICAO_PREMIO.melhor_semi,    lider: lSemi    },
  ];
  const totalP = usersData.filter(u => u.gasto > 0).length;
  container.innerHTML = `
    <div class="premio-balde">
      <div class="premio-balde-titulo">💰 Balde Total</div>
      <div class="premio-balde-valor">${fmtBRL(totalBalde)}</div>
      <div class="premio-balde-sub">${totalP} participante${totalP!==1?'s':''} · atualizado em tempo real</div>
    </div>
    <div class="premios-grid">
      ${premios.map(p => `<div class="premio-card">
        <div class="premio-icon">${p.icon}</div>
        <div class="premio-info">
          <div class="premio-titulo">${p.titulo}</div>
          <div class="premio-desc">${p.desc}</div>
          <div class="premio-lider">${p.lider ? '🏅 Líder: '+p.lider.nome+' ('+p.lider.pts+' pts)' : 'Sem dados ainda'}</div>
        </div>
        <div class="premio-valor">
          <div class="premio-pct">${Math.round(p.pct*100)}%</div>
          <div class="premio-reais">${fmtBRL(totalBalde*p.pct)}</div>
        </div>
      </div>`).join('')}
    </div>
    <div class="premio-participantes" style="text-align:center;margin-top:16px;padding:16px;background:var(--cinza-mid);border-radius:var(--radius)">
      <strong style="color:var(--verde);font-size:18px">${totalP}</strong> participante${totalP!==1?'s':''} · <strong style="color:var(--verde)">${fmtBRL(totalBalde)}</strong> no balde
    </div>`;
}

// ── CHAVEAMENTO ──
function renderChaveamento() {
  const container = document.getElementById('chaveamentoContainer');
  const fases = [
    { label:'⚔️ Oitavas de Final', jogos: CHAVEAMENTO_R32 },
    { label:'🏅 Quartas de Final', jogos: Object.values(jogosKnockout).filter(j=>j.fase==='quartas') },
    { label:'🌟 Semifinal',        jogos: Object.values(jogosKnockout).filter(j=>j.fase==='semi')    },
    { label:'🏆 Final',            jogos: Object.values(jogosKnockout).filter(j=>j.fase==='final')   },
  ];
  container.innerHTML = fases.map(fase => `
    <div class="chave-fase-titulo">${fase.label}</div>
    ${fase.jogos.length === 0
      ? `<div class="empty-state" style="padding:20px 0"><div class="empty-state-desc">Aguardando resultados da fase anterior</div></div>`
      : fase.jogos.map((j, i) => {
          const res = resultados[j.id];
          const t1  = j.time1 || j.slot1;
          const t2  = j.time2 || j.slot2;
          const f1  = CODIGOS_PAIS[t1];
          const f2  = CODIGOS_PAIS[t2];
          const img1 = f1 ? `<img src="https://flagcdn.com/w40/${f1}.png" alt="${t1}" style="width:28px;height:20px;object-fit:cover;border-radius:3px">` : '';
          const img2 = f2 ? `<img src="https://flagcdn.com/w40/${f2}.png" alt="${t2}" style="width:28px;height:20px;object-fit:cover;border-radius:3px">` : '';
          const placar = res
            ? `<div class="chave-placar-v2">${res.gols1}×${res.gols2}</div>`
            : `<div class="chave-placar-v2 pendente">—×—</div>`;
          return `<div class="chave-jogo-v2">
            <div class="chave-jogo-header"><span>Jogo ${i+1}</span>${j.data?`<span>${fmtData(j.data)}</span>`:''}</div>
            <div class="chave-jogo-body">
              <div class="chave-time-v2">${img1}<span class="${!f1?'chave-slot-v2':''}">${t1}</span></div>
              ${placar}
              <div class="chave-time-v2 direita"><span class="${!f2?'chave-slot-v2':''}">${t2}</span>${img2}</div>
            </div>
          </div>`;
        }).join('')
    }`).join('');
}

// ── MEUS PALPITES ──
async function renderMeusPalpites() {
  const container = document.getElementById('meusPalpitesContainer');
  if (!currentUser) return;
  const todos = Object.entries(palpitesUsuario);
  if (!todos.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📝</div><div class="empty-state-titulo">Nenhum palpite ainda</div><div class="empty-state-desc">Vá para Palpites e comece a apostar!</div></div>`;
    return;
  }
  const comJogo = todos.map(([id,p]) => {
    const jogo = [...JOGOS_GRUPOS, ...Object.values(jogosKnockout)].find(j => j.id === id);
    return { id, p, jogo };
  }).filter(x => x.jogo).sort((a,b) => new Date(a.jogo.data) - new Date(b.jogo.data));

  let totalPago = 0, totalPontos = 0;
  comJogo.forEach(({ id, p, jogo }) => {
    if (p.pago) {
      totalPago += CUSTO_PALPITE[jogo.fase||'grupos'] || 0;
      const res = resultados[id];
      if (res) totalPontos += calcularPontos(jogo, p, res);
    }
  });
  container.innerHTML = `
    <div class="ranking-stats" style="margin-bottom:16px">
      <div class="rank-stat-card"><div class="rank-stat-val">${comJogo.length}</div><div class="rank-stat-lbl">Palpites</div></div>
      <div class="rank-stat-card"><div class="rank-stat-val">${fmtBRL(totalPago)}</div><div class="rank-stat-lbl">Investido</div></div>
      <div class="rank-stat-card"><div class="rank-stat-val">${totalPontos}</div><div class="rank-stat-lbl">Pontos</div></div>
    </div>
    <div class="meus-palpites-lista">
      ${comJogo.map(({ id, p, jogo }) => {
        const res = resultados[id];
        const pts = res && p.pago ? calcularPontos(jogo, p, res) : null;
        const statusCls = p.pago ? 'pago' : 'pendente';
        const statusLbl = p.pago ? 'Pago' : 'Aguardando pagamento';
        const badgeCls  = p.pago ? 'status-pago' : 'status-pendente';
        return `<div class="meu-palpite-card ${statusCls}">
          <div class="meu-palpite-header">
            <div class="meu-palpite-jogo">${flag(jogo.time1)} ${jogo.time1} × ${jogo.time2} ${flag(jogo.time2)}</div>
            <span class="meu-palpite-status ${badgeCls}">${statusLbl}</span>
          </div>
          <div class="meu-palpite-detalhe">
            Palpite: <strong>${p.gols1}×${p.gols2}</strong> · ${fmtData(jogo.data)} · ${faseLbl(jogo.fase||'grupos')}
            ${res ? ` · Resultado: <strong>${res.gols1}×${res.gols2}</strong>` : ''}
          </div>
          ${pts !== null ? `<div class="meu-palpite-pontos ${pts>0?'pontos-acertou':'pontos-errou'}">${pts>0?'✅ +'+pts+' pontos':'❌ 0 pontos'}</div>` : ''}
        </div>`;
      }).join('')}
    </div>`;
}

// ── ADMIN ──
async function renderAdmin() {
  if (!isAdmin) {
    document.getElementById('adminContainer').innerHTML = `<div class="empty-state"><div class="empty-state-icon">🔒</div><div class="empty-state-titulo">Acesso restrito</div><div class="empty-state-desc">UID atual: ${currentUser?.uid}</div></div>`;
    return;
  }
  const container = document.getElementById('adminContainer');
  container.innerHTML = '<div class="loading"><div class="spinner"></div> Carregando...</div>';
  try {
    const [usersSnap, pagSnap] = await Promise.all([
      getDocs(collection(db, 'usuarios')),
      getDocs(collection(db, 'pagamentos')),
    ]);
    const users = [];
    usersSnap.forEach(d => users.push(d.data()));
    const pagamentos = [];
    pagSnap.forEach(d => pagamentos.push({ id: d.id, ...d.data() }));
    const pendentes = pagamentos.filter(p => p.status === 'pendente');
    let totalBalde = 0;
    const usersComStats = await Promise.all(users.map(async u => {
      const palSnap = await getDocs(collection(db, 'palpites', u.uid, 'jogos'));
      let palpitesPagos = 0, gasto = 0;
      palSnap.forEach(d => {
        const p = d.data();
        if (p.pago) {
          palpitesPagos++;
          const jogo = [...JOGOS_GRUPOS, ...Object.values(jogosKnockout)].find(j => j.id === p.jogoId);
          gasto += CUSTO_PALPITE[jogo?.fase || 'grupos'] || 0;
        }
      });
      totalBalde += gasto;
      return { ...u, palpitesPagos, gasto };
    }));

    container.innerHTML = `
      <div class="admin-stats-grid">
        <div class="admin-stat"><div class="admin-stat-val">${users.length}</div><div class="admin-stat-lbl">Usuários</div></div>
        <div class="admin-stat"><div class="admin-stat-val">${fmtBRL(totalBalde)}</div><div class="admin-stat-lbl">Balde total</div></div>
        <div class="admin-stat"><div class="admin-stat-val">${pendentes.length}</div><div class="admin-stat-lbl">Pgtos pendentes</div></div>
        <div class="admin-stat"><div class="admin-stat-val">${Object.keys(resultados).length}</div><div class="admin-stat-lbl">Resultados</div></div>
      </div>

      <div class="admin-section">
        <div class="admin-section-titulo">💳 Configuração Pix</div>
        <div class="admin-card">
          <div class="pix-config">
            <input class="pix-input" id="pixKeyInput"    type="text" placeholder="Chave Pix" value="${configSite.pixKey||''}">
            <input class="pix-input" id="pixNomeInput"   type="text" placeholder="Nome do recebedor" value="${configSite.pixNome||''}">
            <input class="pix-input" id="pixCidadeInput" type="text" placeholder="Cidade (ex: SAO PAULO)" value="${configSite.pixCidade||''}">
            <button class="btn-salvar-pix" onclick="salvarConfigPix()">💾 Salvar Pix</button>
          </div>
        </div>
      </div>

      ${pendentes.length ? `
      <div class="admin-section">
        <div class="admin-section-titulo">⏳ Pagamentos Pendentes (${pendentes.length})</div>
        <div class="admin-card">
          ${pendentes.map(p => `
            <div class="admin-jogo-row">
              <div class="admin-jogo-info">
                <div class="admin-jogo-nome">${p.nome||p.email}</div>
                <div class="admin-jogo-meta">${p.jogoIds?.length||0} palpites · ${fmtBRL(p.total||0)}</div>
              </div>
              <div style="display:flex;gap:8px">
                <button class="btn-inserir" onclick="aprovarPagamento('${p.id}',${JSON.stringify(p.jogoIds)},'${p.uid}')">✅ Aprovar</button>
                <button class="btn-inserir" style="background:var(--vermelho)" onclick="rejeitarPagamento('${p.id}')">❌ Rejeitar</button>
              </div>
            </div>`).join('')}
        </div>
      </div>` : ''}

      <div class="admin-section">
        <div class="admin-section-titulo">⚽ Resultados — Fase de Grupos</div>
        ${Object.entries(JOGOS_GRUPOS.reduce((acc,j)=>{ if(!acc[j.grupo])acc[j.grupo]=[];acc[j.grupo].push(j);return acc; },{})).map(([grupo,jogos])=>`
          <div class="admin-card" style="margin-bottom:10px">
            <div style="font-weight:800;color:var(--verde);margin-bottom:10px">Grupo ${grupo}</div>
            ${jogos.map(j=>{
              const res=resultados[j.id];
              return `<div class="admin-jogo-row">
                <div class="admin-jogo-info">
                  <div class="admin-jogo-nome">${flag(j.time1)} ${j.time1} × ${j.time2} ${flag(j.time2)}</div>
                  <div class="admin-jogo-meta">${fmtData(j.data)}</div>
                </div>
                ${res?`<div class="admin-jogo-resultado">${res.gols1}×${res.gols2}</div>`:''}
                <button class="btn-inserir ${res?'editando':''}" onclick="abrirModalResultado('${j.id}','${j.time1}','${j.time2}')">
                  ${res?'✏️ Editar':'+ Resultado'}
                </button>
              </div>`;
            }).join('')}
          </div>`).join('')}
      </div>

      <div class="admin-section">
        <div class="admin-section-titulo">🧪 Dados de Teste</div>
        <div class="admin-card" style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
          <div style="flex:1;font-size:13px;color:var(--texto3);line-height:1.5">
            Cria 8 participantes fictícios com palpites e pagamentos simulados para visualizar o ranking.<br>
            <strong style="color:var(--vermelho)">Remova antes de usar em produção.</strong>
          </div>
          <div style="display:flex;gap:8px;flex-shrink:0">
            <button class="btn-inserir" onclick="criarDadosTeste()" style="background:var(--verde4)">➕ Criar fakes</button>
            <button class="btn-inserir" onclick="removerDadosTeste()" style="background:var(--vermelho)">🗑️ Remover fakes</button>
          </div>
        </div>
      </div>

      <div class="admin-section">
        <div class="admin-section-titulo">👥 Participantes</div>
        <div class="admin-card">
          ${usersComStats.sort((a,b)=>b.gasto-a.gasto).map(u=>`
            <div class="admin-user-row">
              ${u.foto?`<img class="admin-user-avatar" src="${u.foto}" alt="">`:'<div style="width:34px;height:34px;border-radius:50%;background:var(--verde-light);display:flex;align-items:center;justify-content:center">👤</div>'}
              <div class="admin-user-info">
                <div class="admin-user-nome">${u.nome||'Usuário'}</div>
                <div class="admin-user-email">${u.email||''}</div>
              </div>
              <div class="admin-user-stats"><strong>${fmtBRL(u.gasto)}</strong>${u.palpitesPagos} palpites pagos</div>
            </div>`).join('')}
        </div>
      </div>`;
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">❌</div><div class="empty-state-titulo">Erro ao carregar</div><div class="empty-state-desc">${err.code||err.message}</div></div>`;
    console.error('renderAdmin:', err);
  }
}

async function aprovarPagamento(pedidoId, jogoIds, uid) {
  if (!confirm(`Aprovar ${jogoIds.length} palpite(s)?`)) return;
  await Promise.all(jogoIds.map(id => setDoc(doc(db,'palpites',uid,'jogos',id),{pago:true},{merge:true})));
  await updateDoc(doc(db,'pagamentos',pedidoId),{status:'aprovado'});
  showToast('✅ Pagamento aprovado!');
  renderAdmin();
}
window.aprovarPagamento = aprovarPagamento;

async function rejeitarPagamento(pedidoId) {
  if (!confirm('Rejeitar este pagamento?')) return;
  await updateDoc(doc(db,'pagamentos',pedidoId),{status:'rejeitado'});
  showToast('❌ Pagamento rejeitado.');
  renderAdmin();
}
window.rejeitarPagamento = rejeitarPagamento;

async function salvarConfigPix() {
  const key    = document.getElementById('pixKeyInput').value.trim();
  const nome   = document.getElementById('pixNomeInput').value.trim();
  const cidade = document.getElementById('pixCidadeInput').value.trim();
  if (!key) { showToast('Informe a chave Pix'); return; }
  configSite = { pixKey: key, pixNome: nome, pixCidade: cidade };
  await setDoc(doc(db,'config','site'), configSite, { merge: true });
  showToast('✅ Configuração Pix salva!');
}
window.salvarConfigPix = salvarConfigPix;

function abrirModalResultado(jogoId, time1, time2) {
  const res = resultados[jogoId];
  document.getElementById('resultadoContent').innerHTML = `
    <div class="modal-body">
      <div style="text-align:center;margin-bottom:16px;font-size:16px;font-weight:700">${flag(time1)} ${time1} × ${time2} ${flag(time2)}</div>
      <div class="palpite-grid" style="margin-bottom:16px">
        <input class="palpite-input" type="number" min="0" max="20" id="resGols1" placeholder="0" value="${res?.gols1??''}">
        <div class="palpite-x">×</div>
        <input class="palpite-input" type="number" min="0" max="20" id="resGols2" placeholder="0" value="${res?.gols2??''}">
      </div>
      <button class="btn-confirmar-pix" onclick="salvarResultado('${jogoId}')">💾 Salvar Resultado</button>
    </div>`;
  document.getElementById('modalResultado').classList.remove('hidden');
}
window.abrirModalResultado = abrirModalResultado;

function fecharModalResultado() { document.getElementById('modalResultado').classList.add('hidden'); }
window.fecharModalResultado = fecharModalResultado;

async function salvarResultado(jogoId) {
  const g1 = parseInt(document.getElementById('resGols1').value);
  const g2 = parseInt(document.getElementById('resGols2').value);
  if (isNaN(g1)||isNaN(g2)) { showToast('Informe o placar completo'); return; }
  await setDoc(doc(db,'resultados',jogoId),{ jogoId, gols1:g1, gols2:g2, atualizadoEm:serverTimestamp() });
  fecharModalResultado();
  showToast('✅ Resultado salvo!');
}
window.salvarResultado = salvarResultado;

// ── INIT ──
window.logout = logout;

// ── DADOS DE TESTE (admin only) ──
const FAKE_USERS = [
  { nome: 'Carlos Silva',    email: 'carlos@teste.com',   foto: 'https://i.pravatar.cc/40?u=carlos'  },
  { nome: 'Ana Souza',       email: 'ana@teste.com',      foto: 'https://i.pravatar.cc/40?u=ana'     },
  { nome: 'Pedro Oliveira',  email: 'pedro@teste.com',    foto: 'https://i.pravatar.cc/40?u=pedro'   },
  { nome: 'Juliana Costa',   email: 'juliana@teste.com',  foto: 'https://i.pravatar.cc/40?u=juliana' },
  { nome: 'Rafael Mendes',   email: 'rafael@teste.com',   foto: 'https://i.pravatar.cc/40?u=rafael'  },
  { nome: 'Fernanda Lima',   email: 'fernanda@teste.com', foto: 'https://i.pravatar.cc/40?u=fernanda'},
  { nome: 'Bruno Alves',     email: 'bruno@teste.com',    foto: 'https://i.pravatar.cc/40?u=bruno'   },
  { nome: 'Camila Torres',   email: 'camila@teste.com',   foto: 'https://i.pravatar.cc/40?u=camila'  },
];

async function criarDadosTeste() {
  if (!confirm('Criar 8 usuários de teste com palpites e pagamentos simulados?')) return;
  showToast('⏳ Criando dados de teste...', 8000);

  // Pega os primeiros 6 jogos do grupo A
  const jogosTeste = JOGOS_GRUPOS.slice(0, 6);

  for (const u of FAKE_USERS) {
    const uid = 'fake_' + u.email.split('@')[0];

    // Cria usuário
    await setDoc(doc(db, 'usuarios', uid), {
      uid, nome: u.nome, email: u.email, foto: u.foto, fake: true, criadoEm: serverTimestamp(),
    }, { merge: true });

    // Cria 3-6 palpites pagos com valores aleatórios
    const qtd = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < qtd; i++) {
      const jogo  = jogosTeste[i % jogosTeste.length];
      const gols1 = Math.floor(Math.random() * 4);
      const gols2 = Math.floor(Math.random() * 4);
      await setDoc(doc(db, 'palpites', uid, 'jogos', jogo.id), {
        jogoId: jogo.id, gols1, gols2, fase: 'grupos',
        pago: true, uid, atualizadoEm: serverTimestamp(),
      }, { merge: true });
    }
  }
  showToast('✅ Dados de teste criados!');
  setTimeout(renderAdmin, 1500);
}
window.criarDadosTeste = criarDadosTeste;

async function removerDadosTeste() {
  if (!confirm('Remover TODOS os usuários de teste (fake_*) e seus palpites?')) return;
  showToast('⏳ Removendo dados de teste...', 6000);

  const usersSnap = await getDocs(collection(db, 'usuarios'));
  const fakes = [];
  usersSnap.forEach(d => { if (d.data().fake === true) fakes.push(d.id); });

  for (const uid of fakes) {
    // Remove palpites
    const palSnap = await getDocs(collection(db, 'palpites', uid, 'jogos'));
    await Promise.all(palSnap.docs.map(d => deleteDoc(d.ref)));
    // Remove usuário
    await deleteDoc(doc(db, 'usuarios', uid));
  }
  showToast(`✅ ${fakes.length} usuário(s) de teste removidos!`);
  setTimeout(renderAdmin, 1500);
}
window.removerDadosTeste = removerDadosTeste;
